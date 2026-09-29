"""
Razorpay payment service.

Design goal: the checkout flow must never hard-crash if Razorpay keys are
missing. create_payment_order() returns a `configured: False` payload with a
clear message in that case, and the frontend is expected to show that
message instead of opening the Razorpay checkout widget.

Security:
- RAZORPAY_KEY_SECRET never leaves the backend.
- Signature verification happens server-side using hmac/sha256, exactly as
  Razorpay's docs specify, before an order/payment is ever marked PAID.
"""
import hmac
import hashlib
import logging

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.order import Order
from app.models.payment import Payment
from app.models.user import User
from app.models.enums import PaymentStatus, OrderStatus
from app.services.email_service import send_payment_confirmation_email

logger = logging.getLogger("shopnexus.payment")


def create_payment_order(db: Session, order: Order) -> dict:
    if not settings.razorpay_configured:
        logger.warning("Razorpay payment attempted but credentials are not configured (order_id=%s)", order.id)
        return {
            "configured": False,
            "message": (
                "Online payment is not available right now: Razorpay credentials are not configured. "
                "Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in the backend .env file."
            ),
        }

    import razorpay

    client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
    amount_paise = int(order.total_amount * 100)

    try:
        rp_order = client.order.create(
            {
                "amount": amount_paise,
                "currency": "INR",
                "receipt": order.order_number,
                "notes": {"order_id": str(order.id)},
            }
        )
    except Exception as exc:
        logger.exception("Razorpay order creation failed for order_id=%s", order.id)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Payment gateway error: {exc}")

    payment = db.query(Payment).filter(Payment.order_id == order.id).first()
    if not payment:
        payment = Payment(order_id=order.id, amount=order.total_amount, currency="INR")
        db.add(payment)
    payment.razorpay_order_id = rp_order["id"]
    payment.status = PaymentStatus.PENDING
    db.commit()

    return {
        "configured": True,
        "message": "Razorpay order created",
        "razorpay_order_id": rp_order["id"],
        "razorpay_key_id": settings.RAZORPAY_KEY_ID,
        "amount": order.total_amount,
        "currency": "INR",
    }


def verify_payment_signature(razorpay_order_id: str, razorpay_payment_id: str, razorpay_signature: str) -> bool:
    if not settings.razorpay_configured:
        return False
    generated_signature = hmac.new(
        key=settings.RAZORPAY_KEY_SECRET.encode(),
        msg=f"{razorpay_order_id}|{razorpay_payment_id}".encode(),
        digestmod=hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(generated_signature, razorpay_signature)


def confirm_payment(db: Session, order: Order, razorpay_order_id: str, razorpay_payment_id: str, razorpay_signature: str) -> Payment:
    if not verify_payment_signature(razorpay_order_id, razorpay_payment_id, razorpay_signature):
        logger.warning("Razorpay signature verification FAILED for order_id=%s", order.id)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment signature verification failed")

    payment = db.query(Payment).filter(Payment.order_id == order.id).first()
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment record not found")

    payment.razorpay_payment_id = razorpay_payment_id
    payment.razorpay_signature = razorpay_signature
    payment.status = PaymentStatus.PAID
    order.payment_status = PaymentStatus.PAID
    order.order_status = OrderStatus.CONFIRMED
    db.commit()
    db.refresh(payment)

    logger.info("Payment verified and confirmed for order_id=%s", order.id)

    user = db.query(User).filter(User.id == order.user_id).first()
    if user:
        send_payment_confirmation_email(user.email, user.name, order.order_number, str(order.total_amount))

    return payment
