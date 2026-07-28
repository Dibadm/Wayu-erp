import { Role } from '@prisma/client'

export type AppRole = Role

const rolePermissions: Record<AppRole, string[]> = {
  ADMIN: ['*'],
  STAFF: [
    'inventory:view', 'inventory:edit', 'inventory:adjust',
    'pos:view', 'pos:process',
    'reports:view',
    'movements:view',
  ],
  VIEWER: [
    'inventory:view', 'reports:view', 'dashboard:view',
    'sales:view', 'customers:view', 'credit:view',
  ],
  FINANCE: [
    'cashflow:view', 'cashflow:manage',
    'expenses:view', 'expenses:manage',
    'banks:view', 'banks:manage',
    'reports:view', 'reports:finance',
    'adjustments:approve',
    'ar:view', 'credit:view',
  ],
  INVENTORY: [
    'inventory:view', 'inventory:edit', 'inventory:adjust',
    'stock:receive', 'stock:transfer',
    'reports:view', 'reports:inventory',
    'movements:view', 'movements:create',
    'batches:view',
  ],
  SALES: [
    'sales:view', 'sales:create', 'sales:process',
    'invoices:create', 'invoices:view',
    'customers:view', 'customers:edit',
    'pos:view', 'pos:process',
    'reports:view', 'reports:sales',
    'credit:view',
  ],
  CREDIT_OFFICER: [
    'credit:view', 'credit:manage',
    'collections:view', 'collections:manage',
    'aging:view', 'aging:reports',
    'customers:view',
    'ar:view',
    'reports:view',
  ],
}

export function hasPermission(role: AppRole, permission: string): boolean {
  const perms = rolePermissions[role] || []
  if (perms.includes('*')) return true
  return perms.some(p => permission === p || permission.startsWith(p + ':'))
}

export function canAccess(role: AppRole | undefined, ...permissions: string[]): boolean {
  if (!role) return false
  if (role === 'ADMIN') return true
  return permissions.some(p => hasPermission(role, p))
}
