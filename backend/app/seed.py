"""
Database seed script.

Usage:
    python -m app.seed

Creates roles, a demo admin, a demo customer, categories, products,
inventory rows, carts, and one sample order so the app has data to look at
immediately after setup.

IMPORTANT: the credentials below are for LOCAL DEVELOPMENT ONLY.
Never use these in production.
"""

import json
import logging

from app.core.database import SessionLocal, engine, Base
from app.core.security import hash_password
from app import models  # noqa: F401 ensures models are registered
from app.models.role import Role
from app.models.user import User
from app.models.category import Category
from app.models.product import Product
from app.models.product_image import ProductImage
from app.models.inventory import Inventory
from app.models.cart import Cart
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.enums import OrderStatus, PaymentStatus

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("shopnexus.seed")

DEMO_PASSWORD = "Passw0rd!123"
DEMO_ADMIN_EMAIL = "admin@shopnexus.com"
DEMO_CUSTOMER_EMAIL = "customer@shopnexus.com"
LEGACY_DEMO_ADMIN_EMAIL = "admin@shopnexus.local"
LEGACY_DEMO_CUSTOMER_EMAIL = "customer@shopnexus.local"


def _ensure_demo_user(db, roles, role_name, target_email, legacy_email, display_name):
    user = db.query(User).filter(
        User.email.in_([target_email, legacy_email])
    ).first()

    if not user:
        user = User(
            name=display_name,
            email=target_email,
            password_hash=hash_password(DEMO_PASSWORD),
            role_id=roles[role_name].id,
            is_active=True,
        )

        db.add(user)
        db.flush()
        logger.info("Created demo user: %s", target_email)

    elif user.email != target_email:
        user.email = target_email
        logger.info(
            "Updated demo user email from %s to %s",
            legacy_email,
            target_email,
        )

    cart = db.query(Cart).filter(Cart.user_id == user.id).first()
    if not cart:
        db.add(Cart(user_id=user.id))
        logger.info("Created cart for demo user: %s", target_email)

    db.flush()
    return user


