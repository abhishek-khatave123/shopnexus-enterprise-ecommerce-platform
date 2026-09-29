# Order Workflow

## Customer-facing lifecycle

```
PENDING --(payment verified)--> CONFIRMED --(admin)--> PROCESSING
   --(admin)--> SHIPPED --(admin)--> DELIVERED

Any state --(admin, before DELIVERED)--> CANCELLED
```

`payment_status` moves independently: `PENDING -> PAID` (on verified
Razorpay payment) or `-> FAILED` / `-> REFUNDED` (manual admin action via
future tooling — the schema supports it even though no refund endpoint is
wired up in this MVP).

## Placing an order

1. Customer has items in their persistent, database-backed cart
   (`GET/POST/PUT/DELETE /api/cart*`).
2. Customer submits a shipping address at checkout.
3. `POST /api/orders` (see `order_service.create_order_from_cart`):
   - Re-validates stock for every cart item (prevents overselling even if
     stock changed since the item was added to the cart).
   - Computes `subtotal_amount`, `discount_amount`, `total_amount` from
     current product prices.
   - Creates the `Order` and `OrderItem` rows, snapshotting product name
     and unit price at time of purchase.
   - Decrements `Product.stock_quantity` and the matching `Inventory` row.
   - Clears the cart.
   - Sends an order-confirmation email.
4. Order starts as `order_status = PENDING`, `payment_status = PENDING`.
5. Customer proceeds to payment (see `payment-workflow.md`). On success,
   `order_status` becomes `CONFIRMED`.

## Admin order management

- `GET /api/admin/orders` — list all orders, filterable by status and
  searchable by order number.
- `PUT /api/admin/orders/{id}/status` — admin moves the order through
  `PROCESSING -> SHIPPED -> DELIVERED` (or `CANCELLED`). Each status
  change triggers `send_order_status_email` to notify the customer.
- Only orders in `DELIVERED` status make their line items eligible for
  customer reviews (`reviews` endpoint checks for a matching delivered
  `OrderItem`).

## Stock Consistency

Stock is decremented at **order creation**, not at payment confirmation.
This is a deliberate trade-off for the MVP: it guarantees a customer who
completes checkout has the item reserved, at the cost of needing a manual
restock/cancellation flow if payment is never completed. Admins can adjust
stock directly via `PUT /api/inventory/{product_id}` if an unpaid order
needs to be released back to inventory.
