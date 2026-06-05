import { useEffect, useRef, useState } from "react";
import { EmptyState, Field, Icon, formatCurrency } from "./shared";

export const fallbackHero = "/images/burger-hero.jpg";
export const fallbackCard = "/images/burger-card.jpg";
export const categoryChips = ["All", "Fast Food", "Healthy", "Desserts"];

export function BuyerTopBar({
  user,
  cartItemCount,
  searchQuery,
  setSearchQuery,
  onTopNav,
  onToggleCart,
  onMyOrders,
  onLogout,
}) {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef(null);

  useEffect(() => {
    function handleDocumentClick(event) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
        setAccountMenuOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setAccountMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleDocumentClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <header className="buyer-topbar" id="buyer-top">
      <div className="buyer-brand" ref={accountMenuRef}>
        <button
          type="button"
          className="buyer-brand-trigger"
          aria-label="Open account menu"
          aria-expanded={accountMenuOpen}
          onClick={() => setAccountMenuOpen((current) => !current)}
        >
          <span className="buyer-brand-mark" aria-hidden="true">
            <img src="/images/logo.png" alt="" />
          </span>
          <span className="buyer-brand-text">Smart Bites</span>
          <Icon name="expand_more" />
        </button>
        {accountMenuOpen ? (
          <div className="account-menu" role="menu" aria-label="Account menu">
            <div className="account-menu-head">
              <strong>{user.full_name}</strong>
              <span>{user.email}</span>
              <span>{user.role}</span>
            </div>
            <button type="button" role="menuitem" onClick={() => setAccountMenuOpen(false)}>
              <Icon name="person" />
              Personal details
            </button>
            <button type="button" role="menuitem" onClick={onMyOrders}>
              <Icon name="receipt_long" />
              My Orders
            </button>
            <button type="button" role="menuitem" onClick={onLogout} className="danger">
              <Icon name="logout" />
              Logout
            </button>
          </div>
        ) : null}
      </div>

      <nav className="buyer-nav" aria-label="Primary">
        <button type="button" className="active" onClick={() => onTopNav("home")}>Home</button>
        <button type="button" onClick={() => onTopNav("explore")}>Explore</button>
        <button type="button" onClick={() => onTopNav("deals")}>Deals</button>
      </nav>

      <div className="buyer-search">
        <Icon name="search" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search restaurants or dishes..."
          aria-label="Search restaurants or dishes"
        />
      </div>

      <div className="buyer-top-actions">
        <button type="button" className="icon-button" aria-label="Notifications">
          <Icon name="notifications" />
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label="Cart"
          onClick={onToggleCart}
        >
          <Icon name="shopping_cart" />
          {cartItemCount ? <span className="icon-badge">{cartItemCount}</span> : null}
        </button>
        <button type="button" className="profile-button" aria-label="Account">
          <img src="/images/logo.png" alt="" />
        </button>
      </div>
    </header>
  );
}

export function BuyerHero({ restaurant, restaurantMenuCounts, onAddToCart, onOpenRestaurant }) {
  const heroImage = resolveRestaurantImage(restaurant, fallbackHero);
  return (
    <section className="market-hero" id="home">
      <img className="market-hero-image" src={heroImage} alt={restaurant?.name || "Featured restaurant"} />
      <div className="market-hero-gradient" aria-hidden="true" />
      <div className="market-hero-copy">
        <span className="hero-pill">FEATURED</span>
        <h1>{restaurant?.name || "Artisanal Hearth & Grill"}</h1>
        <p>{restaurant?.blurb || "Savor locally sourced ingredients prepared for delivery and pickup."}</p>
        <div className="market-hero-actions">
          <button type="button" className="primary-action" onClick={() => onAddToCart(restaurant)}>
            Add to Cart <Icon name="arrow_forward" />
          </button>
          <span className="hero-rating">
            <Icon name="star" />
            <strong>{formatHeroRating(restaurant, restaurantMenuCounts)}</strong>
            <span>{formatHeroMeta(restaurant, restaurantMenuCounts)}</span>
          </span>
        </div>
      </div>
      <div className="hero-dots" aria-hidden="true">
        <span className="active" />
        <span />
        <span />
      </div>
    </section>
  );
}

export function TrendingSection({
  restaurants,
  restaurantMenuCounts,
  onAddToCart,
  onResetSearch,
}) {
  return (
    <section className="section-block">
      <div className="section-head">
        <div>
          <h2>Trending Near You</h2>
          <p>The most active flavors in your neighborhood</p>
        </div>
        <button type="button" className="text-action" onClick={onResetSearch}>View All</button>
      </div>

      <div className="horizontal-cards">
        {restaurants.length ? restaurants.map((restaurant, index) => {
          const count = restaurantMenuCounts.get(String(restaurant.id)) || 0;
          return (
            <article key={restaurant.id} className="trending-card">
              <div className="trending-image-wrap">
                <img src={resolveRestaurantImage(restaurant, index % 2 === 0 ? fallbackCard : fallbackHero)} alt={restaurant.name} />
                <span className="time-chip">{formatTrendingTag(count, index)}</span>
              </div>
              <div className="trending-body">
                <h3>{restaurant.name}</h3>
                <p>{restaurant.blurb || `${count} menu item${count === 1 ? "" : "s"} available.`}</p>
                <button type="button" onClick={() => onAddToCart(restaurant)}>
                  Add to Cart <Icon name="add_shopping_cart" />
                </button>
              </div>
            </article>
          );
        }) : <EmptyState message="No restaurants available." />}
      </div>
    </section>
  );
}

export function RestaurantGridSection({
  restaurants,
  restaurantMenuCounts,
  activeChip,
  onChipChange,
  onAddToCart,
  onOpenRestaurant,
}) {
  return (
    <section className="section-block" id="restaurants">
      <div className="section-head section-head-stack">
        <div>
          <h2>All Restaurants</h2>
        </div>
        <div className="chip-row">
          {categoryChips.map((chip) => (
            <button
              key={chip}
              type="button"
              className={chip === activeChip ? "chip active" : "chip"}
              onClick={() => onChipChange(chip)}
            >
              {chip}
            </button>
          ))}
          <button type="button" className="chip filters-chip">
            Filters <Icon name="tune" />
          </button>
        </div>
      </div>

      <div className="restaurant-grid">
        {restaurants.length ? restaurants.map((restaurant, index) => {
          const count = restaurantMenuCounts.get(String(restaurant.id)) || 0;
          return (
            <article key={restaurant.id} className="restaurant-card">
              <div className="restaurant-image-wrap">
                <img src={resolveRestaurantImage(restaurant, index)} alt={restaurant.name} />
                <button
                  type="button"
                  className="heart-button"
                  onClick={() => onOpenRestaurant(restaurant.id)}
                  aria-label={`Open ${restaurant.name}`}
                >
                  <Icon name="favorite" />
                </button>
              </div>
              <div className="restaurant-body">
                <div className="restaurant-title-row">
                  <h3>{restaurant.name}</h3>
                  <span className="rating-pill">
                    <Icon name="star" /> {formatRestaurantScore(count, index)}
                  </span>
                </div>
                <div className="restaurant-meta">
                  <span><Icon name="schedule" /> {formatRestaurantWindow(count, index)}</span>
                  <span><Icon name="delivery_dining" /> {formatDeliveryLabel(count, index)}</span>
                </div>
                <button type="button" onClick={() => onAddToCart(restaurant)}>
                  Add to Cart <Icon name="add_shopping_cart" />
                </button>
              </div>
            </article>
          );
        }) : (
          <EmptyState message="No restaurants match your search." />
        )}
      </div>
    </section>
  );
}

export function BuyerDealsSection() {
  return (
    <section className="section-block" id="buyer-deals">
      <div className="promo-banner">
        <Icon name="loyalty" />
        <div>
          <strong>Free delivery</strong>
          <p>Unlock with Smart Bites Plus</p>
        </div>
      </div>
    </section>
  );
}

export function BuyerCartSidebar({
  cartItems,
  cartItemCount,
  cartSubtotal,
  cartOpen,
  onToggleCart,
  updateCartQuantity,
  handleCreateOrder,
  clearCart,
  orderForm,
  setOrderForm,
  orderResult,
  user,
  customerOrders,
}) {
  return (
    <aside className="buyer-sidebar">
      <div className="cart-shell">
        <div className="cart-shell-head">
          <h2><Icon name="shopping_basket" />Current Order</h2>
          <span className="order-count">{cartItemCount} items</span>
        </div>

        <div className="cart-shell-body">
          <div className="cart-items">
            {cartItems.length ? (
              cartItems.map((item) => (
                <article key={item.id} className="cart-row">
                  <img
                    className="cart-item-image"
                    src={item.background_image_url || item.profile_image_url || fallbackCard}
                    alt={item.name}
                  />
                  <div className="cart-item-main">
                    <div className="cart-item-copy">
                      <h3>{item.name}</h3>
                      <p>{item.restaurant_name || "Selected restaurant"}</p>
                      <span>{formatCurrency(item.base_price_cents)} each</span>
                    </div>
                    <div className="cart-controls">
                      <button type="button" onClick={() => updateCartQuantity(item.id, item.quantity - 1)}>-</button>
                      <span>{item.quantity}</span>
                      <button type="button" onClick={() => updateCartQuantity(item.id, item.quantity + 1)}>+</button>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <EmptyState message="Your cart is empty." />
            )}
          </div>

          <div className="cart-summary">
            <div>
              <span>Subtotal</span>
              <strong>{formatCurrency(cartSubtotal)}</strong>
            </div>
            <div>
              <span>Delivery Fee</span>
              <strong>{Number(orderForm.delivery_fee_cents || 0) > 0 ? formatCurrency(orderForm.delivery_fee_cents) : "FREE"}</strong>
            </div>
            <div className="cart-total">
              <span>Total</span>
              <strong>{formatCurrency(cartSubtotal + Number(orderForm.tax_cents || 0) + Number(orderForm.delivery_fee_cents || 0))}</strong>
            </div>
          </div>

          <button type="button" className="checkout-button" onClick={onToggleCart}>
            Checkout <Icon name="arrow_forward" />
          </button>

          {cartOpen ? (
            <form onSubmit={handleCreateOrder} className="checkout-form">
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
                onChange={(e) => setOrderForm((current) => ({ ...current, location_id: e.target.value }))}
                required
              />
              <label className="field">
                <span>Order Type</span>
                <select
                  value={orderForm.order_type}
                  onChange={(e) => setOrderForm((current) => ({ ...current, order_type: e.target.value }))}
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
                onChange={(e) => setOrderForm((current) => ({ ...current, tax_cents: e.target.value }))}
              />
              <Field
                label="Delivery Fee (cents)"
                type="number"
                min="0"
                value={orderForm.delivery_fee_cents}
                onChange={(e) => setOrderForm((current) => ({ ...current, delivery_fee_cents: e.target.value }))}
              />
              <div className="checkout-actions">
                <button type="submit" disabled={!cartItems.length}>Place Order</button>
                <button type="button" onClick={clearCart} disabled={!cartItems.length}>Clear Cart</button>
              </div>
              {orderResult ? <p className="checkout-note">Last order placed: #{orderResult.id}</p> : null}
            </form>
          ) : null}

          {customerOrders.length ? (
            <section className="recent-orders" id="recent-orders">
              <div className="section-head">
                <h3>Recent Orders</h3>
              </div>
              <ul className="data-list">
                {customerOrders.slice(0, 2).map((order) => (
                  <li key={order.id}>
                    <div className="list-head">
                      <strong>Order #{order.id}</strong>
                      <span className="status-chip">{order.status}</span>
                    </div>
                    <span>{order.restaurant_name}</span>
                    <span>Total {formatCurrency(order.total_cents)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="promo-banner compact">
            <Icon name="local_offer" />
            <div>
              <strong>BUY 1 GET 1</strong>
              <p>Selected items only today</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function BuyerBottomNav({ cartItemCount, onTopNav, onToggleCart }) {
  return (
    <nav className="buyer-bottom-nav" aria-label="Quick actions">
      <button type="button" className="active" onClick={() => onTopNav("home")}>
        <Icon name="home" />
        <span>Home</span>
      </button>
      <button type="button" onClick={() => onTopNav("explore")}>
        <Icon name="search" />
        <span>Search</span>
      </button>
      <button type="button" onClick={onToggleCart}>
        <Icon name="shopping_basket" />
        <span>Cart</span>
        {cartItemCount ? <span className="icon-badge mobile">{cartItemCount}</span> : null}
      </button>
      <button type="button">
        <Icon name="person" />
        <span>Account</span>
      </button>
    </nav>
  );
}

function resolveRestaurantImage(restaurant, fallback) {
  return restaurant?.background_image_url || restaurant?.profile_image_url || fallback;
}

function formatRestaurantScore(count, index) {
  const score = 4.4 + ((count + index) % 6) * 0.1;
  return score.toFixed(1);
}

function formatHeroRating(restaurant, counts) {
  if (!restaurant) {
    return "4.9";
  }
  const count = counts.get(String(restaurant.id)) || 0;
  return (4.5 + Math.min(0.4, count * 0.03)).toFixed(1);
}

function formatHeroMeta(restaurant, counts) {
  if (!restaurant) {
    return "500+ reviews";
  }
  const count = counts.get(String(restaurant.id)) || 0;
  return `${count} meals available`;
}

function formatTrendingTag(count, index) {
  const tags = ["High Demand", "Top Rated", "Plant Based", "Fastest Delivery"];
  return count ? tags[index % tags.length] : "New";
}

function formatRestaurantWindow(count, index) {
  const windows = ["15-20 min", "20-30 min", "25-35 min", "30-40 min", "10-20 min"];
  return windows[(count + index) % windows.length];
}

function formatDeliveryLabel(count, index) {
  const labels = ["Free Delivery", "$2.99 Delivery", "Free Delivery", "$1.49 Delivery"];
  return labels[(count + index) % labels.length];
}
