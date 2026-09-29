from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel


class CreatePaymentOrderRequest(BaseModel):
    order_id: int


class CreatePaymentOrderResponse(BaseModel):
    configured: bool
    message: str
    razorpay_order_id: str | None = None
    razorpay_key_id: str | None = None
    amount: Decimal | None = None
    currency: str = "INR"


class VerifyPaymentRequest(BaseModel):
    order_id: int
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class PaymentOut(BaseModel):
    id: int
    order_id: int
    amount: Decimal
    currency: str
    status: str
    razorpay_payment_id: str | None = None
    created_at: datetime | None = None

    class Config:
        from_attributes = True
