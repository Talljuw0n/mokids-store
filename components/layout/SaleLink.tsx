'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'

// One request per page load, shared by every SaleLink on the page
let saleStatus: Promise<boolean> | null = null
function fetchSaleActive(): Promise<boolean> {
  saleStatus ??= fetch('/api/sale-status')
    .then(r => r.json())
    .then(d => d.active === true)
    .catch(() => false)
  return saleStatus
}

// "Sale" link that only renders while the sale campaign is running — once
// the end date passes it disappears instead of leading to an empty sale page
export function SaleLink({ className, onClick, listItem }: { className?: string; onClick?: () => void; listItem?: boolean }) {
  const [active, setActive] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchSaleActive().then(a => { if (!cancelled) setActive(a) })
    return () => { cancelled = true }
  }, [])

  if (!active) return null
  const link = (
    <Link href="/shop?sale=true" className={className} onClick={onClick}>
      Sale
    </Link>
  )
  return listItem ? <li>{link}</li> : link
}
