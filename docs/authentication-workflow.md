# Authentication Workflow

## Registration

1. `POST /api/auth/register` with `{ name, email, password, phone? }`.
2. Backend checks the email is not already registered.
3. Password is hashed with **bcrypt** (via `passlib`) — the plaintext
   password is never stored or logged.
4. A new `User` row is created with `role_id` pointing at the `CUSTOMER`
   role (customers can never self-assign ADMIN/SUPER_ADMIN).
5. A persistent `Cart` row is created for the user immediately.
6. A welcome email is sent (or logged, if SMTP isn't configured).
7. A JWT access token is issued and returned to the client.

## Login

1. `POST /api/auth/login` with `{ email, password }`.
2. Backend looks up the user by email, verifies the password against the
   stored bcrypt hash with `passlib.CryptContext.verify`.
3. Failed attempts are logged (email only — never the password) for basic
   auditability.
4. Deactivated accounts (`is_active = false`) are rejected with 403, even
   with a correct password.
5. A JWT is issued: `{ sub: user_id, role: role_name, exp: ... }`, signed
   with `JWT_SECRET_KEY` using `HS256`.

## Using the token

The frontend stores the JWT in `localStorage` and attaches it as
`Authorization: Bearer <token>` on every request via an Axios request
interceptor (`frontend/src/services/api.js`). On a 401 response, the
interceptor clears the token and redirects to `/login`.

## Backend verification (every protected request)

`app/middleware/auth_middleware.py`:

1. `get_current_user` decodes the JWT and loads the corresponding `User`
   row fresh from the database — the role used for authorization is
   **always the current DB value**, never a claim blindly trusted from the
   token or from anything the frontend sends.
2. `require_roles(*roles)` (aliased as `require_admin`, `require_super_admin`)
   wraps `get_current_user` and raises `403` if the user's current role
   isn't in the allowed set.

This means even if a customer's browser is tampered with to claim
`role: ADMIN` in local state, every admin-only backend endpoint
independently re-checks the role from the database and returns `403`.

## Password Reset

1. `POST /api/auth/forgot-password` with `{ email }`.
2. Always returns the same generic message
   (`"If that email is registered, a password reset link has been sent."`)
   regardless of whether the email exists — this prevents account
   enumeration.
3. If the email does correspond to an active user, a short-lived JWT
   (`purpose: password_reset`) is embedded in a reset link and emailed (or
   logged, if SMTP isn't configured).

## Current User Endpoint

`GET /api/auth/me` returns the authenticated user's profile, resolved the
same way as every other protected endpoint — via `get_current_user`.
