-- Atomic stock decrement used by the Paystack webhook (app/api/webhook/route.ts).
-- Only decrements when enough stock is left, and returns whether it did, so
-- the webhook can tell when two customers paid for the same last unit.
-- (The older `decrement` function silently clamps at 0 and hides that.)
create or replace function decrement_stock(x integer, row_id uuid, row_size text)
returns boolean as $$
  with updated as (
    update inventory set quantity = quantity - x
    where product_id = row_id and size = row_size and quantity >= x
    returning 1
  )
  select exists (select 1 from updated);
$$ language sql;
