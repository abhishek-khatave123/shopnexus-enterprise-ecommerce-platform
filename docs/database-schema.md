# Database Schema

Database: PostgreSQL. ORM: SQLAlchemy. Migrations: Alembic
(`backend/alembic/versions/0001_initial_schema.py`).

## Tables

### `roles`
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| name | String(50) unique | `CUSTOMER`, `ADMIN`, `SUPER_ADMIN` |

### `users`
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| name | String(150) | |
| email | String(255) unique, indexed | |
| password_hash | String(255) | bcrypt via passlib, never plaintext |
| phone | String(30) nullable | |
| role_id | Integer FK → roles.id | |
| is_active | Boolean | deactivated accounts can't log in |
| created_at / updated_at | DateTime | |

### `categories`
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| name | String(150) unique | |
| slug | String(180) unique, indexed | |
| description | String(500) nullable | |

### `products`
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| name | String(255), indexed | |
| slug | String(280) unique, indexed | |
| description | Text nullable | |
| price | Numeric(12,2) | |
| discount_price | Numeric(12,2) nullable | |
| sku | String(100) unique, indexed | |
| category_id | Integer FK → categories.id, indexed | |
| brand | String(150) nullable | |
| stock_quantity | Integer | kept in sync with `inventory.quantity` |
| is_active | Boolean | |
| created_at | DateTime, indexed | used for "newest" sort |
| Composite index | (category_id, is_active) | speeds up category browsing |

### `product_images`
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| product_id | Integer FK → products.id (cascade delete), indexed | |
| image_url | String(1000) | Cloudinary secure_url |
| public_id | String(255) nullable | Cloudinary public_id, used for deletion |
| created_at | DateTime | |

### `inventory`
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| product_id | Integer FK → products.id, unique, indexed | one row per product |
| quantity | Integer | |
| low_stock_threshold | Integer default 10 | |
| updated_at | DateTime | |

### `carts`
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| user_id | Integer FK → users.id, unique, indexed | one persistent cart per user |

### `cart_items`
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| cart_id | Integer FK → carts.id (cascade), indexed | |
| product_id | Integer FK → products.id, indexed | |
| quantity | Integer | |
| Unique constraint | (cart_id, product_id) | one row per product per cart |

### `addresses`
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| user_id | Integer FK → users.id (cascade), indexed | |
| full_name, phone, line1, line2, city, state, postal_code, country | strings | |
| is_default | Boolean | |

### `orders`
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| order_number | String(40) unique, indexed | e.g. `SNX-12345678` |
| user_id | Integer FK → users.id, indexed | |
| total_amount, subtotal_amount, discount_amount | Numeric(12,2) | |
| payment_status | Enum: PENDING/PAID/FAILED/REFUNDED, indexed | |
| order_status | Enum: PENDING/CONFIRMED/PROCESSING/SHIPPED/DELIVERED/CANCELLED, indexed | |
| shipping_address | Text | JSON snapshot of the address at order time |
| created_at | DateTime, indexed | |

### `order_items`
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| order_id | Integer FK → orders.id (cascade), indexed | |
| product_id | Integer FK → products.id, indexed | |
| product_name | String(255) | snapshot — survives product edits/deletes |
| unit_price | Numeric(12,2) | snapshot of price paid |
| quantity | Integer | |

### `payments`
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| order_id | Integer FK → orders.id, unique, indexed | |
| razorpay_order_id / razorpay_payment_id | String(100) nullable, indexed | |
| razorpay_signature | String(255) nullable | |
| amount | Numeric(12,2) | |
| currency | String(10) default "INR" | |
| status | Enum: PENDING/PAID/FAILED/REFUNDED | |

### `reviews`
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| product_id | Integer FK → products.id (cascade), indexed | |
| user_id | Integer FK → users.id (cascade), indexed | |
| order_id | Integer FK → orders.id nullable | |
| rating | Integer, CHECK 1–5 | |
| comment | String(2000) nullable | |
| Unique constraint | (user_id, product_id, order_id) | prevents duplicate reviews per order |

### `notifications`
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| user_id | Integer FK → users.id (cascade), indexed | |
| title, message | strings | |
| is_read | Boolean | |

## Relationships

- **User → Orders**: one-to-many (`users.id` ← `orders.user_id`)
- **User → Cart**: one-to-one (`users.id` ← `carts.user_id`, unique)
- **Order → Order Items**: one-to-many, cascade delete
- **Product → Category**: many-to-one
- **Product → Product Images**: one-to-many, cascade delete
- **Product → Inventory**: one-to-one, cascade delete
- **Order → Payment**: one-to-one, cascade delete
- **Product → Reviews**: one-to-many, cascade delete

## Indexing Strategy

Indexes exist on every column commonly used in `WHERE`/`JOIN`/`ORDER BY`
clauses: `users.email`, `products.sku`, `products.name`, `products.category_id`,
`orders.order_number`, `orders.user_id`, `orders.created_at`, and both
order/payment status enums. A composite index on
`(products.category_id, products.is_active)` speeds up the most common
customer-facing query (browsing an active category).
