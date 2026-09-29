from decimal import Decimal
from pydantic import BaseModel


class OverviewResponse(BaseModel):
    total_revenue: Decimal
    total_orders: int
    total_customers: int
    total_products: int
    average_order_value: Decimal
    pending_orders: int
    low_stock_products: int


class RevenuePoint(BaseModel):
    label: str
    revenue: Decimal


class OrdersByStatusPoint(BaseModel):
    status: str
    count: int


class CategorySalesPoint(BaseModel):
    category: str
    revenue: Decimal


class TopProductPoint(BaseModel):
    product_id: int
    product_name: str
    units_sold: int
    revenue: Decimal
