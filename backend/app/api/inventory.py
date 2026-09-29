from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.middleware.auth_middleware import require_admin
from app.models.user import User
from app.models.inventory import Inventory
from app.models.product import Product
from app.schemas.inventory import InventoryOut, InventoryUpdateRequest

router = APIRouter(prefix="/api/inventory", tags=["Admin - Inventory"])


def _serialize(inv: Inventory) -> InventoryOut:
    return InventoryOut(
        id=inv.id,
        product_id=inv.product_id,
        product_name=inv.product.name,
        sku=inv.product.sku,
        quantity=inv.quantity,
        low_stock_threshold=inv.low_stock_threshold,
        status=inv.status,
        updated_at=inv.updated_at,
    )


@router.get("", response_model=list[InventoryOut], summary="List inventory (Admin only)")
def list_inventory(
    low_stock_only: bool = Query(False),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = db.query(Inventory).options(joinedload(Inventory.product))
    if low_stock_only:
        query = query.filter(Inventory.quantity <= Inventory.low_stock_threshold)
    rows = query.join(Product).order_by(Inventory.quantity.asc()).all()
    return [_serialize(r) for r in rows]


@router.put("/{product_id}", response_model=InventoryOut, summary="Update stock level / low-stock threshold (Admin only)")
def update_inventory(
    product_id: int,
    payload: InventoryUpdateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    inv = db.query(Inventory).options(joinedload(Inventory.product)).filter(Inventory.product_id == product_id).first()
    if not inv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory record not found")

    if payload.quantity is not None:
        inv.quantity = payload.quantity
        inv.product.stock_quantity = payload.quantity  # keep Product.stock_quantity in sync
    if payload.low_stock_threshold is not None:
        inv.low_stock_threshold = payload.low_stock_threshold

    db.commit()
    db.refresh(inv)
    return _serialize(inv)
