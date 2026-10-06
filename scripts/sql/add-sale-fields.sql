-- End-of-year clearance sale feature — run this once in the Supabase SQL editor
-- (Project > SQL Editor > New query > paste > Run). Purely additive: adds
-- new columns/a new table, touches no existing data, and is safe to re-run
-- (IF NOT EXISTS / ON CONFLICT guards throughout).

-- 1. Per-product sale flag + discounted price. `price` stays the real/regular
--    price always — `sale_price` is only read when `on_sale` is true, so
--    toggling a sale off never loses the original number.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS on_sale boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sale_price numeric;

-- 2. Single-row settings table holding the sale campaign's end date. NULL
--    means "no end date set" (sale stays on until manually turned off).
CREATE TABLE IF NOT EXISTS sale_settings (
  id smallint PRIMARY KEY DEFAULT 1,
  ends_at timestamptz,
  CONSTRAINT sale_settings_single_row CHECK (id = 1)
);

INSERT INTO sale_settings (id, ends_at)
VALUES (1, null)
ON CONFLICT (id) DO NOTHING;
