import json
import secrets
import string
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models.cart import Cart
from app.models.cart_item import CartItem
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.inventory import Inventory
from app.models.user import User
from app.models.enums import OrderStatus, PaymentStatus
from app.schemas.order import OrderCreateRequest
from app.services.email_service import (
    send_order_confirmation_email,
    send_order_status_email,
)


def _generate_order_number() -> str:
    rand = "".join(secrets.choice(string.digits) for _ in range(8))
    return f"SNX-{rand}"


def create_order_from_cart(
    db: Session,
    user: User,
    payload: OrderCreateRequest,
) -> Order:

    # Load user's cart together with cart items and products
    cart = (
        db.query(Cart)
        .options(
            joinedload(Cart.items).joinedload(CartItem.product)
        )
        .filter(Cart.user_id == user.id)
        .first()
    )

    if not cart or not cart.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your cart is empty",
        )

    # Validate stock before creating the order
    for item in cart.items:
        product = item.product

        if not product:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A product in your cart could not be found",
            )

        if not product.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{product.name} is no longer available",
            )

        if product.stock_quantity < item.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Insufficient stock for {product.name}. "
                    f"Only {product.stock_quantity} left."
                ),
            )

    # Calculate subtotal and discount
    subtotal = Decimal("0")
    discount = Decimal("0")
    order_items = []

    for item in cart.items:
        product = item.product

        unit_price = product.price
        line_subtotal = unit_price * item.quantity
        subtotal += line_subtotal

        if product.discount_price:
            discount += (
                unit_price - product.discount_price
            ) * item.quantity

        effective_unit_price = (
            product.discount_price
            if product.discount_price
            else product.price
        )

        order_items.append(
            OrderItem(
                product_id=product.id,
                product_name=product.name,
                unit_price=effective_unit_price,
                quantity=item.quantity,
            )
        )

    total = subtotal - discount

    # Create order
    order = Order(
        order_number=_generate_order_number(),
        user_id=user.id,
        total_amount=total,
        subtotal_amount=subtotal,
        discount_amount=discount,
        payment_status=PaymentStatus.PENDING,
        order_status=OrderStatus.PENDING,
        shipping_address=json.dumps(
            payload.address.model_dump()
        ),
        items=order_items,
    )

    db.add(order)

    # Reduce product stock
    for item in cart.items:
        product = item.product

        product.stock_quantity -= item.quantity

        inventory = (
            db.query(Inventory)
            .filter(
                Inventory.product_id == product.id
            )
            .first()
        )

        if inventory:
            inventory.quantity = product.stock_quantity

    # Clear cart
    for item in list(cart.items):
        db.delete(item)

    try:
        db.commit()
        db.refresh(order)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create order",
        )

    # Send confirmation email
    try:
        send_order_confirmation_email(
            user.email,
            user.name,
            order.order_number,
            str(order.total_amount),
        )
    except Exception:
        # Email failure should not cancel a successfully created order
        pass

    return order


def get_order_or_404(
    db: Session,
    order_id: int,
) -> Order:

    order = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.id == order_id)
        .first()
    )

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    return order


def update_order_status(
    db: Session,
    order_id: int,
    new_status: str,
) -> Order:

    order = get_order_or_404(db, order_id)

    try:
        status_enum = OrderStatus(new_status)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid order status",
        )

    order.order_status = status_enum

    db.commit()
    db.refresh(order)

    user = (
        db.query(User)
        .filter(User.id == order.user_id)
        .first()
    )

    if user:
        try:
            send_order_status_email(
                user.email,
                user.name,
                order.order_number,
                status_enum.value,
            )
        except Exception:
            pass

    return order