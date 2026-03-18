import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api";

const initialRestaurantForm = {
  name: "",
  slug: "",
  is_active: true,
  profile_image_url: "",
  background_image_url: "",
  blurb: "",
  owner_full_name: "",
  owner_email: "",
  owner_password: "",
};
const initialMenuForm = {
  restaurantId: "",
  name: "",
  description: "",
  profile_image_url: "",
  background_image_url: "",
  blurb: "",
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
  completed: "Prepared",
};
const ORDER_POLL_MS = 500;
const tabsByRole = {
  admin: [
    { id: "home", label: "Home" },
    { id: "restaurants", label: "Restaurants" },
    { id: "provision", label: "Provision Account" },
  ],
  restaurant: [
    { id: "home", label: "Home" },
    { id: "manage", label: "Manage" },
    { id: "orders", label: "Order Queue" },
    { id: "new_meal", label: "New Meal" },
    { id: "inventory", label: "Inventory" },
  ],
  buyer: [
    { id: "home", label: "Home" },
    { id: "my_orders", label: "My Orders" },
    { id: "order_meal", label: "Order New Meal" },
  ],
};
function formatCurrency(cents) {
  return `$${(Number(cents || 0) / 100).toFixed(2)}`;
}

function formatOrderStatus(status) {
  return statusLabel[status] || status;
}

