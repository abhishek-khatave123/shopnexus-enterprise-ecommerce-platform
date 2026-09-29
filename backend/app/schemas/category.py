from datetime import datetime
from pydantic import BaseModel


class CategoryCreate(BaseModel):
    name: str
    slug: str | None = None
    description: str | None = None


class CategoryUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class CategoryOut(BaseModel):
    id: int
    name: str
    slug: str
    description: str | None
    created_at: datetime

    class Config:
        from_attributes = True
