const express = require("express");
const { query, withTransaction } = require("../lib/db");

const router = express.Router();
const handlers = {};

function asId(value, name) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    const err = new Error(`${name} must be a positive integer`);
    err.status = 400;
    throw err;
  }
  return parsed;
}

handlers.health = async (_req, res, next) => {
  try {
    await query("select 1");
    res.json({ status: "ok" });
  } catch (error) {
    next(error);
  }
};
router.get("/health", handlers.health);

handlers.listRestaurants = async (_req, res, next) => {
  try {
    const result = await query(
      "select id, name, slug, is_active, created_at from restaurants order by created_at desc"
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};
router.get("/restaurants", handlers.listRestaurants);

handlers.createRestaurant = async (req, res, next) => {
  try {
    const { name, slug, is_active = true } = req.body;
    if (!name || !slug) {
      return res.status(400).json({ error: "name and slug are required" });
    }

    const result = await query(
      "insert into restaurants (name, slug, is_active) values ($1, $2, $3) returning *",
      [name, slug, Boolean(is_active)]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};
router.post("/restaurants", handlers.createRestaurant);

handlers.listMenuItems = async (req, res, next) => {
  try {
    const restaurantId = asId(req.params.restaurantId, "restaurantId");
    const result = await query(
      `select id, restaurant_id, category_id, name, description, base_price_cents, is_active
       from menu_items
       where restaurant_id = $1
       order by id desc`,
      [restaurantId]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};
router.get("/restaurants/:restaurantId/menu-items", handlers.listMenuItems);

handlers.createMenuItem = async (req, res, next) => {
  try {
    const restaurantId = asId(req.params.restaurantId, "restaurantId");
    const {
      category_id = null,
      name,
      description = null,
      base_price_cents,
      is_active = true,
    } = req.body;

    if (!name || !Number.isInteger(base_price_cents) || base_price_cents < 0) {
      return res
        .status(400)
        .json({ error: "name and non-negative integer base_price_cents are required" });
    }

    const result = await query(
      `insert into menu_items
      (restaurant_id, category_id, name, description, base_price_cents, is_active)
      values ($1, $2, $3, $4, $5, $6)
      returning *`,
      [restaurantId, category_id, name, description, base_price_cents, Boolean(is_active)]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};
router.post("/restaurants/:restaurantId/menu-items", handlers.createMenuItem);

handlers.listInventory = async (req, res, next) => {
  try {
    const locationId = asId(req.params.locationId, "locationId");
    const result = await query(
      `select
        mi.location_id,
        mi.menu_item_id,
        m.name as menu_item_name,
        mi.qty_on_hand,
        mi.reorder_level,
        mi.par_level,
        mi.track_inventory,
        mi.is_out_of_stock,
        mi.updated_at
      from menu_item_inventory mi
      join menu_items m on m.id = mi.menu_item_id
      where mi.location_id = $1
      order by mi.menu_item_id`,
      [locationId]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};
router.get("/locations/:locationId/inventory", handlers.listInventory);

handlers.upsertInventory = async (req, res, next) => {
  try {
    const locationId = asId(req.params.locationId, "locationId");
    const menuItemId = asId(req.params.menuItemId, "menuItemId");
    const {
      qty_on_hand = 0,
      reorder_level = 0,
      par_level = null,
      track_inventory = true,
      is_out_of_stock = false,
    } = req.body;

    if (Number(qty_on_hand) < 0) {
      return res.status(400).json({ error: "qty_on_hand must be >= 0" });
    }

    const result = await query(
      `insert into menu_item_inventory
      (location_id, menu_item_id, qty_on_hand, reorder_level, par_level, track_inventory, is_out_of_stock, updated_at)
      values ($1, $2, $3, $4, $5, $6, $7, now())
      on conflict (location_id, menu_item_id) do update set
        qty_on_hand = excluded.qty_on_hand,
        reorder_level = excluded.reorder_level,
        par_level = excluded.par_level,
        track_inventory = excluded.track_inventory,
        is_out_of_stock = excluded.is_out_of_stock,
        updated_at = now()
      returning *`,
      [
        locationId,
        menuItemId,
        Number(qty_on_hand),
        Number(reorder_level),
        par_level !== null ? Number(par_level) : null,
        Boolean(track_inventory),
        Boolean(is_out_of_stock),
      ]
    );
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};
router.put("/locations/:locationId/menu-items/:menuItemId/inventory", handlers.upsertInventory);

handlers.createInventoryTransaction = async (req, res, next) => {
  try {
    const locationId = asId(req.params.locationId, "locationId");
    const menuItemId = asId(req.params.menuItemId, "menuItemId");
    const { txn_type, qty_delta, reason = null, created_by = null, order_id = null } = req.body;

    const allowedTxnTypes = ["restock", "sale", "waste", "adjustment", "return"];
    if (!allowedTxnTypes.includes(txn_type)) {
      return res.status(400).json({ error: "invalid txn_type" });
    }
    if (typeof qty_delta !== "number" || Number.isNaN(qty_delta) || qty_delta === 0) {
      return res.status(400).json({ error: "qty_delta must be a non-zero number" });
    }

    const payload = await withTransaction(async (client) => {
      const current = await client.query(
        `select qty_on_hand
           from menu_item_inventory
           where location_id = $1 and menu_item_id = $2
           for update`,
        [locationId, menuItemId]
      );

      const currentQty = current.rows[0] ? Number(current.rows[0].qty_on_hand) : 0;
      const nextQty = currentQty + qty_delta;
      if (nextQty < 0) {
        const err = new Error("inventory cannot go below zero");
        err.status = 400;
        throw err;
      }

      await client.query(
        `insert into menu_item_inventory
          (location_id, menu_item_id, qty_on_hand, reorder_level, track_inventory, is_out_of_stock, updated_at)
          values ($1, $2, 0, 0, true, false, now())
          on conflict (location_id, menu_item_id) do nothing`,
        [locationId, menuItemId]
      );

      const txResult = await client.query(
        `insert into inventory_transactions
          (location_id, menu_item_id, order_id, txn_type, qty_delta, reason, created_by)
          values ($1, $2, $3, $4, $5, $6, $7)
          returning *`,
        [locationId, menuItemId, order_id, txn_type, qty_delta, reason, created_by]
      );

      const invResult = await client.query(
        `update menu_item_inventory
           set qty_on_hand = $3, updated_at = now()
           where location_id = $1 and menu_item_id = $2
           returning *`,
        [locationId, menuItemId, nextQty]
      );

      return {
        transaction: txResult.rows[0],
        inventory: invResult.rows[0],
      };
    });

    res.status(201).json(payload);
  } catch (error) {
    next(error);
  }
};
router.post(
  "/locations/:locationId/menu-items/:menuItemId/inventory/transactions",
  handlers.createInventoryTransaction
);

handlers.createOrder = async (req, res, next) => {
  try {
    const {
      customer_id,
      restaurant_id,
      location_id,
      delivery_address_id = null,
      order_type,
      tax_cents = 0,
      delivery_fee_cents = 0,
      items,
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "items must be a non-empty array" });
    }
    if (!["pickup", "delivery"].includes(order_type)) {
      return res.status(400).json({ error: "order_type must be pickup or delivery" });
    }

    const itemIds = items.map((item) => Number(item.menu_item_id));
    const menuItemsResult = await query(
      `select id, name, base_price_cents
       from menu_items
       where restaurant_id = $1 and id = any($2::bigint[]) and is_active = true`,
      [restaurant_id, itemIds]
    );
    const menuItemMap = new Map(menuItemsResult.rows.map((row) => [Number(row.id), row]));

    let subtotalCents = 0;
    const orderItems = [];
    for (const item of items) {
      const menuItemId = Number(item.menu_item_id);
      const quantity = Number(item.quantity);
      const menuItem = menuItemMap.get(menuItemId);
      if (!menuItem) {
        return res.status(400).json({ error: `invalid menu_item_id: ${menuItemId}` });
      }
      if (!Number.isInteger(quantity) || quantity <= 0) {
        return res.status(400).json({ error: `invalid quantity for menu_item_id ${menuItemId}` });
      }

      const unitPrice = Number(menuItem.base_price_cents);
      subtotalCents += unitPrice * quantity;
      orderItems.push({
        menu_item_id: menuItemId,
        item_name_snapshot: menuItem.name,
        unit_price_cents: unitPrice,
        quantity,
      });
    }

    const totalCents = subtotalCents + Number(tax_cents) + Number(delivery_fee_cents);
    const created = await withTransaction(async (client) => {
      const orderResult = await client.query(
        `insert into orders
        (customer_id, restaurant_id, location_id, delivery_address_id, order_type, status, subtotal_cents, tax_cents, delivery_fee_cents, total_cents)
        values ($1, $2, $3, $4, $5, 'placed', $6, $7, $8, $9)
        returning *`,
        [
          customer_id,
          restaurant_id,
          location_id,
          delivery_address_id,
          order_type,
          subtotalCents,
          Number(tax_cents),
          Number(delivery_fee_cents),
          totalCents,
        ]
      );
      const order = orderResult.rows[0];

      for (const item of orderItems) {
        await client.query(
          `insert into order_items
          (order_id, menu_item_id, item_name_snapshot, unit_price_cents, quantity)
          values ($1, $2, $3, $4, $5)`,
          [
            order.id,
            item.menu_item_id,
            item.item_name_snapshot,
            item.unit_price_cents,
            item.quantity,
          ]
        );
      }

      return order;
    });

    res.status(201).json({
      ...created,
      items: orderItems,
    });
  } catch (error) {
    next(error);
  }
};
router.post("/orders", handlers.createOrder);

handlers.listRestaurantOrders = async (req, res, next) => {
  try {
    const restaurantId = asId(req.params.restaurantId, "restaurantId");
    const result = await query(
      `select
        o.id,
        o.customer_id,
        o.restaurant_id,
        o.location_id,
        o.order_type,
        o.status,
        o.subtotal_cents,
        o.tax_cents,
        o.delivery_fee_cents,
        o.total_cents,
        o.created_at
      from orders o
      where o.restaurant_id = $1
      order by o.created_at desc`,
      [restaurantId]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};
router.get("/restaurants/:restaurantId/orders", handlers.listRestaurantOrders);

handlers.listCustomerOrders = async (req, res, next) => {
  try {
    const customerId = asId(req.params.customerId, "customerId");
    const result = await query(
      `select
        o.id,
        o.customer_id,
        o.restaurant_id,
        r.name as restaurant_name,
        o.location_id,
        o.order_type,
        o.status,
        o.total_cents,
        o.created_at
      from orders o
      join restaurants r on r.id = o.restaurant_id
      where o.customer_id = $1
      order by o.created_at desc`,
      [customerId]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};
router.get("/customers/:customerId/orders", handlers.listCustomerOrders);

handlers.updateOrderStatus = async (req, res, next) => {
  try {
    const orderId = asId(req.params.orderId, "orderId");
    const statusAliases = {
      preparation: "preparing",
      done: "completed",
    };

    const rawStatus = String(req.body.status || "").trim().toLowerCase();
    const requestedStatus = statusAliases[rawStatus] || rawStatus;
    const allowedStatuses = new Set(["placed", "preparing", "completed"]);
    if (!allowedStatuses.has(requestedStatus)) {
      return res.status(400).json({
        error: "status must be one of: placed, preparation/preparing, done/completed",
      });
    }

    const orderResult = await query("select id, status from orders where id = $1", [orderId]);
    if (orderResult.rowCount === 0) {
      return res.status(404).json({ error: "order not found" });
    }

    const currentStatus = orderResult.rows[0].status;
    const allowedTransitions = {
      placed: ["placed", "preparing"],
      preparing: ["preparing", "completed"],
      completed: ["completed"],
    };
    if (!allowedTransitions[currentStatus] || !allowedTransitions[currentStatus].includes(requestedStatus)) {
      return res.status(400).json({
        error: `invalid status transition from ${currentStatus} to ${requestedStatus}`,
      });
    }

    const updated = await query(
      "update orders set status = $2 where id = $1 returning *",
      [orderId, requestedStatus]
    );
    res.json(updated.rows[0]);
  } catch (error) {
    next(error);
  }
};
router.patch("/orders/:orderId/status", handlers.updateOrderStatus);

handlers.getOrder = async (req, res, next) => {
  try {
    const orderId = asId(req.params.orderId, "orderId");
    const orderResult = await query("select * from orders where id = $1", [orderId]);
    if (orderResult.rowCount === 0) {
      return res.status(404).json({ error: "order not found" });
    }
    const itemsResult = await query(
      `select id, menu_item_id, item_name_snapshot, unit_price_cents, quantity
       from order_items
       where order_id = $1
       order by id`,
      [orderId]
    );
    res.json({
      ...orderResult.rows[0],
      items: itemsResult.rows,
    });
  } catch (error) {
    next(error);
  }
};
router.get("/orders/:orderId", handlers.getOrder);

module.exports = {
  router,
  handlers,
};