function Panel({ title, children, footer }) {
  return (
    <section className="panel reveal transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl">
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

function ImageUploadField({ label, onUploaded, onError, onSuccess }) {
  const [pending, setPending] = useState(false);
  const [selectedName, setSelectedName] = useState("");

  async function handleChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setSelectedName(file.name);
      setPending(true);
      const response = await api.uploadImage(file);
      onUploaded(response.url);
      onError("");
      onSuccess?.("Image uploaded");
    } catch (err) {
      onError(err.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <label className="upload-field">
      <span>{label}</span>
      <input type="file" accept="image/*" onChange={handleChange} disabled={pending} />
      <small>
        {pending
          ? `Uploading ${selectedName || "image"}...`
          : selectedName
            ? `Selected: ${selectedName}`
            : "Choose an image file to upload"}
      </small>
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

function BrandBlock({ subtitle }) {
  return (
    <div className="brand-block">
      <div className="brand-mark">
        <img src="/images/logo.png" alt="Smart Bites logo" />
      </div>
      <div>
        <p className="tag">Smart Bites</p>
        <h1>{subtitle}</h1>
      </div>
    </div>
  );
}

export default function App() {
  const [status, setStatus] = useState("Checking API...");
  const [error, setError] = useState("");
  const [toasts, setToasts] = useState([]);

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
  const [allMenuItems, setAllMenuItems] = useState([]);
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
  const [cartItems, setCartItems] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [profileForm, setProfileForm] = useState({
    name: "",
    profile_image_url: "",
    background_image_url: "",
    blurb: "",
    is_active: true,
  });
  const [editingMenuItemId, setEditingMenuItemId] = useState("");
  const [menuEditForm, setMenuEditForm] = useState({
    name: "",
    description: "",
    profile_image_url: "",
    background_image_url: "",
    blurb: "",
    base_price_cents: "",
    is_active: true,
  });
  const previousCustomerOrderStatusesRef = useRef(new Map());
  const previousRestaurantOrderIdsRef = useRef(new Set());

  const restaurantOptions = useMemo(
    () => restaurants.map((restaurant) => ({ value: String(restaurant.id), label: restaurant.name })),
    [restaurants]
  );
  const selectedRestaurant = useMemo(
    () => restaurants.find((restaurant) => String(restaurant.id) === selectedRestaurantId) || null,
    [restaurants, selectedRestaurantId]
  );

  const activeRestaurants = useMemo(
    () => restaurants.filter((restaurant) => restaurant.is_active).length,
    [restaurants]
  );

  const lowStockCount = useMemo(
    () => inventory.filter((row) => Number(row.qty_on_hand) <= Number(row.reorder_level)).length,
    [inventory]
  );
  const inactiveRestaurants = useMemo(
    () => restaurants.filter((restaurant) => !restaurant.is_active).length,
    [restaurants]
  );
  const recentRestaurants = useMemo(() => restaurants.slice(0, 3), [restaurants]);
  const orderQueueCount = useMemo(
    () => restaurantOrders.filter((order) => order.status !== "completed").length,
    [restaurantOrders]
  );
  const completedOrderCount = useMemo(
    () => restaurantOrders.filter((order) => order.status === "completed").length,
    [restaurantOrders]
  );
  const recentRestaurantOrders = useMemo(() => restaurantOrders.slice(0, 4), [restaurantOrders]);
  const topMenuItems = useMemo(() => menuItems.slice(0, 4), [menuItems]);
  const activeBuyerRestaurants = useMemo(
    () => restaurants.filter((restaurant) => restaurant.is_active),
    [restaurants]
  );
  const filteredCatalogItems = useMemo(() => {
    if (!selectedRestaurantId) {
      return allMenuItems;
    }
    return allMenuItems.filter((item) => String(item.restaurant_id) === selectedRestaurantId);
  }, [allMenuItems, selectedRestaurantId]);
  const cartRestaurantId = useMemo(
    () => (cartItems[0] ? String(cartItems[0].restaurant_id) : ""),
    [cartItems]
  );
  const cartSubtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + Number(item.base_price_cents) * Number(item.quantity), 0),
    [cartItems]
  );
  const cartItemCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + Number(item.quantity), 0),
    [cartItems]
  );

  function setErr(message) {
    setError(message);
    if (message) {
      const id = Date.now() + Math.random();
      setToasts((current) => [...current, { id, type: "error", message }]);
      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, 3200);
    }
  }

  function pushToast(message, type = "success") {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, type, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 2600);
  }

  async function refreshAllMenuItems(restaurantRows) {
    const activeRows = restaurantRows.filter((restaurant) => restaurant.is_active);
    if (!activeRows.length) {
      setAllMenuItems([]);
      return;
    }

    try {
      const results = await Promise.all(
        activeRows.map(async (restaurant) => {
          const items = await api.listMenuItems(restaurant.id);
          return items.map((item) => ({
            ...item,
            restaurant_id: restaurant.id,
            restaurant_name: restaurant.name,
            restaurant_blurb: restaurant.blurb,
          }));
        })
      );
      setAllMenuItems(results.flat());
    } catch (err) {
      setErr(err.message);
    }
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
      if (user.role === "buyer") {
        await refreshAllMenuItems(allRestaurants);
      }
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
    setActiveTab("home");
  }, [user?.role]);

  useEffect(() => {
    if (!selectedRestaurantId || !user) {
      setMenuItems([]);
      setRestaurantOrders([]);
      setProfileForm({
        name: "",
        profile_image_url: "",
        background_image_url: "",
        blurb: "",
        is_active: true,
      });
      return;
    }
    refreshMenuItems(selectedRestaurantId);
    if (user.role === "restaurant") {
      refreshRestaurantOrders(selectedRestaurantId);
    }
  }, [selectedRestaurantId, user]);

  useEffect(() => {
    if (!selectedRestaurant) {
      return;
    }
    setProfileForm({
      name: selectedRestaurant.name || "",
      profile_image_url: selectedRestaurant.profile_image_url || "",
      background_image_url: selectedRestaurant.background_image_url || "",
      blurb: selectedRestaurant.blurb || "",
      is_active: Boolean(selectedRestaurant.is_active),
    });
  }, [selectedRestaurant?.id]);

  useEffect(() => {
    if (!selectedLocationId || !user || user.role !== "restaurant") {
      setInventory([]);
      return;
    }
    refreshInventory(selectedLocationId);
  }, [selectedLocationId, user]);

  useEffect(() => {
    if (!user || user.role !== "restaurant" || !selectedRestaurantId) {
      return undefined;
    }

    const timer = setInterval(() => {
      refreshRestaurantOrders(selectedRestaurantId);
    }, ORDER_POLL_MS);

    return () => clearInterval(timer);
  }, [user, selectedRestaurantId]);

  useEffect(() => {
    if (!user || user.role !== "buyer") {
      return undefined;
    }

    const timer = setInterval(() => {
      refreshCustomerOrders(String(user.id));
    }, ORDER_POLL_MS);

    return () => clearInterval(timer);
  }, [user]);

  useEffect(() => {
    if (!user || user.role !== "buyer") {
      previousCustomerOrderStatusesRef.current = new Map();
      return;
    }

    const previousStatuses = previousCustomerOrderStatusesRef.current;
    customerOrders.forEach((order) => {
      const previousStatus = previousStatuses.get(order.id);
      if (previousStatus && previousStatus !== order.status) {
        if (order.status === "preparing") {
          pushToast(`Order #${order.id} moved to preparation`, "info");
        } else if (order.status === "completed") {
          pushToast(`Order #${order.id} is prepared`, "success");
        } else {
          pushToast(`Order #${order.id} is now ${formatOrderStatus(order.status)}`, "info");
        }
      }
    });

    previousCustomerOrderStatusesRef.current = new Map(
      customerOrders.map((order) => [order.id, order.status])
    );
  }, [customerOrders, user]);

  useEffect(() => {
    if (!user || user.role !== "restaurant") {
      previousRestaurantOrderIdsRef.current = new Set();
      return;
    }

    const previousOrderIds = previousRestaurantOrderIdsRef.current;
    restaurantOrders.forEach((order) => {
      if (previousOrderIds.size && !previousOrderIds.has(order.id)) {
        pushToast(`New order #${order.id} received`, "info");
      }
    });

    previousRestaurantOrderIdsRef.current = new Set(restaurantOrders.map((order) => order.id));
  }, [restaurantOrders, user]);

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
      const transitionMessage = {
        preparing: "Order moved to preparation",
        completed: "Order moved to prepared",
      };
      pushToast(
        transitionMessage[nextStatus] || `Order moved to ${formatOrderStatus(nextStatus)}`,
        nextStatus === "completed" ? "success" : "info"
      );
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
      pushToast("Signed in");
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
      pushToast("Account created");
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
    setAllMenuItems([]);
    setInventory([]);
    setRestaurantOrders([]);
    setCustomerOrders([]);
    setCartItems([]);
    setSelectedRestaurantId("");
    setSelectedLocationId("");
    pushToast("Signed out");
  }

  async function handleCreateRestaurant(event) {
    event.preventDefault();
    try {
      await api.createRestaurant(restaurantForm);
      setRestaurantForm(initialRestaurantForm);
      await bootstrap();
      pushToast("Restaurant created");
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
        profile_image_url: menuForm.profile_image_url || null,
        background_image_url: menuForm.background_image_url || null,
        blurb: menuForm.blurb || null,
        base_price_cents: Number(menuForm.base_price_cents),
        is_active: menuForm.is_active,
      });
      await refreshMenuItems(restaurantId);
      setMenuForm((current) => ({
        ...initialMenuForm,
        restaurantId: current.restaurantId || restaurantId,
      }));
      pushToast("Meal created");
    } catch (err) {
      setErr(err.message);
    }
  }

  async function handleUpdateRestaurantProfile(event) {
    event.preventDefault();
    if (!selectedRestaurantId) {
      setErr("No restaurant selected.");
      return;
    }
    try {
      await api.updateRestaurantProfile(Number(selectedRestaurantId), {
        name: profileForm.name,
        profile_image_url: profileForm.profile_image_url || null,
        background_image_url: profileForm.background_image_url || null,
        blurb: profileForm.blurb || null,
        is_active: Boolean(profileForm.is_active),
      });
      await bootstrap();
      setError("");
      pushToast("Restaurant profile updated");
    } catch (err) {
      setErr(err.message);
    }
  }

  function beginEditMenuItem(item) {
    setEditingMenuItemId(String(item.id));
    setMenuEditForm({
      name: item.name || "",
      description: item.description || "",
      profile_image_url: item.profile_image_url || "",
      background_image_url: item.background_image_url || "",
      blurb: item.blurb || "",
      base_price_cents: String(item.base_price_cents || ""),
      is_active: Boolean(item.is_active),
    });
  }

  async function handleUpdateMenuItem(event) {
    event.preventDefault();
    if (!selectedRestaurantId || !editingMenuItemId) {
      setErr("Select a menu item to edit.");
      return;
    }
    try {
      await api.updateMenuItem(Number(selectedRestaurantId), Number(editingMenuItemId), {
        name: menuEditForm.name,
        description: menuEditForm.description || null,
        profile_image_url: menuEditForm.profile_image_url || null,
        background_image_url: menuEditForm.background_image_url || null,
        blurb: menuEditForm.blurb || null,
        base_price_cents: Number(menuEditForm.base_price_cents),
        is_active: Boolean(menuEditForm.is_active),
      });
      await refreshMenuItems(selectedRestaurantId);
      setEditingMenuItemId("");
      setError("");
      pushToast("Meal updated");
    } catch (err) {
      setErr(err.message);
    }
  }

  async function handleDeleteMenuItem(menuItemId) {
    if (!selectedRestaurantId) {
      setErr("No restaurant selected.");
      return;
    }
    try {
      await api.deleteMenuItem(Number(selectedRestaurantId), Number(menuItemId));
      await refreshMenuItems(selectedRestaurantId);
      if (String(menuItemId) === editingMenuItemId) {
        setEditingMenuItemId("");
      }
      setError("");
      pushToast("Meal deleted");
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
      pushToast("Inventory saved");
    } catch (err) {
      setErr(err.message);
    }
  }

  async function handleCreateOrder(event) {
    event.preventDefault();
    const restaurantId = cartRestaurantId || selectedRestaurantId || orderForm.restaurant_id;
    if (!restaurantId || !cartItems.length) {
      setErr("Add items to your cart before placing the order.");
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
        items: cartItems.map((item) => ({
          menu_item_id: Number(item.id),
          quantity: Number(item.quantity),
        })),
      });
      setOrderResult(created);
      setCartItems([]);
      setCartOpen(false);
      setOrderForm((current) => ({ ...current, location_id: "", tax_cents: "0", delivery_fee_cents: "0" }));
      if (user?.role === "buyer") {
        await refreshCustomerOrders(String(user.id));
        await refreshAllMenuItems(restaurants);
      }
      setError("");
      pushToast("Order placed");
    } catch (err) {
      setErr(err.message);
    }
  }

  function addToCart(item) {
    setCartItems((current) => {
      const itemRestaurantId = String(item.restaurant_id);
      if (current.length && String(current[0].restaurant_id) !== itemRestaurantId) {
        setErr("Cart can only contain items from one restaurant at a time.");
        return current;
      }

      const existing = current.find((entry) => entry.id === item.id);
      if (existing) {
        pushToast("Meal quantity updated");
        return current.map((entry) =>
          entry.id === item.id ? { ...entry, quantity: entry.quantity + 1 } : entry
        );
      }

      setSelectedRestaurantId(itemRestaurantId);
      setOrderForm((prev) => ({ ...prev, restaurant_id: itemRestaurantId }));
      setError("");
      pushToast("Meal added to cart");
      return [...current, { ...item, quantity: 1 }];
    });
  }

  function updateCartQuantity(itemId, nextQuantity) {
    if (nextQuantity <= 0) {
      setCartItems((current) => current.filter((item) => item.id !== itemId));
      return;
    }
    setCartItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, quantity: nextQuantity } : item))
    );
  }

  function clearCart() {
    setCartItems([]);
    setCartOpen(false);
    pushToast("Cart cleared");
  }

  if (!user) {
    return (
      <main className="layout auth-layout app-shell auth-shell antialiased">
        <div className="toast-stack" aria-live="polite" aria-atomic="true">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast ${toast.type}`}>{toast.message}</div>
          ))}
        </div>
        <section className="auth-overlay reveal">
          <div className="auth-scrim" aria-hidden="true" />
          <section className="auth-modal" aria-label="Account access">
            <div className="auth-modal-head">
              <div>
                <p className="auth-eyebrow">Account Access</p>
                <h2>{authMode === "login" ? "Welcome back" : "Create your account"}</h2>
                <p className="auth-subtitle">Sign in to access your dashboard, menu workflow, and live order status.</p>
              </div>
              <div className="brand-mark small">
                <img src="/images/logo.png" alt="" />
              </div>
            </div>

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

            {error ? <p className="error auth-error">{error}</p> : null}

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

            <p className="auth-note">JWT session auth</p>
          </section>
        </section>
      </main>
    );
  }

  const roleTabs = tabsByRole[user.role] || tabsByRole.buyer;
  const currentRole = roleMeta[user.role] || roleMeta.buyer;

  return (
    <main className={`layout full-layout app-shell role-${user.role} antialiased`}>
      <div className="toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type}`}>{toast.message}</div>
        ))}
      </div>
      <header className="hero reveal">
        <div className="hero-row">
          <div className="hero-copy">
            <BrandBlock subtitle={currentRole.title} />
            <p>{currentRole.description}</p>
            <div className="hero-kpis">
              <span className="pill soft">{restaurants.length} restaurants</span>
              <span className="pill soft">{menuItems.length} meals loaded</span>
              <span className="pill soft">{formatOrderStatus(orderResult?.status || "placed")}</span>
            </div>
          </div>
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

      <nav className="workspace-tabs" aria-label="Workspace tabs">
        {roleTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={tab.id === activeTab ? "active" : ""}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <section className={`tab-stage shadow-2xl ${user.role === "admin" ? "admin-stage" : ""}`}>
        {user.role === "admin" && activeTab === "home" ? (
          <div className="tab-grid">
            <Panel title="Platform Snapshot" footer="Live metrics">
              <section className="stats-grid">
                <StatCard label="Total Restaurants" value={restaurants.length} />
                <StatCard label="Active Restaurants" value={activeRestaurants} />
                <StatCard label="Inactive Restaurants" value={inactiveRestaurants} />
                <StatCard label="Low Stock Alerts" value={lowStockCount} />
              </section>
            </Panel>
            <div className="dashboard-grid">
              <Panel title="Recent Restaurants" footer="Latest directory snapshot">
                {recentRestaurants.length ? (
                  <ul className="data-list dashboard-list">
                    {recentRestaurants.map((restaurant) => (
                      <li key={restaurant.id}>
                        <div className="list-head">
                          <strong>{restaurant.name}</strong>
                          <span className={`pill ${restaurant.is_active ? "ok" : "bad"}`}>
                            {restaurant.is_active ? "active" : "inactive"}
                          </span>
                        </div>
                        <span>slug: {restaurant.slug}</span>
                        <span>{restaurant.blurb || "No restaurant blurb yet."}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">No restaurants found.</p>
                )}
              </Panel>
              <Panel title="Owner Actions" footer="Admin workflow">
                <div className="dashboard-actions">
                  <button type="button" onClick={() => setActiveTab("provision")}>Create Restaurant Account</button>
                  <button type="button" onClick={() => setActiveTab("restaurants")}>Review Directory</button>
                  <button type="button" onClick={bootstrap}>Refresh Platform Data</button>
                </div>
                <div className="dashboard-note">
                  <strong>Current focus</strong>
                  <span>Use Provision Account to onboard owners, then review branding and activity in Restaurants.</span>
                </div>
              </Panel>
            </div>
          </div>
        ) : null}

        {user.role === "admin" && activeTab === "restaurants" ? (
          <div className="tab-grid">
            <Panel title="Restaurant Directory" footer={`${restaurants.length} record(s)`}>
              {restaurants.length ? (
                <ul className="data-list admin-directory-list">
                  {restaurants.map((restaurant) => (
                    <li key={restaurant.id}>
                      {restaurant.background_image_url ? (
                        <img className="feature-image" src={restaurant.background_image_url} alt={restaurant.name} />
                      ) : null}
                      <strong>{restaurant.name}</strong>
                      <span>slug: {restaurant.slug}</span>
                      <span>{restaurant.blurb || "No restaurant blurb yet."}</span>
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
          </div>
        ) : null}

        {user.role === "admin" && activeTab === "provision" ? (
          <div className="tab-grid">
            <Panel title="Provision Restaurant Account" footer="Admin only">
              <form onSubmit={handleCreateRestaurant} className="form admin-provision-form">
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
                  label="Profile Image URL"
                  value={restaurantForm.profile_image_url}
                  onChange={(e) => setRestaurantForm((c) => ({ ...c, profile_image_url: e.target.value }))}
                />
                <ImageUploadField
                  label="Upload Profile Image"
                  onUploaded={(url) => setRestaurantForm((c) => ({ ...c, profile_image_url: url }))}
                  onError={setErr}
                  onSuccess={pushToast}
                />
                <Field
                  label="Background Image URL"
                  value={restaurantForm.background_image_url}
                  onChange={(e) =>
                    setRestaurantForm((c) => ({ ...c, background_image_url: e.target.value }))
                  }
                />
                <ImageUploadField
                  label="Upload Background Image"
                  onUploaded={(url) => setRestaurantForm((c) => ({ ...c, background_image_url: url }))}
                  onError={setErr}
                  onSuccess={pushToast}
                />
                <Field
                  label="Restaurant Blurb"
                  value={restaurantForm.blurb}
                  onChange={(e) => setRestaurantForm((c) => ({ ...c, blurb: e.target.value }))}
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
                <div className="form-action-span">
                  <button type="submit">Create Restaurant</button>
                </div>
              </form>
            </Panel>
          </div>
        ) : null}

        {user.role === "restaurant" && activeTab === "home" ? (
          <div className="tab-grid">
            <Panel title="Restaurant Dashboard" footer="Operational overview">
              <section className="stats-grid">
                <StatCard label="Restaurant ID" value={selectedRestaurantId || "-"} />
                <StatCard label="Live Menu Items" value={menuItems.length} />
                <StatCard label="Open Orders" value={orderQueueCount} />
                <StatCard label="Low Stock Alerts" value={lowStockCount} />
              </section>
            </Panel>
            <div className="dashboard-grid">
              <Panel title="Store Context" footer="Restaurant owner controls">
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
                <div className="dashboard-actions">
                  <button type="button" onClick={() => setActiveTab("manage")}>Manage Profile & Meals</button>
                  <button type="button" onClick={() => setActiveTab("orders")}>Open Order Queue</button>
                  <button type="button" onClick={() => setActiveTab("inventory")}>Check Inventory</button>
                </div>
              </Panel>
              <Panel title="Kitchen Visual" footer="Brand atmosphere">
                <img
                  className="feature-image"
                  src={selectedRestaurant?.background_image_url || "/images/burger-card.jpg"}
                  alt="Kitchen feature"
                />
                <p className="muted">{selectedRestaurant?.blurb || "Add a short restaurant blurb for buyers."}</p>
              </Panel>
            </div>
            <div className="dashboard-grid">
              <Panel title="Recent Orders" footer={`${completedOrderCount} completed`}>
                {recentRestaurantOrders.length ? (
                  <ul className="data-list dashboard-list">
                    {recentRestaurantOrders.map((order) => (
                      <li key={order.id}>
                        <div className="list-head">
                          <strong>Order #{order.id}</strong>
                          <span className="status-chip">{formatOrderStatus(order.status)}</span>
                        </div>
                        <span>Customer #{order.customer_id} • {order.order_type}</span>
                        <span>Total {formatCurrency(order.total_cents)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">No orders found for this restaurant yet.</p>
                )}
              </Panel>
              <Panel title="Menu Snapshot" footer="Featured items in your current menu">
                {topMenuItems.length ? (
                  <ul className="data-list dashboard-list">
                    {topMenuItems.map((item) => (
                      <li key={item.id}>
                        <div className="list-head">
                          <strong>{item.name}</strong>
                          <span>{formatCurrency(item.base_price_cents)}</span>
                        </div>
                        <span>{item.blurb || item.description || "No description"}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">No meals yet. Add one from New Meal or Manage.</p>
                )}
              </Panel>
            </div>
          </div>
        ) : null}

        {user.role === "restaurant" && activeTab === "manage" ? (
          <div className="tab-grid two-col">
            <Panel title="Restaurant Profile" footer="Update profile image, background, and bio">
              <form onSubmit={handleUpdateRestaurantProfile} className="form">
                <Field
                  label="Display Name"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm((c) => ({ ...c, name: e.target.value }))}
                  required
                />
                <Field
                  label="Profile Image URL"
                  value={profileForm.profile_image_url}
                  onChange={(e) => setProfileForm((c) => ({ ...c, profile_image_url: e.target.value }))}
                />
                <ImageUploadField
                  label="Upload Profile Image"
                  onUploaded={(url) => setProfileForm((c) => ({ ...c, profile_image_url: url }))}
                  onError={setErr}
                  onSuccess={pushToast}
                />
                <Field
                  label="Background Image URL"
                  value={profileForm.background_image_url}
                  onChange={(e) => setProfileForm((c) => ({ ...c, background_image_url: e.target.value }))}
                />
                <ImageUploadField
                  label="Upload Background Image"
                  onUploaded={(url) => setProfileForm((c) => ({ ...c, background_image_url: url }))}
                  onError={setErr}
                  onSuccess={pushToast}
                />
                <Field
                  label="Bio / Blurb"
                  value={profileForm.blurb}
                  onChange={(e) => setProfileForm((c) => ({ ...c, blurb: e.target.value }))}
                />
                <button type="submit">Save Profile</button>
              </form>
            </Panel>

            <Panel title="Meals CRUD" footer={`${menuItems.length} meal(s)`}>
              <form onSubmit={handleCreateMenuItem} className="form">
                <Field
                  label="New Meal Name"
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
                  label="Profile Image URL"
                  value={menuForm.profile_image_url}
                  onChange={(e) => setMenuForm((c) => ({ ...c, profile_image_url: e.target.value }))}
                />
                <ImageUploadField
                  label="Upload Profile Image"
                  onUploaded={(url) => setMenuForm((c) => ({ ...c, profile_image_url: url }))}
                  onError={setErr}
                  onSuccess={pushToast}
                />
                <Field
                  label="Background Image URL"
                  value={menuForm.background_image_url}
                  onChange={(e) => setMenuForm((c) => ({ ...c, background_image_url: e.target.value }))}
                />
                <ImageUploadField
                  label="Upload Background Image"
                  onUploaded={(url) => setMenuForm((c) => ({ ...c, background_image_url: url }))}
                  onError={setErr}
                  onSuccess={pushToast}
                />
                <Field
                  label="Blurb"
                  value={menuForm.blurb}
                  onChange={(e) => setMenuForm((c) => ({ ...c, blurb: e.target.value }))}
                />
                <Field
                  label="Base Price (cents)"
                  type="number"
                  min="0"
                  value={menuForm.base_price_cents}
                  onChange={(e) => setMenuForm((c) => ({ ...c, base_price_cents: e.target.value }))}
                  required
                />
                <button type="submit">Create Meal</button>
              </form>

              {menuItems.length ? (
                <ul className="data-list">
                  {menuItems.map((item) => (
                    <li key={item.id}>
                      <strong>{item.name}</strong>
                      <span>{formatCurrency(item.base_price_cents)}</span>
                      <div className="actions-row">
                        <button type="button" onClick={() => beginEditMenuItem(item)}>Edit</button>
                        <button type="button" onClick={() => handleDeleteMenuItem(item.id)}>Delete</button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No meals yet.</p>
              )}
            </Panel>

            {editingMenuItemId ? (
              <Panel title={`Edit Meal #${editingMenuItemId}`} footer="Update selected meal">
                <form onSubmit={handleUpdateMenuItem} className="form">
                  <Field
                    label="Name"
                    value={menuEditForm.name}
                    onChange={(e) => setMenuEditForm((c) => ({ ...c, name: e.target.value }))}
                    required
                  />
                  <Field
                    label="Description"
                    value={menuEditForm.description}
                    onChange={(e) => setMenuEditForm((c) => ({ ...c, description: e.target.value }))}
                  />
                  <Field
                    label="Profile Image URL"
                    value={menuEditForm.profile_image_url}
                    onChange={(e) => setMenuEditForm((c) => ({ ...c, profile_image_url: e.target.value }))}
                  />
                  <ImageUploadField
                    label="Upload Profile Image"
                    onUploaded={(url) => setMenuEditForm((c) => ({ ...c, profile_image_url: url }))}
                    onError={setErr}
                    onSuccess={pushToast}
                  />
                  <Field
                    label="Background Image URL"
                    value={menuEditForm.background_image_url}
                    onChange={(e) => setMenuEditForm((c) => ({ ...c, background_image_url: e.target.value }))}
                  />
                  <ImageUploadField
                    label="Upload Background Image"
                    onUploaded={(url) => setMenuEditForm((c) => ({ ...c, background_image_url: url }))}
                    onError={setErr}
                    onSuccess={pushToast}
                  />
                  <Field
                    label="Blurb"
                    value={menuEditForm.blurb}
                    onChange={(e) => setMenuEditForm((c) => ({ ...c, blurb: e.target.value }))}
                  />
                  <Field
                    label="Base Price (cents)"
                    type="number"
                    min="0"
                    value={menuEditForm.base_price_cents}
                    onChange={(e) => setMenuEditForm((c) => ({ ...c, base_price_cents: e.target.value }))}
                    required
                  />
                  <div className="actions-row">
                    <button type="submit">Save Meal</button>
                    <button type="button" onClick={() => setEditingMenuItemId("")}>Cancel</button>
                  </div>
                </form>
              </Panel>
            ) : null}
          </div>
        ) : null}

        {user.role === "restaurant" && activeTab === "orders" ? (
          <div className="tab-grid">
            <Panel
              title="Order Queue"
              footer={`${restaurantOrders.length} order(s) • auto-updates every ${ORDER_POLL_MS / 1000}s`}
            >
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
                      <span>Total {formatCurrency(order.total_cents)}</span>
                      <span className="status-chip">Status: {formatOrderStatus(order.status)}</span>
                      <div className="actions-row">
                        {order.status === "placed" ? (
                          <button
                            type="button"
                            onClick={() => handleUpdateOrderStatus(order.id, "preparing")}
                          >
                            Move to Preparation
                          </button>
                        ) : null}
                        {order.status === "preparing" ? (
                          <button
                            type="button"
                            onClick={() => handleUpdateOrderStatus(order.id, "completed")}
                          >
                            Mark Prepared
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
          </div>
        ) : null}

        {user.role === "restaurant" && activeTab === "new_meal" ? (
          <div className="tab-grid">
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
                  label="Meal Profile Image URL"
                  value={menuForm.profile_image_url}
                  onChange={(e) => setMenuForm((c) => ({ ...c, profile_image_url: e.target.value }))}
                />
                <ImageUploadField
                  label="Upload Meal Profile Image"
                  onUploaded={(url) => setMenuForm((c) => ({ ...c, profile_image_url: url }))}
                  onError={setErr}
                  onSuccess={pushToast}
                />
                <Field
                  label="Meal Background Image URL"
                  value={menuForm.background_image_url}
                  onChange={(e) => setMenuForm((c) => ({ ...c, background_image_url: e.target.value }))}
                />
                <ImageUploadField
                  label="Upload Meal Background Image"
                  onUploaded={(url) => setMenuForm((c) => ({ ...c, background_image_url: url }))}
                  onError={setErr}
                  onSuccess={pushToast}
                />
                <Field
                  label="Meal Blurb"
                  value={menuForm.blurb}
                  onChange={(e) => setMenuForm((c) => ({ ...c, blurb: e.target.value }))}
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
          </div>
        ) : null}

        {user.role === "restaurant" && activeTab === "inventory" ? (
          <div className="tab-grid two-col">
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

            <Panel title="Live Inventory" footer="Current location snapshot">
              {inventory.length ? (
                <ul className="data-list">
                  {inventory.map((row) => (
                    <li key={`${row.location_id}-${row.menu_item_id}`}>
                      <strong>{row.menu_item_name}</strong>
                      <span>On Hand: {row.qty_on_hand}</span>
                      <span>Reorder Level: {row.reorder_level}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">Set location ID to load inventory.</p>
              )}
            </Panel>
          </div>
        ) : null}

        {user.role === "buyer" && activeTab === "home" ? (
          <div className="tab-grid two-col">
            <Panel title="Restaurant List" footer={`${activeBuyerRestaurants.length} available`}>
              {activeBuyerRestaurants.length ? (
                <ul className="data-list compact">
                  {activeBuyerRestaurants.map((restaurant) => (
                    <li key={restaurant.id}>
                      {restaurant.profile_image_url ? (
                        <img className="avatar-image" src={restaurant.profile_image_url} alt={restaurant.name} />
                      ) : null}
                      <strong>{restaurant.name}</strong>
                      <span>{restaurant.blurb || "No intro yet."}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = String(restaurant.id);
                          setSelectedRestaurantId(next);
                          setOrderForm((current) => ({ ...current, restaurant_id: next }));
                          setActiveTab("order_meal");
                        }}
                      >
                        Order
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No restaurants available.</p>
              )}
            </Panel>
            <Panel title="Catalog Snapshot" footer={`${allMenuItems.length} items across all restaurants`}>
              {allMenuItems.length ? (
                <ul className="data-list dashboard-list">
                  {allMenuItems.slice(0, 4).map((item) => (
                    <li key={`${item.restaurant_id}-${item.id}`}>
                      {item.background_image_url ? (
                        <img className="menu-inline-image" src={item.background_image_url} alt={item.name} />
                      ) : item.profile_image_url ? (
                        <img className="menu-inline-image" src={item.profile_image_url} alt={item.name} />
                      ) : null}
                      <div className="list-head">
                        <strong>{item.name}</strong>
                        <span>{formatCurrency(item.base_price_cents)}</span>
                      </div>
                      <span>{item.restaurant_name}</span>
                      <span>{item.blurb || item.description || "No description"}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No meals available yet.</p>
              )}
            </Panel>
          </div>
        ) : null}

        {user.role === "buyer" && activeTab === "order_meal" ? (
          <div className="tab-grid buyer-order-stage">
            <Panel title="Browse Menu" footer={`${filteredCatalogItems.length} item(s) shown`}>
              <div className="catalog-controls">
                <label className="field">
                  <span>Restaurant Filter</span>
                  <select
                    value={selectedRestaurantId}
                    onChange={(e) => {
                      const next = e.target.value;
                      setSelectedRestaurantId(next);
                      setOrderForm((current) => ({ ...current, restaurant_id: next }));
                    }}
                  >
                    <option value="">All restaurants</option>
                    {restaurantOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              </div>
              {filteredCatalogItems.length ? (
                <div className="menu-catalog">
                  {filteredCatalogItems.map((item) => (
                    <article key={`${item.restaurant_id}-${item.id}`} className="menu-card">
                      {item.background_image_url ? (
                        <img className="menu-card-image" src={item.background_image_url} alt={item.name} />
                      ) : item.profile_image_url ? (
                        <img className="menu-card-image" src={item.profile_image_url} alt={item.name} />
                      ) : null}
                      <div className="menu-card-body">
                        <div className="list-head">
                          <strong>{item.name}</strong>
                          <span>{formatCurrency(item.base_price_cents)}</span>
                        </div>
                        <span className="menu-card-restaurant">{item.restaurant_name}</span>
                        <p className="muted">{item.blurb || item.description || "No description"}</p>
                        <button type="button" onClick={() => addToCart(item)}>Add to Cart</button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="muted">No menu items available for this filter.</p>
              )}
            </Panel>
            <button
              type="button"
              className="floating-cart-button"
              onClick={() => setCartOpen(true)}
            >
              Cart ({cartItemCount})
            </button>
            {cartOpen ? (
              <div className="cart-modal-layer" role="dialog" aria-modal="true" aria-label="Cart and checkout">
                <button type="button" className="cart-backdrop" onClick={() => setCartOpen(false)} aria-label="Close cart" />
                <section className="cart-modal">
                  <div className="cart-modal-head">
                    <div>
                      <h2>Cart & Checkout</h2>
                      <p className="muted">
                        {orderResult ? `Order #${orderResult.id} placed` : `${cartItemCount} item(s) in cart`}
                      </p>
                    </div>
                    <button type="button" onClick={() => setCartOpen(false)}>Close</button>
                  </div>
                  <form onSubmit={handleCreateOrder} className="form">
                    <Field
                      label="Restaurant"
                      value={cartItems[0]?.restaurant_name || "Add items to begin"}
                      readOnly
                    />
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
                    {cartItems.length ? (
                      <div className="cart-list">
                        {cartItems.map((item) => (
                          <div key={item.id} className="cart-row">
                            <div className="cart-item-main">
                              {item.background_image_url ? (
                                <img className="cart-item-image" src={item.background_image_url} alt={item.name} />
                              ) : item.profile_image_url ? (
                                <img className="cart-item-image" src={item.profile_image_url} alt={item.name} />
                              ) : null}
                              <div>
                              <strong>{item.name}</strong>
                              <span>{formatCurrency(item.base_price_cents)} each</span>
                              </div>
                            </div>
                            <div className="cart-controls">
                              <button type="button" onClick={() => updateCartQuantity(item.id, item.quantity - 1)}>-</button>
                              <span>{item.quantity}</span>
                              <button type="button" onClick={() => updateCartQuantity(item.id, item.quantity + 1)}>+</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="muted">Your cart is empty.</p>
                    )}
                    <div className="checkout-summary">
                      <span>Subtotal</span>
                      <strong>{formatCurrency(cartSubtotal)}</strong>
                    </div>
                    <div className="checkout-summary">
                      <span>Estimated total</span>
                      <strong>
                        {formatCurrency(
                          cartSubtotal + Number(orderForm.tax_cents || 0) + Number(orderForm.delivery_fee_cents || 0)
                        )}
                      </strong>
                    </div>
                    <div className="actions-row">
                      <button type="submit" disabled={!cartItems.length}>Place Order</button>
                      <button type="button" onClick={clearCart} disabled={!cartItems.length}>Clear Cart</button>
                    </div>
                  </form>
                </section>
              </div>
            ) : null}
          </div>
        ) : null}

        {user.role === "buyer" && activeTab === "my_orders" ? (
          <div className="tab-grid">
            <Panel title="My Orders" footer={`${customerOrders.length} order(s) • auto-updates every ${ORDER_POLL_MS / 1000}s`}>
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
                      <span>Total {formatCurrency(order.total_cents)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No orders yet.</p>
              )}
            </Panel>
          </div>
        ) : null}
      </section>
    </main>
  );
}
