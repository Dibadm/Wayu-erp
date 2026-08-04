import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-ET', {
    style: 'currency',
    currency: 'ETB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

export function formatDate(date: Date | string, includeYear = true) {
  return new Intl.DateTimeFormat('en-ET', {
    year: includeYear ? 'numeric' : undefined,
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(date))
}

export function getStockStatus(quantity: number, minStockLevel: number) {
  if (quantity <= 0) return 'out'
  if (quantity <= minStockLevel) return 'low'
  if (quantity <= minStockLevel * 1.5) return 'warning'
  return 'ok'
}

export function getStockLabel(status: string) {
  switch (status) {
    case 'out': return 'OUT OF STOCK'
    case 'low': return 'LOW STOCK'
    case 'warning': return 'REORDER SOON'
    default: return 'IN STOCK'
  }
}
