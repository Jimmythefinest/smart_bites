import { EmptyState, Icon, formatCurrency, formatOrderStatus } from "./shared";

export function RestaurantShell({
  user,
  activeTab,
  onTabChange,
  onQuickAction,
  onLogout,
  onRefresh,
  children,
}) {
  const desktopTabs = [
    { id: "home", label: "Dashboard", icon: "dashboard" },
    { id: "inventory", label: "Inventory", icon: "inventory_2" },
    { id: "orders", label: "Orders", icon: "restaurant_menu" },
    { id: "manage", label: "Analytics", icon: "monitoring", disabled: true },
    { id: "settings", label: "Settings", icon: "settings", disabled: true },
  ];

  const mobileTabs = [
    { id: "home", label: "Home", icon: "home" },
    { id: "orders", label: "Orders", icon: "receipt_long" },
    { id: "inventory", label: "Inventory", icon: "inventory_2" },
    { id: "account", label: "Account", icon: "person" },
  ];

  return (
    <main className="restaurant-shell">
      <header className="restaurant-topbar">
        <div className="restaurant-topbar-left">
          <button type="button" className="restaurant-brand" onClick={() => onTabChange("home")}>
            <span className="restaurant-brand-mark" aria-hidden="true">
              <img src="/images/logo.png" alt="" />
            </span>
            <span className="restaurant-brand-text">Smart Bites</span>
          </button>

          <nav className="restaurant-topnav" aria-label="Restaurant sections">
            {["Dashboard", "Inventory", "Orders"].map((label, index) => {
              const id = index === 0 ? "home" : index === 1 ? "inventory" : "orders";
              return (
                <button
                  key={label}
                  type="button"
                  className={activeTab === id ? "active" : ""}
                  onClick={() => onTabChange(id)}
                >
                  {label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="restaurant-topbar-right">
          <button type="button" className="icon-button" aria-label="Notifications" onClick={onRefresh}>
            <Icon name="notifications" />
            <span className="topbar-dot" aria-hidden="true" />
          </button>
          <button type="button" className="icon-button" aria-label="Open orders" onClick={() => onTabChange("orders")}>
            <Icon name="shopping_cart" />
          </button>
          <button type="button" className="restaurant-profile" onClick={onLogout} aria-label="Logout">
            <span className="restaurant-profile-avatar" aria-hidden="true">
              {user.full_name?.slice(0, 1) || "R"}
            </span>
            <span className="restaurant-profile-text">{user.full_name || "Chef"}</span>
          </button>
        </div>
      </header>

      <div className="restaurant-layout">
        <aside className="restaurant-sidebar">
          <div className="restaurant-sidebar-head">
            <h2>Smart Bites</h2>
            <p>Enterprise Kitchen</p>
          </div>

          <nav className="restaurant-sidebar-nav" aria-label="Workspace">
            {desktopTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={tab.id === activeTab ? "active" : ""}
                disabled={tab.disabled}
                onClick={() => onTabChange(tab.id)}
              >
                <Icon name={tab.icon} />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          <button type="button" className="restaurant-primary-cta" onClick={onQuickAction}>
            Create New Order
          </button>

          <div className="restaurant-sidebar-footer">
            <button type="button">
              <Icon name="help" />
              <span>Help Center</span>
            </button>
            <button type="button" onClick={onLogout}>
              <Icon name="logout" />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        <main className="restaurant-main">{children}</main>
      </div>

      <nav className="restaurant-bottom-nav" aria-label="Quick actions">
        {mobileTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={tab.id === activeTab ? "active" : ""}
            onClick={() => (tab.id === "account" ? onLogout() : onTabChange(tab.id))}
          >
            <Icon name={tab.icon} />
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </main>
  );
}

export function RestaurantInventoryStatus({ rows, lastSyncedLabel = "Just now" }) {
  const defaultRows = [
    { name: "Organic Wagyu", value: "12kg Left", progress: 25, tone: "warning" },
    { name: "Wild Truffles", value: "0.8kg Left", progress: 85, tone: "good" },
    { name: "Saffron Buns", value: "5 Units", progress: 10, tone: "danger" },
    { name: "Micro Greens", value: "42 Boxes", progress: 60, tone: "good" },
  ];
  const inventoryRows = rows.length ? rows : defaultRows;

  return (
    <section className="restaurant-status-panel">
      <div className="restaurant-status-head">
        <div className="restaurant-status-title">
          <Icon name="analytics" />
          <h3>Live Inventory Status</h3>
          <span className="live-pill">LIVE</span>
        </div>
        <div className="restaurant-status-sync">Last synced: {lastSyncedLabel}</div>
      </div>

      <div className="restaurant-status-grid">
        {inventoryRows.map((row) => (
          <div key={row.name} className="restaurant-status-row">
            <div className="restaurant-status-copy">
              <span>{row.name}</span>
              <strong className={row.tone || ""}>{row.value}</strong>
            </div>
            <div className="restaurant-status-bar">
              <span style={{ width: `${Math.min(100, Math.max(2, Number(row.progress || 0)))}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function RestaurantOrderBoard({ columns, onUpdateOrderStatus }) {
  return (
    <section className="restaurant-kanban">
      <div className="restaurant-kanban-columns">
        {columns.map((column) => (
          <div key={column.id} className="restaurant-kanban-column-shell">
            <div className="restaurant-column-head">
              <div className="restaurant-column-title">
                <span className={`column-dot ${column.tone || ""}`} />
                <h4>{column.label}</h4>
                <span className="column-count">{column.orders.length}</span>
              </div>
              <button type="button" className="column-menu" aria-label={`${column.label} menu`}>
                <Icon name="more_vert" />
              </button>
            </div>

            <div className="restaurant-kanban-column">
              {column.orders.length ? (
                column.orders.map((order) => (
                  <article key={order.id} className="restaurant-order-card">
                    <div className="restaurant-order-card-head">
                      <div>
                        <h5>Order #{order.id}</h5>
                        <p>
                          {order.order_type === "delivery" ? `Delivery` : "Takeout"} •
                          {` ${order.customer_name || `Customer ${order.customer_id}`}`}
                        </p>
                      </div>
                      {order.isRush ? <span className="rush-chip">RUSH</span> : null}
                    </div>

                    {column.showProgress ? (
                      <div className="restaurant-order-progress">
                        <div className="restaurant-order-progress-head">
                          <span>Kitchen Progress</span>
                          <span>{order.progressLabel}</span>
                        </div>
                        <div className="restaurant-order-progress-bar">
                          <span style={{ width: `${order.progress || 0}%` }} />
                        </div>
                      </div>
                    ) : null}

                    <ul className="restaurant-order-items">
                      {order.items.length ? (
                        order.items.map((item) => (
                          <li key={`${order.id}-${item.menu_item_id}`}>{item.quantity}x {item.item_name_snapshot}</li>
                        ))
                      ) : (
                        <li>{order.totalLabel}</li>
                      )}
                    </ul>

                    <div className="restaurant-order-footer">
                      <div className="restaurant-order-time">
                        <Icon name="schedule" />
                        <span>{order.elapsedLabel}</span>
                      </div>
                      {column.action ? (
                        <button type="button" className={column.actionTone || ""} onClick={() => onUpdateOrderStatus(order.id, column.action)}>
                          {column.actionLabel}
                        </button>
                      ) : column.trailingIcon ? (
                        <div className="restaurant-order-trailing">
                          <Icon name={column.trailingIcon} />
                        </div>
                      ) : null}
                    </div>
                  </article>
                ))
              ) : (
                <EmptyState message="No orders in this stage." />
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function RestaurantAlertToast({ item, onDismiss }) {
  if (!item) {
    return null;
  }

  return (
    <div className="restaurant-alert-toast">
      <div className="restaurant-alert-icon">
        <Icon name="priority_high" />
      </div>
      <div className="restaurant-alert-copy">
        <h6>Critical Alert: Short Stock</h6>
        <p>
          {item.name} is nearly out of stock. Adjust menu items now.
        </p>
      </div>
      <button type="button" className="restaurant-alert-close" onClick={onDismiss} aria-label="Dismiss alert">
        <Icon name="close" />
      </button>
    </div>
  );
}

export function RestaurantDashboardContent({ inventoryRows, orderGroups, onUpdateOrderStatus, lowStockItem }) {
  return (
    <div className="restaurant-dashboard">
      <RestaurantInventoryStatus rows={inventoryRows} lastSyncedLabel="Just now" />
      <RestaurantOrderBoard columns={orderGroups} onUpdateOrderStatus={onUpdateOrderStatus} />
      <RestaurantAlertToast item={lowStockItem} />
    </div>
  );
}

export function buildRestaurantDashboardData({
  inventory,
  menuItems,
  restaurantOrders,
}) {
  const sourceRows = inventory.length
    ? inventory.slice(0, 4).map((row) => {
        const qty = Number(row.qty_on_hand || 0);
        const reorder = Number(row.reorder_level || 0);
        const max = Math.max(qty, reorder, 1);
        return {
          name: row.menu_item_name || `Item ${row.menu_item_id}`,
          value: qty % 1 === 0 ? `${qty} units` : `${qty.toFixed(1)} units`,
          progress: Math.min(100, Math.max(5, (qty / max) * 100)),
          tone: qty <= reorder ? "danger" : qty <= reorder * 1.5 ? "warning" : "good",
        };
      })
    : menuItems.slice(0, 4).map((item, index) => ({
        name: item.name,
        value: formatCurrency(item.base_price_cents),
        progress: [25, 85, 10, 60][index % 4],
        tone: index % 3 === 0 ? "warning" : "good",
      }));

  const now = Date.now();
  const toElapsed = (createdAt) => {
    const deltaMins = Math.max(1, Math.round((now - new Date(createdAt).getTime()) / 60000));
    return `${deltaMins}m elapsed`;
  };

  const mapOrder = (order) => ({
    ...order,
    items: Array.isArray(order.items) ? order.items : [],
    elapsedLabel: toElapsed(order.created_at),
    totalLabel: `Total ${formatCurrency(order.total_cents)}`,
    progress: order.status === "preparing" ? 75 : order.status === "out_for_delivery" ? 100 : 0,
    progressLabel: order.status === "preparing" ? "75%" : order.status === "out_for_delivery" ? "100%" : "0%",
    isRush: order.order_type === "delivery" || Number(order.total_cents) > 5000,
  });

  const newOrders = restaurantOrders.filter((order) => order.status === "placed").map(mapOrder);
  const preparingOrders = restaurantOrders.filter((order) => order.status === "preparing").map(mapOrder);
  const deliveryOrders = restaurantOrders
    .filter((order) => !["placed", "preparing"].includes(order.status))
    .map(mapOrder);

  const columns = [
    {
      id: "new-orders",
      label: "New Orders",
      tone: "violet",
      orders: newOrders,
      action: "preparing",
      actionLabel: "Move to Preparation",
      actionTone: "column-action",
      trailingIcon: "person",
    },
    {
      id: "preparing",
      label: "Preparing",
      tone: "amber",
      orders: preparingOrders,
      action: "completed",
      actionLabel: "Ready",
      actionTone: "ready-action",
      showProgress: true,
    },
    {
      id: "delivery",
      label: "Out for Delivery",
      tone: "emerald",
      orders: deliveryOrders,
      trailingIcon: "local_shipping",
    },
  ];

  const lowStockItem = inventory
    .slice()
    .sort((a, b) => Number(a.qty_on_hand) - Number(b.qty_on_hand))[0] || null;

  return { inventoryRows: sourceRows, columns, lowStockItem };
}
