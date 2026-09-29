from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.middleware.auth_middleware import require_admin
from app.models.user import User
from app.models.order import Order
from app.models.product import Product
from app.models.payment import Payment
from app.schemas.order import OrderOut, OrderStatusUpdateRequest
from app.schemas.product import ProductOut
from app.schemas.payment import PaymentOut
from app.services.order_service import update_order_status

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/orders", response_model=list[OrderOut], summary="List all orders (Admin only)")
def list_all_orders(
    status_filter: str | None = Query(None, alias="status"),
    search: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = db.query(Order).options(joinedload(Order.items))
    if status_filter:
        query = query.filter(Order.order_status == status_filter)
    if search:
        query = query.filter(or_(Order.order_number.ilike(f"%{search}%")))
    return query.order_by(Order.created_at.desc()).all()


@router.put("/orders/{order_id}/status", response_model=OrderOut, summary="Update order status (Admin only)")
def change_order_status(order_id: int, payload: OrderStatusUpdateRequest, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return update_order_status(db, order_id, payload.order_status)


@router.get("/products", response_model=list[ProductOut], summary="List all products including inactive (Admin only)")
def list_all_products(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return db.query(Product).order_by(Product.created_at.desc()).all()


@router.get("/payments", response_model=list[PaymentOut], summary="List all payments (Admin only)")
def list_all_payments(
    status_filter: str | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = db.query(Payment).options(joinedload(Payment.order))
    if status_filter:
        query = query.filter(Payment.status == status_filter)
    return query.order_by(Payment.created_at.desc()).all()
