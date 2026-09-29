# ShopNexus — Enterprise E-Commerce & Analytics Platform

A full-stack e-commerce platform built with **React + Vite** on the
frontend and **FastAPI + PostgreSQL** on the backend, featuring real
authentication, role-based access control, a database-backed cart and
checkout flow, Razorpay payments, Cloudinary image uploads, email
notifications, and an admin dashboard with analytics computed live from
the database.

> **Honesty note on scope**: This project was generated end-to-end by an AI
> assistant working inside a sandboxed container with **no internet
> access**, so while every backend file was syntax-checked
> (`python -m py_compile`) and every frontend file was syntax- and
> import-checked (`esbuild` + a custom import-resolution script), **neither
> the backend nor the frontend could be installed and run for a true
> end-to-end smoke test** in that environment. Follow the setup steps below
> in your own machine to do that final verification — see
> `docs/testing.md` for a manual QA checklist to run through.

## Features

- Secure authentication (JWT, bcrypt password hashing)
- Role-based access control (`CUSTOMER`, `ADMIN`, `SUPER_ADMIN`) — enforced
  on the backend, not just hidden in the UI
- Product catalog with search, category/price filters, sorting, pagination
- Persistent, database-backed shopping cart with stock validation
- 4-step checkout (address → summary → payment → confirmation)
- Razorpay payment integration with server-side signature verification
- Cloudinary product image uploads (admin-only)
- Email notifications (registration, order confirmation, payment, status
  changes, password reset) — logs instead of crashing when SMTP isn't set up
- Admin dashboard: revenue/orders/customers/products summary, charts
  (Recharts), recent orders, top products, low-stock alerts
- Admin management: products, categories, inventory, orders, customers,
  payments
- Analytics computed from real SQL aggregations — no hardcoded numbers
- CSV report exports (sales, orders, customers, products, inventory)
- Product reviews (only for delivered orders, one review per order/product)

## Technology Stack

**Frontend**: React 18, Vite, Tailwind CSS, React Router, Axios, Recharts,
React Hook Form

**Backend**: Python, FastAPI, SQLAlchemy, Pydantic, PostgreSQL, JWT
(python-jose), passlib/bcrypt, Alembic

**Payments**: Razorpay · **Storage**: Cloudinary · **Email**: SMTP

**Dev/Ops**: Docker, Docker Compose, pytest, Alembic migrations

## Architecture

See [`docs/architecture.md`](docs/architecture.md) for the full breakdown.
Short version:

```
React (Vite SPA) --HTTPS/JSON--> FastAPI (/api/*) --> Service Layer --> SQLAlchemy --> PostgreSQL
                                                          |
                                          Razorpay / Cloudinary / SMTP (all optional)
```

## Folder Structure

```
shopnexus-enterprise-ecommerce-platform/
├── frontend/           React + Vite SPA
│   └── src/
│       ├── components/ (common, navbar, footer, product, cart, admin, forms, analytics)
│       ├── pages/       (auth, customer, admin, errors)
│       ├── layouts/     (CustomerLayout, AdminLayout, AuthLayout)
│       ├── context/     (AuthContext, CartContext)
│       ├── services/    (Axios wrappers per API resource)
│       └── routes/      (ProtectedRoute, AdminRoute)
├── backend/             FastAPI application
│   └── app/
│       ├── api/         routers (thin — parse request, call service, return schema)
│       ├── core/        config, database, security
│       ├── models/      SQLAlchemy ORM models
│       ├── schemas/     Pydantic request/response models
│       ├── services/    business logic (incl. Razorpay/Cloudinary/Email)
│       ├── middleware/  auth resolution, role checks, error handler
│       └── main.py
│   ├── alembic/         migrations
│   └── tests/           pytest suite (SQLite in-memory)
├── docs/                 architecture, schema, API, workflows, deployment, security...
├── screenshots/
├── tests/                (reserved for cross-stack/e2e tests)
├── docker-compose.yml
└── README.md              (this file)
```

## Database Schema

Full column-by-column documentation: [`docs/database-schema.md`](docs/database-schema.md).
14 tables: `users`, `roles`, `categories`, `products`, `product_images`,
`inventory`, `carts`, `cart_items`, `addresses`, `orders`, `order_items`,
`payments`, `reviews`, `notifications`.

## Installation & Local Development

### Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL 14+ (or use the provided Docker Compose setup)
- (Optional) Razorpay, Cloudinary, and SMTP accounts for full functionality

### Option A — Docker Compose (recommended, easiest)

```bash
cd shopnexus-enterprise-ecommerce-platform
docker compose up --build
```

This starts PostgreSQL, seeds demo data, and runs both the backend
(`http://localhost:8000`) and frontend (`http://localhost:5173`) with hot
reload. To enable Razorpay/Cloudinary/Email, export the relevant variables
before running `docker compose up` (see `docker-compose.yml` — it passes
them through from your shell environment), e.g.:

