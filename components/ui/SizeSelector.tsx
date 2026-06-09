'use client'
import { InventoryItem } from '@/types'

interface SizeSelectorProps {
  inventory: InventoryItem[]
  selectedSize: string | null
  onSelect: (size: string) => void
}

export function SizeSelector({ inventory, selectedSize, onSelect }: SizeSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {inventory.map((item) => {
        const inStock = item.quantity > 0
        const isSelected = selectedSize === item.size
        return (
          <button
            key={item.size}
            onClick={() => inStock && onSelect(item.size)}
            disabled={!inStock}
            className={[
              'px-4 py-2 text-sm font-bold rounded-xl border transition-all duration-150',
              isSelected
                ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                : inStock
                ? 'bg-white text-gray-800 border-gray-200 hover:border-gray-900 hover:bg-gray-50 shadow-sm'
                : 'bg-gray-50 text-gray-300 border-gray-100 line-through cursor-not-allowed',
            ].join(' ')}
            style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700 }}
          >
            {item.size}
            {inStock && item.quantity <= 3 && (
              <span className="ml-1 text-[10px] text-[#E55A1C] font-bold">({item.quantity})</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
