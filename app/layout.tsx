import type { Metadata } from 'next'
import './globals.css'
import { NavBar } from '@/components/layout/NavBar'
import { Footer } from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'Mo Kids Place — Dress Them in Pure Joy',
  description: "Nigeria's favourite children's clothing brand. Premium styles for girls and boys, shipped nationwide.",
  keywords: 'children clothing Nigeria, kids fashion, girls dresses Nigeria, boys shirts Nigeria',
  openGraph: {
    title: 'Mo Kids Place',
    description: "Dress Them in Pure Joy — Premium Nigerian children's clothing",
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&family=Fredoka+One&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning style={{ backgroundColor: '#ffffff', fontFamily: "'Poppins', sans-serif", fontWeight: 500 }}>
        <NavBar />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
