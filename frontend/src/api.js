async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "content-type": "application/json",
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
  health: () => request("/api/health"),
  listRestaurants: () => request("/api/restaurants"),
  createRestaurant: (body) =>
    request("/api/restaurants", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  listMenuItems: (restaurantId) => request(`/api/restaurants/${restaurantId}/menu-items`),
  createMenuItem: (restaurantId, body) =>
    request(`/api/restaurants/${restaurantId}/menu-items`, {
      method: "POST",
      body: JSON.stringify(body),
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
};
