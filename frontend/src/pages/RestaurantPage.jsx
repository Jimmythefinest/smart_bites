import {
  EmptyState,
  Field,
  Icon,
  ImageUploadField,
  ItemImage,
  ORDER_POLL_MS,
  Panel,
  PageHeader,
  StatCard,
  formatCurrency,
  formatOrderStatus,
} from "./shared";
import {
  RestaurantDashboardContent,
  RestaurantShell,
  buildRestaurantDashboardData,
} from "./RestaurantSections";

export function RestaurantPage({ ctx }) {
  const {
    activeTab,
    user,
    bootstrap,
    handleLogout,
    setActiveTab,
  } = ctx;

  const shellAction = () => setActiveTab("new_meal");

  let content;
  if (activeTab === "manage") {
    content = <ManagePage ctx={ctx} />;
  } else if (activeTab === "orders") {
    content = <OrdersPage ctx={ctx} />;
  } else if (activeTab === "new_meal") {
    content = <NewMealPage ctx={ctx} />;
  } else if (activeTab === "inventory") {
    content = <InventoryPage ctx={ctx} />;
  } else {
    content = <DashboardPage ctx={ctx} />;
  }

  return (
    <RestaurantShell
      user={user}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onQuickAction={shellAction}
      onLogout={handleLogout}
      onRefresh={bootstrap}
    >
      {content}
    </RestaurantShell>
  );
}

function DashboardPage({ ctx }) {
  const {
    menuItems,
    inventory,
    restaurantOrders,
    topMenuItems,
    handleUpdateOrderStatus,
  } = ctx;

  const { inventoryRows, columns, lowStockItem } = buildRestaurantDashboardData({
    inventory,
    menuItems: topMenuItems.length ? topMenuItems : menuItems,
    restaurantOrders,
  });

  return (
    <div className="restaurant-dashboard-page">
      <RestaurantDashboardContent
        inventoryRows={inventoryRows}
        orderGroups={columns}
        onUpdateOrderStatus={handleUpdateOrderStatus}
        lowStockItem={lowStockItem}
      />
    </div>
  );
}

