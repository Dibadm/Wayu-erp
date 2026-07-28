'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, X, AlertTriangle, Package, FlaskConical, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

type NotificationItem = {
  id: string
  type: 'overdue' | 'low_stock' | 'expiring'
  title: string
  description: string
  href?: string
  date: string
}

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [open, setOpen] = useState(false)
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!open) return
    fetch('/api/notifications')
      .then(r => r.json())
      .then((data) => {
        const items: NotificationItem[] = [
          ...data.overdue.map((n: any) => ({
            id: n.id,
            type: 'overdue' as const,
            title: `Overdue: ${n.customer?.name ?? 'Unknown'}`,
            description: `${n.daysOutstanding}d outstanding · ${n.amount}`,
            href: `/customers/${n.customerId}`,
            date: n.notifiedAt,
          })),
          ...data.lowStock.map((p: any) => ({
            id: p.id,
            type: 'low_stock' as const,
            title: `Low Stock: ${p.name}`,
            description: `${p.quantity} / ${p.minStockLevel} ${p.unit} remaining`,
            href: `/inventory/${p.id}`,
            date: new Date().toISOString(),
          })),
          ...data.expiring.map((b: any) => ({
            id: b.id,
            type: 'expiring' as const,
            title: `Expiring: ${b.product?.name ?? 'Unknown'}`,
            description: `${b.daysUntilExpiry}d left · Batch ${b.batchNumber} · ${b.location?.name ?? ''}`,
            href: `/inventory/${b.productId}`,
            date: b.expiryDate,
          })),
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

        setNotifications(items)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [open])

  useEffect(() => {
    const stored = localStorage.getItem('wayu-read-notifications')
    if (stored) {
      try {
        setReadIds(new Set(JSON.parse(stored)))
      } catch {}
    }
  }, [])

  function markAsRead(id: string) {
    const next = new Set(readIds)
    next.add(id)
    setReadIds(next)
    localStorage.setItem('wayu-read-notifications', JSON.stringify([...next]))
  }

  function markAllAsRead() {
    const allIds = new Set(notifications.map(n => n.id))
    setReadIds(allIds)
    localStorage.setItem('wayu-read-notifications', JSON.stringify([...allIds]))
  }

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length

  useEffect(() => {
    if (open && unreadCount > 0) {
      markAllAsRead()
    }
  }, [open])

  const iconMap = {
    overdue: AlertTriangle,
    low_stock: Package,
    expiring: FlaskConical,
  }

  const colorMap = {
    overdue: 'text-red-400',
    low_stock: 'text-amber-400',
    expiring: 'text-orange-400',
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
        style={{ color: 'var(--text-muted)', border: '1px solid transparent' }}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span
            className="absolute top-1 right-1 w-2 h-2 rounded-full"
            style={{ background: 'var(--accent-red)' }}
          />
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 z-50 rounded-xl overflow-hidden"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-lg)',
            width: '360px',
            maxHeight: '480px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Notifications</h3>
            <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-white/5" style={{ color: 'var(--text-muted)' }}>
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="px-4 py-8 text-center">
                <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Loading…</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--accent-emerald)' }} />
                <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>All caught up!</p>
              </div>
            ) : (
              notifications.map(n => {
                const Icon = iconMap[n.type]
                const isRead = readIds.has(n.id)
                return (
                  <Link
                    key={n.id}
                    href={n.href ?? '#'}
                    onClick={() => {
                      markAsRead(n.id)
                      setOpen(false)
                    }}
                    className="flex items-start gap-3 px-4 py-3 transition-colors border-b"
                    style={{
                      borderColor: 'var(--border)',
                      background: isRead ? 'transparent' : 'var(--bg-muted)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-muted)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = isRead ? 'transparent' : 'var(--bg-muted)' }}
                  >
                    <div className={`mt-0.5 ${colorMap[n.type]}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{n.title}</p>
                      <p className="text-xs font-mono truncate" style={{ color: 'var(--text-muted)' }}>{n.description}</p>
                    </div>
                    {!isRead && (
                      <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'var(--accent-blue)' }} />
                    )}
                  </Link>
                )
              })
            )}
          </div>

          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t flex justify-between items-center" style={{ borderColor: 'var(--border)' }}>
              <button
                onClick={markAllAsRead}
                className="text-[10px] font-mono uppercase tracking-widest transition-colors"
                style={{ color: 'var(--accent-blue)' }}
              >
                Mark all read
              </button>
              <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                {notifications.length} total
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
