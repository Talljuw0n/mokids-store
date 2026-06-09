'use client'
import { ButtonHTMLAttributes, forwardRef } from 'react'

type Variant = 'primary' | 'secondary' | 'pink' | 'orange' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary:   'bg-[#F5C000] text-black hover:bg-[#e0b000]',
  secondary: 'bg-white text-gray-800 border border-gray-200 hover:bg-gray-50',
  pink:      'bg-[#D9247A] text-white hover:bg-[#c01e6a]',
  orange:    'bg-[#E55A1C] text-white hover:bg-[#cc4f18]',
  ghost:     'bg-transparent text-gray-700 hover:bg-gray-100',
  danger:    'bg-red-500 text-white hover:bg-red-600',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-5 py-2.5 text-base rounded-xl',
  lg: 'px-7 py-3.5 text-base rounded-xl',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', fullWidth, className = '', children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={[
          'font-bold inline-flex items-center justify-center gap-2',
          'shadow-sm transition-all duration-150 cursor-pointer',
          'hover:-translate-y-px hover:shadow-md',
          'active:translate-y-0 active:shadow-sm',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-sm',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth ? 'w-full' : '',
          className,
        ].join(' ')}
        style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800 }}
        {...props}
      >
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
