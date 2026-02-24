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

const roleMeta = {
  admin: {
    label: "Admin",
    title: "Admin Dashboard",
    description: "Control restaurants, monitor platform metrics, and manage onboarding.",
  },
  restaurant: {
    label: "Restaurant",
    title: "Restaurant Dashboard",
    description: "Maintain menu, tune stock levels, and progress orders from placed to done.",
  },
  buyer: {
    label: "Buyer",
    title: "Buyer Dashboard",
    description: "Browse restaurants, place orders, and track preparation progress.",
  },
};

const statusLabel = {
  placed: "Placed",
  preparing: "Preparation",
  completed: "Done",
};

function formatOrderStatus(status) {
  return statusLabel[status] || status;
}

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

function StatCard({ label, value }) {
  return (
    <article className="stat-card reveal">
      <p>{label}</p>
      <h3>{value}</h3>
    </article>
  );
}

export default function App() {
  const [status, setStatus] = useState("Checking API...");
  const [error, setError] = useState("");

  const [role, setRole] = useState("admin");
  const [restaurants, setRestaurants] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [restaurantOrders, setRestaurantOrders] = useState([]);
  const [customerOrders, setCustomerOrders] = useState([]);

  const [selectedRestaurantId, setSelectedRestaurantId] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [customerTrackingId, setCustomerTrackingId] = useState("");

  const [restaurantForm, setRestaurantForm] = useState(initialRestaurantForm);
  const [menuForm, setMenuForm] = useState(initialMenuForm);
  const [inventoryForm, setInventoryForm] = useState(initialInventoryForm);
  const [orderForm, setOrderForm] = useState(initialOrderForm);
  const [orderResult, setOrderResult] = useState(null);

  const restaurantOptions = useMemo(
    () => restaurants.map((restaurant) => ({ value: String(restaurant.id), label: restaurant.name })),
    [restaurants]
  );

  const activeRestaurants = useMemo(
    () => restaurants.filter((restaurant) => restaurant.is_active).length,
    [restaurants]
  );

  const lowStockCount = useMemo(
    () => inventory.filter((row) => Number(row.qty_on_hand) <= Number(row.reorder_level)).length,
    [inventory]
  );

  function setErr(message) {
    setError(message);
  }

  async function bootstrap() {
    try {
      setError("");
      const [health, allRestaurants] = await Promise.all([api.health(), api.listRestaurants()]);
      setStatus(health.status === "ok" ? "API online" : "API unavailable");
      setRestaurants(allRestaurants);
      if (!selectedRestaurantId && allRestaurants[0]) {
        const firstId = String(allRestaurants[0].id);
        setSelectedRestaurantId(firstId);
        setMenuForm((current) => ({ ...current, restaurantId: firstId }));
      }
    } catch (err) {
      setStatus("API offline");
      setErr(err.message);
    }
  }

  useEffect(() => {
    bootstrap();
  }, []);

  useEffect(() => {
    if (!selectedRestaurantId) {
      setMenuItems([]);
      setRestaurantOrders([]);
      return;
    }
    refreshMenuItems(selectedRestaurantId);
    refreshRestaurantOrders(selectedRestaurantId);
  }, [selectedRestaurantId]);

  useEffect(() => {
    if (!selectedLocationId) {
      setInventory([]);
      return;
    }
    refreshInventory(selectedLocationId);
  }, [selectedLocationId]);

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

  async function refreshRestaurantOrders(restaurantId) {
    if (!restaurantId) {
      setRestaurantOrders([]);
      return;
    }
    try {
      const rows = await api.listRestaurantOrders(restaurantId);
      setRestaurantOrders(rows);
      setError("");
    } catch (err) {
      setErr(err.message);
    }
  }

  async function refreshCustomerOrders(customerId) {
    if (!customerId) {
      setCustomerOrders([]);
      return;
    }
    try {
      const rows = await api.listCustomerOrders(customerId);
      setCustomerOrders(rows);
      setError("");
    } catch (err) {
      setErr(err.message);
    }
  }

  async function handleUpdateOrderStatus(orderId, nextStatus) {
    try {
      await api.updateOrderStatus(orderId, nextStatus);
      if (selectedRestaurantId) {
        await refreshRestaurantOrders(selectedRestaurantId);
      }
      if (customerTrackingId) {
        await refreshCustomerOrders(customerTrackingId);
      }
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
    const restaurantId = menuForm.restaurantId || selectedRestaurantId;
    if (!restaurantId) {
      setErr("Select a restaurant before creating menu items.");
      return;
    }

    try {
      await api.createMenuItem(Number(restaurantId), {
        name: menuForm.name,
        description: menuForm.description || null,
        base_price_cents: Number(menuForm.base_price_cents),
        is_active: menuForm.is_active,
      });
      await refreshMenuItems(restaurantId);
      setMenuForm((current) => ({
        ...initialMenuForm,
        restaurantId: current.restaurantId || restaurantId,
      }));
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
    const restaurantId = selectedRestaurantId || orderForm.restaurant_id;
    if (!restaurantId) {
      setErr("Choose a restaurant before placing the order.");
      return;
    }

    try {
      const created = await api.createOrder({
        customer_id: Number(orderForm.customer_id),
        restaurant_id: Number(restaurantId),
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
      const customerId = String(created.customer_id);
      setCustomerTrackingId(customerId);
      await refreshCustomerOrders(customerId);
      setError("");
    } catch (err) {
      setErr(err.message);
    }
  }

  const currentRole = roleMeta[role];

  return (
    <main className="layout">
      <header className="hero reveal">
        <div>
          <p className="tag">Smart Bites Frontend</p>
          <h1>{currentRole.title}</h1>
          <p>{currentRole.description}</p>
        </div>
        <div className="hero-controls">
          <div className="status-row">
            <span className={`pill ${status === "API online" ? "ok" : "bad"}`}>{status}</span>
            <button type="button" onClick={bootstrap}>Refresh Data</button>
          </div>
          <nav className="role-switcher" aria-label="Dashboard role selector">
            {Object.entries(roleMeta).map(([key, value]) => (
              <button
                key={key}
                type="button"
                className={key === role ? "active" : ""}
                onClick={() => setRole(key)}
              >
                {value.label}
              </button>
            ))}
          </nav>
        </div>
        {error ? <p className="error">{error}</p> : null}
      </header>

      {role === "admin" ? (
        <>
          <section className="stats-grid">
            <StatCard label="Total Restaurants" value={restaurants.length} />
            <StatCard label="Active Restaurants" value={activeRestaurants} />
            <StatCard label="Menu Items (selected)" value={menuItems.length} />
            <StatCard label="Low Stock Alerts" value={lowStockCount} />
          </section>

          <section className="grid">
            <Panel title="Create Restaurant" footer="New partner onboarding">
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

            <Panel title="Restaurant Directory" footer={`${restaurants.length} record(s)`}>
              {restaurants.length ? (
                <ul className="data-list">
                  {restaurants.map((restaurant) => (
                    <li key={restaurant.id}>
                      <strong>{restaurant.name}</strong>
                      <span>slug: {restaurant.slug}</span>
                      <span className={`pill ${restaurant.is_active ? "ok" : "bad"}`}>
                        {restaurant.is_active ? "active" : "inactive"}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No restaurants found.</p>
              )}
            </Panel>
          </section>
        </>
      ) : null}

      {role === "restaurant" ? (
        <section className="grid">
          <Panel title="Context" footer="Select restaurant and location to load menu, inventory, and orders">
            <div className="form">
              <label className="field">
                <span>Restaurant</span>
                <select
                  value={selectedRestaurantId}
                  onChange={(e) => {
                    const next = e.target.value;
                    setSelectedRestaurantId(next);
                    setMenuForm((current) => ({ ...current, restaurantId: next }));
                    setOrderForm((current) => ({ ...current, restaurant_id: next }));
                  }}
                >
                  <option value="">Select restaurant</option>
                  {restaurantOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <Field
                label="Location ID"
                type="number"
                min="1"
                value={selectedLocationId}
                onChange={(e) => {
                  const next = e.target.value;
                  setSelectedLocationId(next);
                  setInventoryForm((current) => ({ ...current, locationId: next }));
                }}
              />
            </div>
          </Panel>

          <Panel title="Order Queue" footer={`${restaurantOrders.length} order(s)`}>
            <div className="stack-row">
              <button
                type="button"
                onClick={() => refreshRestaurantOrders(selectedRestaurantId)}
                disabled={!selectedRestaurantId}
              >
                Refresh Orders
              </button>
            </div>
            {restaurantOrders.length ? (
              <ul className="data-list">
                {restaurantOrders.map((order) => (
                  <li key={order.id}>
                    <strong>Order #{order.id}</strong>
                    <span>Customer #{order.customer_id} • {order.order_type}</span>
                    <span>Total ${(Number(order.total_cents) / 100).toFixed(2)}</span>
                    <span className="status-chip">Status: {formatOrderStatus(order.status)}</span>
                    <div className="actions-row">
                      {order.status === "placed" ? (
                        <button
                          type="button"
                          onClick={() => handleUpdateOrderStatus(order.id, "preparation")}
                        >
                          Move to Preparation
                        </button>
                      ) : null}
                      {order.status === "preparing" ? (
                        <button
                          type="button"
                          onClick={() => handleUpdateOrderStatus(order.id, "done")}
                        >
                          Mark Done
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No orders found for this restaurant yet.</p>
            )}
          </Panel>

          <Panel title="Add Menu Item" footer={`${menuItems.length} menu item(s) loaded`}>
            <form onSubmit={handleCreateMenuItem} className="form">
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

          <Panel title="Upsert Inventory" footer={`${inventory.length} inventory row(s)`}>
            <form onSubmit={handleInventoryUpsert} className="form">
              <Field
                label="Location ID"
                type="number"
                min="1"
                value={inventoryForm.locationId}
                onChange={(e) => setInventoryForm((c) => ({ ...c, locationId: e.target.value }))}
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
              <button type="submit">Save Inventory</button>
            </form>
          </Panel>

          <Panel title="Live Menu" footer="Current selection">
            {menuItems.length ? (
              <ul className="data-list compact">
                {menuItems.map((item) => (
                  <li key={item.id}>
                    <strong>{item.name}</strong>
                    <span>{item.description || "No description"}</span>
                    <span>${(Number(item.base_price_cents) / 100).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Choose a restaurant to view menu items.</p>
            )}
          </Panel>
        </section>
      ) : null}

      {role === "buyer" ? (
        <section className="grid">
          <Panel title="Browse Restaurants" footer={`${restaurants.length} available`}>
            {restaurants.length ? (
              <ul className="data-list compact">
                {restaurants.map((restaurant) => (
                  <li key={restaurant.id}>
                    <strong>{restaurant.name}</strong>
                    <button
                      type="button"
                      onClick={() => {
                        const next = String(restaurant.id);
                        setSelectedRestaurantId(next);
                        setOrderForm((current) => ({ ...current, restaurant_id: next }));
                      }}
                    >
                      Select
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No restaurants available.</p>
            )}
          </Panel>

          <Panel title="Place Order" footer={orderResult ? `Order #${orderResult.id} placed` : "No order yet"}>
            <form onSubmit={handleCreateOrder} className="form">
              <label className="field">
                <span>Restaurant</span>
                <select
                  value={selectedRestaurantId}
                  onChange={(e) => {
                    const next = e.target.value;
                    setSelectedRestaurantId(next);
                    setOrderForm((current) => ({ ...current, restaurant_id: next }));
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
                label="Customer ID"
                type="number"
                min="1"
                value={orderForm.customer_id}
                onChange={(e) => setOrderForm((c) => ({ ...c, customer_id: e.target.value }))}
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
              <label className="field">
                <span>Menu Item</span>
                <select
                  value={orderForm.menu_item_id}
                  onChange={(e) => setOrderForm((c) => ({ ...c, menu_item_id: e.target.value }))}
                  required
                >
                  <option value="">Select item</option>
                  {menuItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} - ${(Number(item.base_price_cents) / 100).toFixed(2)}
                    </option>
                  ))}
                </select>
              </label>
              <Field
                label="Quantity"
                type="number"
                min="1"
                value={orderForm.quantity}
                onChange={(e) => setOrderForm((c) => ({ ...c, quantity: e.target.value }))}
                required
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
              <button type="submit">Place Order</button>
            </form>
          </Panel>

          <Panel title="My Orders" footer={`${customerOrders.length} order(s)`}>
            <div className="form-inline">
              <Field
                label="Customer ID"
                type="number"
                min="1"
                value={customerTrackingId}
                onChange={(e) => setCustomerTrackingId(e.target.value)}
              />
              <button
                type="button"
                onClick={() => refreshCustomerOrders(customerTrackingId)}
                disabled={!customerTrackingId}
              >
                Check Status
              </button>
            </div>
            {customerOrders.length ? (
              <ul className="data-list">
                {customerOrders.map((order) => (
                  <li key={order.id}>
                    <strong>Order #{order.id}</strong>
                    <span>{order.restaurant_name}</span>
                    <span>Status: {formatOrderStatus(order.status)}</span>
                    <span>Total ${(Number(order.total_cents) / 100).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Enter customer ID to view order progress.</p>
            )}
          </Panel>

          {orderResult ? (
            <Panel title="Latest Order Payload" footer="Returned by API">
              <pre>{JSON.stringify(orderResult, null, 2)}</pre>
            </Panel>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
