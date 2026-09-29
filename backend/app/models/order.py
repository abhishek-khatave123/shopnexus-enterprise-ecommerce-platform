from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, Enum, func, Text
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.enums import OrderStatus, PaymentStatus


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(40), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    total_amount = Column(Numeric(12, 2), nullable=False)
    subtotal_amount = Column(Numeric(12, 2), nullable=False, default=0)
    discount_amount = Column(Numeric(12, 2), nullable=False, default=0)
    payment_status = Column(Enum(PaymentStatus), nullable=False, default=PaymentStatus.PENDING, index=True)
    order_status = Column(Enum(OrderStatus), nullable=False, default=OrderStatus.PENDING, index=True)
    shipping_address = Column(Text, nullable=False)  # JSON-serialized snapshot of address at order time
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    payment = relationship("Payment", back_populates="order", uselist=False, cascade="all, delete-orphan")
