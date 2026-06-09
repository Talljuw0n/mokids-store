interface BadgeProps {
  children: React.ReactNode
  variant?: 'sale' | 'new' | 'low' | 'out' | 'default'
  className?: string
}

const variantClasses = {
  sale:    'bg-[#E55A1C] text-white',
  new:     'bg-[#F5C000] text-black',
  low:     'bg-amber-100 text-amber-700',
  out:     'bg-gray-100 text-gray-500',
  default: 'bg-gray-900 text-white',
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs font-bold rounded-md ${variantClasses[variant]} ${className}`}
      style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800 }}
    >
      {children}
    </span>
  )
}