def run():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Roles
        role_names = ["CUSTOMER", "ADMIN", "SUPER_ADMIN"]
        roles = {}

        for name in role_names:
            role = db.query(Role).filter(Role.name == name).first()

            if not role:
                role = Role(name=name)
                db.add(role)
                db.flush()

            roles[name] = role

        db.commit()

        # Admin user
        admin = _ensure_demo_user(
            db,
            roles,
            "SUPER_ADMIN",
            DEMO_ADMIN_EMAIL,
            LEGACY_DEMO_ADMIN_EMAIL,
            "ShopNexus Admin",
        )

        # Customer user
        customer = _ensure_demo_user(
            db,
            roles,
            "CUSTOMER",
            DEMO_CUSTOMER_EMAIL,
            LEGACY_DEMO_CUSTOMER_EMAIL,
            "Demo Customer",
        )

        db.commit()

        # Categories
        category_defs = [
            (
                "Electronics",
                "electronics",
                "Phones, laptops, gadgets and accessories",
            ),
            (
                "Fashion",
                "fashion",
                "Clothing, footwear and accessories",
            ),
            (
                "Home & Kitchen",
                "home-kitchen",
                "Furniture, appliances and kitchenware",
            ),
            (
                "Books",
                "books",
                "Fiction, non-fiction and educational books",
            ),
            (
                "Sports & Fitness",
                "sports-fitness",
                "Sportswear, equipment and fitness gear",
            ),
        ]

        categories = {}

        for name, slug, desc in category_defs:
            cat = db.query(Category).filter(
                Category.slug == slug
            ).first()

            if not cat:
                cat = Category(
                    name=name,
                    slug=slug,
                    description=desc,
                )

                db.add(cat)
                db.flush()

            categories[slug] = cat

        db.commit()

        # Products
        product_defs = [
            (
                "Wireless Bluetooth Headphones",
                "electronics",
                2999.00,
                2499.00,
                "ELEC-HP-001",
                "SoundMax",
                50,
                "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
            ),
            (
                "Smartphone 128GB",
                "electronics",
                24999.00,
                22999.00,
                "ELEC-PH-002",
                "Nexowave",
                25,
                "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80",
            ),
            (
                "Laptop Backpack",
                "fashion",
                1499.00,
                None,
                "FASH-BP-003",
                "UrbanGear",
                100,
                "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80",
            ),
            (
                "Men's Running Shoes",
                "sports-fitness",
                3499.00,
                2799.00,
                "SPRT-SH-004",
                "FlexRun",
                60,
                "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80",
            ),
            (
                "Non-Stick Cookware Set",
                "home-kitchen",
                3999.00,
                None,
                "HOME-CK-005",
                "ChefPro",
                40,
                "https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=800&q=80",
            ),
            (
                "Yoga Mat Premium",
                "sports-fitness",
                899.00,
                699.00,
                "SPRT-YM-006",
                "FlexRun",
                80,
                "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?auto=format&fit=crop&w=800&q=80",
            ),
            (
                "The Art of Clean Code (Book)",
                "books",
                599.00,
                None,
                "BOOK-CC-007",
                "TechPress",
                120,
                "https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=800&q=80",
            ),
            (
                "Smart LED Desk Lamp",
                "electronics",
                1299.00,
                999.00,
                "ELEC-LP-008",
                "Brightly",
                70,
                "https://images.unsplash.com/photo-1534073828943-f801091bb18c?auto=format&fit=crop&w=800&q=80",
            ),
            (
                "Cotton Casual T-Shirt",
                "fashion",
                799.00,
                None,
                "FASH-TS-009",
                "UrbanGear",
                150,
                "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80",
            ),
            (
                "Stainless Steel Water Bottle",
                "home-kitchen",
                549.00,
                None,
                "HOME-WB-010",
                "ChefPro",
                200,
                "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=800&q=80",
            ),
            (
                "4K Action Camera",
                "electronics",
                8999.00,
                7999.00,
                "ELEC-CAM-011",
                "Nexowave",
                15,
                "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80",
            ),
            (
                "Office Ergonomic Chair",
                "home-kitchen",
                7499.00,
                6499.00,
                "HOME-CH-012",
                "ComfortSit",
                20,
                "https://images.unsplash.com/photo-1589578228447-e1a4e481c6c8?auto=format&fit=crop&w=800&q=80",
            ),
        ]

        for (
            name,
            cat_slug,
            price,
            discount,
            sku,
            brand,
            stock,
            image_url,
        ) in product_defs:

            existing = db.query(Product).filter(
                Product.sku == sku
            ).first()

            if existing:
                if not existing.images:
                    db.add(ProductImage(product_id=existing.id, image_url=image_url))
                continue

            slug = (
                name.lower()
                .replace(" ", "-")
                .replace("(", "")
                .replace(")", "")
                .replace("'", "")
            )

            product = Product(
                name=name,
                slug=slug,
                description=(
                    f"{name} - high quality product from {brand}. "
                    "Great value and reliable performance."
                ),
                price=price,
                discount_price=discount,
                sku=sku,
                category_id=categories[cat_slug].id,
                brand=brand,
                stock_quantity=stock,
                is_active=True,
            )

            db.add(product)
            db.flush()

            db.add(ProductImage(product_id=product.id, image_url=image_url))

            db.add(
                Inventory(
                    product_id=product.id,
                    quantity=stock,
                    low_stock_threshold=10,
                )
            )

        # Ensure any existing product in DB without images gets an appropriate image
        all_products = db.query(Product).all()
        fallback_images = {
            "WH-BT-001": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
        }
        for p in all_products:
            if not p.images and p.sku in fallback_images:
                db.add(ProductImage(product_id=p.id, image_url=fallback_images[p.sku]))

        db.commit()

        db.commit()

        logger.info(
            "Seeded %d categories and product catalog",
            len(category_defs),
        )

        # Sample order for the demo customer
        # Check the unique order number so the seed script
        # can safely run multiple times.
        if not db.query(Order).filter(
            Order.order_number == "SNX-10000001"
        ).first():

            sample_product = db.query(Product).filter(
                Product.sku == "ELEC-HP-001"
            ).first()

            if sample_product:
                order = Order(
                    order_number="SNX-10000001",
                    user_id=customer.id,
                    total_amount=sample_product.effective_price,
                    subtotal_amount=sample_product.price,
                    discount_amount=(
                        sample_product.price
                        - sample_product.effective_price
                    ),
                    payment_status=PaymentStatus.PAID,
                    order_status=OrderStatus.DELIVERED,
                    shipping_address=json.dumps(
                        {
                            "full_name": "Demo Customer",
                            "phone": "9999999999",
                            "line1": "123 Demo Street",
                            "city": "Bengaluru",
                            "state": "Karnataka",
                            "postal_code": "560001",
                            "country": "India",
                        }
                    ),
                )

                order.items = [
                    OrderItem(
                        product_id=sample_product.id,
                        product_name=sample_product.name,
                        unit_price=sample_product.effective_price,
                        quantity=1,
                    )
                ]

                db.add(order)
                db.commit()

                logger.info(
                    "Seeded sample delivered order for demo customer"
                )

        logger.info("=" * 60)
        logger.info("SEED COMPLETE")
        logger.info(
            "Admin login:    %s / %s",
            DEMO_ADMIN_EMAIL,
            DEMO_PASSWORD,
        )
        logger.info(
            "Customer login: %s / %s",
            DEMO_CUSTOMER_EMAIL,
            DEMO_PASSWORD,
        )
        logger.info(
            "These are DEVELOPMENT-ONLY credentials. "
            "Do not use in production."
        )
        logger.info("=" * 60)

    finally:
        db.close()


if __name__ == "__main__":
    run()