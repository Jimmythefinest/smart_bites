import { useMemo, useState } from "react";
import { EmptyState, Icon, formatCurrency } from "./shared";
import {
  BuyerBottomNav,
  BuyerCartSidebar,
  BuyerDealsSection,
  BuyerHero,
  BuyerTopBar,
  RestaurantGridSection,
  TrendingSection,
  fallbackHero,
} from "./BuyerSections";

export function BuyerPage({ ctx }) {
  const {
    restaurants,
    allMenuItems,
    activeBuyerRestaurants,
    restaurantOptions,
    selectedRestaurantId,
    setSelectedRestaurantId,
    setOrderForm,
    addToCart,
    cartItems,
    cartItemCount,
    cartSubtotal,
    cartOpen,
    setCartOpen,
    updateCartQuantity,
    handleCreateOrder,
    clearCart,
    orderForm,
    orderResult,
    user,
    refreshCustomerOrders,
    customerOrders,
    refreshAllMenuItems,
    setErr,
    pushToast,
    selectedRestaurant,
    activeTab,
    setActiveTab,
    handleLogout,
  } = ctx;

  const [searchQuery, setSearchQuery] = useState("");
  const [activeChip, setActiveChip] = useState("All");

  const restaurantMenuCounts = useMemo(() => {
    const counts = new Map();
    allMenuItems.forEach((item) => {
      const key = String(item.restaurant_id);
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [allMenuItems]);

  const visibleRestaurants = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let rows = activeBuyerRestaurants.slice();

    if (activeChip === "Fast Food") {
      rows = rows.filter((restaurant) => {
        const count = restaurantMenuCounts.get(String(restaurant.id)) || 0;
        return count >= 4;
      });
    }

    if (activeChip === "Healthy") {
      rows = rows.filter((restaurant) => {
        const text = `${restaurant.name} ${restaurant.blurb || ""}`.toLowerCase();
        return /green|salad|bowl|fresh|healthy|organics|leaf/.test(text);
      });
    }

    if (activeChip === "Desserts") {
      rows = rows.filter((restaurant) => {
        const text = `${restaurant.name} ${restaurant.blurb || ""}`.toLowerCase();
        return /sweet|dessert|cake|bakery|pastry|juice|co/.test(text);
      });
    }

    if (query) {
      rows = rows.filter((restaurant) => {
        const text = `${restaurant.name} ${restaurant.blurb || ""}`.toLowerCase();
        const menuText = allMenuItems
          .filter((item) => String(item.restaurant_id) === String(restaurant.id))
          .map((item) => `${item.name} ${item.description || ""} ${item.blurb || ""}`)
          .join(" ")
          .toLowerCase();
        return text.includes(query) || menuText.includes(query);
      });
    }

    return rows;
  }, [activeBuyerRestaurants, activeChip, allMenuItems, restaurantMenuCounts, searchQuery]);

  const heroRestaurant = selectedRestaurant || visibleRestaurants[0] || activeBuyerRestaurants[0] || null;
  const trendingRestaurants = useMemo(() => visibleRestaurants.slice(0, 4), [visibleRestaurants]);

  function openRestaurant(restaurantId) {
    if (restaurantId === undefined || restaurantId === null) {
      return;
    }
    const next = String(restaurantId);
    setSelectedRestaurantId(next);
    setOrderForm((current) => ({ ...current, restaurant_id: next }));
    document.getElementById("restaurants")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function addRestaurantMeal(restaurant) {
    if (!restaurant) {
      return;
    }
    const restaurantId = String(restaurant.id);
    const candidate =
      allMenuItems.find((item) => String(item.restaurant_id) === restaurantId && item.is_active !== false) ||
      allMenuItems.find((item) => String(item.restaurant_id) === restaurantId);

    if (!candidate) {
      setErr(`${restaurant.name} does not have a menu item ready to add yet.`);
      return;
    }

    setSelectedRestaurantId(restaurantId);
    setOrderForm((current) => ({ ...current, restaurant_id: restaurantId }));
    addToCart(candidate);
    pushToast?.(`${candidate.name} added to cart`);
  }

  function handleTopNav(target) {
    const nodes = {
      home: "buyer-top",
      explore: "restaurants",
      deals: "buyer-deals",
    };
    const id = nodes[target];
    if (id) {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function handleMyOrders() {
    setActiveTab?.("my_orders");
    document.getElementById("recent-orders")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleLogoutClick() {
    handleLogout?.();
  }

  return (
    <main className="buyer-page-shell">
      <BuyerTopBar
        user={user}
        cartItemCount={cartItemCount}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onTopNav={handleTopNav}
        onToggleCart={() => setCartOpen((current) => !current)}
        onMyOrders={handleMyOrders}
        onLogout={handleLogoutClick}
      />

      <div className="buyer-shell">
        <main className="buyer-main" id="buyer-main">
          <BuyerHero
            restaurant={heroRestaurant}
            restaurantMenuCounts={restaurantMenuCounts}
            onAddToCart={addRestaurantMeal}
            onOpenRestaurant={openRestaurant}
          />

          <TrendingSection
            restaurants={trendingRestaurants}
            restaurantMenuCounts={restaurantMenuCounts}
            onAddToCart={addRestaurantMeal}
            onResetSearch={() => setSearchQuery("")}
          />

          <RestaurantGridSection
            restaurants={visibleRestaurants}
            restaurantMenuCounts={restaurantMenuCounts}
            activeChip={activeChip}
            onChipChange={setActiveChip}
            onAddToCart={addRestaurantMeal}
            onOpenRestaurant={openRestaurant}
          />

          <BuyerDealsSection />
        </main>
        <BuyerCartSidebar
          cartItems={cartItems}
          cartItemCount={cartItemCount}
          cartSubtotal={cartSubtotal}
          cartOpen={cartOpen}
          onToggleCart={() => setCartOpen((current) => !current)}
          updateCartQuantity={updateCartQuantity}
          handleCreateOrder={handleCreateOrder}
          clearCart={clearCart}
          orderForm={orderForm}
          setOrderForm={setOrderForm}
          orderResult={orderResult}
          user={user}
          customerOrders={customerOrders}
        />
      </div>
      <BuyerBottomNav
        cartItemCount={cartItemCount}
        onTopNav={handleTopNav}
        onToggleCart={() => setCartOpen((current) => !current)}
      />
    </main>
  );
}
