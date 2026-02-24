const test = require("node:test");
const assert = require("node:assert/strict");

function createQueryMock() {
  const responses = [];
  const calls = [];
  const query = async (text, params) => {
    calls.push({ text, params });
    if (responses.length === 0) {
      throw new Error("No queued query response");
    }
    const next = responses.shift();
    if (next instanceof Error) {
      throw next;
    }
    return next;
  };
  return { query, responses, calls };
}

function createClientMock(queuedResults) {
  return {
    async query() {
      if (queuedResults.length === 0) {
        throw new Error("No queued transaction response");
      }
      const next = queuedResults.shift();
      if (next instanceof Error) {
        throw next;
      }
      return next;
    },
  };
}

function loadHandlers(dbMock) {
  const dbPath = require.resolve("../src/lib/db");
  const routesPath = require.resolve("../src/routes/api");
  delete require.cache[dbPath];
  delete require.cache[routesPath];
  require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: dbMock,
  };
  return require("../src/routes/api").handlers;
}

function createRes() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function createReq({ params = {}, body = {} } = {}) {
  return { params, body };
}

test("GET /api/health", async () => {
  const q = createQueryMock();
  q.responses.push({ rows: [], rowCount: 1 });
  const handlers = loadHandlers({ query: q.query, withTransaction: async () => ({}) });
  const res = createRes();
  let err;

  await handlers.health(createReq(), res, (e) => {
    err = e;
  });

  assert.equal(err, undefined);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { status: "ok" });
});

test("GET /api/restaurants", async () => {
  const q = createQueryMock();
  q.responses.push({ rows: [{ id: 1, name: "Smart Eats" }], rowCount: 1 });
  const handlers = loadHandlers({ query: q.query, withTransaction: async () => ({}) });
  const res = createRes();

  await handlers.listRestaurants(createReq(), res, () => {});
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.length, 1);
});

test("POST /api/restaurants", async () => {
  const q = createQueryMock();
  q.responses.push({ rows: [{ id: 2, name: "Noodle Hub", slug: "noodle-hub" }], rowCount: 1 });
  const handlers = loadHandlers({ query: q.query, withTransaction: async () => ({}) });
  const res = createRes();

  await handlers.createRestaurant(
    createReq({ body: { name: "Noodle Hub", slug: "noodle-hub", is_active: true } }),
    res,
    () => {}
  );
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.slug, "noodle-hub");
});

test("GET /api/restaurants/:restaurantId/menu-items", async () => {
  const q = createQueryMock();
  q.responses.push({ rows: [{ id: 10, restaurant_id: 1, name: "Burger" }], rowCount: 1 });
  const handlers = loadHandlers({ query: q.query, withTransaction: async () => ({}) });
  const res = createRes();

  await handlers.listMenuItems(createReq({ params: { restaurantId: "1" } }), res, () => {});
  assert.equal(res.statusCode, 200);
  assert.equal(res.body[0].id, 10);
});

test("POST /api/restaurants/:restaurantId/menu-items", async () => {
  const q = createQueryMock();
  q.responses.push({ rows: [{ id: 11, restaurant_id: 1, name: "Fries" }], rowCount: 1 });
  const handlers = loadHandlers({ query: q.query, withTransaction: async () => ({}) });
  const res = createRes();

  await handlers.createMenuItem(
    createReq({
      params: { restaurantId: "1" },
      body: { name: "Fries", base_price_cents: 499 },
    }),
    res,
    () => {}
  );
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.name, "Fries");
});

test("GET /api/locations/:locationId/inventory", async () => {
  const q = createQueryMock();
  q.responses.push({ rows: [{ location_id: 1, menu_item_id: 11, qty_on_hand: "20.00" }], rowCount: 1 });
  const handlers = loadHandlers({ query: q.query, withTransaction: async () => ({}) });
  const res = createRes();

  await handlers.listInventory(createReq({ params: { locationId: "1" } }), res, () => {});
  assert.equal(res.statusCode, 200);
  assert.equal(res.body[0].menu_item_id, 11);
});

