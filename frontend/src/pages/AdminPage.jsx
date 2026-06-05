import { useMemo, useState } from "react";
import {
  AdminAlertsPanel,
  AdminDirectorySection,
  AdminFloatingAction,
  AdminMetricGrid,
  AdminPartnerGrid,
  AdminRestaurantEditorSection,
  AdminProvisionSection,
  AdminSidebar,
  AdminTopBar,
  AdminTrendPanel,
} from "./AdminSections";

export function AdminPage({ ctx }) {
  const {
    activeTab,
    setActiveTab,
    user,
    restaurants,
    menuItems,
    inventory,
    restaurantForm,
    setRestaurantForm,
    handleCreateRestaurant,
    profileForm,
    setProfileForm,
    handleUpdateRestaurantProfile,
    setSelectedRestaurantId,
    selectedRestaurant,
    bootstrap,
    handleLogout,
    setErr,
    pushToast,
  } = ctx;

  const [trendRange, setTrendRange] = useState("7d");

  const restaurantMenuCounts = useMemo(() => {
    const counts = new Map();
    menuItems.forEach((item) => {
      const key = String(item.restaurant_id);
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [menuItems]);

  const activeRestaurants = useMemo(
    () => restaurants.filter((restaurant) => restaurant.is_active).length,
    [restaurants]
  );

  const inactiveRestaurants = useMemo(
    () => restaurants.filter((restaurant) => !restaurant.is_active).length,
    [restaurants]
  );

  const lowStockCount = useMemo(
    () => inventory.filter((row) => Number(row.qty_on_hand) <= Number(row.reorder_level)).length,
    [inventory]
  );

  const recentRestaurants = useMemo(() => restaurants.slice(0, 4), [restaurants]);

  const rankedRestaurants = useMemo(() => {
    return [...restaurants].sort((a, b) => {
      const countB = restaurantMenuCounts.get(String(b.id)) || 0;
      const countA = restaurantMenuCounts.get(String(a.id)) || 0;
      if (countB !== countA) {
        return countB - countA;
      }
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  }, [restaurants, restaurantMenuCounts]);

  const metrics = useMemo(
    () => [
      {
        label: "Total Restaurants",
        badge: restaurants.length ? "+ live" : "Empty",
        value: restaurants.length,
        progress: Math.min(100, restaurants.length * 8),
      },
      {
        label: "Active Restaurants",
        badge: `${activeRestaurants} online`,
        value: activeRestaurants,
        progress: restaurants.length ? Math.round((activeRestaurants / restaurants.length) * 100) : 0,
      },
      {
        label: "Menu Items",
        badge: "Catalog",
        value: menuItems.length,
        progress: Math.min(100, menuItems.length * 3),
      },
      {
        label: "Low Stock Alerts",
        badge: lowStockCount ? "Attention" : "Stable",
        badgeTone: lowStockCount ? "bad" : "ok",
        value: lowStockCount,
        progress: Math.min(100, lowStockCount * 20),
      },
    ],
    [activeRestaurants, lowStockCount, menuItems.length, restaurants.length]
  );

  const chartSource = useMemo(() => {
    const source = rankedRestaurants.slice(0, 7);
    const max = Math.max(
      1,
      ...source.map((restaurant) => restaurantMenuCounts.get(String(restaurant.id)) || 0)
    );

    return source.map((restaurant, index) => {
      const count = restaurantMenuCounts.get(String(restaurant.id)) || 0;
      const base = 34 + (count / max) * 58;
      return {
        label: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index] || `D${index + 1}`,
        height: Math.max(16, Math.min(96, base)),
      };
    });
  }, [rankedRestaurants, restaurantMenuCounts]);

  const alerts = useMemo(() => {
    const rows = [];

    if (inactiveRestaurants) {
      rows.push({
        tone: "danger",
        title: "Inactive restaurants detected",
        body: `${inactiveRestaurants} profile${inactiveRestaurants === 1 ? "" : "s"} need attention.`,
        time: "Just now",
      });
    }

    if (lowStockCount) {
      const lowStockLabel = inventory.find(
        (row) => Number(row.qty_on_hand) <= Number(row.reorder_level)
      );
      rows.push({
        tone: "warning",
        title: `Inventory low: ${lowStockLabel ? `Location ${lowStockLabel.location_id}` : "network"}`,
        body: `${lowStockCount} item${lowStockCount === 1 ? "" : "s"} are below reorder thresholds.`,
        time: "15 mins ago",
      });
    }

    if (recentRestaurants.length) {
      rows.push({
        tone: "success",
        title: `New partner: ${recentRestaurants[0].name}`,
        body: recentRestaurants[0].blurb || "Onboarding sequence initiated successfully.",
        time: "1 hour ago",
      });
    }

    return rows.slice(0, 3);
  }, [inactiveRestaurants, inventory, lowStockCount, recentRestaurants]);

  function handleOpenRestaurant(restaurantId) {
    if (restaurantId !== null && restaurantId !== undefined) {
      setSelectedRestaurantId(String(restaurantId));
    }
    setActiveTab("restaurants");
  }

  function handleClearRestaurantSelection() {
    setSelectedRestaurantId("");
  }

  function handleViewLog() {
    setActiveTab("restaurants");
  }

  function handleProvisionShortcut() {
    setActiveTab("provision");
  }

  if (activeTab === "restaurants") {
    return (
      <div className="admin-dashboard-shell">
        <AdminTopBar
          user={user}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onRefresh={bootstrap}
          onLogout={handleLogout}
        />
        <div className="admin-dashboard-layout">
          <AdminSidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onProvision={handleProvisionShortcut}
            onLogout={handleLogout}
          />
          <main className="admin-dashboard-main">
            <div className="admin-directory-layout">
              <AdminDirectorySection restaurants={restaurants} onOpenRestaurant={handleOpenRestaurant} />
              <AdminRestaurantEditorSection
                restaurant={selectedRestaurant}
                profileForm={profileForm}
                setProfileForm={setProfileForm}
                handleUpdateRestaurantProfile={handleUpdateRestaurantProfile}
                onClearSelection={handleClearRestaurantSelection}
              />
            </div>
            <AdminFloatingAction onClick={handleProvisionShortcut} />
          </main>
        </div>
      </div>
    );
  }

  if (activeTab === "provision") {
    return (
      <div className="admin-dashboard-shell">
        <AdminTopBar
          user={user}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onRefresh={bootstrap}
          onLogout={handleLogout}
        />
        <div className="admin-dashboard-layout">
          <AdminSidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onProvision={handleProvisionShortcut}
            onLogout={handleLogout}
          />
          <main className="admin-dashboard-main">
            <AdminProvisionSection
              restaurantForm={restaurantForm}
              setRestaurantForm={setRestaurantForm}
              handleCreateRestaurant={handleCreateRestaurant}
              setErr={setErr}
              pushToast={pushToast}
            />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-shell">
      <AdminTopBar
        user={user}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onRefresh={bootstrap}
        onLogout={handleLogout}
      />

      <div className="admin-dashboard-layout">
        <AdminSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onProvision={handleProvisionShortcut}
          onLogout={handleLogout}
        />

        <main className="admin-dashboard-main">
          <section className="admin-hero-copy">
            <h1>Global Overview</h1>
            <p>Real-time performance metrics for Smart Bites Network.</p>
          </section>

          <AdminMetricGrid metrics={metrics} />

          <div className="admin-bento-grid">
            <AdminTrendPanel
              labels={chartSource.map((bar) => bar.label)}
              bars={chartSource}
              range={trendRange}
              onRangeChange={setTrendRange}
            />
            <AdminAlertsPanel alerts={alerts} onViewLog={handleViewLog} />
          </div>

          <AdminPartnerGrid
            restaurants={rankedRestaurants.slice(0, 4)}
            restaurantMenuCounts={restaurantMenuCounts}
            onOpenRestaurant={handleOpenRestaurant}
          />

          <AdminFloatingAction onClick={handleProvisionShortcut} />
        </main>
      </div>
    </div>
  );
}
