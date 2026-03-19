import { type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const badgeVariants = {
  default: 'bg-[#dbeafe] text-[#2563eb] border border-[#2563eb]/20',
  success: 'bg-[#dcfce7] text-[#16a34a] border border-[#16a34a]/20',
  warning: 'bg-[#fef3c7] text-[#d97706] border border-[#d97706]/20',
  destructive: 'bg-[#fee2e2] text-[#dc2626] border border-[#dc2626]/20',
  secondary: 'bg-[#f9fafb] text-[#6b7280] border border-[#e3e6ed]',
  outline: 'bg-transparent text-[#6b7280] border border-[#e3e6ed]',
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof badgeVariants
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2.5 py-0.5 text-xs font-medium transition-[color,opacity] duration-150',
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