test("PUT /api/locations/:locationId/menu-items/:menuItemId/inventory", async () => {
  const q = createQueryMock();
  q.responses.push({ rows: [{ location_id: 1, menu_item_id: 11, qty_on_hand: "40.00" }], rowCount: 1 });
  const handlers = loadHandlers({ query: q.query, withTransaction: async () => ({}) });
  const res = createRes();

  await handlers.upsertInventory(
    createReq({
      params: { locationId: "1", menuItemId: "11" },
      body: { qty_on_hand: 40, reorder_level: 10 },
    }),
    res,
    () => {}
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.menu_item_id, 11);
});

test("POST /api/locations/:locationId/menu-items/:menuItemId/inventory/transactions", async () => {
  const q = createQueryMock();
  const client = createClientMock([
    { rows: [{ qty_on_hand: "10.00" }], rowCount: 1 },
    { rows: [], rowCount: 1 },
    { rows: [{ id: 90, txn_type: "restock", qty_delta: "5.00" }], rowCount: 1 },
    { rows: [{ location_id: 1, menu_item_id: 11, qty_on_hand: "15.00" }], rowCount: 1 },
  ]);
  const handlers = loadHandlers({
    query: q.query,
    withTransaction: async (work) => work(client),
  });
  const res = createRes();

  await handlers.createInventoryTransaction(
    createReq({
      params: { locationId: "1", menuItemId: "11" },
      body: { txn_type: "restock", qty_delta: 5 },
    }),
    res,
    () => {}
  );
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.transaction.txn_type, "restock");
});

test("POST /api/orders", async () => {
  const q = createQueryMock();
  q.responses.push({
    rows: [{ id: 11, name: "Fries", base_price_cents: 499 }],
    rowCount: 1,
  });
  const client = createClientMock([
    {
      rows: [
        {
          id: 500,
          customer_id: 1,
          restaurant_id: 1,
          location_id: 1,
          status: "placed",
          subtotal_cents: 998,
          tax_cents: 100,
          delivery_fee_cents: 0,
          total_cents: 1098,
        },
      ],
      rowCount: 1,
    },
    { rows: [], rowCount: 1 },
  ]);
  const handlers = loadHandlers({
    query: q.query,
    withTransaction: async (work) => work(client),
  });
  const res = createRes();

  await handlers.createOrder(
    createReq({
      body: {
        customer_id: 1,
        restaurant_id: 1,
        location_id: 1,
        order_type: "pickup",
        tax_cents: 100,
        items: [{ menu_item_id: 11, quantity: 2 }],
      },
    }),
    res,
    () => {}
  );
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.id, 500);
  assert.equal(res.body.items.length, 1);
});

test("GET /api/orders/:orderId", async () => {
  const q = createQueryMock();
  q.responses.push(
    { rows: [{ id: 500, customer_id: 1, status: "placed" }], rowCount: 1 },
    { rows: [{ id: 1, menu_item_id: 11, quantity: 2 }], rowCount: 1 }
  );
  const handlers = loadHandlers({ query: q.query, withTransaction: async () => ({}) });
  const res = createRes();

  await handlers.getOrder(createReq({ params: { orderId: "500" } }), res, () => {});
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.id, 500);
  assert.equal(res.body.items[0].menu_item_id, 11);
});

test("POST /api/restaurants validation error", async () => {
  const q = createQueryMock();
  const handlers = loadHandlers({ query: q.query, withTransaction: async () => ({}) });
  const res = createRes();

  await handlers.createRestaurant(createReq({ body: { name: "Missing Slug" } }), res, () => {});
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, "name and slug are required");
});

test("GET /api/orders/:orderId not found", async () => {
  const q = createQueryMock();
  q.responses.push({ rows: [], rowCount: 0 });
  const handlers = loadHandlers({ query: q.query, withTransaction: async () => ({}) });
  const res = createRes();

  await handlers.getOrder(createReq({ params: { orderId: "9999" } }), res, () => {});
  assert.equal(res.statusCode, 404);
  assert.equal(res.body.error, "order not found");
});