```bash
export RAZORPAY_KEY_ID=rzp_test_xxxxx
export RAZORPAY_KEY_SECRET=xxxxx
docker compose up --build
```

### Option B — Manual Setup

**1. PostgreSQL**

Create a local database (or use Docker just for Postgres:
`docker run -d -p 5432:5432 -e POSTGRES_USER=shopnexus -e POSTGRES_PASSWORD=shopnexus -e POSTGRES_DB=shopnexus postgres:16-alpine`).

**2. Backend**

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env: set DATABASE_URL at minimum. Razorpay/Cloudinary/Email are optional.

alembic upgrade head             # run migrations
python -m app.seed               # seed demo data (roles, admin, customer, products...)

uvicorn app.main:app --reload    # http://localhost:8000
```

**3. Frontend**

```bash
cd frontend
cp .env.example .env
# VITE_API_URL=http://localhost:8000 by default

npm install
npm run dev                       # http://localhost:5173
```

### Environment Variables

See `backend/.env.example` and `frontend/.env.example` for the full list.
Key point: **every third-party integration (Razorpay, Cloudinary, Email)
is optional.** The app starts and runs fully for browsing, cart, and
checkout (up to the payment step) without any of them configured; each
service returns a clear, non-crashing message when its credentials are
missing rather than failing silently or throwing a 500.

### Database Migrations (Alembic)

```bash
cd backend
alembic upgrade head       # apply all migrations
alembic downgrade -1       # roll back one migration
alembic revision --autogenerate -m "description"   # create a new migration after model changes
```

### Seed Data & Demo Credentials

```bash
python -m app.seed
```

| Role | Email | Password |
|---|---|---|
| Super Admin | `admin@shopnexus.com` | `Passw0rd!123` |
| Customer | `customer@shopnexus.com` | `Passw0rd!123` |

**These are local-development-only credentials. Never use them in
production** — change or remove the seed script's demo accounts before
deploying, and always set a strong, unique `JWT_SECRET_KEY`.

## API Documentation

Once the backend is running:
- Swagger UI: **http://localhost:8000/docs**
- OpenAPI JSON: **http://localhost:8000/openapi.json**
- Quick reference: [`docs/api-documentation.md`](docs/api-documentation.md)

## Authentication

JWT-based, bcrypt password hashing, role-based authorization re-verified
on every backend request (never trusts the frontend). Full detail:
[`docs/authentication-workflow.md`](docs/authentication-workflow.md).

## Payment Integration

Razorpay, with server-side HMAC-SHA256 signature verification before any
payment is marked `PAID`. Full detail:
[`docs/payment-workflow.md`](docs/payment-workflow.md).

## Cloudinary Integration

Admin-only product image uploads via `POST /api/uploads/product-image`.
Returns a clear `503` with an explanatory message if Cloudinary isn't
configured, instead of crashing.

## Email Configuration

SMTP-based; every event (`registration`, `order confirmation`, `payment
confirmation`, `order status change`, `password reset`) is logged locally
when SMTP isn't configured, so local development never breaks on missing
email credentials.

## Testing

```bash
cd backend
pytest -v
```

See [`docs/testing.md`](docs/testing.md) for what's covered and a manual
QA checklist.

## Build Commands

```bash
# Frontend production build
cd frontend && npm run build     # outputs to frontend/dist

# Backend — no build step; runs directly via uvicorn/gunicorn in production
```

## Deployment

Full step-by-step guide: [`docs/deployment.md`](docs/deployment.md)
(Frontend → Vercel, Backend → Render, Database → Render/Supabase-compatible
PostgreSQL).

## Performance

Indexed queries, pagination everywhere, `joinedload()` to avoid N+1 queries,
SQL-level aggregation for analytics. Full detail:
[`docs/performance.md`](docs/performance.md).

## Security

Backend-enforced authorization, bcrypt hashing, parameterized queries via
the ORM, no secrets in source or in the frontend bundle, centralized error
handling with no leaked stack traces. Full detail, including known
limitations: [`docs/security.md`](docs/security.md).

## Screenshots

See `screenshots/` — add your own once the app is running locally
(`docker compose up` then visit `http://localhost:5173`).

## Future Improvements

- Refresh-token rotation and token revocation
- Rate limiting (e.g. `slowapi`) on auth and payment endpoints
- Redis caching for read-heavy endpoints
- Wishlist / saved-for-later
- Multi-currency and multi-language support
- PDF report generation alongside the existing CSV exports
- Automated frontend test suite (Vitest + React Testing Library)
- Inventory history / audit log table

## Author / Project Information

Generated as a complete, runnable reference implementation of an
enterprise-style e-commerce platform for educational and portfolio
purposes. Not production-hardened out of the box — review
[`docs/security.md`](docs/security.md)'s "Known Limitations" section and
run through [`docs/testing.md`](docs/testing.md)'s manual QA checklist
before using this as a real production system.
