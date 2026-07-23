-- Lets a product appear under an additional category listing (e.g. school
-- shoes showing up in both "Girls Shoes" and "Back to School") without
-- duplicating the product row or changing its primary category.
-- Run once in the Supabase SQL Editor.
alter table products add column if not exists also_categories text[] not null default '{}';

create index if not exists idx_products_also_categories on products using gin (also_categories);
