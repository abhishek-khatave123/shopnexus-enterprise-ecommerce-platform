from datetime import datetime
from pydantic import BaseModel, Field


class InventoryOut(BaseModel):
    id: int
    product_id: int
    product_name: str
    sku: str
    quantity: int
    low_stock_threshold: int
    status: str
    updated_at: datetime

    class Config:
        from_attributes = True


class InventoryUpdateRequest(BaseModel):
    quantity: int | None = Field(default=None, ge=0)
    low_stock_threshold: int | None = Field(default=None, ge=0)
