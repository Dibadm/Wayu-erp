'use client'

import { AlertTriangle } from 'lucide-react'

export default function OverdueNotificationBanner({ notifications }: { notifications: any[] }) {
  if (!notifications || notifications.length === 0) return null
  const total = notifications.reduce((s, n) => s + Number(n.amount || 0), 0)
  return (
    <div className="glass-card p-4 flex items-center gap-3 border-l-4 border-l-red-500">
      <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
      <div>
        <p className="text-sm font-medium text-zinc-200">Overdue Notifications</p>
        <p className="text-xs font-mono text-zinc-500">{notifications.length} alerts · ETB {total.toLocaleString()} total overdue</p>
      </div>
    </div>
  )
}
