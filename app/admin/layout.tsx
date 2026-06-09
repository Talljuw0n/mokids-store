import Link from 'next/link'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" style={{ fontFamily: "'Nunito', sans-serif" }}>
      {/* Admin Nav */}
      <header className="bg-black text-white border-b-[2.5px] border-[#F5C000]">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="font-bold text-lg" style={{ fontFamily: "'Fredoka One', cursive" }}>
              <span className="text-white">Mo</span>
              <span className="text-[#D9247A]">Kids</span>
              <span className="text-[#F5C000]"> Admin</span>
            </Link>
            <span className="text-gray-500 text-xs hidden sm:inline">|</span>
            <nav className="hidden sm:flex items-center gap-4 text-sm font-bold">
              <Link href="/admin" className="text-gray-300 hover:text-[#F5C000] transition-colors">Dashboard</Link>
              <Link href="/admin/products" className="text-gray-300 hover:text-[#F5C000] transition-colors">Products</Link>
              <Link href="/admin/orders" className="text-gray-300 hover:text-[#F5C000] transition-colors">Orders</Link>
              <Link href="/admin/inventory" className="text-gray-300 hover:text-[#F5C000] transition-colors">Inventory</Link>
              <Link href="/admin/shipping" className="text-gray-300 hover:text-[#F5C000] transition-colors">Delivery</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xs text-gray-400 hover:text-white transition-colors">← View Store</Link>
            <a
              href="/api/admin/logout"
              className="text-xs px-3 py-1 bg-white/10 rounded border border-white/20 hover:bg-white/20 transition-colors"
            >
              Logout
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
