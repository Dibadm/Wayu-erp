'use client'

export default function RiskBadge({ level }: { level: string }) {
  const cls = level === 'LOW' ? 'badge-in' : level === 'MEDIUM' ? 'badge-outline' : level === 'HIGH' ? 'badge-warning' : 'badge-warning'
  return <span className={`badge ${cls}`}>{level}</span>
}
