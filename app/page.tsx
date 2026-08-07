export const dynamic = 'force-dynamic'

import Link from 'next/link'
import Image from 'next/image'
import { getServiceClient, isConfigured } from '@/lib/supabase'
import { ProductCard } from '@/components/ui/ProductCard'
import { HeroSlideshow } from '@/components/ui/HeroSlideshow'
import { ProductWithInventory } from '@/types'

const HERO_SLIDES = [
  {
    image: 'https://res.cloudinary.com/dtrwr5vwt/image/upload/v1783441283/mokids/hero/hero-bg-1.jpg',
    alt: 'Kids at school with backpacks',
    headline: ['Back to', 'School'],
    subtitle: "Everything your kids need for the new term: backpacks, shoes, uniforms and more.",
    ctaHref: '/shop',
    ctaLabel: 'Shop Now',
    mobileImagePosition: '58% 62%',
  },
  {
    image: 'https://res.cloudinary.com/dtrwr5vwt/image/upload/v1783441284/mokids/hero/hero-bg-2.jpg',
    alt: 'Girl walking in school hallway',
    headline: ['Style Meets', 'School'],
    subtitle: "Bold backpacks and chic shoes, because every girl deserves to walk into school with confidence.",
    ctaHref: '/shop?category=back-to-school-girls',
    ctaLabel: 'Shop Girls',
    imagePosition: '60% 15%',
    mobileImagePosition: '58% 45%',
  },
  {
    image: 'https://res.cloudinary.com/dtrwr5vwt/image/upload/v1783441286/mokids/hero/hero-bg-3.jpg',
    alt: 'Boy walking in school hallway',
    headline: ['Gear Up for', 'the New Term'],
    subtitle: "Tough backpacks, sharp shoes and cool sets, built for boys who mean business.",
    ctaHref: '/shop?category=back-to-school-boys',
    ctaLabel: 'Shop Boys',
    imagePosition: '60% 15%',
    mobileImagePosition: '58% 45%',
  },
]

const FEATURED_CATEGORIES = [
  { slug: 'girls-dresses',        label: 'Girls Dresses',          href: '/shop?category=girls-dresses',        fallbackBg: '#fce7f3', pinSku: 'MOKIDSD031' },
  { slug: 'boys-shirts',          label: 'Boys Shirts',            href: '/shop?category=boys-shirts',          fallbackBg: '#e0f2fe' },
  { slug: 'back-to-school-girls', label: 'Back to School (Girls)', href: '/shop?category=back-to-school-girls', fallbackBg: '#fef9c3', pinSku: 'MOKIDSB014' },
  { slug: 'back-to-school-boys',  label: 'Back to School (Boys)',  href: '/shop?category=back-to-school-boys',  fallbackBg: '#dbeafe', pinSku: 'MOKIDSB003' },
]


async function getCategoryImages(): Promise<Record<string, string[]>> {
  try {
    if (!isConfigured()) return {}
    const sb = getServiceClient()

    const pinnedSkus = FEATURED_CATEGORIES.flatMap(c => c.pinSku ? [c.pinSku] : [])
    const allSlugs = FEATURED_CATEGORIES.map(c => c.slug)

    const [{ data: catData }, { data: pinnedData }] = await Promise.all([
      sb.from('products').select('category, images').eq('is_active', true).in('category', allSlugs).not('images', 'is', null),
      pinnedSkus.length
        ? sb.from('products').select('sku, category, images').in('sku', pinnedSkus)
        : Promise.resolve({ data: [] }),
    ])

    // Key by sku+category, not sku alone — the same SKU string is sometimes reused
    // across a boys and a girls product, which would otherwise let one silently
    // overwrite the other here
    const pinnedBySkuCategory: Record<string, string> = {}
    for (const row of (pinnedData ?? [])) {
      if (row.images?.[0]) pinnedBySkuCategory[`${row.sku.toUpperCase()}|${row.category}`] = row.images[0]
    }

    const result: Record<string, string[]> = {}
    for (const cat of FEATURED_CATEGORIES) {
      const key = cat.pinSku ? `${cat.pinSku}|${cat.slug}` : null
      if (key && pinnedBySkuCategory[key]) {
        result[cat.slug] = [pinnedBySkuCategory[key]]
      }
    }
    for (const row of (catData ?? [])) {
      if (row.images?.[0]) {
        if (!result[row.category]) result[row.category] = []
        if (result[row.category].length < 3) result[row.category].push(row.images[0])
      }
    }
    return result
  } catch {
    return {}
  }
}


