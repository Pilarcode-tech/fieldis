'use client'

import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, placeholder, id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="font-mono-data mb-1.5 block text-[11px] uppercase tracking-wider text-[#6b7280]"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'flex h-10 w-full rounded-md border border-[#e3e6ed] bg-white px-3 py-2 text-sm text-[#111827] focus:border-[#2563eb] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-[#dc2626] focus:border-[#dc2626]',
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="">{placeholder}</option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="mt-1 text-xs text-[#dc2626]">{error}</p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'

export { Select }
