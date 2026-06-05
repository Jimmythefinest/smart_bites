import { Icon } from "./shared";

export function BrandBlock({ subtitle }) {
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

export function AppShell({
  user,
  status,
  error,
  toasts,
  roleTabs,
  currentRole,
  activeTab,
  setActiveTab,
  restaurants,
  menuItems,
  orderStatus,
  bootstrap,
  handleLogout,
  children,
}) {
  if (user.role === "admin" || user.role === "restaurant") {
    return (
      <main className={`app-shell role-${user.role} ${user.role === "admin" ? "admin-shell" : "restaurant-shell-wrapper"} antialiased`}>
        <div className="toast-stack" aria-live="polite" aria-atomic="true">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast ${toast.type}`}>{toast.message}</div>
          ))}
        </div>
        {error ? <p className={user.role === "admin" ? "admin-shell-error" : "restaurant-shell-error"}>{error}</p> : null}
        {children}
      </main>
    );
  }

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
              <span className="pill soft">{orderStatus}</span>
            </div>
          </div>
        </div>
        <div className="hero-controls">
          <div className="status-row">
            <span className={`pill ${status === "API online" || status === "Authenticated" ? "ok" : "bad"}`}>
              {status}
            </span>
            <span className="pill">{user.full_name} ({user.role})</span>
            <button type="button" onClick={bootstrap}><Icon name="sync" />Refresh Data</button>
            <button type="button" onClick={handleLogout}><Icon name="logout" />Logout</button>
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
            <Icon name={tab.icon} />
            {tab.label}
          </button>
        ))}
      </nav>

      <section className={`tab-stage ${user.role === "admin" ? "admin-stage" : ""}`}>
        {children}
      </section>
    </main>
  );
}
