export function formatPrice(amount: number): string {
  return `₦${amount.toLocaleString('en-NG')}`
}

export function productSlug(sku: string, name: string): string {
  return `${sku.toLowerCase()}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
}

export function slugToSku(slug: string): string {
  // The SKU is the part before the first long hyphenated name segment
  // Slugs are: mokidsd001-stunning-turquoise-layered-dress
  // SKU patterns: MokidsD001, MokidsSL008, MokidsLS022, etc.
  // Extract the first "word" up to the start of the product name
  const match = slug.match(/^(mokids[a-z]*\d+|mokid[a-z]*\d+)/i)
  return match ? match[1].toUpperCase() : slug
}

export const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa',
  'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo',
  'Ekiti', 'Enugu', 'FCT - Abuja', 'Gombe', 'Imo', 'Jigawa',
  'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
  'Lagos Island', 'Lagos Mainland', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun',
  'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
]

export const CATEGORY_LABELS: Record<string, string> = {
  'girls-dresses': 'Girls Dresses',
  'girls-tops': 'Girls Tops',
  'girls-graphic-tees': 'Girls Graphic Tees',
  'girls-underwear': 'Girls Underwear',
  'girls-shoes': 'Girls Shoes',
  'girls-jumpsuits': 'Girls Jumpsuits',
  'girls-leggings': 'Girls Leggings',
  'girls-shorts': 'Girls Shorts',
  'girls-jeans': 'Girls Jeans',
  'girls-jackets': 'Girls Jackets',
  'girls-skirts': 'Girls Skirts & Skorts',
  'back-to-school-girls': 'Back to School (Girls)',
  'girls-baby': 'Girls Baby (0-24m)',
  'boys-shirts': 'Boys Shirts',
  'boys-graphic-tees': 'Boys Graphic Tees',
  'boys-polo': 'Boys Polo',
  'boys-sets': 'Boys 2PCS Sets',
  'boys-pyjamas': 'Boys Pyjamas',
  'boys-shoes': 'Boys Shoes',
  'boys-shorts': 'Boys Shorts',
  'boys-trousers': 'Boys Trousers',
  'boys-underwear': 'Boys Underwear',
  'back-to-school-boys': 'Back to School (Boys)',
  'boys-baby': 'Boys Baby (0-24m)',
  'birthday-tees': 'Birthday Tees',
  'clearance': 'Clearance Sale',
}

// Maps a free-text colour name (lowercased, spaces stripped) to a swatch
// colour/gradient, used for both the storefront swatch picker and the admin
// colour-variant linker
export const COLOUR_SWATCH_MAP: Record<string, string> = {
  red: '#ef4444', pink: '#ec4899', hotpink: '#f472b6', rose: '#fb7185',
  purple: '#a855f7', violet: '#8b5cf6', lavender: '#c4b5fd',
  blue: '#3b82f6', navy: '#1e3a8a', skyblue: '#38bdf8', lightblue: '#7dd3fc',
  green: '#22c55e', mint: '#6ee7b7', olive: '#84cc16',
  yellow: '#eab308', gold: '#f59e0b', orange: '#f97316', peach: '#fdba74',
  white: '#ffffff', cream: '#fef9c3', beige: '#e5d3b3',
  grey: '#9ca3af', gray: '#9ca3af', silver: '#d1d5db',
  black: '#111827', brown: '#92400e', chocolate: '#7c3100',
  teal: '#14b8a6', cyan: '#06b6d4', coral: '#f87171', lilac: '#d8b4fe',
  multicolour: 'linear-gradient(135deg,#f472b6,#a78bfa,#38bdf8,#4ade80,#facc15)',
  multicolor:  'linear-gradient(135deg,#f472b6,#a78bfa,#38bdf8,#4ade80,#facc15)',
}

export const STANDARD_SHIPPING_FEE = 5500
// Item count threshold above which the heavy (>1kg) rate applies.
// Kids clothing ≈ 300g/item → 4 items ≈ 1.2kg
export const HEAVY_ORDER_THRESHOLD = 4

export type ShippingRate = { fee: number; heavy_fee: number }

// Delivery zones
export const DELIVERY_ZONES = [
  {
    id: 'lagos-island',
    name: 'Lagos Island',
    carrier: 'Local delivery',
    note: '',
    states: ['Lagos Island'],
    color: '#D9247A',
    defaultFee: 5000,
    defaultHeavyFee: 5000,
  },
  {
    id: 'lagos-mainland',
    name: 'Lagos Mainland',
    carrier: 'Local delivery',
    note: '',
    states: ['Lagos Mainland'],
    color: '#F5C000',
    defaultFee: 6000,
    defaultHeavyFee: 6000,
  },
  {
    id: 'south',
    name: 'Southwest, East & Abuja',
    carrier: 'GUO',
    note: '',
    states: [
      'Ogun', 'Oyo', 'Osun', 'Ondo', 'Ekiti', 'Kwara',
      'FCT - Abuja', 'Nasarawa',
      'Delta', 'Edo', 'Rivers', 'Bayelsa', 'Cross River', 'Akwa Ibom',
      'Anambra', 'Imo', 'Abia', 'Enugu', 'Ebonyi',
    ],
    color: '#3DB8E8',
    defaultFee: 6500,
    defaultHeavyFee: 6500,
  },
  {
    id: 'north',
    name: 'North',
    carrier: 'ABC Logistics',
    note: '',
    states: [
      'Benue', 'Kogi', 'Niger', 'Plateau', 'Taraba',
      'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Sokoto', 'Jigawa', 'Zamfara',
      'Borno', 'Adamawa', 'Gombe', 'Bauchi', 'Yobe',
    ],
    color: '#E55A1C',
    defaultFee: 8500,
    defaultHeavyFee: 8500,
  },
] as const

// Default per-state rates (fallback if DB is unavailable)
export const DEFAULT_SHIPPING_RATES: Record<string, ShippingRate> = (() => {
  const map: Record<string, ShippingRate> = {}
  for (const zone of DELIVERY_ZONES) {
    for (const state of zone.states) {
      map[state] = { fee: zone.defaultFee, heavy_fee: zone.defaultHeavyFee }
    }
  }
  return map
})()
