'use client'

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = {
  default: 'bg-[#2563eb] text-white font-medium hover:shadow-[0_0_12px_rgba(37,99,235,0.3)]',
  secondary: 'bg-transparent border border-[#e3e6ed] text-[#6b7280] hover:bg-[#f9fafb]',
  destructive: 'bg-[#dc2626]/10 text-[#dc2626] border border-[#dc2626]/20 hover:bg-[#dc2626]/20',
  outline: 'bg-transparent border border-[#e3e6ed] text-[#6b7280] hover:bg-[#f9fafb]',
  ghost: 'bg-transparent text-[#6b7280] hover:bg-[#f9fafb]',
  link: 'text-[#2563eb] underline-offset-4 hover:underline',
}

const buttonSizes = {
  sm: 'h-8 px-3 text-xs rounded-md',
  default: 'h-10 px-4 py-2 text-sm rounded-md',
  lg: 'h-12 px-6 text-base rounded-md',
  icon: 'h-10 w-10 rounded-md',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonVariants
  size?: keyof typeof buttonSizes
  children: ReactNode
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-[color,opacity] duration-150 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
          buttonVariants[variant],
          buttonSizes[size],
          className
        )}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button, buttonVariants }
