from datetime import datetime
from pydantic import BaseModel, Field


class ReviewCreate(BaseModel):
    product_id: int
    order_id: int | None = None
    rating: int = Field(ge=1, le=5)
    comment: str | None = None


class ReviewOut(BaseModel):
    id: int
    product_id: int
    user_id: int
    rating: int
    comment: str | None
    created_at: datetime

    class Config:
        from_attributes = True
