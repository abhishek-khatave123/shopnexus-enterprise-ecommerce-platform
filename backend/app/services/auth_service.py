import logging

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password, create_access_token
from app.models.user import User
from app.models.role import Role
from app.models.cart import Cart
from app.schemas.auth import RegisterRequest, LoginRequest
from app.services.email_service import send_welcome_email

logger = logging.getLogger("shopnexus")


def register_user(db: Session, payload: RegisterRequest) -> User:
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is already registered")

    customer_role = db.query(Role).filter(Role.name == "CUSTOMER").first()
    if not customer_role:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Roles not seeded")

    user = User(
        name=payload.name,
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        phone=payload.phone,
        role_id=customer_role.id,
        is_active=True,
    )
    db.add(user)
    db.flush()

    # Every customer gets a persistent cart created at registration.
    db.add(Cart(user_id=user.id))
    db.commit()
    db.refresh(user)

    send_welcome_email(user.email, user.name)
    logger.info("New user registered: user_id=%s", user.id)
    return user


def authenticate_user(db: Session, payload: LoginRequest) -> User:
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        logger.warning("Failed login attempt for email=%s", payload.email)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated")
    return user


def issue_token(user: User) -> str:
    return create_access_token(subject=str(user.id), role=user.role.name)
