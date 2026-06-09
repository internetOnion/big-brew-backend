# Order & Payment System Design

## Summary

Two-step order/payment flow: create order (pending, unpaid) → pay (confirmed, paid). Cash only for v1, static QR (manual verification) planned for future. Server-authoritative pricing — client sends IDs, server calculates all money.

---

## Schema Changes

Migration required — change `orders` table:

| Change | Detail |
|--------|--------|
| `receiptNumber` | `serial` → `integer` (nullable, defaults NULL) |
| `receiptDate` | new `date` column (nullable) |
| Constraint | Both set together at payment, both NULL before payment |

---

## Status Flow

```
                    cancel
                 ┌─────────► cancelled
                 │
  POST /orders ──┤
                 │            pay            kitchen flow
                 └─── pending ──► confirmed ──► preparing ──► ready ──► delivered
                                     │
                                     │ void-request
                                     ▼
                               void_pending
                                │        │
                          approve│        │reject
                                ▼        ▼
                             voided   (back to prior status)
                         (auto-refund)
```

- Unpaid orders: cancel only — no void for unpaid
- Void is for paid orders only, auto-refunds on approval (one manager approval covers both)
- Cancelled is terminal — cannot un-cancel or pay a cancelled order
- Void/reject returns order to previous status (e.g., `confirmed`)

---

## Authorization

| Action | Minimum Role |
|--------|-------------|
| Create order | barista |
| Pay order | barista |
| Update order | barista |
| Cancel order | barista |
| View orders | barista (all employees see all orders) |
| Void request | barista |
| Void approve | manager |
| Void reject | manager |

---

## Endpoints

### `POST /api/orders` — Create Order

**Auth:** barista+

**Request:**
```ts
{
  diningOption: "dine_in" | "take_away",
  items: [
    {
      menuItemId: string,
      quantity: number,
      modifiers: [
        { modifierOptionId: string }
      ]
    }
  ],
  discountId?: string
}
```

**Validation:**
- Items array must be non-empty
- `menuItemId` must reference an existing, available menu item
- `modifierOptionId` must be valid for the given menu item
- `discountId` (if provided) must be an active, valid discount

**Server processing:**
- Look up menu item `basePrice` → set `order_items.unitPrice`
- Look up modifier option `price` → set `order_item_modifiers.price`
- If BOGO discount: identify applicable items, zero out `unitPrice` on the cheapest free item
- Calculate: `subtotal` = sum of (item prices × quantities)
- Apply discount: `discountAmount`, `total` = `subtotal - discountAmount`
- Insert order with `status: "pending"`, `paymentStatus: "pending"`

**Response:** Full order tree (see Response Shape below)

---

### `GET /api/orders` — List Orders

**Auth:** barista+

**Query params:**
| Param | Type | Default |
|-------|------|---------|
| `status` | `orderStatusEnum` | (all) |
| `dateFrom` | ISO date string | start of today |
| `dateTo` | ISO date string | end of today |
| `paymentMethod` | `paymentMethodEnum` | (all) |
| `diningOption` | `diningOptionEnum` | (all) |
| `page` | integer | 1 |
| `limit` | integer | 20 |

**Response:** Paginated list of full order trees

---

### `GET /api/orders/:id` — Get Single Order

**Auth:** barista+

**Response:** Full order tree

---

### `PUT /api/orders/:id` — Update Order

**Auth:** barista+

**Constraint:** Only allowed when `status: "pending"` (unpaid)

**Request:** Same shape as `POST /api/orders` (full replacement — complete items array)

**Server processing:**
- Delete existing `order_items` and `order_item_modifiers` (cascade)
- Re-insert items and modifiers with current prices
- Full recalculation of subtotal, discount (re-evaluate against new items), total
- If BOGO no longer qualifies after item removal, discount resets to 0

**Response:** Full order tree (recalculated)

---

### `POST /api/orders/:id/cancel` — Cancel Unpaid Order

**Auth:** barista+

**Constraint:** Only allowed when `paymentStatus: "pending"` (unpaid)

Sets `status: "cancelled"`.

**Response:** Full order tree

---

### `POST /api/orders/:id/pay` — Pay for Order

**Auth:** barista+

**Constraint:** Only allowed when `paymentStatus: "pending"` and `status: "pending"`

**Request (discriminated union):**
```ts
// Cash
{ paymentMethod: "cash", amountReceived: number }
// QR (future)
{ paymentMethod: "qr" }
```

**Cash processing:**
- Validate `amountReceived >= total` → reject if insufficient
- `changeAmount = amountReceived - total`
- Assign `receiptNumber` (daily contiguous, `SELECT MAX + 1` for today)
- Set `receiptDate = CURRENT_DATE`
- Update: `paymentMethod`, `paymentStatus: "paid"`, `status: "confirmed"`
- Deduct stock (see Stock Integration)
- Response: receipt (see Payment Receipt Response)

**QR processing (future):**
- No stock deduction (manual verification by cashier)
- Flip `paymentMethod`, `paymentStatus`, `status` — no money calculation

**Idempotency:**
- `SELECT ... FOR UPDATE` row lock on the order row
- If already paid, return 200 with existing receipt — no error

---

### `POST /api/orders/:id/void-request` — Request Void

