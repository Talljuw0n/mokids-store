'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const NAV_LINKS = [
  { href: '/admin',           label: 'Dashboard', exact: true  },
  { href: '/admin/products',  label: 'Products'               },
  { href: '/admin/orders',    label: 'Orders'                 },
  { href: '/admin/inventory', label: 'Inventory'              },
  { href: '/admin/shipping',  label: 'Delivery'               },
  { href: '/admin/security',  label: 'Security'               },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" style={{ fontFamily: "'Nunito', sans-serif" }}>
      {/* Admin Nav */}
      <header className="bg-black text-white border-b-[2.5px] border-[#F5C000] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="flex items-center gap-2 flex-shrink-0">
              <Image src="/logo.jpeg" alt="Mo Kids Place" width={36} height={36} className="rounded-lg" />
              <span className="font-bold text-lg text-[#F5C000]" style={{ fontFamily: "'Fredoka One', cursive" }}>Admin</span>
            </Link>
            {/* Desktop nav */}
            <span className="text-gray-500 text-xs hidden sm:inline">|</span>
            <nav className="hidden sm:flex items-center gap-4 text-sm font-bold">
              {NAV_LINKS.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`transition-colors ${isActive(link.href, link.exact) ? 'text-[#F5C000]' : 'text-gray-300 hover:text-[#F5C000]'}`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/" className="text-xs text-gray-400 hover:text-white transition-colors hidden sm:inline">← Store</Link>
            <a
              href="/api/admin/logout"
              className="text-xs px-3 py-1 bg-white/10 rounded border border-white/20 hover:bg-white/20 transition-colors hidden sm:inline"
            >
              Logout
            </a>
            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="sm:hidden p-2 rounded-lg border border-white/20 text-white hover:bg-white/10 transition-colors"
              aria-label="Menu"
            >
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div className="sm:hidden bg-gray-950 border-t border-white/10 px-4 pb-4 pt-2">
            <nav className="flex flex-col gap-1">
              {NAV_LINKS.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`px-3 py-2.5 rounded-lg text-sm font-bold transition-colors ${
                    isActive(link.href, link.exact)
                      ? 'bg-[#F5C000] text-black'
                      : 'text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/10">
              <Link href="/" className="text-xs text-gray-400 hover:text-white transition-colors">← View Store</Link>
              <a href="/api/admin/logout" className="text-xs px-3 py-1 bg-white/10 rounded border border-white/20 hover:bg-white/20 transition-colors">
                Logout
              </a>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
