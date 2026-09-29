# Payment Workflow (Razorpay)

```
Customer
  |
  v
Checkout (address -> summary)
  |
  v
POST /api/orders            (creates Order, status PENDING/PENDING, decrements stock)
  |
  v
POST /api/payments/create-order   (creates a Razorpay Order server-side)
  |
  v
Razorpay Checkout widget opens client-side
  |
  v
Customer pays
  |
  v
POST /api/payments/verify   (server-side HMAC-SHA256 signature check)
  |
  v
Payment marked PAID, Order marked CONFIRMED
  |
  v
Confirmation email sent
```

## Step-by-step

1. **Order creation** (`order_service.create_order_from_cart`): validates
   every cart item is active and in stock, computes subtotal/discount/total
   from current product prices, snapshots line items into `order_items`
   (so later product edits never change historical order totals),
   decrements `products.stock_quantity` and `inventory.quantity`, clears
   the cart, and sends an order-confirmation email.

2. **Razorpay order creation** (`POST /api/payments/create-order`):
   - Backend checks `settings.razorpay_configured`. If `RAZORPAY_KEY_ID` /
     `RAZORPAY_KEY_SECRET` are missing, it returns
     `{ "configured": false, "message": "..." }` — the frontend shows this
     message and does **not** attempt to open the Razorpay widget.
   - If configured, it calls the Razorpay SDK to create an order for
     `order.total_amount` (converted to paise) and stores the returned
     `razorpay_order_id` on the `Payment` row.

3. **Client-side checkout**: the frontend loads Razorpay's `checkout.js`
   and opens the widget with the `razorpay_order_id` and publishable
   `RAZORPAY_KEY_ID` (the **secret** key never leaves the backend).

4. **Verification** (`POST /api/payments/verify`): the frontend forwards
   Razorpay's callback payload (`razorpay_order_id`, `razorpay_payment_id`,
   `razorpay_signature`). The backend recomputes:

   ```python
   hmac.new(RAZORPAY_KEY_SECRET, f"{order_id}|{payment_id}", sha256).hexdigest()
   ```

   and compares it to the provided signature using
   `hmac.compare_digest` (constant-time comparison). Only on a match is the
   `Payment.status` set to `PAID`, `Order.payment_status` to `PAID`, and
   `Order.order_status` to `CONFIRMED`. On mismatch, `400` is returned and
   nothing is marked paid.

5. **Payment confirmation email** is sent after successful verification.

## Security Requirements Met

- Card numbers and CVV are **never** received or stored by this
  application — Razorpay's hosted Checkout widget handles that entirely.
- `RAZORPAY_KEY_SECRET` exists only in the backend's environment; it is
  never sent to the frontend or embedded in any bundle.
- Payment status can only transition to `PAID` via a verified signature —
  there is no endpoint that lets a client directly set payment status.
- If Razorpay is unreachable or misconfigured, the failure is explicit and
  logged (`payment_service.py`), never silently swallowed into a false
  "success".
