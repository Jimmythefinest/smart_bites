-- smart_bites database schema
-- PostgreSQL

begin;

-- USERS
create table if not exists users (
  id bigserial primary key,
  email text unique not null,
  full_name text not null,
  password_hash text,
  role text not null default 'buyer' check (role in ('admin', 'restaurant', 'buyer')),
  managed_restaurant_id bigint,
  phone text,
  created_at timestamptz not null default now()
);

alter table users add column if not exists password_hash text;
alter table users add column if not exists role text not null default 'buyer';
alter table users add column if not exists managed_restaurant_id bigint;
alter table users drop constraint if exists users_role_check;
alter table users add constraint users_role_check check (role in ('admin', 'restaurant', 'buyer'));
create unique index if not exists uq_users_managed_restaurant_id
  on users (managed_restaurant_id)
  where managed_restaurant_id is not null;

-- RESTAURANTS + LOCATIONS
create table if not exists restaurants (
  id bigserial primary key,
  name text not null,
  slug text unique not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists restaurant_locations (
  id bigserial primary key,
  restaurant_id bigint not null references restaurants(id) on delete cascade,
  name text not null,
  address_line1 text not null,
  city text not null,
  state text not null,
  postal_code text not null,
  timezone text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table users drop constraint if exists users_managed_restaurant_id_fkey;
alter table users add constraint users_managed_restaurant_id_fkey
  foreign key (managed_restaurant_id) references restaurants(id) on delete set null;

-- STAFF ACCESS
create table if not exists restaurant_staff (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  restaurant_id bigint not null references restaurants(id) on delete cascade,
  location_id bigint references restaurant_locations(id) on delete set null,
  role text not null check (role in ('owner', 'manager', 'staff')),
  created_at timestamptz not null default now()
);

create unique index if not exists uq_restaurant_staff_scope
  on restaurant_staff (user_id, restaurant_id, coalesce(location_id, 0));

-- MENU
create table if not exists menu_categories (
  id bigserial primary key,
  restaurant_id bigint not null references restaurants(id) on delete cascade,
  name text not null,
  sort_order int not null default 0
);

create table if not exists menu_items (
  id bigserial primary key,
  restaurant_id bigint not null references restaurants(id) on delete cascade,
  category_id bigint references menu_categories(id) on delete set null,
  name text not null,
  description text,
  base_price_cents int not null check (base_price_cents >= 0),
  is_active boolean not null default true
);

create table if not exists modifier_groups (
  id bigserial primary key,
  restaurant_id bigint not null references restaurants(id) on delete cascade,
  name text not null,
  min_select int not null default 0,
  max_select int not null default 1
);

create table if not exists modifier_options (
  id bigserial primary key,
  group_id bigint not null references modifier_groups(id) on delete cascade,
  name text not null,
  price_delta_cents int not null default 0
);

create table if not exists menu_item_modifier_groups (
  menu_item_id bigint not null references menu_items(id) on delete cascade,
  modifier_group_id bigint not null references modifier_groups(id) on delete cascade,
  primary key (menu_item_id, modifier_group_id)
);

-- CUSTOMERS + ORDERS
create table if not exists customer_addresses (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  label text,
  address_line1 text not null,
  city text not null,
  state text not null,
  postal_code text not null
);

create table if not exists orders (
  id bigserial primary key,
  customer_id bigint not null references users(id),
  restaurant_id bigint not null references restaurants(id),
  location_id bigint not null references restaurant_locations(id),
  delivery_address_id bigint references customer_addresses(id),
  order_type text not null check (order_type in ('pickup', 'delivery')),
  status text not null check (
    status in (
      'placed',
      'confirmed',
      'preparing',
      'ready',
      'out_for_delivery',
      'completed',
      'cancelled'
    )
  ),
  subtotal_cents int not null check (subtotal_cents >= 0),
  tax_cents int not null default 0 check (tax_cents >= 0),
  delivery_fee_cents int not null default 0 check (delivery_fee_cents >= 0),
  total_cents int not null check (total_cents >= 0),
  created_at timestamptz not null default now()
);

create table if not exists order_items (
  id bigserial primary key,
  order_id bigint not null references orders(id) on delete cascade,
  menu_item_id bigint not null references menu_items(id),
  item_name_snapshot text not null,
  unit_price_cents int not null check (unit_price_cents >= 0),
  quantity int not null check (quantity > 0)
);

create table if not exists order_item_modifiers (
  order_item_id bigint not null references order_items(id) on delete cascade,
  modifier_option_id bigint not null references modifier_options(id),
  option_name_snapshot text not null,
  price_delta_cents int not null default 0,
  primary key (order_item_id, modifier_option_id)
);

create table if not exists payments (
  id bigserial primary key,
  order_id bigint not null unique references orders(id) on delete cascade,
  provider text not null,
  provider_payment_id text,
  status text not null check (status in ('pending', 'authorized', 'captured', 'failed', 'refunded')),
  amount_cents int not null check (amount_cents >= 0),
  created_at timestamptz not null default now()
);

-- STOCK TRACKER (PER MENU ITEM, PER LOCATION)
create table if not exists menu_item_inventory (
  location_id bigint not null references restaurant_locations(id) on delete cascade,
  menu_item_id bigint not null references menu_items(id) on delete cascade,
  qty_on_hand numeric(10,2) not null default 0,
  reorder_level numeric(10,2) not null default 0,
  par_level numeric(10,2),
  track_inventory boolean not null default true,
  is_out_of_stock boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (location_id, menu_item_id),
  check (qty_on_hand >= 0)
);

create table if not exists inventory_transactions (
  id bigserial primary key,
  location_id bigint not null references restaurant_locations(id) on delete cascade,
  menu_item_id bigint not null references menu_items(id) on delete cascade,
  order_id bigint references orders(id) on delete set null,
  txn_type text not null check (txn_type in ('restock', 'sale', 'waste', 'adjustment', 'return')),
  qty_delta numeric(10,2) not null,
  reason text,
  created_by bigint references users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- INDEXES
create index if not exists idx_menu_items_active
  on menu_items (restaurant_id, is_active);

create index if not exists idx_orders_restaurant_created
  on orders (restaurant_id, created_at desc);

create index if not exists idx_orders_customer_created
  on orders (customer_id, created_at desc);

create index if not exists idx_locations_active
  on restaurant_locations (restaurant_id, is_active);

create index if not exists idx_inventory_low_stock
  on menu_item_inventory (location_id, qty_on_hand, reorder_level);

create index if not exists idx_inventory_txn_lookup
  on inventory_transactions (location_id, menu_item_id, created_at desc);

commit;
