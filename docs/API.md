# API Reference

Base URL example: `http://127.0.0.1:3000/api`

## Authentication

Most endpoints require bearer auth:

```http
Authorization: Bearer <token>
```

### `POST /auth/register`

Creates a buyer user and returns a signed auth token.

Body:

```json
{
  "email": "buyer@example.com",
  "full_name": "Buyer One",
  "password": "strongpass123"
}
```

Validation:
- `email`, `full_name`, `password` are required.
- password must be at least 8 characters.

### `POST /auth/login`

Logs in a user and returns token + user profile.

Body:

```json
{
  "email": "buyer@example.com",
  "password": "strongpass123"
}
```

### `GET /auth/me`

Returns the authenticated user profile.

## Health

### `GET /health`

Returns API/database health.

Response `200`:

```json
{ "status": "ok" }
```

## Restaurants

### `GET /restaurants`

Returns all restaurants (newest first).

### `POST /restaurants`

Creates a restaurant and its single restaurant-owner login.

Body:

```json
{
  "name": "Noodle Hub",
  "slug": "noodle-hub",
  "is_active": true,
  "owner_full_name": "Noodle Hub Owner",
  "owner_email": "owner@noodlehub.com",
  "owner_password": "strongpass123"
}
```

Validation:
- `name`, `slug`, `owner_email`, `owner_password` are required.
- `owner_password` must be at least 8 characters.
- each restaurant owner login is mapped to exactly one restaurant.

## Menu Items

### `GET /restaurants/:restaurantId/menu-items`

Lists menu items for a restaurant.

Validation:
- `restaurantId` must be a positive integer.

### `POST /restaurants/:restaurantId/menu-items`

Creates a menu item for a restaurant.

Body:

```json
{
  "category_id": null,
  "name": "Fries",
  "description": "Crispy",
  "base_price_cents": 499,
  "is_active": true
}
```

Validation:
- `name` is required.
- `base_price_cents` must be a non-negative integer.

## Inventory

### `GET /locations/:locationId/inventory`

Lists inventory records for a location.

Validation:
- `locationId` must be a positive integer.

### `PUT /locations/:locationId/menu-items/:menuItemId/inventory`

Upserts inventory values for a menu item at a location.

Body:

```json
{
  "qty_on_hand": 40,
  "reorder_level": 10,
  "par_level": null,
  "track_inventory": true,
  "is_out_of_stock": false
}
```

Validation:
- `qty_on_hand >= 0`.

### `POST /locations/:locationId/menu-items/:menuItemId/inventory/transactions`

Appends an inventory transaction and updates on-hand quantity atomically.

Body:

```json
{
  "txn_type": "restock",
  "qty_delta": 5,
  "reason": "weekly refill",
  "created_by": 1,
  "order_id": null
}
```

Validation:
- `txn_type` must be one of: `restock`, `sale`, `waste`, `adjustment`, `return`.
- `qty_delta` must be a non-zero number.
- resulting inventory cannot go below zero.

Response `201` includes:
- `transaction` object
- `inventory` object (updated row)

## Orders

### `POST /orders`

Creates an order and order items in a transaction.

Body:

```json
{
  "customer_id": 1,
  "restaurant_id": 1,
  "location_id": 1,
  "delivery_address_id": null,
  "order_type": "pickup",
  "tax_cents": 100,
  "delivery_fee_cents": 0,
  "items": [{ "menu_item_id": 11, "quantity": 2 }]
}
```

Rules:
- `items` must be a non-empty array.
- `order_type` must be `pickup` or `delivery`.
- each `menu_item_id` must exist, belong to the restaurant, and be active.
- each `quantity` must be a positive integer.

Subtotal and total are computed server-side from `base_price_cents`, tax, and delivery fee.

### `GET /restaurants/:restaurantId/orders`

Lists orders for a restaurant (newest first).

Validation:
- `restaurantId` must be a positive integer.

### `GET /customers/:customerId/orders`

Lists orders for a customer (newest first), including current status.

Validation:
- `customerId` must be a positive integer.

### `PATCH /orders/:orderId/status`

Updates an order status with the restaurant workflow:
- `placed` -> `preparation` (`preparing`)
- `preparation` (`preparing`) -> `done` (`completed`)

Body:

```json
{ "status": "preparation" }
```

Accepted values:
- `placed`
- `preparation` or `preparing`
- `done` or `completed`

Validation:
- `orderId` must be a positive integer.
- only valid forward transitions are allowed.

### `GET /orders/:orderId`

Returns an order with its item rows.

Validation:
- `orderId` must be a positive integer.

Errors:
- `404` if order does not exist.

## Common Error Payload

```json
{ "error": "message" }
```
