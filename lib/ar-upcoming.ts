// lib/ar-upcoming.ts
// Upcoming AR due-date helpers. Mirrors the inventory expiry tier pattern.

export type ARTier = 'overdue' | 'critical' | 'warning' | 'soon' | 'ok'

export function getARTier(daysLeft: number): ARTier {
  if (daysLeft < 0)  return 'overdue'
  if (daysLeft <= 7) return 'critical'
  if (daysLeft <= 14) return 'warning'
  if (daysLeft <= 30) return 'soon'
  return 'ok'
}

export function arTierLabel(tier: ARTier) {
  switch (tier) {
    case 'overdue':  return 'OVERDUE'
    case 'critical': return 'DUE ≤7d'
    case 'warning':  return 'DUE ≤14d'
    case 'soon':     return 'DUE ≤30d'
    default:         return 'OK'
  }
}
