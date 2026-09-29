from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.user import User
from app.models.cart import Cart
from app.models.cart_item import CartItem
from app.models.product import Product
from app.schemas.cart import CartItemAdd, CartItemUpdate, CartOut, CartItemOut
from app.schemas.common import MessageResponse

router = APIRouter(prefix="/api/cart", tags=["Cart"])


def _get_or_create_cart(db: Session, user: User) -> Cart:
    cart = db.query(Cart).options(joinedload(Cart.items).joinedload(CartItem.product)).filter(Cart.user_id == user.id).first()
    if not cart:
        cart = Cart(user_id=user.id)
        db.add(cart)
        db.commit()
        db.refresh(cart)
    return cart


def _serialize(cart: Cart) -> CartOut:
    items_out = []
    subtotal = Decimal("0")
    discount = Decimal("0")
    for item in cart.items:
        product = item.product
        line_total = product.effective_price * item.quantity
        subtotal += product.price * item.quantity
        if product.discount_price:
            discount += (product.price - product.discount_price) * item.quantity
        items_out.append(CartItemOut(id=item.id, product=product, quantity=item.quantity, line_total=line_total))
    return CartOut(id=cart.id, items=items_out, subtotal=subtotal, discount=discount, total=subtotal - discount)


@router.get("", response_model=CartOut, summary="Get the current user's cart")
def get_cart(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cart = _get_or_create_cart(db, current_user)
    return _serialize(cart)


@router.post("/items", response_model=CartOut, summary="Add an item to the cart")
def add_item(payload: CartItemAdd, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cart = _get_or_create_cart(db, current_user)
    product = db.query(Product).filter(Product.id == payload.product_id).first()
    if not product or not product.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    existing = db.query(CartItem).filter(CartItem.cart_id == cart.id, CartItem.product_id == product.id).first()
    new_qty = (existing.quantity if existing else 0) + payload.quantity
    if new_qty > product.stock_quantity:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Only {product.stock_quantity} units available")

    if existing:
        existing.quantity = new_qty
    else:
        db.add(CartItem(cart_id=cart.id, product_id=product.id, quantity=payload.quantity))
    db.commit()

    cart = _get_or_create_cart(db, current_user)
    return _serialize(cart)


@router.put("/items/{item_id}", response_model=CartOut, summary="Update cart item quantity")
def update_item(item_id: int, payload: CartItemUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cart = _get_or_create_cart(db, current_user)
    item = db.query(CartItem).filter(CartItem.id == item_id, CartItem.cart_id == cart.id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart item not found")
    if payload.quantity > item.product.stock_quantity:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Only {item.product.stock_quantity} units available")
    item.quantity = payload.quantity
    db.commit()

    cart = _get_or_create_cart(db, current_user)
    return _serialize(cart)


@router.delete("/items/{item_id}", response_model=CartOut, summary="Remove an item from the cart")
def remove_item(item_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cart = _get_or_create_cart(db, current_user)
    item = db.query(CartItem).filter(CartItem.id == item_id, CartItem.cart_id == cart.id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart item not found")
    db.delete(item)
    db.commit()

    cart = _get_or_create_cart(db, current_user)
    return _serialize(cart)


@router.delete("", response_model=MessageResponse, summary="Clear the entire cart")
def clear_cart(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cart = _get_or_create_cart(db, current_user)
    for item in list(cart.items):
        db.delete(item)
    db.commit()
    return MessageResponse(message="Cart cleared")
