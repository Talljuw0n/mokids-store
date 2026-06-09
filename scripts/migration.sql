-- Products table
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  sku text unique not null,
  name text not null,
  description text,
  price integer not null,
  category text not null check (category in ('girls-dresses','girls-tops','girls-graphic-tees','girls-underwear','girls-shoes','girls-jumpsuits','boys-shirts','boys-polo','boys-pyjamas','boys-shoes','boys-shorts','boys-trousers')),
  gender text not null check (gender in ('girls','boys','unisex')),
  colour text,
  images text[] default '{}',
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Inventory table (per product per size)
create table if not exists inventory (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  size text not null,
  quantity integer not null default 0,
  updated_at timestamptz default now(),
  unique(product_id, size)
);

-- Orders table
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  email text not null,
  phone text not null,
  shipping_address text not null,
  state text not null,
  items jsonb not null,
  subtotal integer not null,
  shipping_fee integer not null default 0,
  total integer not null,
  payment_ref text,
  paystack_status text,
  status text default 'pending' check (status in ('pending','paid','fulfilled','cancelled')),
  created_at timestamptz default now()
);

-- Trigger to auto-update inventory.updated_at
create or replace function update_inventory_timestamp()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists inventory_updated_at on inventory;
create trigger inventory_updated_at
before update on inventory
for each row execute function update_inventory_timestamp();

-- Safe decrement function (never goes below 0)
create or replace function decrement(x integer, row_id uuid, row_size text)
returns void as $$
  update inventory set quantity = greatest(0, quantity - x)
  where product_id = row_id and size = row_size;
$$ language sql;
