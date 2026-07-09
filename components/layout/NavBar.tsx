'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useCartStore } from '@/store/cart'
import { useRouter } from 'next/navigation'
import { LogoLink } from './LogoLink'

export function NavBar() {
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const totalItems = useCartStore((s) => s.totalItems())

  useEffect(() => { setMounted(true) }, [])
  const router = useRouter()

  const handleSearch = (e: React.SyntheticEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/shop?search=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  return (
    <>
      {/* Announcement bar */}
      {/* <div className="bg-[#F5C000] overflow-hidden py-2 text-center text-sm font-bold">
        Nationwide shipping across Nigeria &nbsp;·&nbsp; Secure Paystack checkout
      </div> */}

      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-20 gap-4">

          {/* Logo */}
          <LogoLink />

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-6" style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800 }}>
            <Link href="/shop?gender=girls" className="text-sm font-bold text-gray-700 hover:text-[#D9247A] transition-colors">Girls</Link>
            <Link href="/shop?gender=boys" className="text-sm font-bold text-gray-700 hover:text-[#3DB8E8] transition-colors">Boys</Link>
            <Link href="/shop?sort=newest" className="text-sm font-bold text-gray-700 hover:text-gray-900 transition-colors">New In</Link>
            <Link href="/shop?sale=true" className="text-sm font-bold text-[#E55A1C] hover:underline">Sale</Link>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xs">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, colour or age…"
                className="w-full pl-4 pr-10 py-2 text-sm border border-gray-200 rounded-full bg-gray-50 focus:outline-none focus:bg-white focus:border-[#F5C000] transition-colors"
                style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700 }}
              />
              <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-xs font-bold transition-colors">
                ⌕
              </button>
            </div>
          </form>

          {/* Cart button */}
          <Link
            href="/cart"
            className="relative flex items-center gap-1.5 px-4 py-2 bg-[#F5C000] rounded-full font-bold text-sm shadow-sm hover:bg-[#e0b000] hover:shadow-md transition-all"
            style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800 }}
          >
            Cart
            {mounted && totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-[#D9247A] text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                {totalItems > 9 ? '9+' : totalItems}
              </span>
            )}
          </Link>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 pb-4">
            <form onSubmit={handleSearch} className="mt-3 mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, colour or age…"
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-full bg-gray-50 focus:outline-none focus:border-[#F5C000]"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              />
            </form>
            <div className="flex flex-col gap-1" style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800 }}>
              {[
                { href: '/shop?gender=girls', label: 'Girls', color: 'text-[#D9247A]' },
                { href: '/shop?gender=boys', label: 'Boys', color: 'text-[#3DB8E8]' },
                { href: '/shop?sort=newest', label: 'New In', color: '' },
                { href: '/shop?sale=true', label: 'Sale', color: 'text-[#E55A1C]' },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`py-3 border-b border-gray-50 text-sm ${item.color || 'text-gray-800'}`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
      `}</style>
    </>
  )
}
