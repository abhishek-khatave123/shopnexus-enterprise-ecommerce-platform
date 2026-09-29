from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.user import User
from app.models.order import Order
from app.schemas.order import OrderCreateRequest, OrderOut
from app.services import order_service

router = APIRouter(prefix="/api/orders", tags=["Orders"])


def _attach_items_total(order: Order) -> OrderOut:
    out = OrderOut.model_validate(order)
    for i, item in enumerate(order.items):
        out.items[i].line_total = item.unit_price * item.quantity
    return out


@router.post("", response_model=OrderOut, status_code=201, summary="Create an order from the current cart (checkout)")
def create_order(payload: OrderCreateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    order = order_service.create_order_from_cart(db, current_user, payload)
    return _attach_items_total(order)


@router.get("", response_model=list[OrderOut], summary="List the current user's orders")
def list_my_orders(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    orders = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.user_id == current_user.id)
        .order_by(Order.created_at.desc())
        .all()
    )
    return [_attach_items_total(o) for o in orders]


@router.get("/{order_id}", response_model=OrderOut, summary="Get order details")
def get_order(order_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    order = order_service.get_order_or_404(db, order_id)
    role_name = current_user.role.name
    if order.user_id != current_user.id and role_name not in ("ADMIN", "SUPER_ADMIN"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot view this order")
    return _attach_items_total(order)
