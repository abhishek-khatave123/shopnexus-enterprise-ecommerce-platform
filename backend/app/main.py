import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.config import settings
from app.middleware.error_handler import register_error_handlers
from app.api import (
    auth,
    users,
    products,
    categories,
    cart,
    orders,
    payments,
    customers,
    uploads,
    analytics,
    reports,
    notifications,
    reviews,
    admin,
    inventory,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("shopnexus")

app = FastAPI(
    title="ShopNexus API",
    description="Enterprise E-Commerce & Analytics Platform API",
    version="1.0.0",
    docs_url="/docs",
    openapi_url="/openapi.json",
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next) -> Response:
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if settings.ENVIRONMENT == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
)

register_error_handlers(app)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(products.router)
app.include_router(categories.router)
app.include_router(cart.router)
app.include_router(orders.router)
app.include_router(payments.router)
app.include_router(customers.router)
app.include_router(uploads.router)
app.include_router(analytics.router)
app.include_router(reports.router)
app.include_router(notifications.router)
app.include_router(reviews.router)
app.include_router(admin.router)
app.include_router(inventory.router)


@app.get("/api/health", tags=["Health"], summary="Health check")
def health_check():
    return {"status": "ok", "message": "API is running!"}


@app.on_event("startup")
def on_startup():
    logger.info("ShopNexus API starting up | environment=%s", settings.ENVIRONMENT)
    logger.info("Razorpay configured: %s", settings.razorpay_configured)
    logger.info("Cloudinary configured: %s", settings.cloudinary_configured)
    logger.info("Email configured: %s", settings.email_configured)
