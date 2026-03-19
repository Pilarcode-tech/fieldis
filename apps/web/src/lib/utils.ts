import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a raw number string as BRL currency display (1500 → 1.500,00) */
export function formatMoneyInput(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  const num = Number(digits) / 100
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Parse a formatted BRL string back to number (1.500,00 → 1500) */
export function parseMoneyInput(formatted: string): number {
  const digits = formatted.replace(/\D/g, '')
  return Number(digits) / 100
}
