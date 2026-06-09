-- Create shipping_rates table with both fee tiers
create table if not exists shipping_rates (
  state      text primary key,
  fee        integer not null default 5500,
  heavy_fee  integer not null default 7500,
  updated_at timestamptz default now()
);

-- Upsert all 37 states with correct zone rates
insert into shipping_rates (state, fee, heavy_fee) values
  -- Lagos
  ('Lagos',           4000,  6000),
  -- Southwest + East + Abuja (GIGM)
  ('Ogun',            5500,  7500),
  ('Oyo',             5500,  7500),
  ('Osun',            5500,  7500),
  ('Ondo',            5500,  7500),
  ('Ekiti',           5500,  7500),
  ('Kwara',           5500,  7500),
  ('FCT - Abuja',     5500,  7500),
  ('Nasarawa',        5500,  7500),
  ('Delta',           5500,  7500),
  ('Edo',             5500,  7500),
  ('Rivers',          5500,  7500),
  ('Bayelsa',         5500,  7500),
  ('Cross River',     5500,  7500),
  ('Akwa Ibom',       5500,  7500),
  ('Anambra',         5500,  7500),
  ('Imo',             5500,  7500),
  ('Abia',            5500,  7500),
  ('Enugu',           5500,  7500),
  ('Ebonyi',          5500,  7500),
  -- North (ABC Logistics)
  ('Benue',           9000, 13000),
  ('Kogi',            9000, 13000),
  ('Niger',           9000, 13000),
  ('Plateau',         9000, 13000),
  ('Taraba',          9000, 13000),
  ('Kaduna',          9000, 13000),
  ('Kano',            9000, 13000),
  ('Katsina',         9000, 13000),
  ('Kebbi',           9000, 13000),
  ('Sokoto',          9000, 13000),
  ('Jigawa',          9000, 13000),
  ('Zamfara',         9000, 13000),
  ('Borno',           9000, 13000),
  ('Adamawa',         9000, 13000),
  ('Gombe',           9000, 13000),
  ('Bauchi',          9000, 13000),
  ('Yobe',            9000, 13000)
on conflict (state) do update
  set fee = excluded.fee,
      heavy_fee = excluded.heavy_fee;
