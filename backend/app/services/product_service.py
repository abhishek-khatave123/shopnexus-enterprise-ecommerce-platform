import re
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.inventory import Inventory
from app.schemas.product import ProductCreate, ProductUpdate


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def list_products(
    db: Session,
    page: int = 1,
    page_size: int = 12,
    search: str | None = None,
    category_id: int | None = None,
    min_price: Decimal | None = None,
    max_price: Decimal | None = None,
    sort: str | None = None,
    active_only: bool = True,
):
    query = db.query(Product)
    if active_only:
        query = query.filter(Product.is_active == True)  # noqa: E712
    if search:
        like = f"%{search}%"
        query = query.filter(or_(Product.name.ilike(like), Product.sku.ilike(like)))
    if category_id:
        query = query.filter(Product.category_id == category_id)
    if min_price is not None:
        query = query.filter(Product.price >= min_price)
    if max_price is not None:
        query = query.filter(Product.price <= max_price)

    if sort == "price_asc":
        query = query.order_by(Product.price.asc())
    elif sort == "price_desc":
        query = query.order_by(Product.price.desc())
    elif sort == "newest":
        query = query.order_by(Product.created_at.desc())
    else:
        query = query.order_by(Product.created_at.desc())

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    total_pages = max(1, (total + page_size - 1) // page_size)
    return items, total, total_pages


def get_product_or_404(db: Session, product_id: int) -> Product:
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


def create_product(db: Session, payload: ProductCreate) -> Product:
    if db.query(Product).filter(Product.sku == payload.sku).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="SKU already exists")

    slug = payload.slug or slugify(payload.name)
    base_slug, suffix = slug, 1
    while db.query(Product).filter(Product.slug == slug).first():
        suffix += 1
        slug = f"{base_slug}-{suffix}"

    product = Product(
        name=payload.name,
        slug=slug,
        description=payload.description,
        price=payload.price,
        discount_price=payload.discount_price,
        sku=payload.sku,
        category_id=payload.category_id,
        brand=payload.brand,
        stock_quantity=payload.stock_quantity,
        is_active=payload.is_active,
    )
    db.add(product)
    db.flush()

    db.add(Inventory(product_id=product.id, quantity=payload.stock_quantity))
    db.commit()
    db.refresh(product)
    return product


def update_product(db: Session, product_id: int, payload: ProductUpdate) -> Product:
    product = get_product_or_404(db, product_id)
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(product, field, value)

    if "stock_quantity" in data:
        inv = db.query(Inventory).filter(Inventory.product_id == product.id).first()
        if inv:
            inv.quantity = data["stock_quantity"]

    db.commit()
    db.refresh(product)
    return product


def delete_product(db: Session, product_id: int) -> None:
    product = get_product_or_404(db, product_id)
    db.delete(product)
    db.commit()
