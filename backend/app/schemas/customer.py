from datetime import datetime
from pydantic import BaseModel, EmailStr


class CustomerOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    phone: str | None
    is_active: bool
    created_at: datetime
    order_count: int = 0

    class Config:
        from_attributes = True


class CustomerListResponse(BaseModel):
    items: list[CustomerOut]
    total: int
    page: int
    page_size: int
    total_pages: int
