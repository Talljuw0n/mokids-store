export const dynamic = 'force-dynamic'

import Link from 'next/link'
import Image from 'next/image'
import { getServiceClient, isConfigured } from '@/lib/supabase'
import { ProductCard } from '@/components/ui/ProductCard'
import { BackToSchoolSlideshow } from '@/components/ui/BackToSchoolSlideshow'
import { ProductWithInventory, Product } from '@/types'

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
        ? sb.from('products').select('sku, images').in('sku', pinnedSkus)
        : Promise.resolve({ data: [] }),
    ])

    const pinnedBySkU: Record<string, string> = {}
    for (const row of (pinnedData ?? [])) {
      if (row.images?.[0]) pinnedBySkU[row.sku.toUpperCase()] = row.images[0]
    }

    const result: Record<string, string[]> = {}
    for (const cat of FEATURED_CATEGORIES) {
      if (cat.pinSku && pinnedBySkU[cat.pinSku]) {
        result[cat.slug] = [pinnedBySkU[cat.pinSku]]
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

const HERO_SLIDES = [
  { sku: 'MOKIDSB001',         gender: 'boys',  heroImage: 'https://res.cloudinary.com/dtrwr5vwt/image/upload/v1782824907/mokids/hero/MOKIDSB001-boys.png' },
  { sku: 'MOKIDSB003',         gender: 'boys',  heroImage: 'https://res.cloudinary.com/dtrwr5vwt/image/upload/v1782824916/mokids/hero/MOKIDSB003-boys.png' },
  { sku: 'MOKIDSB004',         gender: 'boys',  heroImage: 'https://res.cloudinary.com/dtrwr5vwt/image/upload/v1782824935/mokids/hero/MOKIDSB004-boys.png' },
  { sku: 'MOKIDSB005',         gender: 'boys',  heroImage: 'https://res.cloudinary.com/dtrwr5vwt/image/upload/v1782824946/mokids/hero/MOKIDSB005-boys.png' },
  { sku: 'MOKIDSSC004',        gender: 'boys',  heroImage: 'https://res.cloudinary.com/dtrwr5vwt/image/upload/v1782824957/mokids/hero/MOKIDSSC004-boys.png' },
  { sku: 'MOKIDSB014',         gender: 'girls', heroImage: 'https://res.cloudinary.com/dtrwr5vwt/image/upload/v1782824976/mokids/hero/MOKIDSB014-girls.png' },
  { sku: 'MOKIDSB015',         gender: 'girls', heroImage: 'https://res.cloudinary.com/dtrwr5vwt/image/upload/v1782825006/mokids/hero/MOKIDSB015-girls.png' },
  { sku: 'MOKIDSDRESSSHOE005', gender: 'girls', heroImage: 'https://res.cloudinary.com/dtrwr5vwt/image/upload/v1782825027/mokids/hero/MOKIDSDRESSSHOE005-girls.png' },
  { sku: 'MOKIDSDRESSSHOE010', gender: 'girls', heroImage: 'https://res.cloudinary.com/dtrwr5vwt/image/upload/v1782825042/mokids/hero/MOKIDSDRESSSHOE010-girls.png' },
  { sku: 'MOKIDSSC011',        gender: 'girls', heroImage: 'https://res.cloudinary.com/dtrwr5vwt/image/upload/v1782825066/mokids/hero/MOKIDSSC011-girls.png' },
]

async function getHeroSlides() {
  try {
    if (!isConfigured()) return []
    const sb = getServiceClient()
    const skus = HERO_SLIDES.map(s => s.sku)
    const { data } = await sb.from('products').select('*').in('sku', skus).eq('is_active', true)
    const byKey = Object.fromEntries(((data ?? []) as Product[]).map(p => [`${p.sku}|${p.gender}`, p]))
    return HERO_SLIDES
      .map(s => {
        const product = byKey[`${s.sku}|${s.gender}`]
        return product ? { product, heroImage: s.heroImage } : null
      })
      .filter(Boolean) as { product: Product; heroImage: string }[]
  } catch {
    return []
  }
}

const FEATURED_ITEMS: { sku: string; gender?: string }[] = [
  { sku: 'MOKIDSD043' },
  { sku: 'MOKIDSDRESSSHOE018' },
  { sku: 'MOKIDSSL011' },
  { sku: 'MOKIDSP003' },
  { sku: 'MOKIDSD042' },
  { sku: 'MOKIDSSC004', gender: 'boys' },
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
  const [featured, categoryImages, heroSlides] = await Promise.all([
    getFeaturedProducts(),
    getCategoryImages(),
    getHeroSlides(),
  ])


  return (
    <div className="bg-white">

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Container: natural aspect ratio on mobile, fixed height on desktop */}
        <div className="relative aspect-[3/4] sm:aspect-auto sm:min-h-[600px]">
          <Image
            src="/hero-bg.JPG"
            alt="Kids clothing"
            fill
            className="object-cover object-center sm:object-top"
            priority
            sizes="100vw"
          />

          {/* Gradient: bottom-up on mobile (text sits at bottom), left-right on desktop */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10 sm:bg-gradient-to-r sm:from-black/55 sm:via-black/25 sm:to-transparent" />

          {/* Content: bottom of image on mobile, vertically centred on desktop */}
          <div className="absolute inset-0 flex items-end sm:items-center">
            <div className="max-w-7xl mx-auto px-5 sm:px-6 pb-8 sm:pb-0 sm:py-20 w-full">
              <div className="max-w-lg">
                <span
                  className="inline-block px-3 py-1 bg-[#E55A1C] text-white text-xs font-bold rounded-full mb-4"
                  style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800 }}
                >
                  Ships Nationwide
                </span>
                <h1 className="text-4xl sm:text-5xl md:text-6xl leading-tight mb-3 text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  Dress Them<br />
                  <span style={{ color: '#F5C000' }}>in Pure</span>{' '}
                  <span style={{ color: '#f87171' }}>Joy</span>
                </h1>
                <p className="text-sm sm:text-base text-white/80 mb-6 max-w-md leading-relaxed" style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700 }}>
                  Premium children&apos;s clothing for Nigerian kids. Bold styles, vibrant colours, and quality that lasts.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/shop"
                    className="px-7 py-3 text-white font-bold rounded-full shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all inline-block"
                    style={{ fontFamily: "'Poppins', sans-serif", fontSize: '1rem', backgroundColor: '#D9247A' }}
                  >
                    Shop Now
                  </Link>
                  <Link
                    href="/shop?gender=girls"
                    className="px-7 py-3 bg-white text-gray-900 font-bold rounded-full shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all inline-block"
                    style={{ fontFamily: "'Poppins', sans-serif", fontSize: '1rem' }}
                  >
                    View Girls
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Back to School Slideshow */}
      {heroSlides.length > 0 && (
        <BackToSchoolSlideshow slides={heroSlides} />
      )}

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
