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
  'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun',
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

export const STANDARD_SHIPPING_FEE = 5500
// Item count threshold above which the heavy (>1kg) rate applies.
// Kids clothing ≈ 300g/item → 4 items ≈ 1.2kg
export const HEAVY_ORDER_THRESHOLD = 4

export type ShippingRate = { fee: number; heavy_fee: number }

// Delivery zones
export const DELIVERY_ZONES = [
  {
    id: 'lagos',
    name: 'Lagos',
    carrier: 'Local delivery',
    note: 'Rate may vary by area within Lagos',
    states: ['Lagos'],
    color: '#D9247A',
    defaultFee: 4000,
    defaultHeavyFee: 6000,
  },
  {
    id: 'south',
    name: 'Southwest, East & Abuja',
    carrier: 'GIGM',
    note: '',
    states: [
      'Ogun', 'Oyo', 'Osun', 'Ondo', 'Ekiti', 'Kwara',
      'FCT - Abuja', 'Nasarawa',
      'Delta', 'Edo', 'Rivers', 'Bayelsa', 'Cross River', 'Akwa Ibom',
      'Anambra', 'Imo', 'Abia', 'Enugu', 'Ebonyi',
    ],
    color: '#3DB8E8',
    defaultFee: 5500,
    defaultHeavyFee: 7500,
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
    defaultFee: 9000,
    defaultHeavyFee: 13000,
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
