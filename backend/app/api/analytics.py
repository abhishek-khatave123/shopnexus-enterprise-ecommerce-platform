from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.middleware.auth_middleware import require_admin
from app.models.user import User
from app.schemas.analytics import OverviewResponse
from app.services import analytics_service

router = APIRouter(prefix="/api/analytics", tags=["Admin - Analytics"])


@router.get("/overview", response_model=OverviewResponse, summary="Dashboard overview metrics (Admin only)")
def overview(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return analytics_service.get_overview(db)


@router.get("/revenue", summary="Revenue over time (Admin only)")
def revenue(
    period: str = Query("30d", description="today | 7d | 30d | 6m | 1y"),
    group_by: str = Query("day", description="day | month"),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    if group_by == "month":
        return analytics_service.get_revenue_by_month(db)
    return analytics_service.get_revenue_by_day(db, period)


@router.get("/orders", summary="Orders breakdown by status (Admin only)")
def orders_breakdown(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return {
        "by_status": analytics_service.get_orders_by_status(db),
        "payment_statistics": analytics_service.get_payment_statistics(db),
    }


@router.get("/products", summary="Product-related analytics: top sellers, sales by category (Admin only)")
def products_analytics(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return {
        "top_products": analytics_service.get_top_products(db),
        "sales_by_category": analytics_service.get_sales_by_category(db),
    }


@router.get("/customers", summary="New customer analytics (Admin only)")
def customers_analytics(
    period: str = Query("30d", description="today | 7d | 30d | 6m | 1y"),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return {"new_customers": analytics_service.get_new_customers(db, period)}
