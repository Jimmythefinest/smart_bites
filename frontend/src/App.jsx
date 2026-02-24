import { useEffect, useMemo, useState } from "react";
import { api } from "./api";

const initialRestaurantForm = {
  name: "",
  slug: "",
  is_active: true,
  owner_full_name: "",
  owner_email: "",
  owner_password: "",
};
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
    title: "Admin Dashboard",
    description: "Manage restaurants and monitor platform activity.",
  },
  restaurant: {
    title: "Restaurant Dashboard",
    description: "Manage menu, inventory, and move orders through preparation.",
  },
  buyer: {
    title: "Buyer Dashboard",
    description: "Place orders and track status updates in real time.",
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

  const [authMode, setAuthMode] = useState("login");
  const [user, setUser] = useState(null);
  const [authPending, setAuthPending] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    full_name: "",
    email: "",
    password: "",
  });

  const [restaurants, setRestaurants] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [restaurantOrders, setRestaurantOrders] = useState([]);
  const [customerOrders, setCustomerOrders] = useState([]);

  const [selectedRestaurantId, setSelectedRestaurantId] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState("");

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
    if (!user) {
      return;
    }
    try {
      setError("");
      const [health, allRestaurants] = await Promise.all([api.health(), api.listRestaurants()]);
      setStatus(health.status === "ok" ? "API online" : "API unavailable");
      setRestaurants(allRestaurants);
      if (user.role === "restaurant" && user.managed_restaurant_id) {
        const managedId = String(user.managed_restaurant_id);
        setSelectedRestaurantId(managedId);
        setMenuForm((current) => ({ ...current, restaurantId: managedId }));
      } else if (!selectedRestaurantId && allRestaurants[0]) {
        const firstId = String(allRestaurants[0].id);
        setSelectedRestaurantId(firstId);
        setMenuForm((current) => ({ ...current, restaurantId: firstId }));
      }
    } catch (err) {
      setStatus("API offline");
      setErr(err.message);
    }
  }

  async function loadSession() {
    const token = api.getToken();
    if (!token) {
      setStatus("Sign in required");
      return;
    }

    try {
      const response = await api.me();
      setUser(response.user);
      setStatus("Authenticated");
      if (response.user.role === "buyer") {
        setOrderForm((current) => ({ ...current, customer_id: String(response.user.id) }));
        await refreshCustomerOrders(String(response.user.id));
      }
      if (response.user.role === "restaurant" && response.user.managed_restaurant_id) {
        const managedId = String(response.user.managed_restaurant_id);
        setSelectedRestaurantId(managedId);
        setMenuForm((current) => ({ ...current, restaurantId: managedId }));
      }
    } catch (_err) {
      api.setToken("");
      setUser(null);
      setStatus("Sign in required");
    }
  }

  useEffect(() => {
    loadSession();
  }, []);

  useEffect(() => {
    bootstrap();
  }, [user]);

  useEffect(() => {
    if (!selectedRestaurantId || !user) {
      setMenuItems([]);
      setRestaurantOrders([]);
      return;
    }
    refreshMenuItems(selectedRestaurantId);
    if (user.role === "restaurant") {
      refreshRestaurantOrders(selectedRestaurantId);
    }
  }, [selectedRestaurantId, user]);

  useEffect(() => {
    if (!selectedLocationId || !user || user.role !== "restaurant") {
      setInventory([]);
      return;
    }
    refreshInventory(selectedLocationId);
  }, [selectedLocationId, user]);

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
      if (user?.role === "buyer") {
        await refreshCustomerOrders(String(user.id));
      }
    } catch (err) {
      setErr(err.message);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    try {
      setAuthPending(true);
      const response = await api.login(loginForm);
      api.setToken(response.token);
      setUser(response.user);
      setStatus("Authenticated");
      setError("");
      if (response.user.role === "buyer") {
        setOrderForm((current) => ({ ...current, customer_id: String(response.user.id) }));
        await refreshCustomerOrders(String(response.user.id));
      }
      if (response.user.role === "restaurant" && response.user.managed_restaurant_id) {
        const managedId = String(response.user.managed_restaurant_id);
        setSelectedRestaurantId(managedId);
        setMenuForm((current) => ({ ...current, restaurantId: managedId }));
      }
    } catch (err) {
      setErr(err.message);
    } finally {
      setAuthPending(false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    try {
      setAuthPending(true);
      const response = await api.register(registerForm);
      api.setToken(response.token);
      setUser(response.user);
      setStatus("Authenticated");
      setError("");
      if (response.user.role === "buyer") {
        setOrderForm((current) => ({ ...current, customer_id: String(response.user.id) }));
      }
    } catch (err) {
      setErr(err.message);
    } finally {
      setAuthPending(false);
    }
  }

  function handleLogout() {
    api.setToken("");
    setUser(null);
    setStatus("Sign in required");
    setError("");
    setRestaurants([]);
    setMenuItems([]);
    setInventory([]);
    setRestaurantOrders([]);
    setCustomerOrders([]);
    setSelectedRestaurantId("");
    setSelectedLocationId("");
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
      const customerId = user?.role === "buyer" ? Number(user.id) : Number(orderForm.customer_id);
      const created = await api.createOrder({
        customer_id: customerId,
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
      if (user?.role === "buyer") {
        await refreshCustomerOrders(String(user.id));
      }
      setError("");
    } catch (err) {
      setErr(err.message);
    }
  }

  if (!user) {
    return (
      <main className="layout">
        <header className="hero reveal">
          <p className="tag">Smart Bites</p>
          <h1>Authentication</h1>
          <p>Sign in to access your dashboard.</p>
          {error ? <p className="error">{error}</p> : null}
        </header>

        <section className="grid">
          <Panel title="Account Access" footer="JWT session auth">
            <nav className="role-switcher" aria-label="Auth mode selector">
              <button
                type="button"
                className={authMode === "login" ? "active" : ""}
                onClick={() => setAuthMode("login")}
              >
                Login
              </button>
              <button
                type="button"
                className={authMode === "register" ? "active" : ""}
                onClick={() => setAuthMode("register")}
              >
                Register
              </button>
            </nav>

            {authMode === "login" ? (
              <form onSubmit={handleLogin} className="form">
                <Field
                  label="Email"
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm((c) => ({ ...c, email: e.target.value }))}
                  required
                />
                <Field
                  label="Password"
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm((c) => ({ ...c, password: e.target.value }))}
                  required
                />
                <button type="submit" disabled={authPending}>Sign In</button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="form">
                <Field
                  label="Full Name"
                  value={registerForm.full_name}
                  onChange={(e) => setRegisterForm((c) => ({ ...c, full_name: e.target.value }))}
                  required
                />
                <Field
                  label="Email"
                  type="email"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm((c) => ({ ...c, email: e.target.value }))}
                  required
                />
                <Field
                  label="Password"
                  type="password"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm((c) => ({ ...c, password: e.target.value }))}
                  required
                />
                <button type="submit" disabled={authPending}>Create Account</button>
              </form>
            )}
          </Panel>
        </section>
      </main>
    );
  }

  const currentRole = roleMeta[user.role] || roleMeta.buyer;

  return (
    <main className="layout">
      <header className="hero reveal">
        <div>
          <p className="tag">Smart Bites</p>
          <h1>{currentRole.title}</h1>
          <p>{currentRole.description}</p>
        </div>
        <div className="hero-controls">
          <div className="status-row">
            <span className={`pill ${status === "API online" || status === "Authenticated" ? "ok" : "bad"}`}>
              {status}
            </span>
            <span className="pill">{user.full_name} ({user.role})</span>
            <button type="button" onClick={bootstrap}>Refresh Data</button>
            <button type="button" onClick={handleLogout}>Logout</button>
          </div>
        </div>
        {error ? <p className="error">{error}</p> : null}
      </header>

      {user.role === "admin" ? (
        <>
          <section className="stats-grid">
            <StatCard label="Total Restaurants" value={restaurants.length} />
            <StatCard label="Active Restaurants" value={activeRestaurants} />
            <StatCard label="Menu Items (selected)" value={menuItems.length} />
            <StatCard label="Low Stock Alerts" value={lowStockCount} />
          </section>

          <section className="grid">
            <Panel title="Create Restaurant" footer="Admin only">
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
                <Field
                  label="Owner Full Name"
                  value={restaurantForm.owner_full_name}
                  onChange={(e) => setRestaurantForm((c) => ({ ...c, owner_full_name: e.target.value }))}
                  required
                />
                <Field
                  label="Owner Email"
                  type="email"
                  value={restaurantForm.owner_email}
                  onChange={(e) => setRestaurantForm((c) => ({ ...c, owner_email: e.target.value }))}
                  required
                />
                <Field
                  label="Owner Password"
                  type="password"
                  value={restaurantForm.owner_password}
                  onChange={(e) => setRestaurantForm((c) => ({ ...c, owner_password: e.target.value }))}
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

      {user.role === "restaurant" ? (
        <section className="grid">
          <Panel title="Context" footer="Your account is mapped to exactly one restaurant">
            <div className="form">
              <Field label="Restaurant ID" value={selectedRestaurantId} readOnly />
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

          <Panel title="Add Menu Item" footer={`${menuItems.length} menu item(s)`}>
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
        </section>
      ) : null}

      {user.role === "buyer" ? (
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
              <Field label="Customer ID" value={String(user.id)} readOnly />
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
            <div className="stack-row">
              <button type="button" onClick={() => refreshCustomerOrders(String(user.id))}>
                Refresh Status
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
              <p className="muted">No orders yet.</p>
            )}
          </Panel>
        </section>
      ) : null}
    </main>
  );
}
