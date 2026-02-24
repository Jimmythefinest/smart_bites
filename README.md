# Smart Bites API

Backend API for restaurant menu, inventory, and order management using Node.js, Express, and PostgreSQL.

## Stack

- Node.js (CommonJS)
- Express 4
- PostgreSQL (`pg`)
- `dotenv`
- Node test runner (`node --test`)

## Project Layout

```text
.
├── db/schema.sql
├── scripts/create_db.sh
├── scripts/curl_tests.sh
├── src/app.js
├── src/server.js
├── src/lib/db.js
├── src/routes/api.js
└── test/api.test.js
```

## Prerequisites

- Node.js 18+
- PostgreSQL
- `psql` CLI available in PATH
- `sudo` access (needed by `scripts/create_db.sh` to create the DB as `postgres`)

## Environment

Create `.env` in the project root:

```bash
DATABASE_URL=postgres://<user>:<password>@localhost:5432/smart_bites?schema=public
PORT=3000
```

Notes:
- `DATABASE_URL` is required at runtime.
- The app strips `?schema=...` before connecting to PostgreSQL.

## Install

```bash
npm install
```

## Database Setup

Create database (if missing) and apply schema:

```bash
npm run db:create
```

Apply schema only:

```bash
npm run db:migrate
```

## Run

```bash
npm run dev
```

Server starts at `http://localhost:3000` by default.

## Test

Unit tests (handler-level with mocked DB):

```bash
npm test
```

Endpoint smoke tests with `curl` (requires API running + seeded DB access):

```bash
npm run test:curl
```

You can override target URL:

```bash
BASE_URL=http://127.0.0.1:3000 npm run test:curl
```

## API Overview

Base path: `/api`

- `GET /health`
- `GET /restaurants`
- `POST /restaurants`
- `GET /restaurants/:restaurantId/menu-items`
- `POST /restaurants/:restaurantId/menu-items`
- `GET /locations/:locationId/inventory`
- `PUT /locations/:locationId/menu-items/:menuItemId/inventory`
- `POST /locations/:locationId/menu-items/:menuItemId/inventory/transactions`
- `POST /orders`
- `GET /orders/:orderId`

Detailed endpoint docs are in `docs/API.md`.

## Error Handling

Common responses:

- `400` for validation errors and invalid references
- `404` when a requested order is not found
- `409` for unique-constraint conflicts
- `500` for unexpected server errors

## License

ISC
