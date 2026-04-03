'use client'

import { useState, useEffect, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface CurrencyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label?: string
  error?: string
  value?: number
  onValueChange?: (value: number) => void
}

function formatToBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function parseCentsFromDisplay(display: string): number {
  const digits = display.replace(/\D/g, '')
  return parseInt(digits || '0', 10)
}

export function CurrencyInput({
  className,
  label,
  error,
  id,
  value,
  onValueChange,
  disabled,
  ...props
}: CurrencyInputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  const [display, setDisplay] = useState('')

  useEffect(() => {
    if (value !== undefined && value !== null) {
      const cents = Math.round(value * 100)
      setDisplay(formatToBRL(cents))
    }
  }, [value])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    const cents = parseCentsFromDisplay(raw)
    setDisplay(formatToBRL(cents))
    onValueChange?.(cents / 100)
  }

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="font-mono-data mb-1.5 block text-[11px] uppercase tracking-wider text-[#6b7280]"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6b7280]">R$</span>
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          className={cn(
            'flex h-10 w-full rounded-md border border-[#e3e6ed] bg-white pl-10 pr-3 py-2 text-sm text-[#111827] placeholder:text-[#9ca3af] focus:border-[#2563eb] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-[#dc2626] focus:border-[#dc2626]',
            className
          )}
          value={display}
          onChange={handleChange}
          disabled={disabled}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-xs text-[#dc2626]">{error}</p>
      )}
    </div>
  )
}
