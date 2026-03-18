const tokenKey = "smart_bites_token";

function getToken() {
  return localStorage.getItem(tokenKey) || "";
}

function setToken(token) {
  if (token) {
    localStorage.setItem(tokenKey, token);
  } else {
    localStorage.removeItem(tokenKey);
  }
}

async function request(path, options = {}) {
  const token = getToken();
  const response = await fetch(path, {
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = payload && typeof payload === "object" && payload.error
      ? payload.error
      : `request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

export const api = {
  getToken,
  setToken,
  health: () => request("/api/health"),
  register: (body) =>
    request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  login: (body) =>
    request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  me: () => request("/api/auth/me"),
  listRestaurants: () => request("/api/restaurants"),
  createRestaurant: (body) =>
    request("/api/restaurants", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateRestaurantProfile: (restaurantId, body) =>
    request(`/api/restaurants/${restaurantId}/profile`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  listMenuItems: (restaurantId) => request(`/api/restaurants/${restaurantId}/menu-items`),
  createMenuItem: (restaurantId, body) =>
    request(`/api/restaurants/${restaurantId}/menu-items`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateMenuItem: (restaurantId, menuItemId, body) =>
    request(`/api/restaurants/${restaurantId}/menu-items/${menuItemId}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  deleteMenuItem: (restaurantId, menuItemId) =>
    request(`/api/restaurants/${restaurantId}/menu-items/${menuItemId}`, {
      method: "DELETE",
    }),
  listInventory: (locationId) => request(`/api/locations/${locationId}/inventory`),
  upsertInventory: (locationId, menuItemId, body) =>
    request(`/api/locations/${locationId}/menu-items/${menuItemId}/inventory`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  createOrder: (body) =>
    request("/api/orders", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  listRestaurantOrders: (restaurantId) => request(`/api/restaurants/${restaurantId}/orders`),
  listCustomerOrders: (customerId) => request(`/api/customers/${customerId}/orders`),
  updateOrderStatus: (orderId, status) =>
    request(`/api/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};
