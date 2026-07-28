// lib/expiry.ts
// Centralised expiry query helpers.
// Used by dashboard widget, notification banner, and AI report.

import { prisma } from '@/lib/db'

export type ExpiryTier = 'expired' | 'critical' | 'warning' | 'soon' | 'ok'

export function getExpiryTier(daysLeft: number): ExpiryTier {
  if (daysLeft < 0)    return 'expired'
  if (daysLeft <= 7)   return 'critical'
  if (daysLeft <= 14)  return 'warning'
  if (daysLeft <= 30)  return 'soon'
  return 'ok'
}

export function expiryTierLabel(tier: ExpiryTier) {
  switch (tier) {
    case 'expired':  return 'EXPIRED'
    case 'critical': return 'EXP ≤7d'
    case 'warning':  return 'EXP ≤14d'
    case 'soon':     return 'EXP ≤30d'
    default:         return 'OK'
  }
}

export function expiryTierColors(tier: ExpiryTier) {
  switch (tier) {
    case 'expired':  return { badge: 'bg-red-500/15 text-red-400 border-red-500/25',    row: 'bg-red-500/5' }
    case 'critical': return { badge: 'bg-orange-500/15 text-orange-400 border-orange-500/25', row: 'bg-orange-500/5' }
    case 'warning':  return { badge: 'bg-amber-500/15 text-amber-400 border-amber-500/25',    row: 'bg-amber-500/5' }
    case 'soon':     return { badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', row: '' }
    default:         return { badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', row: '' }
  }
}

// Full expiry counts for dashboard widget
export async function getExpiryCounts() {
  const now     = new Date()
  const in7d    = new Date(now.getTime() + 7  * 86400000)
  const in14d   = new Date(now.getTime() + 14 * 86400000)
  const in30d   = new Date(now.getTime() + 30 * 86400000)

  const [expired, within7, within14, within30] = await Promise.all([
    prisma.batch.count({ where: { expiryDate: { lt: now }, status: 'ACTIVE' } }),
    prisma.batch.count({ where: { expiryDate: { gte: now, lte: in7d  }, status: 'ACTIVE' } }),
    prisma.batch.count({ where: { expiryDate: { gte: in7d, lte: in14d }, status: 'ACTIVE' } }),
    prisma.batch.count({ where: { expiryDate: { gte: in14d, lte: in30d }, status: 'ACTIVE' } }),
  ])

  return { expired, within7, within14, within30, total: expired + within7 + within14 + within30 }
}

// Detailed batch list for the banner and AI recommendations
export async function getExpiryBatchDetails() {
  const now   = new Date()
  const in30d = new Date(now.getTime() + 30 * 86400000)

  const batches = await prisma.batch.findMany({
    where: {
      OR: [
        { expiryDate: { lt: now }, status: 'ACTIVE' },
        { expiryDate: { gte: now, lte: in30d }, status: 'ACTIVE' },
      ],
    },
    orderBy: { expiryDate: 'asc' },
    include: {
      product:  { select: { name: true, sku: true, id: true } },
      location: { select: { name: true, code: true } },
    },
  })

  return batches.map(b => {
    const daysLeft = Math.floor((b.expiryDate.getTime() - now.getTime()) / 86400000)
    return {
      id:          b.id,
      batchNumber: b.batchNumber,
      quantity:    b.quantity,
      expiryDate:  b.expiryDate.toISOString().split('T')[0],
      daysLeft,
      tier:        getExpiryTier(daysLeft),
      product:     b.product,
      location:    b.location,
    }
  })
}
