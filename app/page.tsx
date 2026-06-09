export const dynamic = 'force-dynamic'

import Link from 'next/link'
import Image from 'next/image'
import { getServiceClient, isConfigured } from '@/lib/supabase'
import { ProductCard } from '@/components/ui/ProductCard'
import { ProductWithInventory } from '@/types'

const FEATURED_CATEGORIES = [
  { slug: 'girls-dresses', label: 'Girls Dresses', href: '/shop?category=girls-dresses', fallbackBg: '#fce7f3' },
  { slug: 'boys-shirts',   label: 'Boys Shirts',   href: '/shop?category=boys-shirts',   fallbackBg: '#e0f2fe' },
  { slug: 'girls-tops',    label: 'Girls Tops',    href: '/shop?category=girls-tops',    fallbackBg: '#f3e8ff' },
  { slug: 'boys-pyjamas',  label: 'Boys Pyjamas',  href: '/shop?category=boys-pyjamas',  fallbackBg: '#dcfce7' },
]


async function getCategoryImages(): Promise<Record<string, string[]>> {
  try {
    if (!isConfigured()) return {}
    const sb = getServiceClient()
    const allSlugs = FEATURED_CATEGORIES.map(c => c.slug)
    const { data } = await sb
      .from('products')
      .select('category, images')
      .eq('is_active', true)
      .in('category', allSlugs)
      .not('images', 'is', null)

    const result: Record<string, string[]> = {}
    for (const row of (data ?? [])) {
      if (row.images?.[0]) {
        if (!result[row.category]) result[row.category] = []
        // collect up to 3 images per category
        if (result[row.category].length < 3) result[row.category].push(row.images[0])
      }
    }
    return result
  } catch {
    return {}
  }
}

async function getFeaturedProducts() {
  try {
    if (!isConfigured()) return []
    const sb = getServiceClient()
    const { data } = await sb
      .from('products')
      .select('*, inventory(*)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(8)

    return ((data ?? []) as ProductWithInventory[]).map((p) => ({
      product: p,
      inventory: p.inventory || [],
    }))
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

      {/* Hero */}
      <section className="relative overflow-hidden min-h-[520px] md:min-h-[600px] flex items-center">
        {/* Background image */}
        <Image
          src="/hero-bg.jpeg"
          alt="Kids clothing"
          fill
          className="object-cover object-top"
          priority
          sizes="100vw"
        />
        {/* Gradient overlay — lighter so image stays vivid */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent" />

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 w-full">
          <div className="max-w-lg">
            <span
              className="inline-block px-3 py-1 bg-[#E55A1C] text-white text-xs font-bold rounded-full mb-5"
              style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800 }}
            >
              Ships Nationwide
            </span>
            <h1 className="text-5xl md:text-6xl leading-tight mb-4 text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
              Dress Them<br />
              <span style={{ color: '#F5C000' }}>in Pure</span>{' '}
              <span style={{ color: '#f87171' }}>Joy</span>
            </h1>
            <p className="text-base text-white/80 mb-8 max-w-md leading-relaxed" style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700 }}>
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
      </section>

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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
