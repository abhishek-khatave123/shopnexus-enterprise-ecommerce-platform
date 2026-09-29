# API Documentation

Interactive, always-up-to-date docs are served by FastAPI itself once the
backend is running:

- Swagger UI: **http://localhost:8000/docs**
- OpenAPI JSON: **http://localhost:8000/openapi.json**

Every endpoint below is documented there with request/response schemas,
status codes, and which ones require a Bearer token. This file is a quick
reference; the running `/docs` page is the source of truth.

Base URL: `/api`

## Authentication (`/api/auth`)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | none | Create a CUSTOMER account, returns JWT |
| POST | `/auth/login` | none | Returns JWT |
| GET | `/auth/me` | Bearer | Current user profile |
| POST | `/auth/forgot-password` | none | Always returns a generic success message |

## Users (`/api/users`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/users/me` | Bearer | My profile |
| PUT | `/users/me` | Bearer | Update name/phone |
| GET | `/users/me/addresses` | Bearer | List my addresses |
| POST | `/users/me/addresses` | Bearer | Add address |
| DELETE | `/users/me/addresses/{id}` | Bearer | Delete my address |

## Products (`/api/products`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/products` | none | Search/filter/sort/paginate (`search`, `category_id`, `min_price`, `max_price`, `sort`, `page`, `page_size`) |
| GET | `/products/{id}` | none | Product details |
| POST | `/products` | Admin | Create product |
| PUT | `/products/{id}` | Admin | Update product |
| DELETE | `/products/{id}` | Admin | Delete product |

## Categories (`/api/categories`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/categories` | none | List all |
| POST | `/categories` | Admin | Create |
| PUT | `/categories/{id}` | Admin | Update |
| DELETE | `/categories/{id}` | Admin | Delete |

## Cart (`/api/cart`) — all require Bearer (customer)
| Method | Path | Description |
|---|---|---|
| GET | `/cart` | Get my cart (auto-created if missing) |
| POST | `/cart/items` | Add item (`product_id`, `quantity`) |
| PUT | `/cart/items/{item_id}` | Update quantity |
| DELETE | `/cart/items/{item_id}` | Remove item |
| DELETE | `/cart` | Clear cart |

## Orders (`/api/orders`) — all require Bearer
| Method | Path | Description |
|---|---|---|
| POST | `/orders` | Checkout from cart (`{ address: {...} }`) |
| GET | `/orders` | My order history |
| GET | `/orders/{id}` | Order details (owner or admin) |

## Payments (`/api/payments`) — all require Bearer
| Method | Path | Description |
|---|---|---|
| POST | `/payments/create-order` | Create Razorpay order for an owned order |
| POST | `/payments/verify` | Verify Razorpay signature, mark order paid |
| GET | `/payments/{id}` | Payment details (owner or admin) |

## Reviews (`/api/reviews`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/reviews/product/{product_id}` | none | List reviews |
| POST | `/reviews` | Bearer | Submit review (must have a DELIVERED order for that product) |

## Uploads (`/api/uploads`)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/uploads/product-image?product_id=` | Admin | Upload to Cloudinary; 503 with a clear message if not configured |

## Notifications (`/api/notifications`) — all require Bearer
| Method | Path | Description |
|---|---|---|
| GET | `/notifications` | My notifications |
| PUT | `/notifications/{id}/read` | Mark as read |

## Admin (`/api/admin`) — all require Admin/Super Admin
| Method | Path | Description |
|---|---|---|
| GET | `/admin/orders` | All orders (`status`, `search` filters) |
| PUT | `/admin/orders/{id}/status` | Update order status, triggers status email |
| GET | `/admin/products` | All products, including inactive |
| GET | `/admin/payments` | All payments (`status` filter) |
| GET | `/admin/customers` | Paginated customers (`search`, `is_active`) |
| GET | `/admin/customers/{id}` | Customer details |
| GET | `/admin/customers/{id}/orders` | A customer's orders |
| PUT | `/admin/customers/{id}/status?is_active=` | Activate/deactivate |

## Inventory (`/api/inventory`) — all require Admin
| Method | Path | Description |
|---|---|---|
| GET | `/inventory?low_stock_only=` | List stock levels |
| PUT | `/inventory/{product_id}` | Update quantity / low-stock threshold |

## Analytics (`/api/analytics`) — all require Admin
| Method | Path | Description |
|---|---|---|
| GET | `/analytics/overview` | Revenue, orders, customers, products, AOV, pending orders, low stock |
| GET | `/analytics/revenue?period=&group_by=` | Revenue over time (`today\|7d\|30d\|6m\|1y`, `day\|month`) |
| GET | `/analytics/orders` | Orders by status + payment statistics |
| GET | `/analytics/products` | Top-selling products + sales by category |
| GET | `/analytics/customers?period=` | New customers in the given period |

## Reports (`/api/reports`) — all require Admin, return CSV
| Method | Path | Description |
|---|---|---|
| GET | `/reports/sales` | Paid orders: subtotal, discount, total |
| GET | `/reports/orders` | All orders: statuses, total |
| GET | `/reports/customers` | Customers: joined date, status |
| GET | `/reports/products` | Product catalog: price, stock, status |
| GET | `/reports/inventory` | Stock levels and thresholds |

## Health
| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | `{ "status": "ok", "message": "API is running!" }` |

## Error Response Shape

All errors (validation, not-found, forbidden, unhandled) return:

```json
{ "success": false, "message": "Human-readable message" }
```

Validation errors additionally include an `errors` array with `field` and
`message` per invalid field. No stack traces are ever returned to the
client; unhandled exceptions are logged server-side and return a generic
500 message.
