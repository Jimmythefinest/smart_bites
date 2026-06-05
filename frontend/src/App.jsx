import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api";
import { AuthPage } from "./pages/AuthPage";
import { AppShell } from "./pages/AppShell";
import { AdminPage } from "./pages/AdminPage";
import { BuyerPage } from "./pages/BuyerPage";
import { RestaurantPage } from "./pages/RestaurantPage";

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
    { id: "home", label: "Home", icon: "dashboard" },
    { id: "restaurants", label: "Restaurants", icon: "storefront" },
    { id: "provision", label: "Provision Account", icon: "person_add" },
  ],
  restaurant: [
    { id: "home", label: "Home", icon: "dashboard" },
    { id: "manage", label: "Manage", icon: "restaurant_menu" },
    { id: "orders", label: "Order Queue", icon: "receipt_long" },
    { id: "new_meal", label: "New Meal", icon: "add_circle" },
    { id: "inventory", label: "Inventory", icon: "inventory_2" },
  ],
  buyer: [
    { id: "home", label: "Home", icon: "home" },
    { id: "my_orders", label: "My Orders", icon: "receipt_long" },
    { id: "order_meal", label: "Order New Meal", icon: "shopping_basket" },
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
      <span className="stat-dot" aria-hidden="true" />
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
      const created = await api.createRestaurant(restaurantForm);
      setRestaurantForm(initialRestaurantForm);
      if (created?.restaurant?.id) {
        setSelectedRestaurantId(String(created.restaurant.id));
      }
      setActiveTab("restaurants");
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
      <AuthPage
        authMode={authMode}
        setAuthMode={setAuthMode}
        error={error}
        authPending={authPending}
        loginForm={loginForm}
        setLoginForm={setLoginForm}
        registerForm={registerForm}
        setRegisterForm={setRegisterForm}
        handleLogin={handleLogin}
        handleRegister={handleRegister}
        toasts={toasts}
      />
    );
  }

  const roleTabs = tabsByRole[user.role] || tabsByRole.buyer;
  const currentRole = roleMeta[user.role] || roleMeta.buyer;
  const pageCtx = {
    activeTab,
    setActiveTab,
    user,
    status,
    error,
    toasts,
    restaurants,
    menuItems,
    allMenuItems,
    inventory,
    restaurantOrders,
    customerOrders,
    selectedRestaurantId,
    setSelectedRestaurantId,
    selectedLocationId,
    setSelectedLocationId,
    selectedRestaurant,
    activeRestaurants,
    inactiveRestaurants,
    lowStockCount,
    recentRestaurants,
    orderQueueCount,
    completedOrderCount,
    recentRestaurantOrders,
    topMenuItems,
    activeBuyerRestaurants,
    filteredCatalogItems,
    restaurantOptions,
    restaurantForm,
    setRestaurantForm,
    handleCreateRestaurant,
    menuForm,
    setMenuForm,
    inventoryForm,
    setInventoryForm,
    orderForm,
    setOrderForm,
    orderResult,
    cartItems,
    cartItemCount,
    cartSubtotal,
    cartOpen,
    setCartOpen,
    addToCart,
    updateCartQuantity,
    handleCreateOrder,
    clearCart,
    profileForm,
    setProfileForm,
    editingMenuItemId,
    setEditingMenuItemId,
    menuEditForm,
    setMenuEditForm,
    beginEditMenuItem,
    handleDeleteMenuItem,
    handleUpdateMenuItem,
    handleUpdateRestaurantProfile,
    handleCreateMenuItem,
    handleInventoryUpsert,
    handleUpdateOrderStatus,
    refreshRestaurantOrders,
    refreshCustomerOrders,
    refreshAllMenuItems,
    bootstrap,
    handleLogout,
    setErr,
    pushToast,
  };

  const page = user.role === "admin"
    ? <AdminPage ctx={pageCtx} />
    : user.role === "restaurant"
      ? <RestaurantPage ctx={pageCtx} />
      : <BuyerPage ctx={pageCtx} />;

  if (user.role === "buyer") {
    return page;
  }

  return (
    <AppShell
      user={user}
      status={status}
      error={error}
      toasts={toasts}
      roleTabs={roleTabs}
      currentRole={currentRole}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      restaurants={restaurants}
      menuItems={menuItems}
      orderStatus={formatOrderStatus(orderResult?.status || "placed")}
      bootstrap={bootstrap}
      handleLogout={handleLogout}
    >
      {page}
    </AppShell>
  );
}
