-- Shipping rates per Nigerian state
create table if not exists shipping_rates (
  state text primary key,
  fee   integer not null default 3500,
  updated_at timestamptz default now()
);

-- Default rates (Lagos cheapest; North most expensive)
insert into shipping_rates (state, fee) values
  ('Lagos',         2000),
  ('Ogun',          3000),
  ('Oyo',           3000),
  ('Osun',          3000),
  ('Ondo',          3000),
  ('Ekiti',         3000),
  ('Kwara',         3000),
  ('FCT - Abuja',   3000),
  ('Delta',         3500),
  ('Edo',           3500),
  ('Rivers',        3500),
  ('Bayelsa',       3500),
  ('Cross River',   3500),
  ('Akwa Ibom',     3500),
  ('Anambra',       3500),
  ('Imo',           3500),
  ('Abia',          3500),
  ('Enugu',         3500),
  ('Ebonyi',        3500),
  ('Kogi',          4000),
  ('Benue',         4000),
  ('Nasarawa',      4000),
  ('Niger',         4000),
  ('Plateau',       4000),
  ('Taraba',        4000),
  ('Kaduna',        4500),
  ('Kano',          4500),
  ('Katsina',       4500),
  ('Kebbi',         4500),
  ('Sokoto',        4500),
  ('Jigawa',        4500),
  ('Zamfara',       4500),
  ('Borno',         4500),
  ('Adamawa',       4500),
  ('Gombe',         4500),
  ('Bauchi',        4500),
  ('Yobe',          4500)
on conflict (state) do nothing;
