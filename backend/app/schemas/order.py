from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel

from app.schemas.user import AddressCreate


class OrderCreateRequest(BaseModel):
    address: AddressCreate


class OrderItemOut(BaseModel):
    id: int
    product_id: int
    product_name: str
    unit_price: Decimal
    quantity: int
    line_total: Decimal

    class Config:
        from_attributes = True


class OrderOut(BaseModel):
    id: int
    order_number: str
    user_id: int
    total_amount: Decimal
    subtotal_amount: Decimal
    discount_amount: Decimal
    payment_status: str
    order_status: str
    shipping_address: str
    created_at: datetime
    items: list[OrderItemOut] = []

    class Config:
        from_attributes = True


class OrderStatusUpdateRequest(BaseModel):
    order_status: str
