# Testing Strategy

## Backend (pytest)

Location: `backend/tests/`. Uses an in-memory SQLite database
(`tests/conftest.py`) so tests run without needing a real Postgres
instance, with roles pre-seeded per test via the `db_session` fixture and
FastAPI's dependency override system swapping in the test session.

Run:

```bash
cd backend
pip install -r requirements.txt
pytest -v
```

Covered:

- **`test_auth.py`** — registration (success + duplicate-email rejection),
  login (success + wrong password), `/auth/me` with a valid token.
- **`test_authorization.py`** — a CUSTOMER token hitting `POST /api/products`
  and `GET /api/admin/customers` receives `403`, proving backend-side
  role enforcement (not just frontend route guards).
- **`test_products.py`** — product creation (admin), retrieval, search /
  pagination behavior.
- **`test_cart_and_orders.py`** — add to cart, quantity update, checkout
  creates an order with correct totals, stock is decremented, an
  over-quantity add is rejected with a clear error.

### What's intentionally out of scope for this MVP test suite

Razorpay and Cloudinary calls are not exercised end-to-end in automated
tests since they require real third-party credentials; the "not
configured" code paths (`services/payment_service.py`,
`services/cloudinary_service.py`) are straightforward enough to verify by
inspection and manual testing. A production hardening pass should add
mocked tests for the signature-verification logic specifically
(`payment_service.verify_payment_signature`), since that function is pure
and easy to unit test without hitting Razorpay's API.

## Frontend

No automated frontend test suite is included in this MVP (the spec treats
this as optional — "frontend tests where practical"). Recommended next
step: **Vitest + React Testing Library**, starting with:

- `AuthContext` login/logout state transitions
- `CartContext` add/update/remove reducers
- `Checkout.jsx` step transitions (address → summary → payment → confirmation)

## Manual QA Checklist

- [ ] Register as a new customer, confirm a `Cart` is auto-created
- [ ] Browse products, use search + category + price filters + sorting
- [ ] Add items to cart from both the Products grid and Product Details page
- [ ] Attempt to add more than available stock — should be rejected
- [ ] Complete checkout with a shipping address
- [ ] If Razorpay isn't configured, confirm the checkout page shows a
      clear "payment unavailable" message rather than crashing
- [ ] Log in as `admin@shopnexus.com`, confirm the dashboard shows
      non-fabricated numbers matching what's actually in the database
- [ ] Create/edit/delete a product as admin; confirm it appears/disappears
      on the customer-facing product list
- [ ] Attempt admin-only actions with a customer JWT via a tool like
      Postman — confirm `403`, not `200`
- [ ] Download each CSV report from the admin Reports page and confirm the
      row counts match the database
