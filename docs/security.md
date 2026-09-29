# Security

## Authentication & Passwords

- Passwords are hashed with **bcrypt** via `passlib.CryptContext` — never
  stored or logged in plaintext.
- JWTs are signed with `JWT_SECRET_KEY` (`HS256`) and expire after
  `ACCESS_TOKEN_EXPIRE_MINUTES` (default 60).
- Deactivated accounts (`is_active = false`) are rejected at both login and
  on every subsequent authenticated request.

## Authorization — Backend Is the Source of Truth

**The frontend's route guards (`ProtectedRoute`, `AdminRoute`) are a UX
convenience only.** Every admin-only backend endpoint independently
re-verifies the caller's role by loading the `User` row from the database
via `get_current_user` and checking `user.role.name` — never trusting a
role claim sent by the client. See `app/middleware/auth_middleware.py`.

Concretely: a `CUSTOMER` JWT sent to `POST /api/products` or
`GET /api/admin/customers` receives `HTTP 403`, regardless of what the
frontend does or doesn't render. This is covered by
`backend/tests/test_authorization.py`.

## Input Validation

Every request body is validated by a Pydantic schema before it reaches
business logic (`app/schemas/*`). Invalid input returns `422` with a
structured `{ "field": ..., "message": ... }` list — never a raw
stack trace.

## SQL Injection

All database access goes through SQLAlchemy's ORM/query builder with
parameterized queries. No raw string-interpolated SQL exists anywhere in
the codebase.

## CORS

`app/main.py` configures `CORSMiddleware` with an explicit allow-list
(`settings.cors_origins`, driven by `FRONTEND_URL`) rather than a wildcard,
so only the deployed frontend origin (plus localhost for dev) can call the
API from a browser.

## Secrets Management

- No secrets are hardcoded anywhere in source. All third-party credentials
  (Razorpay, Cloudinary, SMTP, `JWT_SECRET_KEY`, `DATABASE_URL`) are read
  from environment variables via `pydantic-settings` (`app/core/config.py`).
- `.env` is gitignored; only `.env.example` (with empty/placeholder values)
  is committed.
- `RAZORPAY_KEY_SECRET`, `CLOUDINARY_API_SECRET`, and `EMAIL_PASSWORD`
  never leave the backend process — they are never included in any API
  response or sent to the frontend. Only `RAZORPAY_KEY_ID` (a publishable
  key by Razorpay's own design) is exposed to the client, and only inside
  the payment-order-creation response.

## Payment Security

See `docs/payment-workflow.md` for full detail. Summary: card data is
never handled by this application (Razorpay's hosted widget owns that),
and payment status can only become `PAID` after a server-side HMAC-SHA256
signature verification (`hmac.compare_digest`, constant-time) — there is
no client-writable "mark as paid" path.

## Error Handling

A centralized exception handler (`app/middleware/error_handler.py`)
ensures:
- All errors return the consistent shape `{ "success": false, "message": "..." }`.
- Unhandled exceptions are logged server-side with full detail but return
  only a generic `"Internal server error"` message to the client — no
  stack traces, file paths, or internal details are ever leaked externally.

## Logging

`app/main.py` configures structured logging on startup. Explicitly logged:
application startup, whether each optional integration is configured,
failed login attempts (email only), payment signature failures, and
unhandled server errors.

**Never logged**: passwords (plaintext or hashed), `JWT_SECRET_KEY`,
`RAZORPAY_KEY_SECRET`, `CLOUDINARY_API_SECRET`, `EMAIL_PASSWORD`, or full
JWTs.

## Rate Limiting

Not implemented in this MVP (FastAPI has no built-in rate limiter). For a
production deployment, add `slowapi` (Starlette-compatible) or handle it
at the infrastructure layer (Render's edge, a reverse proxy, or an API
gateway) — this is called out as a "where practical" requirement and is a
recommended follow-up rather than a blocking gap.

## Known Limitations (be transparent about these)

- No automated CSRF protection beyond JWT-in-header (standard for a
  token-based SPA API, but worth noting explicitly).
- No account lockout / brute-force throttling on login yet — only logging
  of failed attempts.
- No refresh-token rotation — access tokens are long-lived (60 min default)
  bearer tokens with no revocation list; logging out simply discards the
  token client-side.
