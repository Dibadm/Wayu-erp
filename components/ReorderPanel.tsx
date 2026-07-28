'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, TrendingDown, CheckCircle, Eye, RefreshCw } from 'lucide-react'

interface Recommendation {
  id: string; name: string; sku: string; unit: string
  currentStock: number; minStockLevel: number
  avgDailySales: number; daysOfStockRemaining: number | null
  deficit: number; status: string; recommendation: string
}

export default function ReorderPanel() {
  const [items,   setItems]   = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState<'all' | 'urgent'>('urgent')

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/ai/reorder')
      if (res.ok) setItems(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const shown       = filter === 'urgent' ? items.filter(r => r.status !== 'OK') : items
  const urgentCount = items.filter(r => r.status === 'OUT_OF_STOCK' || r.status === 'REORDER_NOW').length

  function statusColor(status: string) {
    switch (status) {
      case 'OUT_OF_STOCK': return 'var(--accent-red)'
      case 'REORDER_NOW':  return 'var(--accent-red)'
      case 'REORDER_SOON': return 'var(--accent-amber)'
      case 'WATCH':        return 'var(--text-muted)'
      default:             return 'var(--accent-emerald)'
    }
  }

  function statusBorderColor(status: string) {
    switch (status) {
      case 'OUT_OF_STOCK':
      case 'REORDER_NOW':  return 'var(--accent-red)'
      case 'REORDER_SOON': return 'var(--accent-amber)'
      default:             return 'transparent'
    }
  }

  function StatusIcon({ status }: { status: string }) {
    const color = statusColor(status)
    if (status === 'OK') return <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color }} />
    if (status === 'WATCH') return <Eye className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color }} />
    return <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color }} />
  }

  return (
    <div className="glass-card overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div>
          <h2 className="text-sm font-semibold">Reorder Recommendations</h2>
          <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>
            From sales history and stock levels
          </p>
        </div>
        <div className="flex items-center gap-2">
          {urgentCount > 0 && <span className="badge-low">{urgentCount} urgent</span>}
          <button
            onClick={load}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div
        className="px-5 py-2.5 flex gap-2 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        {(['urgent', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="text-xs font-mono px-3 py-1 rounded-full transition-colors"
            style={filter === f
              ? { background: 'var(--accent-blue-bg)', color: 'var(--accent-blue)', border: '1px solid var(--accent-blue-border)' }
              : { color: 'var(--text-muted)', border: '1px solid transparent' }
            }
          >
            {f === 'urgent' ? `Needs attention (${items.filter(r => r.status !== 'OK').length})` : `All (${items.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex-1 flex justify-center items-center py-10">
          <RefreshCw className="w-5 h-5 animate-spin" style={{ color: 'var(--text-muted)' }} />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto divide-y" style={{ borderColor: 'var(--border)' }}>
          {shown.map(item => (
            <div
              key={item.id}
              className="px-5 py-3"
              style={{ borderLeft: `3px solid ${statusBorderColor(item.status)}` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  <StatusIcon status={item.status} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{item.name}</p>
                    <p className="sku mt-0.5">{item.sku}</p>
                    <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>{item.recommendation}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="stat-num text-sm" style={{ color: statusColor(item.status) }}>
                    {item.currentStock}
                  </p>
                  <p className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{item.unit}</p>
                  {item.daysOfStockRemaining !== null && (
                    <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      ~{item.daysOfStockRemaining}d left
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
          {shown.length === 0 && (
            <div className="py-10 text-center flex flex-col items-center gap-2">
              <CheckCircle className="w-8 h-8" style={{ color: 'var(--accent-emerald)', opacity: 0.4 }} />
              <p className="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>All products are well-stocked.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
