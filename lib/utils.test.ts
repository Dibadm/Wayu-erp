import { describe, it, expect } from 'vitest'
import { cn, formatDate, getStockStatus, getStockLabel } from './utils'

describe('cn', () => {
  it('merges class names with tailwind-merge', () => {
    expect(cn('p-4 text-white', 'p-2 text-black')).toBe('p-2 text-black')
  })

  it('handles clsx conditional classes', () => {
    expect(cn('base', { active: true, inactive: false })).toBe('base active')
  })
})

describe('formatDate', () => {
  it('formats a date string', () => {
    const result = formatDate('2025-01-15T10:30:00Z')
    expect(result).toMatch(/\w+ \d{2}, \d{4}/)
  })

  it('includes time in the output', () => {
    const result = formatDate('2025-06-15T14:45:00Z')
    expect(result).toMatch(/\d{2}:\d{2}/)
  })

  it('includes the year by default', () => {
    const result = formatDate('2025-01-15T10:30:00Z')
    expect(result).toContain('2025')
  })

  it('omits the year when includeYear is false', () => {
    const result = formatDate('2025-01-15T10:30:00Z', false)
    expect(result).not.toContain('2025')
  })
})

describe('getStockStatus', () => {
  it('returns "out" when quantity is 0', () => {
    expect(getStockStatus(0, 10)).toBe('out')
  })

  it('returns "out" when quantity is negative', () => {
    expect(getStockStatus(-5, 10)).toBe('out')
  })

  it('returns "low" when quantity is at or below minStockLevel', () => {
    expect(getStockStatus(5, 10)).toBe('low')
  })

  it('returns "warning" when quantity is between minStockLevel and 1.5x minStockLevel', () => {
    expect(getStockStatus(12, 10)).toBe('warning')
  })

  it('returns "ok" when quantity is above 1.5x minStockLevel', () => {
    expect(getStockStatus(20, 10)).toBe('ok')
  })
})

describe('getStockLabel', () => {
  it('maps "out" to OUT OF STOCK', () => {
    expect(getStockLabel('out')).toBe('OUT OF STOCK')
  })

  it('maps "low" to LOW STOCK', () => {
    expect(getStockLabel('low')).toBe('LOW STOCK')
  })

  it('maps "warning" to REORDER SOON', () => {
    expect(getStockLabel('warning')).toBe('REORDER SOON')
  })

  it('maps any other status to IN STOCK', () => {
    expect(getStockLabel('ok')).toBe('IN STOCK')
    expect(getStockLabel('unknown')).toBe('IN STOCK')
  })
})