import { describe, it, expect } from 'vitest'
import { hasPermission, canAccess } from './permissions'

describe('hasPermission', () => {
  it('returns true for ADMIN on any permission', () => {
    expect(hasPermission('ADMIN', 'anything')).toBe(true)
  })

  it('returns true for STAFF on inventory:view', () => {
    expect(hasPermission('STAFF', 'inventory:view')).toBe(true)
  })

  it('returns true for STAFF on inventory:edit', () => {
    expect(hasPermission('STAFF', 'inventory:edit')).toBe(true)
  })

  it('returns false for STAFF on finance:manage', () => {
    expect(hasPermission('STAFF', 'finance:manage')).toBe(false)
  })

  it('returns true for VIEWER on inventory:view', () => {
    expect(hasPermission('VIEWER', 'inventory:view')).toBe(true)
  })

  it('returns false for VIEWER on inventory:edit', () => {
    expect(hasPermission('VIEWER', 'inventory:edit')).toBe(false)
  })

  it('matches prefix permissions (e.g., inventory:view matches inventory:*)', () => {
    expect(hasPermission('STAFF', 'inventory:view')).toBe(true)
    expect(hasPermission('STAFF', 'inventory:edit')).toBe(true)
    expect(hasPermission('STAFF', 'inventory:adjust')).toBe(true)
  })

  it('returns false for unknown role', () => {
    expect(hasPermission('UNKNOWN' as any, 'inventory:view')).toBe(false)
  })
})

describe('canAccess', () => {
  it('returns true for ADMIN regardless of permissions', () => {
    expect(canAccess('ADMIN', 'any:permission')).toBe(true)
  })

  it('returns true for STAFF with matching permission', () => {
    expect(canAccess('STAFF', 'inventory:view')).toBe(true)
  })

  it('returns true for STAFF with any matching permission', () => {
    expect(canAccess('STAFF', 'reports:view', 'pos:process')).toBe(true)
  })

  it('returns false for STAFF with no matching permissions', () => {
    expect(canAccess('STAFF', 'finance:manage', 'banks:view')).toBe(false)
  })

  it('returns false when role is undefined', () => {
    expect(canAccess(undefined, 'inventory:view')).toBe(false)
  })

  it('returns true for FINANCE on cashflow:manage', () => {
    expect(canAccess('FINANCE', 'cashflow:manage')).toBe(true)
  })

  it('returns true for INVENTORY on stock:receive', () => {
    expect(canAccess('INVENTORY', 'stock:receive')).toBe(true)
  })

  it('returns false for VIEWER on pos:process', () => {
    expect(canAccess('VIEWER', 'pos:process')).toBe(false)
  })
})