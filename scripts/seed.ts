import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const girlsDresses = [
  { sku: 'MokidsD001', name: 'Stunning Turquoise Layered Dress', description: 'A stunning turquoise layered dress that commands attention. Perfect for special occasions.', price: 54999, colour: 'Turquoise', sizes: [{ size: '7 Years', qty: 1 }, { size: '8 Years', qty: 1 }] },
  { sku: 'MokidsD002', name: 'Black & Red Checkered Dress', description: 'Beautiful black and red checkered dress with elegant styling.', price: 38000, colour: 'Black & Red', sizes: [{ size: '6 Years', qty: 2 }, { size: '6X', qty: 1 }] },
  { sku: 'MokidsD003', name: 'Beautiful Lace Mesh Red Dress', description: 'Gorgeous lace mesh red dress, perfect for parties and celebrations.', price: 35000, colour: 'Red', sizes: [{ size: '4T', qty: 1 }] },
  { sku: 'MokidsD004', name: 'Sparkling Show-Stopper Dress', description: 'A sparkling show-stopper dress that will make your little girl shine at any event.', price: 40500, colour: 'One Colour', sizes: [{ size: '5 Years', qty: 1 }, { size: '6 Years', qty: 1 }, { size: '8 Years', qty: 1 }, { size: '9 Years', qty: 1 }, { size: '10 Years', qty: 1 }] },
  { sku: 'MokidsD005', name: 'Green Lace Mesh Ball Dress', description: 'An elegant green lace mesh ball dress for your little princess.', price: 38000, colour: 'Green', sizes: [{ size: '7 Years', qty: 1 }] },
  { sku: 'MokidsD007', name: 'Emerald-Green Layered Ball Dress', description: 'Stunning emerald-green layered ball dress — a true showpiece for any occasion.', price: 68000, colour: 'Emerald Green', sizes: [{ size: '7 Years', qty: 1 }, { size: '8 Years', qty: 1 }, { size: '10 Years', qty: 1 }, { size: '12 Years', qty: 1 }, { size: '14 Years', qty: 1 }, { size: '16 Years', qty: 1 }] },
  { sku: 'MokidsD009', name: 'Sparkly Bodice Bow & Plaid Skirt Dress', description: 'Sparkly bodice, statement side bow and twirl-ready plaid skirt. A true head-turner.', price: 42500, colour: 'One Colour', sizes: [{ size: '2T', qty: 1 }, { size: '3T', qty: 1 }, { size: '4T', qty: 1 }, { size: '5 Years', qty: 1 }, { size: '6 Years', qty: 1 }] },
  { sku: 'MokidD010', name: 'Elegant Show-Stopper Dress with Cross Bag', description: 'Sparkle all night in this elegant, comfy show-stopper dress — comes with a matching cross bag.', price: 48500, colour: 'One Colour', sizes: [{ size: '7 Years', qty: 1 }, { size: '8 Years', qty: 1 }, { size: '10 Years', qty: 1 }] },
  { sku: 'MokidsD012', name: 'Side Ruffle Bow Dress', description: 'Stunning side ruffle bow dress available in red and green. A statement piece for any event.', price: 38000, colour: 'Red & Green', sizes: [{ size: '7 Years', qty: 2 }, { size: '8 Years', qty: 1 }, { size: '10 Years', qty: 1 }, { size: '12 Years', qty: 1 }] },
  { sku: 'MokidsD014', name: 'Emerald Layered Bow Dress', description: 'An elegant emerald layered bow dress for your little fashionista.', price: 55000, colour: 'Emerald', sizes: [{ size: '7 Years', qty: 1 }, { size: '10 Years', qty: 1 }] },
  { sku: 'MokidsD015', name: 'Elegant Floral High-Low Dress', description: 'Beautiful floral high-low dress with elegant styling — perfect for parties.', price: 55000, colour: 'One Colour', sizes: [{ size: '7 Years', qty: 1 }, { size: '8 Years', qty: 1 }, { size: '10 Years', qty: 1 }, { size: '12 Years', qty: 1 }] },
  { sku: 'MokidsD017', name: 'Sky Blue Bow Scuba Dress', description: 'Triple-strapped statement shoulder bow scuba dress in sky blue. A true fashion statement.', price: 28000, colour: 'Sky Blue', sizes: [{ size: '7 Years', qty: 1 }, { size: '8 Years', qty: 1 }] },
  { sku: 'MokidsD018', name: 'Shimmer Pleated Party Dress', description: 'A dazzling shimmer pleated party dress that will make your little girl the star of the show.', price: 60000, colour: 'Shimmer', sizes: [{ size: '7 Years', qty: 1 }, { size: '8 Years', qty: 1 }] },
  { sku: 'MokidsD019', name: 'Red Crystal Brooch Ball Dress', description: 'Double strap crystal brooch, side drape ball dress in stunning red. Pure elegance.', price: 60000, colour: 'Red', sizes: [{ size: '8 Years', qty: 1 }, { size: '10 Years', qty: 1 }] },
  { sku: 'MokidsD022', name: 'Navy & Gold One-Shoulder Dress', description: 'Sophisticated navy and gold one-hand shoulder dress — perfect for special occasions.', price: 55000, colour: 'Navy & Gold', sizes: [{ size: '7 Years', qty: 1 }] },
  { sku: 'MokidsD023', name: 'Stain-Resistance Polo Dress', description: 'Practical and stylish stain-resistance polo dress in sky blue. Great for everyday wear.', price: 25000, colour: 'Sky Blue', sizes: [{ size: '10 Years', qty: 1 }] },
  { sku: 'MokidsD024', name: 'Asymmetric Layered Dress with Side Rose', description: 'Stunning asymmetric layered dress with a beautiful side rose detail.', price: 42000, colour: 'One Colour', sizes: [{ size: '8 Years', qty: 1 }, { size: '10 Years', qty: 1 }] },
  { sku: 'MokidsD026', name: 'Velour Fit & Flare Dress', description: 'Chic velour fit and flare dress in black and gold — timeless and elegant.', price: 25000, colour: 'Black & Gold', sizes: [{ size: '5 Years', qty: 1 }, { size: '8 Years', qty: 1 }, { size: '10 Years', qty: 1 }, { size: '16 Years', qty: 1 }] },
  { sku: 'MokidsD027', name: 'Green Polo Dress', description: 'Stylish and comfortable green polo dress for everyday wear.', price: 18000, colour: 'Green', sizes: [{ size: '10 Years', qty: 1 }, { size: '12 Years', qty: 1 }] },
  { sku: 'MokidsD028', name: 'Satin Bodice Red Lace Dress', description: 'Beautiful satin bodice red lace dress — perfect for toddlers at special events.', price: 42500, colour: 'Red', sizes: [{ size: '2T', qty: 1 }, { size: '3T', qty: 1 }, { size: '4T', qty: 1 }] },
  { sku: 'MokidsD029', name: 'Pink Casual Dress', description: 'A pretty pink casual dress for everyday style and comfort.', price: 15000, colour: 'Pink', sizes: [{ size: '5 Years', qty: 1 }, { size: '6X/7', qty: 1 }, { size: '8 Years', qty: 1 }, { size: '14 Years', qty: 1 }] },
  { sku: 'MokidsD030', name: 'Pink Casual Dress with Rhinestone', description: 'Cute pink casual dress with rhinestone detail for extra sparkle.', price: 15000, colour: 'Pink', sizes: [{ size: '6 Years', qty: 1 }] },
  { sku: 'MokidsD031', name: 'Multicolor Lace Dress', description: 'Vibrant multicolor lace dress — a celebration of colour and style.', price: 30000, colour: 'Multicolor', sizes: [{ size: '18-24 Months', qty: 1 }, { size: '2T', qty: 2 }, { size: '4T', qty: 1 }, { size: '5T', qty: 1 }] },
  { sku: 'MokidsD033', name: 'Champagne Gold Floral Dress', description: 'Gorgeous champagne gold floral dress — a classic choice for any special occasion.', price: 39500, colour: 'Champagne Gold', sizes: [{ size: '2T', qty: 1 }, { size: '3T', qty: 2 }] },
  { sku: 'MokidsD034', name: 'Dreamy Unicorn Dress', description: 'A magical dreamy unicorn dress that every little girl will love.', price: 30000, colour: 'One Colour', sizes: [{ size: '2T', qty: 1 }] },
  { sku: 'MokidsD035', name: 'Jacketed Floral Embroidery Dress', description: 'Beautiful jacketed dress with intricate floral embroidery detail.', price: 25000, colour: 'One Colour', sizes: [{ size: '5T', qty: 1 }] },
  { sku: 'MokidsD036', name: 'Checkers Casual Dress', description: 'Fun checkers casual dress — great for school or everyday wear.', price: 18000, colour: 'One Colour', sizes: [{ size: '5 Years', qty: 1 }] },
  { sku: 'MokidsD037', name: 'Stunning Metallic Flare Dress', description: 'A head-turning metallic flare dress with brilliant shimmer.', price: 30000, colour: 'Metallic', sizes: [{ size: '5 Years', qty: 1 }] },
  { sku: 'MokidsD038', name: 'Brown Cotton Dress', description: 'Comfortable and stylish brown cotton dress for casual everyday wear.', price: 30000, colour: 'Brown', sizes: [{ size: '5 Years', qty: 1 }] },
  { sku: 'MokidsD039', name: 'Casual Purple Floral Dress', description: 'Pretty casual purple floral dress — light, airy, and stylish.', price: 8000, colour: 'Purple', sizes: [{ size: '6X/7', qty: 1 }] },
  { sku: 'MokidD040', name: 'Casual Black Dress', description: 'Simple and chic casual black dress — a wardrobe essential.', price: 8000, colour: 'Black', sizes: [{ size: '6X/7', qty: 1 }] },
  { sku: 'MokidsD041', name: 'Green Casual Dress', description: 'Fresh and fun green casual dress for everyday adventures.', price: 8000, colour: 'Green', sizes: [{ size: '3 Years', qty: 1 }, { size: '5 Years', qty: 1 }] },
  { sku: 'MokidsD042', name: 'Yellow Floral Casual Dress', description: 'Bright and cheerful yellow floral casual dress — sunshine in a dress.', price: 8000, colour: 'Yellow', sizes: [{ size: '2T', qty: 1 }, { size: '3T', qty: 1 }, { size: '6 Years', qty: 1 }, { size: '6X', qty: 1 }, { size: '8 Years', qty: 1 }, { size: '10 Years', qty: 1 }] },
]

