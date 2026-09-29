import csv
import io

from sqlalchemy.orm import Session

from app.models.order import Order
from app.models.user import User
from app.models.product import Product
from app.models.inventory import Inventory


def _to_csv(headers: list[str], rows: list[list]) -> str:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(headers)
    writer.writerows(rows)
    return buffer.getvalue()


def sales_report_csv(db: Session) -> str:
    orders = db.query(Order).filter(Order.payment_status == "PAID").all()
    rows = [[o.order_number, o.created_at, o.subtotal_amount, o.discount_amount, o.total_amount] for o in orders]
    return _to_csv(["Order Number", "Date", "Subtotal", "Discount", "Total"], rows)


def orders_report_csv(db: Session) -> str:
    orders = db.query(Order).all()
    rows = [[o.order_number, o.created_at, o.order_status.value, o.payment_status.value, o.total_amount] for o in orders]
    return _to_csv(["Order Number", "Date", "Order Status", "Payment Status", "Total"], rows)


def customers_report_csv(db: Session) -> str:
    users = db.query(User).join(User.role).filter(User.role.has(name="CUSTOMER")).all()
    rows = [[u.id, u.name, u.email, u.phone or "", u.created_at, "Active" if u.is_active else "Inactive"] for u in users]
    return _to_csv(["ID", "Name", "Email", "Phone", "Joined", "Status"], rows)


def products_report_csv(db: Session) -> str:
    products = db.query(Product).all()
    rows = [[p.id, p.name, p.sku, p.category_id, p.price, p.stock_quantity, "Active" if p.is_active else "Inactive"] for p in products]
    return _to_csv(["ID", "Name", "SKU", "Category ID", "Price", "Stock", "Status"], rows)


def inventory_report_csv(db: Session) -> str:
    inventory = db.query(Inventory).all()
    rows = [[i.product_id, i.quantity, i.low_stock_threshold, i.status] for i in inventory]
    return _to_csv(["Product ID", "Quantity", "Low Stock Threshold", "Status"], rows)