function ManagePage({ ctx }) {
  const {
    profileForm,
    setProfileForm,
    handleUpdateRestaurantProfile,
    menuForm,
    setMenuForm,
    handleCreateMenuItem,
    menuItems,
    beginEditMenuItem,
    handleDeleteMenuItem,
    editingMenuItemId,
    menuEditForm,
    setMenuEditForm,
    handleUpdateMenuItem,
    setEditingMenuItemId,
    setErr,
    pushToast,
  } = ctx;

  return (
    <div className="page-stack restaurant-page menu-management-page">
      <PageHeader title="Menu Inventory" subtitle="Manage the live culinary catalog, branding, and item availability." />
      <div className="tab-grid two-col">
        <Panel title="Restaurant Profile" footer="Update profile image, background, and bio">
          <form onSubmit={handleUpdateRestaurantProfile} className="form">
            <Field label="Display Name" value={profileForm.name} onChange={(e) => setProfileForm((c) => ({ ...c, name: e.target.value }))} required />
            <Field label="Profile Image URL" value={profileForm.profile_image_url} onChange={(e) => setProfileForm((c) => ({ ...c, profile_image_url: e.target.value }))} />
            <ImageUploadField label="Upload Profile Image" onUploaded={(url) => setProfileForm((c) => ({ ...c, profile_image_url: url }))} onError={setErr} onSuccess={pushToast} />
            <Field label="Background Image URL" value={profileForm.background_image_url} onChange={(e) => setProfileForm((c) => ({ ...c, background_image_url: e.target.value }))} />
            <ImageUploadField label="Upload Background Image" onUploaded={(url) => setProfileForm((c) => ({ ...c, background_image_url: url }))} onError={setErr} onSuccess={pushToast} />
            <Field label="Bio / Blurb" value={profileForm.blurb} onChange={(e) => setProfileForm((c) => ({ ...c, blurb: e.target.value }))} />
            <button type="submit"><Icon name="save" />Save Profile</button>
          </form>
        </Panel>
        <Panel title="Meals CRUD" footer={`${menuItems.length} meal(s)`}>
          <MealForm form={menuForm} setForm={setMenuForm} onSubmit={handleCreateMenuItem} buttonLabel="Create Meal" setErr={setErr} pushToast={pushToast} />
          {menuItems.length ? (
            <ul className="data-list menu-management-list">
              {menuItems.map((item) => (
                <li key={item.id}>
                  <ItemImage item={item} className="menu-inline-image" alt={item.name} />
                  <div className="list-head">
                    <strong>{item.name}</strong>
                    <span>{formatCurrency(item.base_price_cents)}</span>
                  </div>
                  <div className="actions-row">
                    <button type="button" onClick={() => beginEditMenuItem(item)}><Icon name="edit" />Edit</button>
                    <button type="button" onClick={() => handleDeleteMenuItem(item.id)}><Icon name="delete" />Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message="No meals yet." />
          )}
        </Panel>
        {editingMenuItemId ? (
          <Panel title={`Edit Meal #${editingMenuItemId}`} footer="Update selected meal">
            <MealForm
              form={menuEditForm}
              setForm={setMenuEditForm}
              onSubmit={handleUpdateMenuItem}
              buttonLabel="Save Meal"
              setErr={setErr}
              pushToast={pushToast}
            />
            <div className="actions-row form-tail-action">
              <button type="button" onClick={() => setEditingMenuItemId("")}><Icon name="close" />Cancel</button>
            </div>
          </Panel>
        ) : null}
      </div>
    </div>
  );
}

function OrdersPage({ ctx }) {
  const { restaurantOrders, selectedRestaurantId, refreshRestaurantOrders, handleUpdateOrderStatus } = ctx;
  return (
    <div className="page-stack restaurant-page">
      <PageHeader title="Order Queue" subtitle={`Auto-updates every ${ORDER_POLL_MS / 1000}s.`} />
      <Panel title="Kitchen Kanban" footer={`${restaurantOrders.length} order(s)`}>
        <div className="stack-row">
          <button type="button" onClick={() => refreshRestaurantOrders(selectedRestaurantId)} disabled={!selectedRestaurantId}>
            <Icon name="sync" />Refresh Orders
          </button>
        </div>
        {restaurantOrders.length ? (
          <ul className="data-list order-kanban-list">
            {restaurantOrders.map((order) => (
              <li key={order.id}>
                <div className="list-head">
                  <strong>Order #{order.id}</strong>
                  <span className="status-chip">{formatOrderStatus(order.status)}</span>
                </div>
                <span>Customer #{order.customer_id} - {order.order_type}</span>
                <span>Total {formatCurrency(order.total_cents)}</span>
                <div className="actions-row">
                  {order.status === "placed" ? (
                    <button type="button" onClick={() => handleUpdateOrderStatus(order.id, "preparing")}>
                      <Icon name="skillet" />Move to Preparation
                    </button>
                  ) : null}
                  {order.status === "preparing" ? (
                    <button type="button" onClick={() => handleUpdateOrderStatus(order.id, "completed")}>
                      <Icon name="check_circle" />Mark Prepared
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState message="No orders found for this restaurant yet." />
        )}
      </Panel>
    </div>
  );
}

function NewMealPage({ ctx }) {
  const { menuItems, menuForm, setMenuForm, handleCreateMenuItem, setErr, pushToast } = ctx;
  return (
    <div className="page-stack restaurant-page menu-management-page">
      <PageHeader title="Create Menu Item" subtitle="Add a new dish with marketplace-ready metadata and imagery." />
      <Panel title="Add Menu Item" footer={`${menuItems.length} menu item(s)`}>
        <MealForm form={menuForm} setForm={setMenuForm} onSubmit={handleCreateMenuItem} buttonLabel="Create Menu Item" setErr={setErr} pushToast={pushToast} />
      </Panel>
    </div>
  );
}

function InventoryPage({ ctx }) {
  const { inventory, inventoryForm, setInventoryForm, handleInventoryUpsert } = ctx;
  return (
    <div className="page-stack restaurant-page menu-management-page">
      <PageHeader title="Live Inventory Status" subtitle="Update stock counts and monitor reorder thresholds." />
      <section className="stats-grid">
        <StatCard label="Inventory Rows" value={inventory.length} icon="inventory_2" />
        <StatCard label="Low Stock Items" value={inventory.filter((row) => Number(row.qty_on_hand) <= Number(row.reorder_level)).length} icon="warning" tone="danger" />
      </section>
      <div className="tab-grid two-col">
        <Panel title="Upsert Inventory" footer={`${inventory.length} inventory row(s)`}>
          <form onSubmit={handleInventoryUpsert} className="form">
            <Field label="Location ID" type="number" min="1" value={inventoryForm.locationId} onChange={(e) => setInventoryForm((c) => ({ ...c, locationId: e.target.value }))} required />
            <Field label="Menu Item ID" type="number" min="1" value={inventoryForm.menuItemId} onChange={(e) => setInventoryForm((c) => ({ ...c, menuItemId: e.target.value }))} required />
            <Field label="Qty On Hand" type="number" min="0" value={inventoryForm.qty_on_hand} onChange={(e) => setInventoryForm((c) => ({ ...c, qty_on_hand: e.target.value }))} required />
            <Field label="Reorder Level" type="number" min="0" value={inventoryForm.reorder_level} onChange={(e) => setInventoryForm((c) => ({ ...c, reorder_level: e.target.value }))} required />
            <button type="submit"><Icon name="save" />Save Inventory</button>
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
            <EmptyState message="Set location ID to load inventory." />
          )}
        </Panel>
      </div>
    </div>
  );
}

function MealForm({ form, setForm, onSubmit, buttonLabel, setErr, pushToast }) {
  return (
    <form onSubmit={onSubmit} className="form">
      <Field label="Name" value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} required />
      <Field label="Description" value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} />
      <Field label="Profile Image URL" value={form.profile_image_url} onChange={(e) => setForm((c) => ({ ...c, profile_image_url: e.target.value }))} />
      <ImageUploadField label="Upload Profile Image" onUploaded={(url) => setForm((c) => ({ ...c, profile_image_url: url }))} onError={setErr} onSuccess={pushToast} />
      <Field label="Background Image URL" value={form.background_image_url} onChange={(e) => setForm((c) => ({ ...c, background_image_url: e.target.value }))} />
      <ImageUploadField label="Upload Background Image" onUploaded={(url) => setForm((c) => ({ ...c, background_image_url: url }))} onError={setErr} onSuccess={pushToast} />
      <Field label="Blurb" value={form.blurb} onChange={(e) => setForm((c) => ({ ...c, blurb: e.target.value }))} />
      <Field label="Base Price (cents)" type="number" min="0" value={form.base_price_cents} onChange={(e) => setForm((c) => ({ ...c, base_price_cents: e.target.value }))} required />
      <button type="submit"><Icon name="add" />{buttonLabel}</button>
    </form>
  );
}