const FEATURED_ITEMS: { sku: string; gender?: string }[] = [
  { sku: 'MOKIDSD043' },
  { sku: 'MOKIDSSC012', gender: 'girls' },
  { sku: 'MOKIDSSL011' },
  { sku: 'MOKIDSP003' },
  { sku: 'MOKIDSD042' },
  { sku: 'MOKIDSSC011', gender: 'boys' },
  { sku: 'MOKIDSLS004' },
  { sku: 'MOKIDSSH006' },
]

async function getFeaturedProducts() {
  try {
    if (!isConfigured()) return []
    const sb = getServiceClient()

    const skus = FEATURED_ITEMS.map(i => i.sku)
    const { data } = await sb
      .from('products')
      .select('*, inventory(*)')
      .in('sku', skus)
      .eq('is_active', true)

    // Build lookup keyed by "sku" or "sku|gender" for gender-specific slots
    const byKey = Object.fromEntries(
      ((data ?? []) as ProductWithInventory[]).map(p => [`${p.sku}|${p.gender}`, p])
    )
    const bySku = Object.fromEntries(
      ((data ?? []) as ProductWithInventory[]).map(p => [p.sku, p])
    )

    return FEATURED_ITEMS
      .map(item => {
        const p = item.gender
          ? byKey[`${item.sku}|${item.gender}`]
          : bySku[item.sku]
        return p ? { product: p, inventory: p.inventory || [] } : null
      })
      .filter(Boolean) as { product: ProductWithInventory; inventory: ProductWithInventory['inventory'] }[]
  } catch {
    return []
  }
}

export default async function Home() {
  const [featured, categoryImages] = await Promise.all([
    getFeaturedProducts(),
    getCategoryImages(),
  ])


  return (
    <div className="bg-white">

      {/* Announcement bar */}
      <div className="w-full py-2.5 text-center text-sm font-bold text-white" style={{ background: '#D9247A', fontFamily: "'Poppins', sans-serif", letterSpacing: '0.05em' }}>
        Nationwide Delivery
      </div>

      {/* Hero slideshow */}
      <HeroSlideshow slides={HERO_SLIDES} />


      {/* Category Grid — product images */}
      <section className="max-w-7xl mx-auto px-4 py-14">
        <h2 className="text-3xl text-center mb-8 text-gray-900" style={{ fontFamily: "'Poppins', sans-serif" }}>
          Shop by Category
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {FEATURED_CATEGORIES.map((cat) => {
            const img = categoryImages[cat.slug]?.[0]
            return (
              <Link
                key={cat.slug}
                href={cat.href}
                className="group relative block rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all aspect-[3/4]"
              >
                {img ? (
                  <Image
                    src={img}
                    alt={cat.label}
                    fill
                    className="object-cover object-top group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 50vw, 25vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: cat.fallbackBg }}>
                    <span className="text-gray-500 text-sm font-bold" style={{ fontFamily: "'Poppins', sans-serif" }}>{cat.label}</span>
                  </div>
                )}
                {/* Label overlay */}
                <div className="absolute inset-x-0 bottom-0 bg-white/80 backdrop-blur-sm px-3 py-2.5">
                  <p className="text-gray-900 text-sm font-bold" style={{ fontFamily: "'Poppins', sans-serif" }}>
                    {cat.label}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Featured Products */}
      <section className="bg-gray-50 py-14">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl text-gray-900" style={{ fontFamily: "'Poppins', sans-serif" }}>
                Featured Products
              </h2>
              <p className="text-gray-400 text-sm font-bold mt-1" style={{ fontFamily: "'Poppins', sans-serif" }}>
                Hand-picked styles for your little ones
              </p>
            </div>
            <Link
              href="/shop"
              className="text-sm font-bold hover:underline"
              style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, color: '#D9247A' }}
            >
              View all →
            </Link>
          </div>
          {featured.length === 0 ? (
            <div className="text-center py-16 text-gray-300">
              <p className="text-lg font-bold" style={{ fontFamily: "'Poppins', sans-serif" }}>Products coming soon</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-stretch">
              {featured.map(({ product, inventory }) => (
                <ProductCard key={product.id} product={product} inventory={inventory} />
              ))}
            </div>
          )}
        </div>
      </section>

    </div>
  )
}
