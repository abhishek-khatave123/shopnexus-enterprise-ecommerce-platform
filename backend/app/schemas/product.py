from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field


class ProductImageOut(BaseModel):
    id: int
    image_url: str
    public_id: str | None = None

    class Config:
        from_attributes = True


class ProductCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    slug: str | None = None
    description: str | None = None
    price: Decimal = Field(gt=0)
    discount_price: Decimal | None = Field(default=None, ge=0)
    sku: str
    category_id: int
    brand: str | None = None
    stock_quantity: int = Field(ge=0, default=0)
    is_active: bool = True


class ProductUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    price: Decimal | None = None
    discount_price: Decimal | None = None
    category_id: int | None = None
    brand: str | None = None
    stock_quantity: int | None = None
    is_active: bool | None = None


class ProductOut(BaseModel):
    id: int
    name: str
    slug: str
    description: str | None
    price: Decimal
    discount_price: Decimal | None
    sku: str
    category_id: int
    brand: str | None
    stock_quantity: int
    is_active: bool
    created_at: datetime
    images: list[ProductImageOut] = []

    class Config:
        from_attributes = True


class ProductListResponse(BaseModel):
    items: list[ProductOut]
    total: int
    page: int
    page_size: int
    total_pages: int
