import logging

from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token
from app.middleware.auth_middleware import get_current_user
from app.models.user import User
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, CurrentUserResponse
from app.schemas.common import MessageResponse
from app.services import auth_service
from app.services.email_service import send_password_reset_email

logger = logging.getLogger("shopnexus")

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


@router.post("/register", response_model=TokenResponse, status_code=201, summary="Register a new customer account")
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    user = auth_service.register_user(db, payload)
    token = auth_service.issue_token(user)
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse, summary="Login and receive a JWT access token")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = auth_service.authenticate_user(db, payload)
    token = auth_service.issue_token(user)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=CurrentUserResponse, summary="Get the currently authenticated user")
def me(current_user: User = Depends(get_current_user)):
    return CurrentUserResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        phone=current_user.phone,
        role=current_user.role.name,
        is_active=current_user.is_active,
    )


@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    summary="Request a password reset email",
)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Always returns a generic success message, whether or not the email is
    registered, so this endpoint can never be used to enumerate accounts.
    If email is not configured, the reset link is logged instead of sent
    (see email_service), which keeps local development functional.
    """
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if user and user.is_active:
        reset_token = create_access_token(subject=str(user.id), role=user.role.name, extra_claims={"purpose": "password_reset"})
        reset_link = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?token={reset_token}"
        send_password_reset_email(user.email, user.name, reset_link)
        logger.info("Password reset requested for user_id=%s", user.id)
    return MessageResponse(message="If that email is registered, a password reset link has been sent.")
