from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.user import User
from app.models.payment import Payment
from app.schemas.payment import (
    CreatePaymentOrderRequest,
    CreatePaymentOrderResponse,
    VerifyPaymentRequest,
    PaymentOut,
)
from app.services import payment_service, order_service

router = APIRouter(prefix="/api/payments", tags=["Payments"])


@router.post("/create-order", response_model=CreatePaymentOrderResponse, summary="Create a Razorpay payment order for checkout")
def create_payment_order(payload: CreatePaymentOrderRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    order = order_service.get_order_or_404(db, payload.order_id)
    if order.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This order does not belong to you")
    result = payment_service.create_payment_order(db, order)
    return CreatePaymentOrderResponse(**result)


@router.post("/verify", response_model=PaymentOut, summary="Verify Razorpay payment signature and confirm payment")
def verify_payment(payload: VerifyPaymentRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    order = order_service.get_order_or_404(db, payload.order_id)
    if order.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This order does not belong to you")
    payment = payment_service.confirm_payment(
        db, order, payload.razorpay_order_id, payload.razorpay_payment_id, payload.razorpay_signature
    )
    return payment


@router.get("/{payment_id}", response_model=PaymentOut, summary="Get payment details")
def get_payment(payment_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    order = order_service.get_order_or_404(db, payment.order_id)
    role_name = current_user.role.name
    if order.user_id != current_user.id and role_name not in ("ADMIN", "SUPER_ADMIN"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot view this payment")
    return payment
