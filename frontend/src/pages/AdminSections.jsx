import { EmptyState, Field, Icon, ImageUploadField, ItemImage, formatCurrency } from "./shared";

export function AdminTopBar({ user, activeTab, onTabChange, onRefresh, onLogout }) {
  const tabs = [
    { id: "home", label: "Dashboard", icon: "dashboard" },
    { id: "restaurants", label: "Inventory", icon: "inventory_2" },
    { id: "provision", label: "Orders", icon: "restaurant_menu" },
  ];

  return (
    <header className="admin-topbar">
      <div className="admin-topbar-left">
        <button type="button" className="admin-brand" onClick={() => onTabChange("home")}>
          <span className="admin-brand-mark" aria-hidden="true">
            <img src="/images/logo.png" alt="" />
          </span>
          <span className="admin-brand-text">Smart Bites</span>
        </button>

        <nav className="admin-topnav" aria-label="Admin sections">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={tab.id === activeTab ? "active" : ""}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="admin-topbar-right">
        <button type="button" className="icon-button" aria-label="Notifications">
          <Icon name="notifications" />
        </button>
        <button type="button" className="icon-button" aria-label="Orders">
          <Icon name="shopping_cart" />
        </button>
        <button type="button" className="icon-button" aria-label="Refresh dashboard" onClick={onRefresh}>
          <Icon name="sync" />
        </button>
        <button type="button" className="admin-profile">
          <span className="admin-profile-avatar" aria-hidden="true">
            {user.full_name?.slice(0, 1) || "A"}
          </span>
          <span className="admin-profile-text">Profile</span>
        </button>
        <button type="button" className="admin-logout" onClick={onLogout}>
          <Icon name="logout" />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}

export function AdminSidebar({ activeTab, onTabChange, onProvision, onLogout }) {
  const items = [
    { id: "home", label: "Dashboard", icon: "dashboard" },
    { id: "restaurants", label: "Inventory", icon: "storefront" },
    { id: "provision", label: "Orders", icon: "restaurant_menu" },
    { id: "analytics", label: "Analytics", icon: "monitoring", disabled: true },
    { id: "settings", label: "Settings", icon: "settings", disabled: true },
  ];

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-head">
        <p className="admin-sidebar-brand">Smart Bites</p>
        <span>Enterprise Kitchen</span>
      </div>

      <nav className="admin-sidebar-nav" aria-label="Workspace">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === activeTab ? "active" : ""}
            disabled={item.disabled}
            onClick={() => onTabChange(item.id)}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <button type="button" className="admin-primary-cta" onClick={onProvision}>
        <Icon name="person_add" />
        <span>Provision Account</span>
      </button>

      <div className="admin-sidebar-footer">
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
  );
}

export function AdminMetricGrid({ metrics }) {
  return (
    <section className="admin-metric-grid" aria-label="Platform metrics">
      {metrics.map((metric) => (
        <article key={metric.label} className="admin-metric-card">
          <div className="admin-metric-head">
            <span>{metric.label}</span>
            <strong className={metric.badgeTone || ""}>{metric.badge}</strong>
          </div>
          <div className="admin-metric-value">{metric.value}</div>
          <div className="admin-metric-bar" aria-hidden="true">
            <span style={{ width: `${metric.progress}%` }} />
          </div>
        </article>
      ))}
    </section>
  );
}

