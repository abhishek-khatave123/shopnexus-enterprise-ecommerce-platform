# Architecture

## High-Level Overview

```
Browser (React + Vite SPA)
        |
        | HTTPS / JSON (Axios)
        v
FastAPI REST API  (/api/*)
        |
        v
Service Layer  (app/services/*)
        |
        v
SQLAlchemy ORM  (app/models/*)
        |
        v
PostgreSQL Database
```

External integrations, called only from the service layer (never directly
from API routers or the frontend):

```
FastAPI Service Layer
   |-- Razorpay      (app/services/payment_service.py)
   |-- Cloudinary     (app/services/cloudinary_service.py)
   `-- Email (SMTP)   (app/services/email_service.py)
```

## Layered Backend Design

- **`app/api/`** — FastAPI routers. Thin: parse request, call a service
  function, return a Pydantic response model. No business logic here.
- **`app/services/`** — Business logic: stock validation, order totals,
  payment signature verification, analytics aggregation, etc.
- **`app/models/`** — SQLAlchemy ORM models, one file per table.
- **`app/schemas/`** — Pydantic request/response models. Never expose ORM
  objects directly; every endpoint declares a `response_model`.
- **`app/middleware/`** — Cross-cutting concerns: JWT-based auth resolution,
  role enforcement, and a centralized error handler that returns a
  consistent `{ "success": false, "message": "..." }` shape.
- **`app/core/`** — Configuration (`config.py`), DB session factory
  (`database.py`), and password/JWT helpers (`security.py`).

## Why external services are optional

Razorpay, Cloudinary, and Email are all wrapped by dedicated service
modules that check `settings.<service>_configured` before doing any
network I/O. If credentials are missing:

- `payment_service.create_payment_order()` returns `{"configured": False, "message": "..."}`
  instead of raising, so checkout degrades to "payment unavailable" rather
  than crashing the whole request.
- `cloudinary_service.upload_image()` returns `{"success": False, "message": "..."}`.
- `email_service.*` logs the event and returns `False` instead of raising.

This means the entire application — registration, browsing, cart, checkout,
admin dashboard — works end-to-end in local development with zero
third-party accounts configured. Only the payment/upload/email-sending
steps themselves are affected, and they fail with a clear message rather
than a stack trace.

## Frontend Architecture

```
main.jsx
  -> BrowserRouter
    -> AuthProvider (JWT session, /api/auth/me)
      -> CartProvider (persistent DB-backed cart)
        -> App.jsx (route tree)
          -> CustomerLayout / AdminLayout / AuthLayout
            -> Pages (customer / admin / auth / errors)
              -> Components (product, cart, admin, common)
                -> Services (axios wrappers per resource)
```

- **`context/`** holds global client state (auth session, cart) via React
  Context, avoiding prop drilling.
- **`services/`** is a thin Axios wrapper per backend resource — the only
  place that knows API URLs and payload shapes.
- **`routes/ProtectedRoute.jsx` / `AdminRoute.jsx`** gate navigation in the
  UI, but this is a UX convenience only — see `docs/security.md` for why
  the backend re-verifies authorization independently on every request.

## Request Lifecycle Example (Checkout)

1. Customer submits address → frontend calls `POST /api/orders`.
2. `order_service.create_order_from_cart()` validates stock, computes
   totals, snapshots product prices into `order_items`, decrements
   inventory, clears the cart — all in one DB transaction.
3. Frontend calls `POST /api/payments/create-order` → `payment_service`
   creates a Razorpay order (or returns a "not configured" message).
4. Razorpay Checkout widget collects payment client-side.
5. Frontend calls `POST /api/payments/verify` with the Razorpay response.
6. `payment_service.confirm_payment()` recomputes the HMAC-SHA256
   signature server-side and only then marks the payment `PAID` and the
   order `CONFIRMED`.
7. A confirmation email is sent (or logged, if SMTP isn't configured).