// Boys shirts - long sleeve (MokidsLS008–MokidsLS050)
const boysLongSleeveShirts = Array.from({ length: 43 }, (_, i) => {
  const num = i + 8
  return {
    sku: `MokidsLS${String(num).padStart(3, '0')}`,
    name: `Boys Long Sleeve Shirt ${String(num).padStart(3, '0')}`,
    description: 'Boys long sleeve shirt — details and pricing to be updated.',
    price: 0,
    colour: null,
    sizes: [] as { size: string; qty: number }[],
  }
})

// Boys shirts - short sleeve (MokidsSL008–MokidsSL050)
const boysShortSleeveShirts = Array.from({ length: 43 }, (_, i) => {
  const num = i + 8
  return {
    sku: `MokidsSL${String(num).padStart(3, '0')}`,
    name: `Boys Short Sleeve Shirt ${String(num).padStart(3, '0')}`,
    description: 'Boys short sleeve shirt — details and pricing to be updated.',
    price: 0,
    colour: null,
    sizes: [] as { size: string; qty: number }[],
  }
})

async function seed() {
  console.log('Seeding Girls Dresses...')
  for (const dress of girlsDresses) {
    const { data: product, error: prodErr } = await supabase
      .from('products')
      .upsert({ sku: dress.sku, name: dress.name, description: dress.description, price: dress.price, category: 'girls-dresses', gender: 'girls', colour: dress.colour, images: [], is_active: true }, { onConflict: 'sku' })
      .select()
      .single()

    if (prodErr) { console.error(`Error inserting ${dress.sku}:`, prodErr); continue }

    if (dress.sizes.length > 0) {
      const invRows = dress.sizes.map(s => ({ product_id: product.id, size: s.size, quantity: s.qty }))
      const { error: invErr } = await supabase.from('inventory').upsert(invRows, { onConflict: 'product_id,size' })
      if (invErr) console.error(`Error inserting inventory for ${dress.sku}:`, invErr)
    }
    console.log(`✓ ${dress.sku} - ${dress.name}`)
  }

  console.log('\nSeeding Boys Long Sleeve Shirts...')
  for (const shirt of boysLongSleeveShirts) {
    const { error } = await supabase
      .from('products')
      .upsert({ sku: shirt.sku, name: shirt.name, description: shirt.description, price: shirt.price, category: 'boys-shirts', gender: 'boys', colour: shirt.colour, images: [], is_active: false }, { onConflict: 'sku' })
    if (error) console.error(`Error inserting ${shirt.sku}:`, error)
    else console.log(`✓ ${shirt.sku}`)
  }

  console.log('\nSeeding Boys Short Sleeve Shirts...')
  for (const shirt of boysShortSleeveShirts) {
    const { error } = await supabase
      .from('products')
      .upsert({ sku: shirt.sku, name: shirt.name, description: shirt.description, price: shirt.price, category: 'boys-shirts', gender: 'boys', colour: shirt.colour, images: [], is_active: false }, { onConflict: 'sku' })
    if (error) console.error(`Error inserting ${shirt.sku}:`, error)
    else console.log(`✓ ${shirt.sku}`)
  }

  console.log('\nSeeding complete!')
}

seed()