export function AdminTrendPanel({ labels, bars, range, onRangeChange }) {
  return (
    <section className="admin-trend-panel">
      <div className="admin-panel-head">
        <div>
          <h3>Platform-wide Sales Trend</h3>
          <p>Daily transaction volume across all regions.</p>
        </div>
        <select value={range} onChange={(event) => onRangeChange(event.target.value)}>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
        </select>
      </div>

      <div className="admin-chart" aria-hidden="true">
        {bars.map((bar, index) => (
          <div key={`${bar.label}-${index}`} className="admin-chart-col" style={{ height: `${bar.height}%` }}>
            <span className={index === bars.length - 1 ? "active" : ""} />
          </div>
        ))}
        <div className="admin-chart-gridline" style={{ top: "25%" }} />
        <div className="admin-chart-gridline" style={{ top: "50%" }} />
        <div className="admin-chart-gridline" style={{ top: "75%" }} />
      </div>

      <div className="admin-chart-labels">
        {labels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </section>
  );
}

export function AdminAlertsPanel({ alerts, onViewLog }) {
  return (
    <section className="admin-alerts-panel">
      <div className="admin-alerts-head">
        <h3>
          <Icon name="warning" />
          Network Alerts
        </h3>
        <p>Operational monitoring active.</p>
      </div>

      <div className="admin-alerts-list">
        {alerts.length ? (
          alerts.map((alert) => (
            <article key={alert.title} className="admin-alert-card">
              <span className={`admin-alert-dot ${alert.tone || ""}`} aria-hidden="true" />
              <div>
                <strong>{alert.title}</strong>
                <p>{alert.body}</p>
                <span>{alert.time}</span>
              </div>
            </article>
          ))
        ) : (
          <EmptyState message="No alerts right now." />
        )}
      </div>

      <button type="button" className="admin-alerts-link" onClick={onViewLog}>
        VIEW FULL NETWORK LOG <Icon name="chevron_right" />
      </button>
    </section>
  );
}

export function AdminPartnerGrid({ restaurants, restaurantMenuCounts, onOpenRestaurant }) {
  return (
    <section className="admin-partner-panel">
      <div className="admin-panel-head">
        <h3>Top Performing Restaurants</h3>
        <button type="button" className="admin-link-button" onClick={() => onOpenRestaurant(null)}>
          View All Partners
        </button>
      </div>

      <div className="admin-partner-grid">
        {restaurants.length ? (
          restaurants.map((restaurant, index) => {
            const count = restaurantMenuCounts.get(String(restaurant.id)) || 0;
            const badge = ["GROWING FAST", "TOP RATED", "STEADY", "NEW TRENDING"][index] || "ACTIVE";

            return (
              <button
                key={restaurant.id}
                type="button"
                className="admin-partner-card"
                onClick={() => onOpenRestaurant(restaurant.id)}
              >
                <div className="admin-partner-image">
                  <ItemImage item={restaurant} className="admin-partner-photo" alt={restaurant.name} />
                  <span className="admin-rank">#{index + 1} RANK</span>
                </div>
                <div className="admin-partner-body">
                  <div className="admin-partner-title">
                    <h4>{restaurant.name}</h4>
                    <Icon name="star" />
                  </div>
                  <div className="admin-partner-meta">
                    <span>Revenue (MTD)</span>
                    <strong>{formatCurrency((count + 1) * 14250)}</strong>
                  </div>
                  <div className="admin-partner-footer">
                    <div className="admin-avatar-stack" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </div>
                    <span className="admin-partner-badge">{badge}</span>
                  </div>
                </div>
              </button>
            );
          })
        ) : (
          <EmptyState message="No restaurants found." />
        )}
      </div>
    </section>
  );
}

export function AdminDirectorySection({ restaurants, onOpenRestaurant }) {
  return (
    <section className="admin-directory-panel">
      <div className="admin-panel-head">
        <h3>Restaurant Directory</h3>
        <span>{restaurants.length} record(s)</span>
      </div>

      {restaurants.length ? (
        <div className="admin-directory-grid">
          {restaurants.map((restaurant) => (
            <button
              key={restaurant.id}
              type="button"
              className="admin-directory-card"
              onClick={() => onOpenRestaurant(restaurant.id)}
            >
              <ItemImage item={restaurant} className="admin-directory-image" alt={restaurant.name} />
              <div className="admin-directory-copy">
                <div className="admin-directory-head">
                  <strong>{restaurant.name}</strong>
                  <span className={restaurant.is_active ? "pill ok" : "pill bad"}>
                    {restaurant.is_active ? "active" : "inactive"}
                  </span>
                </div>
                <span>slug: {restaurant.slug}</span>
                <p>{restaurant.blurb || "No restaurant blurb yet."}</p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState message="No restaurants found." />
      )}
    </section>
  );
}

export function AdminRestaurantEditorSection({
  restaurant,
  profileForm,
  setProfileForm,
  handleUpdateRestaurantProfile,
  onClearSelection,
}) {
  return (
    <section className="admin-restaurant-editor">
      <div className="admin-panel-head">
        <div>
          <h3>{restaurant ? `Edit ${restaurant.name}` : "Restaurant details"}</h3>
          <p>Update storefront identity and activation state.</p>
        </div>
        {restaurant ? (
          <span className={restaurant.is_active ? "pill ok" : "pill bad"}>
            {restaurant.is_active ? "active" : "inactive"}
          </span>
        ) : null}
      </div>

      {restaurant ? (
        <form className="admin-editor-form" onSubmit={handleUpdateRestaurantProfile}>
          <Field
            label="Name"
            value={profileForm.name}
            onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))}
            required
          />
          <Field
            label="Profile Image URL"
            value={profileForm.profile_image_url}
            onChange={(event) =>
              setProfileForm((current) => ({ ...current, profile_image_url: event.target.value }))
            }
          />
          <Field
            label="Background Image URL"
            value={profileForm.background_image_url}
            onChange={(event) =>
              setProfileForm((current) => ({ ...current, background_image_url: event.target.value }))
            }
          />
          <label className="field admin-editor-span">
            <span>Blurb</span>
            <textarea
              rows="4"
              value={profileForm.blurb}
              onChange={(event) => setProfileForm((current) => ({ ...current, blurb: event.target.value }))}
            />
          </label>
          <label className="admin-toggle-row admin-editor-span">
            <input
              type="checkbox"
              checked={Boolean(profileForm.is_active)}
              onChange={(event) =>
                setProfileForm((current) => ({ ...current, is_active: event.target.checked }))
              }
            />
            <span>Restaurant is active</span>
          </label>
          <div className="admin-editor-actions admin-editor-span">
            <button type="submit">
              <Icon name="save" />
              Save Changes
            </button>
            <button type="button" className="secondary" onClick={onClearSelection}>
              <Icon name="close" />
              Clear
            </button>
          </div>
        </form>
      ) : (
        <EmptyState message="Select a restaurant to edit its profile." />
      )}
    </section>
  );
}

export function AdminProvisionSection({
  restaurantForm,
  setRestaurantForm,
  handleCreateRestaurant,
  setErr,
  pushToast,
}) {
  return (
    <section className="admin-provision-panel">
      <div className="admin-panel-head">
        <div>
          <h3>Provision Restaurant Account</h3>
          <p>Create a restaurant profile and owner login in one workflow.</p>
        </div>
        <span className="pill soft">Admin only</span>
      </div>

      <div className="admin-provision-grid">
        <form onSubmit={handleCreateRestaurant} className="admin-provision-form">
          <Field
            label="Name"
            value={restaurantForm.name}
            onChange={(event) => setRestaurantForm((current) => ({ ...current, name: event.target.value }))}
            required
          />
          <Field
            label="Slug"
            value={restaurantForm.slug}
            onChange={(event) => setRestaurantForm((current) => ({ ...current, slug: event.target.value }))}
            required
          />
          <Field
            label="Profile Image URL"
            value={restaurantForm.profile_image_url}
            onChange={(event) =>
              setRestaurantForm((current) => ({ ...current, profile_image_url: event.target.value }))
            }
          />
          <ImageUploadField
            label="Upload Profile Image"
            onUploaded={(url) => setRestaurantForm((current) => ({ ...current, profile_image_url: url }))}
            onError={setErr}
            onSuccess={pushToast}
          />
          <Field
            label="Background Image URL"
            value={restaurantForm.background_image_url}
            onChange={(event) =>
              setRestaurantForm((current) => ({ ...current, background_image_url: event.target.value }))
            }
          />
          <ImageUploadField
            label="Upload Background Image"
            onUploaded={(url) => setRestaurantForm((current) => ({ ...current, background_image_url: url }))}
            onError={setErr}
            onSuccess={pushToast}
          />
          <Field
            label="Restaurant Blurb"
            value={restaurantForm.blurb}
            onChange={(event) => setRestaurantForm((current) => ({ ...current, blurb: event.target.value }))}
          />
          <Field
            label="Owner Full Name"
            value={restaurantForm.owner_full_name}
            onChange={(event) =>
              setRestaurantForm((current) => ({ ...current, owner_full_name: event.target.value }))
            }
            required
          />
          <Field
            label="Owner Email"
            type="email"
            value={restaurantForm.owner_email}
            onChange={(event) => setRestaurantForm((current) => ({ ...current, owner_email: event.target.value }))}
            required
          />
          <Field
            label="Owner Password"
            type="password"
            value={restaurantForm.owner_password}
            onChange={(event) =>
              setRestaurantForm((current) => ({ ...current, owner_password: event.target.value }))
            }
            required
          />
          <div className="admin-provision-actions">
            <button type="submit">
              <Icon name="storefront" />
              Create Restaurant
            </button>
          </div>
        </form>

        <aside className="admin-provision-preview">
          <div className="admin-provision-preview-card">
            <div className="admin-preview-image" aria-hidden="true">
              <img src="/images/background.jpeg" alt="" />
            </div>
            <div className="admin-preview-copy">
              <strong>Owner onboarding</strong>
              <p>Brand, menu access, and storefront identity stay in sync from one admin action.</p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

export function AdminFloatingAction({ onClick }) {
  return (
    <button type="button" className="admin-fab" onClick={onClick} aria-label="Create restaurant">
      <Icon name="add" />
    </button>
  );
}