**Auth:** barista+

**Constraint:** Order must be paid (`paymentStatus: "paid"`) and not already voided/cancelled

**Request:**
```ts
{ reason: string }
```

Sets `status: "void_pending"`, `voidRequestedBy`, `voidRequestedAt`, `voidReason`.

---

### `POST /api/orders/:id/void-approve` — Approve Void

**Auth:** manager+

**Constraint:** Order must be in `status: "void_pending"`

**Processing:**
- Set `status: "voided"`, `voidApprovedBy`, `voidApprovedAt`
- Set `paymentStatus: "refunded"` (auto-refund)
- Reverse stock (insert `stock_movements` with `reason: "order_voided"`, increment ingredient quantities)

---

### `POST /api/orders/:id/void-reject` — Reject Void

**Auth:** manager+

**Constraint:** Order must be in `status: "void_pending"`

Sets `status` back to the prior status (e.g., `confirmed`), records `voidRejectedAt`.

---

## Discount Engine

Three types, all calculated server-side:

| Type | Logic |
|------|-------|
| `percentage` | `discountAmount = subtotal × (value / 100)` |
| `fixed_amount` | `discountAmount = min(value, subtotal)` |
| `bogo` | Find items matching `buyItemId` and `freeItemId` → zero out `unitPrice` on cheapest free item. `discountAmount = freeItem.basePrice` |

- Discounts recalculated on every `PUT` (full recalculation against current items)
- `total = subtotal - discountAmount`
- `discountId` can be added, changed, or removed on update

---

## Stock Integration

Fired at payment time, inside the same transaction as the pay update.

1. Look up `item_recipes` for each ordered item → get `(ingredientId, quantity)` pairs
2. Look up `modifier_option_ingredients` for each modifier → get additional ingredient quantities
3. Sum per ingredient, multiply by item quantity
4. Decrement `ingredients.stock_quantity`
5. Insert `stock_movements` rows:
   - `reason: "order_placed"`
   - `quantity_change: -totalConsumed`
   - `referenceOrderId`
6. Void approval reverses: `reason: "order_voided"`, positive `quantity_change`

---

## Receipt Number

Daily contiguous numbering — resets each day.

```sql
-- Inside payment transaction, after row lock:
SELECT COALESCE(MAX(receipt_number), 0) + 1
FROM orders
WHERE receipt_date = CURRENT_DATE
```

Sets both `receiptNumber` (integer) and `receiptDate` (date) atomically.

---

## Concurrent Payment Guard

`SELECT ... FOR UPDATE` row lock on the order row at the start of the payment transaction. If another cashier already paid the order, the second request sees `paymentStatus: "paid"` and returns 200 (idempotent) — no error, no double charge.

---

## Response Shapes

### Full Order Tree

Returned by: `POST /api/orders`, `GET /api/orders`, `GET /api/orders/:id`, `PUT /api/orders/:id`

```ts
{
  id: string,
  orderNumber: number,
  receiptNumber: number | null,
  receiptDate: string | null,
  status: "pending" | "confirmed" | "preparing" | "ready" | "delivered" | "cancelled" | "void_pending" | "voided",
  diningOption: "dine_in" | "take_away",
  subtotal: string,
  discountAmount: string,
  total: string,
  paymentMethod: "cash" | "qr" | null,
  paymentStatus: "pending" | "paid" | "refunded",
  amountReceived: string | null,
  changeAmount: string | null,
  voidRequestedBy: string | null,
  voidRequestedAt: string | null,
  voidApprovedBy: string | null,
  voidApprovedAt: string | null,
  voidRejectedAt: string | null,
  voidReason: string | null,
  createdAt: string,
  updatedAt: string,
  discount: {
    id: string,
    name: string,
    type: "percentage" | "fixed_amount" | "bogo",
    value: string | null
  } | null,
  createdBy: {
    id: string,
    name: string
  },
  items: [
    {
      id: string,
      unitPrice: string,
      quantity: number,
      menuItem: {
        id: string,
        name: string,
        basePrice: string,
        imageUrl: string | null
      },
      modifiers: [
        {
          id: string,
          price: string,
          modifierOption: {
            id: string,
            name: string,
            price: string
          }
        }
      ]
    }
  ]
}
```

### Payment Receipt

Returned by: `POST /api/orders/:id/pay`

```ts
{
  orderNumber: number,
  receiptNumber: number,
  receiptDate: string,
  total: string,
  amountReceived: string,
  changeAmount: string,
  paymentMethod: "cash",
  paidAt: string,
  items: /* same items array as full order tree */,
  storeName: string,    // from settings
  receiptHeader: string, // from settings
  receiptFooter: string  // from settings
}
```

---

## New Files

```
src/routes/orders.ts
src/controllers/order.controller.ts
src/services/order.service.ts
src/repositories/order.repository.ts
```

Plus barrel index updates in each directory.

---

## Future: QR Payment

- Static QR code at counter — no gateway integration
- Cashier visually confirms customer paid in their app
- `POST /api/orders/:id/pay` with `{ paymentMethod: "qr" }` flips status
- No `amountReceived`, no `changeAmount`, no stock deduction (cashier verifies)
- Discriminated union already handles the different body shapes
