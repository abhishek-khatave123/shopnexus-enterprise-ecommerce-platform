from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.middleware.auth_middleware import require_admin
from app.models.user import User
from app.schemas.product import ProductCreate, ProductUpdate, ProductOut, ProductListResponse
from app.schemas.common import MessageResponse
from app.services import product_service

router = APIRouter(prefix="/api/products", tags=["Products"])


@router.get("", response_model=ProductListResponse, summary="List products with search, filter, sort, pagination")
def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    search: str | None = None,
    category_id: int | None = None,
    min_price: Decimal | None = None,
    max_price: Decimal | None = None,
    sort: str | None = Query(None, description="price_asc | price_desc | newest"),
    db: Session = Depends(get_db),
):
    items, total, total_pages = product_service.list_products(
        db, page, page_size, search, category_id, min_price, max_price, sort, active_only=True
    )
    return ProductListResponse(items=items, total=total, page=page, page_size=page_size, total_pages=total_pages)


@router.get("/{product_id}", response_model=ProductOut, summary="Get product details")
def get_product(product_id: int, db: Session = Depends(get_db)):
    return product_service.get_product_or_404(db, product_id)


@router.post("", response_model=ProductOut, status_code=201, summary="Create a product (Admin only)")
def create_product(payload: ProductCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return product_service.create_product(db, payload)


@router.put("/{product_id}", response_model=ProductOut, summary="Update a product (Admin only)")
def update_product(product_id: int, payload: ProductUpdate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return product_service.update_product(db, product_id, payload)


@router.delete("/{product_id}", response_model=MessageResponse, summary="Delete a product (Admin only)")
def delete_product(product_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    product_service.delete_product(db, product_id)
    return MessageResponse(message="Product deleted successfully")
