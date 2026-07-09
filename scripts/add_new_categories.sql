-- Adds girls-jackets, girls-skirts, boys-underwear, boys-graphic-tees to the
-- allowed category list. Run once in the Supabase SQL Editor.
alter table products drop constraint if exists products_category_check;

alter table products add constraint products_category_check
  check (category in (
    'girls-dresses','girls-tops','girls-graphic-tees','girls-underwear','girls-shoes',
    'girls-jumpsuits','girls-leggings','girls-shorts','girls-jeans','girls-jackets','girls-skirts',
    'back-to-school-girls','girls-baby',
    'boys-shirts','boys-graphic-tees','boys-polo','boys-sets','boys-pyjamas','boys-shoes',
    'boys-shorts','boys-trousers','boys-underwear',
    'back-to-school-boys','boys-baby',
    'birthday-tees','clearance'
  ));
