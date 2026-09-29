from datetime import datetime, timedelta
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.product import Product
from app.models.category import Category
from app.models.user import User
from app.models.inventory import Inventory
from app.models.enums import OrderStatus, PaymentStatus


def _date_range(period: str) -> datetime | None:
    now = datetime.utcnow()
    mapping = {
        "today": now - timedelta(days=1),
        "7d": now - timedelta(days=7),
        "30d": now - timedelta(days=30),
        "6m": now - timedelta(days=182),
        "1y": now - timedelta(days=365),
    }
    return mapping.get(period)


def get_overview(db: Session) -> dict:
    total_revenue = db.query(func.coalesce(func.sum(Order.total_amount), 0)).filter(
        Order.payment_status == PaymentStatus.PAID
    ).scalar()
    total_orders = db.query(func.count(Order.id)).scalar()
    total_customers = db.query(func.count(User.id)).join(User.role).filter(User.role.has(name="CUSTOMER")).scalar()
    total_products = db.query(func.count(Product.id)).scalar()
    pending_orders = db.query(func.count(Order.id)).filter(Order.order_status == OrderStatus.PENDING).scalar()
    low_stock = db.query(func.count(Inventory.id)).filter(Inventory.quantity <= Inventory.low_stock_threshold).scalar()

    avg_order_value = Decimal("0")
    if total_orders:
        avg_order_value = (Decimal(total_revenue) / total_orders) if total_orders else Decimal("0")

    return {
        "total_revenue": total_revenue or 0,
        "total_orders": total_orders or 0,
        "total_customers": total_customers or 0,
        "total_products": total_products or 0,
        "average_order_value": avg_order_value,
        "pending_orders": pending_orders or 0,
        "low_stock_products": low_stock or 0,
    }


def get_revenue_by_day(db: Session, period: str = "30d") -> list[dict]:
    since = _date_range(period)
    query = db.query(
        func.date(Order.created_at).label("day"),
        func.coalesce(func.sum(Order.total_amount), 0).label("revenue"),
    ).filter(Order.payment_status == PaymentStatus.PAID)
    if since:
        query = query.filter(Order.created_at >= since)
    rows = query.group_by(func.date(Order.created_at)).order_by(func.date(Order.created_at)).all()
    return [{"label": str(r.day), "revenue": r.revenue} for r in rows]


def get_revenue_by_month(db: Session) -> list[dict]:
    rows = (
        db.query(
            func.to_char(Order.created_at, "YYYY-MM").label("month"),
            func.coalesce(func.sum(Order.total_amount), 0).label("revenue"),
        )
        .filter(Order.payment_status == PaymentStatus.PAID)
        .group_by("month")
        .order_by("month")
        .all()
    )
    return [{"label": r.month, "revenue": r.revenue} for r in rows]


def get_orders_by_status(db: Session) -> list[dict]:
    rows = db.query(Order.order_status, func.count(Order.id)).group_by(Order.order_status).all()
    return [{"status": s.value, "count": c} for s, c in rows]


def get_sales_by_category(db: Session) -> list[dict]:
    rows = (
        db.query(Category.name, func.coalesce(func.sum(OrderItem.unit_price * OrderItem.quantity), 0))
        .join(Product, Product.category_id == Category.id)
        .join(OrderItem, OrderItem.product_id == Product.id)
        .join(Order, Order.id == OrderItem.order_id)
        .filter(Order.payment_status == PaymentStatus.PAID)
        .group_by(Category.name)
        .all()
    )
    return [{"category": name, "revenue": revenue} for name, revenue in rows]


def get_top_products(db: Session, limit: int = 5) -> list[dict]:
    rows = (
        db.query(
            OrderItem.product_id,
            OrderItem.product_name,
            func.sum(OrderItem.quantity).label("units_sold"),
            func.sum(OrderItem.unit_price * OrderItem.quantity).label("revenue"),
        )
        .join(Order, Order.id == OrderItem.order_id)
        .filter(Order.payment_status == PaymentStatus.PAID)
        .group_by(OrderItem.product_id, OrderItem.product_name)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(limit)
        .all()
    )
    return [
        {"product_id": pid, "product_name": name, "units_sold": units, "revenue": revenue}
        for pid, name, units, revenue in rows
    ]


def get_new_customers(db: Session, period: str = "30d") -> int:
    since = _date_range(period)
    query = db.query(func.count(User.id)).join(User.role).filter(User.role.has(name="CUSTOMER"))
    if since:
        query = query.filter(User.created_at >= since)
    return query.scalar() or 0


def get_payment_statistics(db: Session) -> list[dict]:
    rows = db.query(Order.payment_status, func.count(Order.id)).group_by(Order.payment_status).all()
    return [{"status": s.value, "count": c} for s, c in rows]


def get_low_stock_products(db: Session, limit: int = 20) -> list:
    return (
        db.query(Product)
        .join(Inventory, Inventory.product_id == Product.id)
        .filter(Inventory.quantity <= Inventory.low_stock_threshold)
        .order_by(Inventory.quantity.asc())
        .limit(limit)
        .all()
    )
