-- Adds variant-grouping support: two or more product rows can share a
-- variant_group so the shop shows them as one listing with a dropdown that
-- switches price/name/inventory/sku between the real underlying products.
-- Run once in the Supabase SQL Editor.
alter table products add column if not exists variant_group text;
alter table products add column if not exists variant_label text;
alter table products add column if not exists is_variant_child boolean not null default false;

-- Hidden variant children shouldn't show up twice in listings/search
create index if not exists idx_products_variant_group on products (variant_group) where variant_group is not null;
