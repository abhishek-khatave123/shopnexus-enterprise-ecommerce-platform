from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.middleware.auth_middleware import require_admin
from app.models.user import User
from app.models.order import Order
from app.schemas.customer import CustomerOut, CustomerListResponse
from app.schemas.order import OrderOut
from app.services.order_service import get_order_or_404

router = APIRouter(prefix="/api/admin/customers", tags=["Admin - Customers"])


@router.get("", response_model=CustomerListResponse, summary="List customers (Admin only)")
def list_customers(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    is_active: bool | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = db.query(User).join(User.role).filter(User.role.has(name="CUSTOMER"))
    if search:
        like = f"%{search}%"
        query = query.filter(or_(User.name.ilike(like), User.email.ilike(like)))
    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    total = query.count()
    users = query.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for u in users:
        order_count = db.query(func.count(Order.id)).filter(Order.user_id == u.id).scalar()
        out = CustomerOut.model_validate(u)
        out.order_count = order_count or 0
        items.append(out)

    total_pages = max(1, (total + page_size - 1) // page_size)
    return CustomerListResponse(items=items, total=total, page=page, page_size=page_size, total_pages=total_pages)


@router.get("/{customer_id}", response_model=CustomerOut, summary="Get customer details (Admin only)")
def get_customer(customer_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == customer_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    order_count = db.query(func.count(Order.id)).filter(Order.user_id == user.id).scalar()
    out = CustomerOut.model_validate(user)
    out.order_count = order_count or 0
    return out


@router.get("/{customer_id}/orders", response_model=list[OrderOut], summary="Get a customer's orders (Admin only)")
def get_customer_orders(customer_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    orders = db.query(Order).filter(Order.user_id == customer_id).order_by(Order.created_at.desc()).all()
    return orders


@router.put("/{customer_id}/status", response_model=CustomerOut, summary="Activate/deactivate a customer account (Admin only)")
def set_customer_status(customer_id: int, is_active: bool, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == customer_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    user.is_active = is_active
    db.commit()
    db.refresh(user)
    out = CustomerOut.model_validate(user)
    return out
