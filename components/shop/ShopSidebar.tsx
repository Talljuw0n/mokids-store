'use client'
import { useState } from 'react'
import Link from 'next/link'
import { CATEGORY_LABELS } from '@/lib/utils'

interface Params {
  category?: string
  gender?: string
  search?: string
  sort?: string
  page?: string
  minPrice?: string
  maxPrice?: string
}

interface ShopSidebarProps {
  params: Params
}

function buildHref(params: Params, overrides: Record<string, string | undefined>) {
  const merged = { ...params, ...overrides }
  const qs = Object.entries(merged)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
    .join('&')
  return `/shop${qs ? `?${qs}` : ''}`
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2" style={{ fontFamily: "'Poppins', sans-serif" }}>
        {title}
      </p>
      {children}
    </div>
  )
}

export function ShopSidebar({ params }: ShopSidebarProps) {
  const [open, setOpen] = useState(false)
  const categories = Object.entries(CATEGORY_LABELS)
  const hasFilters = !!(params.category || params.gender || params.search)

  const close = () => setOpen(false)

  const linkCls = (active: boolean) =>
    `block px-3 py-1.5 text-sm font-bold rounded-xl transition-all ${
      active ? 'bg-[#F5C000] text-gray-900' : 'text-gray-600 hover:bg-gray-50'
    }`

  const content = (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 lg:sticky lg:top-24">
      <h2 className="hidden lg:block text-base font-bold text-gray-900 mb-4" style={{ fontFamily: "'Poppins', sans-serif" }}>
        Filters
      </h2>

      {/* Gender */}
      <FilterSection title="Gender">
        <div className="flex flex-col gap-0.5">
          {[{ value: '', label: 'All' }, { value: 'girls', label: 'Girls' }, { value: 'boys', label: 'Boys' }].map((g) => (
            <Link key={g.value} href={buildHref(params, { gender: g.value || undefined, page: '1' })} onClick={close}
              className={linkCls(params.gender === g.value || (!params.gender && !g.value))}
              style={{ fontFamily: "'Poppins', sans-serif" }}>
              {g.label}
            </Link>
          ))}
        </div>
      </FilterSection>

      {/* Category */}
      <FilterSection title="Category">
        <div className="flex flex-col gap-0.5">
          <Link href={buildHref(params, { category: undefined, page: '1' })} onClick={close}
            className={linkCls(!params.category)} style={{ fontFamily: "'Poppins', sans-serif" }}>
            All Categories
          </Link>
          {categories.map(([value, label]) => (
            <Link key={value} href={buildHref(params, { category: value, page: '1' })} onClick={close}
              className={linkCls(params.category === value)} style={{ fontFamily: "'Poppins', sans-serif" }}>
              {label}
            </Link>
          ))}
        </div>
      </FilterSection>

      {/* Sort */}
      <FilterSection title="Sort By">
        <div className="flex flex-col gap-0.5">
          {[
            { value: 'newest', label: 'Newest First' },
            { value: 'price-asc', label: 'Price: Low → High' },
            { value: 'price-desc', label: 'Price: High → Low' },
          ].map((s) => (
            <Link key={s.value} href={buildHref(params, { sort: s.value, page: '1' })} onClick={close}
              className={linkCls((params.sort || 'newest') === s.value)} style={{ fontFamily: "'Poppins', sans-serif" }}>
              {s.label}
            </Link>
          ))}
        </div>
      </FilterSection>

      {/* Clear */}
      {hasFilters && (
        <Link href="/shop" onClick={close}
          className="block text-center px-3 py-2 text-sm font-bold text-[#E55A1C] hover:bg-red-50 rounded-xl transition-colors"
          style={{ fontFamily: "'Poppins', sans-serif" }}>
          Clear All Filters
        </Link>
      )}
    </div>
  )

  return (
    <>
      {/* Mobile toggle */}
      <div className="lg:hidden">
        <button
          onClick={() => setOpen(!open)}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border shadow-sm text-sm font-bold transition-all ${
            hasFilters ? 'bg-[#FFF8E1] border-[#F5C000] text-gray-900' : 'bg-white border-gray-200 text-gray-700'
          }`}
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.553.894l-4 2A1 1 0 016 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
            </svg>
            Filters
            {hasFilters && <span className="px-1.5 py-0.5 bg-[#D9247A] text-white text-[10px] rounded-full">Active</span>}
          </span>
          <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
        </button>
        {open && <div className="mt-2">{content}</div>}
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:block lg:w-56 flex-shrink-0">
        {content}
      </aside>
    </>
  )
}
