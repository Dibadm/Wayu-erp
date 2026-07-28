'use client'

import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, FlaskConical } from 'lucide-react'
import { expiryTierColors, expiryTierLabel, type ExpiryTier } from '@/lib/expiry'
import EmptyState from './EmptyState'

type Batch = {
  id: string
  batchNumber: string
  quantity: number
  expiryDate: string
  daysLeft: number
  tier: ExpiryTier
  product: { name: string; sku: string }
  location: { name: string; code: string }
}

type SortKey = 'product' | 'batchNumber' | 'quantity' | 'expiryDate' | 'daysLeft' | 'tier'
type SortDir = 'asc' | 'desc'

export default function BatchesTable({ batches }: { batches: Batch[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('expiryDate')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(25)

  const sorted = useMemo(() => {
    const data = [...batches]
    data.sort((a, b) => {
      let aVal: any = a[sortKey]
      let bVal: any = b[sortKey]
      if (sortKey === 'product') {
        aVal = a.product.name.toLowerCase()
        bVal = b.product.name.toLowerCase()
      } else if (sortKey === 'expiryDate') {
        aVal = new Date(aVal).getTime()
        bVal = new Date(bVal).getTime()
      } else if (sortKey === 'tier') {
        const tierOrder = { expired: 0, critical: 1, warning: 2, soon: 3 }
        aVal = tierOrder[aVal as keyof typeof tierOrder] ?? 99
        bVal = tierOrder[bVal as keyof typeof tierOrder] ?? 99
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = bVal.toLowerCase()
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return data
  }, [batches, sortKey, sortDir])

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

  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="px-5 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                <button onClick={() => handleSort('product')} className="flex items-center gap-1 hover:text-zinc-400">Product <SortIcon column="product" /></button>
              </th>
              <th className="px-5 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                <button onClick={() => handleSort('batchNumber')} className="flex items-center gap-1 hover:text-zinc-400">Batch No. <SortIcon column="batchNumber" /></button>
              </th>
              <th className="px-5 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Location</th>
              <th className="px-5 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                <button onClick={() => handleSort('quantity')} className="flex items-center gap-1 hover:text-zinc-400">Qty <SortIcon column="quantity" /></button>
              </th>
              <th className="px-5 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                <button onClick={() => handleSort('expiryDate')} className="flex items-center gap-1 hover:text-zinc-400">Expiry Date <SortIcon column="expiryDate" /></button>
              </th>
              <th className="px-5 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                <button onClick={() => handleSort('daysLeft')} className="flex items-center gap-1 hover:text-zinc-400">Days Left <SortIcon column="daysLeft" /></button>
              </th>
              <th className="px-5 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                <button onClick={() => handleSort('tier')} className="flex items-center gap-1 hover:text-zinc-400">Status <SortIcon column="tier" /></button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {paginated.map(b => {
              const { badge, row } = expiryTierColors(b.tier)
              return (
                <tr key={b.id} className={`hover:bg-white/[0.02] transition-colors ${row}`}>
                  <td className="px-5 py-3">
                    <p className="text-zinc-200 font-medium text-xs">{b.product.name}</p>
                    <p className="sku mt-0.5">{b.product.sku}</p>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-zinc-300">{b.batchNumber}</td>
                  <td className="px-5 py-3">
                    <p className="text-xs text-zinc-400">{b.location.name}</p>
                    <p className="sku mt-0.5">{b.location.code}</p>
                  </td>
                  <td className="px-5 py-3 stat-num text-sm text-zinc-200">{b.quantity.toLocaleString()}</td>
                  <td className="px-5 py-3 text-xs font-mono text-zinc-300">{b.expiryDate}</td>
                  <td className="px-5 py-3">
                    <span className={`stat-num text-sm ${
                      b.tier === 'expired'  ? 'text-red-400'    :
                      b.tier === 'critical' ? 'text-orange-400' :
                      b.tier === 'warning'  ? 'text-amber-400'  :
                      b.tier === 'soon'     ? 'text-yellow-400' : 'text-zinc-400'
                    }`}>
                      {b.daysLeft < 0 ? `${Math.abs(b.daysLeft)}d ago` : `${b.daysLeft}d`}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium tracking-wide border ${badge}`}>
                      {expiryTierLabel(b.tier)}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {batches.length === 0 && (
        <EmptyState
          icon={<FlaskConical className="w-6 h-6" />}
          title="No batches with expiry activity"
          description="Add batches when receiving stock to start tracking expiry."
        />
      )}

      <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
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
