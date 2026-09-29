# Performance

## Database

- **Indexes** on every high-traffic lookup/filter/sort column: `users.email`,
  `products.sku`, `products.name`, `products.category_id`,
  `orders.order_number`, `orders.user_id`, `orders.created_at`, both status
  enums, and a composite `(products.category_id, products.is_active)`
  index for the most common customer query (browsing an active category).
- **Pagination everywhere**: product listing, admin customer listing, and
  reports all use `LIMIT`/`OFFSET` via SQLAlchemy `.offset().limit()`
  rather than loading full tables into memory.
- **Avoiding N+1 queries**: `joinedload()` is used wherever a list endpoint
  also needs a related collection — e.g. `Cart.items -> CartItem.product`
  in `app/api/cart.py`, `Order.items` in `app/api/orders.py` and
  `app/api/admin.py`, `Inventory.product` in `app/api/inventory.py`.
- **Efficient aggregation**: analytics use SQL-level `GROUP BY`/`SUM`/`COUNT`
  (`app/services/analytics_service.py`) rather than fetching rows into
  Python and aggregating in application code.
- **Numeric precision**: `Numeric(12,2)` for all monetary columns avoids
  floating-point rounding errors in totals.

## Backend (FastAPI)

- Pydantic `response_model`s on every endpoint control exactly what's
  serialized, avoiding accidental over-fetching of relationship data.
- Stateless JWT auth — no server-side session store to scale, sessions
  scale horizontally with the API process.
- Database sessions are request-scoped via FastAPI's `Depends(get_db)` and
  always closed in a `finally` block.

## Frontend (React + Vite)

- **Route-level structure**: pages are split by route
  (`pages/customer/*`, `pages/admin/*`) which is a natural boundary for
  adding `React.lazy()` code-splitting as the app grows — each page is
  already its own module, so wrapping the route element in the router
  with `lazy(() => import('./pages/...'))` is a drop-in change if bundle
  size becomes a concern.
- **Pagination** on the Products page and every admin list, avoiding
  rendering thousands of DOM nodes at once.
- **Debounced-free but deliberate search**: search is submit-triggered
  (not on every keystroke) to avoid firing a request per character.
- **Reusable components** (`ProductCard`, `DataTable`, `Pagination`,
  `LoadingSpinner`, `EmptyState`, `ErrorMessage`) keep bundle size down by
  avoiding duplicated markup/logic across pages.
- **Avoiding unnecessary API calls**: `CartContext` and `AuthContext`
  cache session/cart state in React state rather than re-fetching on every
  navigation; components re-fetch only when their own route/params change
  (see the `useCallback` + `useEffect` dependency pattern in
  `Products.jsx`, `Analytics.jsx`).
- **Images**: product images render with `object-cover` inside fixed
  aspect-ratio containers to avoid layout shift; Cloudinary itself can be
  configured with transformation URLs for further optimization (e.g.
  `f_auto,q_auto`) as a future enhancement.

## Suggested Next Steps for Scale

- Add Redis for response caching on read-heavy, rarely-changing endpoints
  (e.g. `/api/categories`).
- Add a CDN in front of the frontend build (Vercel does this by default).
- Introduce `React.lazy()` + `Suspense` per route once bundle size is
  measured and justifies it.
- Add database connection pooling tuning (`pool_size`, `max_overflow`) in
  `app/core/database.py` for high-concurrency production loads.
