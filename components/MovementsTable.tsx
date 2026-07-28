'use client'

import { useState, useMemo } from 'react'
import { formatDate } from '@/lib/utils'
import { ArrowDownLeft, ArrowUpRight, RefreshCw, ArrowLeftRight, ChevronUp, ChevronDown, ArrowLeftRight as ArrowLeftRightIcon } from 'lucide-react'
import { MovementType } from '@prisma/client'
import EmptyState from './EmptyState'

interface Movement {
  id: string
  type: MovementType
  quantity: number
  notes?: string | null
  timestamp: Date
  product:  { name: string; sku: string }
  user:     { name?: string | null; email: string }
  location?: { name: string; code: string } | null
  batch?:   { batchNumber: string; expiryDate: Date } | null
}

type SortKey = 'type' | 'product' | 'quantity' | 'user' | 'timestamp'
type SortDir = 'asc' | 'desc'

function TypeBadge({ type }: { type: MovementType }) {
  if (type === 'IN') return (
    <span className="badge-in flex items-center gap-1 w-fit">
      <ArrowDownLeft className="w-3 h-3" /> IN
    </span>
  )
  if (type === 'OUT') return (
    <span className="badge-out flex items-center gap-1 w-fit">
      <ArrowUpRight className="w-3 h-3" /> OUT
    </span>
  )
  if (type === 'TRANSFER') return (
    <span className="badge-adjustment flex items-center gap-1 w-fit">
      <ArrowLeftRight className="w-3 h-3" /> TRANSFER
    </span>
  )
  return (
    <span className="badge-adjustment flex items-center gap-1 w-fit">
      <RefreshCw className="w-3 h-3" /> ADJ
    </span>
  )
}

export default function MovementsTable({ movements }: { movements: Movement[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('timestamp')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(25)

  const sorted = useMemo(() => {
    const data = [...movements]
    data.sort((a, b) => {
      let aVal: any = a[sortKey]
      let bVal: any = b[sortKey]
      if (sortKey === 'product') {
        aVal = a.product.name.toLowerCase()
        bVal = b.product.name.toLowerCase()
      } else if (sortKey === 'user') {
        aVal = (a.user.name ?? a.user.email).toLowerCase()
        bVal = (b.user.name ?? b.user.email).toLowerCase()
      } else if (sortKey === 'timestamp') {
        aVal = new Date(aVal).getTime()
        bVal = new Date(bVal).getTime()
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = bVal.toLowerCase()
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return data
  }, [movements, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const paginated = sorted.slice(page * pageSize, (page + 1) * pageSize)

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(0)
  }

  function SortIcon({ column }: { column: SortKey }) {
    if (sortKey !== column) return <span className="text-zinc-700">↕</span>
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
  }

  if (!movements.length) {
    return (
      <EmptyState
        icon={<ArrowLeftRightIcon className="w-6 h-6" />}
        title="No movements yet"
        description="Record stock movements to see them here."
      />
    )
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="px-4 py-2 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                <button onClick={() => handleSort('type')} className="flex items-center gap-1 hover:text-zinc-400">
                  Type <SortIcon column="type" />
                </button>
              </th>
              <th className="px-4 py-2 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                <button onClick={() => handleSort('product')} className="flex items-center gap-1 hover:text-zinc-400">
                  Product <SortIcon column="product" />
                </button>
              </th>
              <th className="px-4 py-2 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                <button onClick={() => handleSort('quantity')} className="flex items-center gap-1 hover:text-zinc-400">
                  Qty <SortIcon column="quantity" />
                </button>
              </th>
              <th className="px-4 py-2 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                <button onClick={() => handleSort('user')} className="flex items-center gap-1 hover:text-zinc-400">
                  By <SortIcon column="user" />
                </button>
              </th>
              <th className="px-4 py-2 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                <button onClick={() => handleSort('timestamp')} className="flex items-center gap-1 hover:text-zinc-400">
                  When <SortIcon column="timestamp" />
                </button>
              </th>
              <th className="px-4 py-2 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {paginated.map(m => (
              <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-2.5"><TypeBadge type={m.type} /></td>
                <td>
                  <p className="font-medium text-xs" style={{ color: 'var(--text-primary)' }}>{m.product.name}</p>
                  <p className="sku mt-0.5">{m.product.sku}</p>
                </td>
                <td>
                  <span
                    className="stat-num text-sm"
                    style={{ color: m.type === 'OUT' ? 'var(--accent-red)' : 'var(--accent-emerald)' }}
                  >
                    {m.type === 'OUT' ? '−' : '+'}{m.quantity}
                  </span>
                </td>
                <td className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                  {m.user.name ?? m.user.email.split('@')[0]}
                </td>
                <td className="text-xs font-mono whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                  {formatDate(m.timestamp, false)}
                </td>
                <td className="text-xs max-w-xs truncate" style={{ color: 'var(--text-muted)' }}>
                  {m.notes ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800 mt-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Rows per page</span>
          <select
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(0) }}
            className="input w-auto py-1 text-xs"
          >
            {[10, 25, 50, 100].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-2 py-1 text-xs font-mono rounded border border-zinc-800 disabled:opacity-40 hover:bg-white/5 transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            Prev
          </button>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-2 py-1 text-xs font-mono rounded border border-zinc-800 disabled:opacity-40 hover:bg-white/5 transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
