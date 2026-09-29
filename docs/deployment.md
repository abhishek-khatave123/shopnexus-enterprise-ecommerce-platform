# Deployment Guide

Target: **Frontend → Vercel**, **Backend → Render**, **Database → Render
PostgreSQL (or Supabase-compatible Postgres)**.

## 1. GitHub Setup

```bash
cd shopnexus-enterprise-ecommerce-platform
git init
git add .
git commit -m "Initial commit: ShopNexus enterprise e-commerce platform"
git branch -M main
git remote add origin https://github.com/<your-username>/shopnexus-enterprise-ecommerce-platform.git
git push -u origin main
```

`.env` files are already excluded via `.gitignore` — only `.env.example`
files are committed. **Never commit real secrets.**

## 2. PostgreSQL Setup (Render or Supabase)

**Render:**
1. Render Dashboard → New → PostgreSQL.
2. Choose a name, region, and plan.
3. Once provisioned, copy the **Internal Database URL** (for the backend
   service, same region) or **External Database URL** (for local access).

**Supabase-compatible alternative:** create a project, copy the connection
string from Project Settings → Database.

Either way, the resulting string is your `DATABASE_URL`:
`postgresql://user:password@host:port/dbname`

## 3. Backend Deployment (Render)

1. Render Dashboard → New → Web Service → connect your GitHub repo.
2. Root directory: `backend`
3. Build command: `pip install -r requirements.txt`
4. Start command: `alembic upgrade head && python -m app.seed && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   (drop `python -m app.seed` after the first deploy if you don't want
   demo data re-seeded on every restart — the seed script is idempotent
   but unnecessary after initial setup).
5. Environment variables (Render → Environment tab) — see section 4.
6. Deploy. Confirm `https://<your-backend>.onrender.com/api/health` returns
   `{"status": "ok", ...}` and `/docs` loads.

## 4. Environment Variables (Backend, on Render)

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | From step 2 |
| `JWT_SECRET_KEY` | Yes | Long random string — generate with `openssl rand -hex 32` |
| `JWT_ALGORITHM` | No | Defaults to `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | Defaults to `60` |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | No | Leave blank to disable payments |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | No | Leave blank to disable image upload |
| `EMAIL_HOST` / `_PORT` / `_USERNAME` / `_PASSWORD` / `_FROM` | No | Leave blank to disable email sending (events are logged) |
| `FRONTEND_URL` | Yes | Your deployed Vercel URL, e.g. `https://shopnexus.vercel.app` — used for CORS and password-reset links |
| `ENVIRONMENT` | No | `production` |

## 5. Frontend Deployment (Vercel)

1. Vercel Dashboard → Add New Project → import the same GitHub repo.
2. Root directory: `frontend`
3. Framework preset: Vite (auto-detected).
4. Build command: `npm run build` (default). Output directory: `dist`.
5. Environment variables (Vercel → Settings → Environment Variables):

| Variable | Value |
|---|---|
| `VITE_API_URL` | Your Render backend URL, e.g. `https://shopnexus-api.onrender.com` |
| `VITE_RAZORPAY_KEY_ID` | Your Razorpay publishable key (if payments are enabled) |

6. Deploy. Vercel gives you a `https://<project>.vercel.app` URL.

## 6. CORS Configuration

Set the backend's `FRONTEND_URL` env var to your exact Vercel URL. The
backend's CORS middleware (`app/main.py`) reads `settings.cors_origins`,
which includes `FRONTEND_URL` plus localhost defaults for local dev. If you
add a custom domain later, update `FRONTEND_URL` (or extend
`Settings.cors_origins` in `app/core/config.py` to accept a list).

## 7. Razorpay Configuration (Production)

1. Create a live Razorpay account, complete KYC.
2. Dashboard → Settings → API Keys → generate a **live** key pair.
3. Set `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` on Render (backend) and
   `VITE_RAZORPAY_KEY_ID` on Vercel (frontend, publishable key only).
4. Test with a small real transaction before going fully live.

## 8. Cloudinary Configuration (Production)

1. Create a Cloudinary account.
2. Dashboard → copy Cloud Name, API Key, API Secret.
3. Set `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET`
   on Render.

## 9. Email Configuration (Production)

Any SMTP provider works (SendGrid, Mailgun, Amazon SES, Gmail with an app
password, etc.). Set `EMAIL_HOST`, `EMAIL_PORT` (usually `587` for STARTTLS),
`EMAIL_USERNAME`, `EMAIL_PASSWORD`, `EMAIL_FROM` on Render.

## 10. Production Testing Checklist

- [ ] `GET /api/health` returns 200
- [ ] `/docs` loads and lists all routers
- [ ] Register + login flow works end-to-end on the live frontend
- [ ] Browsing products/categories works (data comes from Postgres, not
      mocked)
- [ ] Add to cart → checkout → Razorpay widget opens (if configured) →
      payment verifies → order shows `CONFIRMED`
- [ ] Admin login → dashboard shows real (non-zero after a test order)
      analytics
- [ ] A non-admin JWT against `POST /api/products` returns `403`
- [ ] CORS: frontend can call the backend without browser console errors
- [ ] Image upload works (if Cloudinary configured) or shows a clear
      "not configured" message (if not)
