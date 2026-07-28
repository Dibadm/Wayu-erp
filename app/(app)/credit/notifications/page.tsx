'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

export default function OverdueNotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])

  useEffect(() => { fetch('/api/overdue-notifications').then(r => r.json()).then(setNotifications) }, [])

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Overdue Notifications</h1>
        <p className="text-sm text-zinc-500 font-mono mt-0.5">System-generated overdue alerts</p>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                {['Customer', 'Days Outstanding', 'Amount', 'Channel', 'Notified At', 'Notes'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {notifications.map((n: any) => (
                <tr key={n.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5 text-sm text-zinc-300">{n.customer?.name ?? '—'}</td>
                  <td className="px-4 py-2.5 stat-num text-sm text-red-400">{n.daysOutstanding} days</td>
                  <td className="px-4 py-2.5 stat-num text-sm text-amber-400">ETB {Number(n.amount).toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-xs text-zinc-500">{n.channel}</td>
                  <td className="px-4 py-2.5 text-xs text-zinc-500">{new Date(n.notifiedAt).toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-xs text-zinc-500">{n.notes ?? '—'}</td>
                </tr>
              ))}
              {notifications.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-xs font-mono text-zinc-600">No notifications found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
