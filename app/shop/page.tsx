export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { getServiceClient, isConfigured } from '@/lib/supabase'
import { ProductCard } from '@/components/ui/ProductCard'
import { ProductWithInventory, ProductCategory, Gender } from '@/types'
import { CATEGORY_LABELS } from '@/lib/utils'
import Link from 'next/link'
import { ShopSidebar } from '@/components/shop/ShopSidebar'

const ITEMS_PER_PAGE = 12

interface ShopPageProps {
  searchParams: Promise<{
    category?: string
    gender?: string
    search?: string
    sort?: string
    page?: string
    minPrice?: string
    maxPrice?: string
  }>
}

async function getProducts(params: Awaited<ShopPageProps['searchParams']>) {
  try {
    if (!isConfigured()) return { products: [], count: 0 }

    const page = parseInt(params.page || '1', 10)
    const offset = (page - 1) * ITEMS_PER_PAGE

    const sb = getServiceClient()
    let query = sb
      .from('products')
      .select('*, inventory(*)', { count: 'exact' })
      .eq('is_active', true)

    if (params.category) query = query.eq('category', params.category as ProductCategory)
    if (params.gender)   query = query.eq('gender', params.gender as Gender)
    if (params.minPrice) query = query.gte('price', parseInt(params.minPrice))
    if (params.maxPrice) query = query.lte('price', parseInt(params.maxPrice))

    // Smart search: match name, colour, description, or inventory size/age
    if (params.search) {
      const term = params.search.replace(/'/g, "''")
      const { data: sizeMatchRows } = await sb
        .from('inventory')
        .select('product_id')
        .ilike('size', `%${term}%`)
      const sizeMatchIds = (sizeMatchRows ?? []).map((r: { product_id: string }) => r.product_id)

      if (sizeMatchIds.length > 0) {
        query = query.or(
          `name.ilike.%${term}%,colour.ilike.%${term}%,description.ilike.%${term}%,id.in.(${sizeMatchIds.join(',')})`
        )
      } else {
        query = query.or(`name.ilike.%${term}%,colour.ilike.%${term}%,description.ilike.%${term}%`)
      }
    }

    if (params.sort === 'price-asc')       query = query.order('price', { ascending: true })
    else if (params.sort === 'price-desc') query = query.order('price', { ascending: false })
    else                                   query = query.order('created_at', { ascending: false })

    query = query.range(offset, offset + ITEMS_PER_PAGE - 1)

    const { data, count } = await query
    if (!data) return { products: [], count: 0 }

    const enriched = ((data ?? []) as ProductWithInventory[]).map((p) => ({
      product: p,
      inventory: p.inventory || [],
    }))

    return { products: enriched, count: count || 0 }
  } catch {
    return { products: [], count: 0 }
  }
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = await searchParams
  const { products, count } = await getProducts(params)
  const totalPages = Math.ceil(count / ITEMS_PER_PAGE)
  const currentPage = parseInt(params.page || '1', 10)

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const merged = { ...params, ...overrides }
    const qs = Object.entries(merged)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
      .join('&')
    return `/shop${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-10">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-4xl text-gray-900" style={{ fontFamily: "'Poppins', sans-serif" }}>
            {params.gender === 'girls' ? 'Girls Collection' :
              params.gender === 'boys' ? 'Boys Collection' :
                params.category ? CATEGORY_LABELS[params.category] || 'Shop' :
                  'Shop All'}
          </h1>
          <p className="text-gray-400 font-bold text-sm mt-1" style={{ fontFamily: "'Poppins', sans-serif" }}>
            {count} item{count !== 1 ? 's' : ''} found
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">

          <ShopSidebar params={params} />

          {/* Product Grid */}
          <div className="flex-1">
            {/* Active filter chips */}
            {(params.search || params.category || params.gender) && (
              <div className="flex flex-wrap gap-2 mb-5">
                {params.search && (
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-bold rounded-full" style={{ fontFamily: "'Poppins', sans-serif" }}>
                    &ldquo;{params.search}&rdquo;
                  </span>
                )}
                {params.category && (
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-bold rounded-full" style={{ fontFamily: "'Poppins', sans-serif" }}>
                    {CATEGORY_LABELS[params.category]}
                  </span>
                )}
                {params.gender && (
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-bold rounded-full" style={{ fontFamily: "'Poppins', sans-serif" }}>
                    {params.gender === 'girls' ? 'Girls' : 'Boys'}
                  </span>
                )}
              </div>
            )}

            {products.length === 0 ? (
              <div className="text-center py-20 bg-gray-50 rounded-2xl">
                <p className="text-4xl mb-3">🔍</p>
                <p className="text-xl font-bold text-gray-700" style={{ fontFamily: "'Poppins', sans-serif" }}>No products found</p>
                <p className="text-gray-400 mt-1 text-sm font-bold" style={{ fontFamily: "'Poppins', sans-serif" }}>Try a different search term or adjust your filters</p>
                <Link href="/shop" className="inline-block mt-5 px-6 py-2.5 bg-[#F5C000] text-gray-900 font-bold rounded-full shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  Clear All Filters
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  <Suspense>
                    {products.map(({ product, inventory }) => (
                      <ProductCard key={product.id} product={product} inventory={inventory} />
                    ))}
                  </Suspense>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-10 flex-wrap">
                    {currentPage > 1 && (
                      <Link
                        href={buildHref({ page: String(currentPage - 1) })}
                        className="px-4 py-2 font-bold text-sm rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all text-gray-700"
                        style={{ fontFamily: "'Poppins', sans-serif" }}
                      >
                        ← Prev
                      </Link>
                    )}
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                      .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                        if (idx > 0 && typeof arr[idx - 1] === 'number' && (p as number) - (arr[idx - 1] as number) > 1) acc.push('…')
                        acc.push(p)
                        return acc
                      }, [])
                      .map((p, idx) =>
                        p === '…' ? (
                          <span key={`ellipsis-${idx}`} className="px-1 text-gray-400 font-bold text-sm select-none">…</span>
                        ) : (
                          <Link
                            key={p}
                            href={buildHref({ page: String(p) })}
                            className={`px-4 py-2 font-bold text-sm rounded-xl border shadow-sm hover:shadow-md transition-all ${
                              p === currentPage
                                ? 'bg-[#F5C000] border-[#F5C000] text-gray-900'
                                : 'bg-white border-gray-200 text-gray-700'
                            }`}
                            style={{ fontFamily: "'Poppins', sans-serif" }}
                          >
                            {p}
                          </Link>
                        )
                      )}
                    {currentPage < totalPages && (
                      <Link
                        href={buildHref({ page: String(currentPage + 1) })}
                        className="px-4 py-2 font-bold text-sm rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all text-gray-700"
                        style={{ fontFamily: "'Poppins', sans-serif" }}
                      >
                        Next →
                      </Link>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
