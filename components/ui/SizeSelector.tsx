'use client'
import { InventoryItem } from '@/types'

interface SizeSelectorProps {
  inventory: InventoryItem[]
  selectedSize: string | null
  onSelect: (size: string) => void
}

export function SizeSelector({ inventory, selectedSize, onSelect }: SizeSelectorProps) {
  return (
    <select
      value={selectedSize ?? ''}
      onChange={e => { if (e.target.value) onSelect(e.target.value) }}
      className="w-full px-4 py-2.5 text-sm font-bold border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:border-gray-900 transition-colors"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <option value="">Choose a size…</option>
      {inventory.map((item) => (
        <option key={item.size} value={item.size} disabled={item.quantity === 0}>
          {item.size}{item.quantity === 0 ? ' — Sold Out' : ''}
        </option>
      ))}
    </select>
  )
}
