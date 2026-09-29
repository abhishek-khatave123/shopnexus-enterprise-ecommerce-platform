from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io

from app.core.database import get_db
from app.middleware.auth_middleware import require_admin
from app.models.user import User
from app.services import report_service

router = APIRouter(prefix="/api/reports", tags=["Admin - Reports"])


def _csv_response(content: str, filename: str) -> StreamingResponse:
    return StreamingResponse(
        io.StringIO(content),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/sales", summary="Sales report CSV (Admin only)")
def sales_report(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return _csv_response(report_service.sales_report_csv(db), "sales_report.csv")


@router.get("/orders", summary="Orders report CSV (Admin only)")
def orders_report(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return _csv_response(report_service.orders_report_csv(db), "orders_report.csv")


@router.get("/customers", summary="Customers report CSV (Admin only)")
def customers_report(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return _csv_response(report_service.customers_report_csv(db), "customers_report.csv")


@router.get("/inventory", summary="Inventory report CSV (Admin only)")
def inventory_report(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return _csv_response(report_service.inventory_report_csv(db), "inventory_report.csv")


@router.get("/products", summary="Products report CSV (Admin only)")
def products_report(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return _csv_response(report_service.products_report_csv(db), "products_report.csv")
