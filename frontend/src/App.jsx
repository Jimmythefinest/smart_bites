import { useEffect, useMemo, useState } from "react";
import { api } from "./api";

const initialRestaurantForm = { name: "", slug: "", is_active: true };
const initialMenuForm = {
  restaurantId: "",
  name: "",
  description: "",
  base_price_cents: "",
  is_active: true,
};
const initialInventoryForm = {
  locationId: "",
  menuItemId: "",
  qty_on_hand: "",
  reorder_level: "",
};
const initialOrderForm = {
  customer_id: "",
  restaurant_id: "",
  location_id: "",
  order_type: "pickup",
  tax_cents: "0",
  delivery_fee_cents: "0",
  menu_item_id: "",
  quantity: "1",
};

function Panel({ title, children, footer }) {
  return (
    <section className="panel reveal">
      <h2>{title}</h2>
      <div className="panel-body">{children}</div>
      {footer ? <div className="panel-footer">{footer}</div> : null}
    </section>
  );
}

function Field({ label, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input {...props} />
    </label>
  );
}

export default function App() {
  const [status, setStatus] = useState("Checking API...");
  const [error, setError] = useState("");

  const [restaurants, setRestaurants] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [inventory, setInventory] = useState([]);

  const [restaurantForm, setRestaurantForm] = useState(initialRestaurantForm);
  const [menuForm, setMenuForm] = useState(initialMenuForm);
  const [inventoryForm, setInventoryForm] = useState(initialInventoryForm);
  const [orderForm, setOrderForm] = useState(initialOrderForm);
  const [orderResult, setOrderResult] = useState(null);

  const restaurantOptions = useMemo(
    () => restaurants.map((restaurant) => ({ value: String(restaurant.id), label: restaurant.name })),
    [restaurants]
  );

  const setErr = (message) => setError(message);

  async function bootstrap() {
    try {
      setError("");
      const [health, allRestaurants] = await Promise.all([api.health(), api.listRestaurants()]);
      setStatus(health.status === "ok" ? "API online" : "API unavailable");
      setRestaurants(allRestaurants);
    } catch (err) {
      setStatus("API offline");
      setErr(err.message);
    }
  }

  useEffect(() => {
    bootstrap();
  }, []);

  async function refreshMenuItems(restaurantId) {
    if (!restaurantId) {
      setMenuItems([]);
      return;
    }
    try {
      const rows = await api.listMenuItems(restaurantId);
      setMenuItems(rows);
      setError("");
    } catch (err) {
      setErr(err.message);
    }
  }

  async function refreshInventory(locationId) {
    if (!locationId) {
      setInventory([]);
      return;
    }
    try {
      const rows = await api.listInventory(locationId);
      setInventory(rows);
      setError("");
    } catch (err) {
      setErr(err.message);
    }
  }

  async function handleCreateRestaurant(event) {
    event.preventDefault();
    try {
      await api.createRestaurant(restaurantForm);
      setRestaurantForm(initialRestaurantForm);
      await bootstrap();
    } catch (err) {
      setErr(err.message);
    }
  }

  async function handleCreateMenuItem(event) {
    event.preventDefault();
    try {
      await api.createMenuItem(Number(menuForm.restaurantId), {
        name: menuForm.name,
        description: menuForm.description || null,
        base_price_cents: Number(menuForm.base_price_cents),
        is_active: menuForm.is_active,
      });
      await refreshMenuItems(menuForm.restaurantId);
      setMenuForm((current) => ({ ...initialMenuForm, restaurantId: current.restaurantId }));
    } catch (err) {
      setErr(err.message);
    }
  }

  async function handleInventoryUpsert(event) {
    event.preventDefault();
    try {
      await api.upsertInventory(Number(inventoryForm.locationId), Number(inventoryForm.menuItemId), {
        qty_on_hand: Number(inventoryForm.qty_on_hand),
        reorder_level: Number(inventoryForm.reorder_level),
      });
      await refreshInventory(inventoryForm.locationId);
      setInventoryForm((current) => ({ ...current, qty_on_hand: "", reorder_level: "" }));
    } catch (err) {
      setErr(err.message);
    }
  }

  async function handleCreateOrder(event) {
    event.preventDefault();
    try {
      const created = await api.createOrder({
        customer_id: Number(orderForm.customer_id),
        restaurant_id: Number(orderForm.restaurant_id),
        location_id: Number(orderForm.location_id),
        order_type: orderForm.order_type,
        tax_cents: Number(orderForm.tax_cents),
        delivery_fee_cents: Number(orderForm.delivery_fee_cents),
        items: [
          {
            menu_item_id: Number(orderForm.menu_item_id),
            quantity: Number(orderForm.quantity),
          },
        ],
      });
      setOrderResult(created);
      setError("");
    } catch (err) {
      setErr(err.message);
    }
  }

  return (
    <main className="layout">
      <header className="hero reveal">
        <p className="tag">Smart Bites</p>
        <h1>Restaurant Ops Console</h1>
        <p>
          Create restaurants, manage menu and inventory, and place orders from a single React frontend.
        </p>
        <div className="status-row">
          <span className={`pill ${status === "API online" ? "ok" : "bad"}`}>{status}</span>
          <button type="button" onClick={bootstrap}>Refresh</button>
        </div>
        {error ? <p className="error">{error}</p> : null}
      </header>

      <section className="grid">
        <Panel title="Restaurants" footer={`${restaurants.length} record(s)`}>
          <form onSubmit={handleCreateRestaurant} className="form">
            <Field
              label="Name"
              value={restaurantForm.name}
              onChange={(e) => setRestaurantForm((c) => ({ ...c, name: e.target.value }))}
              required
            />
            <Field
              label="Slug"
              value={restaurantForm.slug}
              onChange={(e) => setRestaurantForm((c) => ({ ...c, slug: e.target.value }))}
              required
            />
            <button type="submit">Create Restaurant</button>
          </form>
        </Panel>

        <Panel title="Menu Items" footer={`${menuItems.length} menu item(s)`}>
          <form onSubmit={handleCreateMenuItem} className="form">
            <label className="field">
              <span>Restaurant</span>
              <select
                value={menuForm.restaurantId}
                onChange={(e) => {
                  const next = e.target.value;
                  setMenuForm((c) => ({ ...c, restaurantId: next }));
                  refreshMenuItems(next);
                }}
                required
              >
                <option value="">Select restaurant</option>
                {restaurantOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <Field
              label="Name"
              value={menuForm.name}
              onChange={(e) => setMenuForm((c) => ({ ...c, name: e.target.value }))}
              required
            />
            <Field
              label="Description"
              value={menuForm.description}
              onChange={(e) => setMenuForm((c) => ({ ...c, description: e.target.value }))}
            />
            <Field
              label="Base Price (cents)"
              type="number"
              min="0"
              value={menuForm.base_price_cents}
              onChange={(e) => setMenuForm((c) => ({ ...c, base_price_cents: e.target.value }))}
              required
            />
            <button type="submit">Create Menu Item</button>
          </form>
        </Panel>

        <Panel title="Inventory" footer={`${inventory.length} inventory row(s)`}>
          <form onSubmit={handleInventoryUpsert} className="form">
            <Field
              label="Location ID"
              type="number"
              min="1"
              value={inventoryForm.locationId}
              onChange={(e) => {
                const next = e.target.value;
                setInventoryForm((c) => ({ ...c, locationId: next }));
                refreshInventory(next);
              }}
              required
            />
            <Field
              label="Menu Item ID"
              type="number"
              min="1"
              value={inventoryForm.menuItemId}
              onChange={(e) => setInventoryForm((c) => ({ ...c, menuItemId: e.target.value }))}
              required
            />
            <Field
              label="Qty On Hand"
              type="number"
              min="0"
              value={inventoryForm.qty_on_hand}
              onChange={(e) => setInventoryForm((c) => ({ ...c, qty_on_hand: e.target.value }))}
              required
            />
            <Field
              label="Reorder Level"
              type="number"
              min="0"
              value={inventoryForm.reorder_level}
              onChange={(e) => setInventoryForm((c) => ({ ...c, reorder_level: e.target.value }))}
              required
            />
            <button type="submit">Upsert Inventory</button>
          </form>
        </Panel>

        <Panel title="Create Order" footer={orderResult ? `Order #${orderResult.id} placed` : "No order yet"}>
          <form onSubmit={handleCreateOrder} className="form">
            <Field
              label="Customer ID"
              type="number"
              min="1"
              value={orderForm.customer_id}
              onChange={(e) => setOrderForm((c) => ({ ...c, customer_id: e.target.value }))}
              required
            />
            <Field
              label="Restaurant ID"
              type="number"
              min="1"
              value={orderForm.restaurant_id}
              onChange={(e) => setOrderForm((c) => ({ ...c, restaurant_id: e.target.value }))}
              required
            />
            <Field
              label="Location ID"
              type="number"
              min="1"
              value={orderForm.location_id}
              onChange={(e) => setOrderForm((c) => ({ ...c, location_id: e.target.value }))}
              required
            />
            <Field
              label="Menu Item ID"
              type="number"
              min="1"
              value={orderForm.menu_item_id}
              onChange={(e) => setOrderForm((c) => ({ ...c, menu_item_id: e.target.value }))}
              required
            />
            <Field
              label="Quantity"
              type="number"
              min="1"
              value={orderForm.quantity}
              onChange={(e) => setOrderForm((c) => ({ ...c, quantity: e.target.value }))}
              required
            />
            <Field
              label="Tax (cents)"
              type="number"
              min="0"
              value={orderForm.tax_cents}
              onChange={(e) => setOrderForm((c) => ({ ...c, tax_cents: e.target.value }))}
            />
            <Field
              label="Delivery Fee (cents)"
              type="number"
              min="0"
              value={orderForm.delivery_fee_cents}
              onChange={(e) => setOrderForm((c) => ({ ...c, delivery_fee_cents: e.target.value }))}
            />
            <label className="field">
              <span>Order Type</span>
              <select
                value={orderForm.order_type}
                onChange={(e) => setOrderForm((c) => ({ ...c, order_type: e.target.value }))}
              >
                <option value="pickup">Pickup</option>
                <option value="delivery">Delivery</option>
              </select>
            </label>
            <button type="submit">Place Order</button>
          </form>
        </Panel>
      </section>

      {orderResult ? (
        <section className="panel reveal">
          <h2>Latest Order Payload</h2>
          <pre>{JSON.stringify(orderResult, null, 2)}</pre>
        </section>
      ) : null}
    </main>
  );
}
