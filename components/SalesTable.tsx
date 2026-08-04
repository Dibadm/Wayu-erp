'use client'

import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { formatDate } from '@/lib/utils'

type Sale = {
  id: string
  receiptNumber: string
  customer?: { name: string } | null
  cashier: { name?: string | null; email: string }
  salesperson?: { name?: string | null; email: string } | null
  payments: { method: string; amount: any }[]
  _count: { items: number }
  discountAmount: any
  taxAmount: any
  total: any
  profit: any
  status: string
  createdAt: Date
}

type SortKey = 'receiptNumber' | 'customer' | 'status' | 'total' | 'profit' | 'createdAt' | 'salesperson'
type SortDir = 'asc' | 'desc'

const STATUS_CLS: Record<string, string> = {
  COMPLETED: 'badge-ok',
  REFUNDED: 'badge-out',
  PARTIAL_REFUND: 'badge-warning',
  VOIDED: 'badge-low',
}

function fmt(n: number | string | null | undefined) {
  return `ETB ${(Number(n ?? 0)).toLocaleString('en-ET', { minimumFractionDigits: 2 })}`
}

export default function SalesTable({ sales }: { sales: Sale[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(25)

  const sorted = useMemo(() => {
    const data = [...sales]
    data.sort((a, b) => {
      let aVal: any = a[sortKey]
      let bVal: any = b[sortKey]
      if (sortKey === 'customer') {
        aVal = (a.customer?.name ?? '').toLowerCase()
        bVal = (b.customer?.name ?? '').toLowerCase()
      } else if (sortKey === 'salesperson') {
        aVal = (a.salesperson?.name ?? a.salesperson?.email ?? '').toLowerCase()
        bVal = (b.salesperson?.name ?? b.salesperson?.email ?? '').toLowerCase()
      } else if (sortKey === 'receiptNumber') {
        aVal = a.receiptNumber.toLowerCase()
        bVal = b.receiptNumber.toLowerCase()
      } else if (sortKey === 'status') {
        aVal = a.status.toLowerCase()
        bVal = b.status.toLowerCase()
      } else if (sortKey === 'createdAt') {
        aVal = new Date(aVal).getTime()
        bVal = new Date(bVal).getTime()
      } else if (typeof aVal === 'string') {
        aVal = parseFloat(aVal)
        bVal = parseFloat(bVal)
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return data
  }, [sales, sortKey, sortDir])

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
      <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-100">Recent Transactions</h2>
        <span className="text-xs font-mono text-zinc-600">{sales.length} total</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                <button onClick={() => handleSort('receiptNumber')} className="flex items-center gap-1 hover:text-zinc-400">Receipt <SortIcon column="receiptNumber" /></button>
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                <button onClick={() => handleSort('customer')} className="flex items-center gap-1 hover:text-zinc-400">Customer <SortIcon column="customer" /></button>
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                <button onClick={() => handleSort('status')} className="flex items-center gap-1 hover:text-zinc-400">Status <SortIcon column="status" /></button>
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Items</th>
              <th className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Discount</th>
              <th className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Tax</th>
              <th className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                <button onClick={() => handleSort('total')} className="flex items-center gap-1 hover:text-zinc-400">Total <SortIcon column="total" /></button>
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                <button onClick={() => handleSort('profit')} className="flex items-center gap-1 hover:text-zinc-400">Profit <SortIcon column="profit" /></button>
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Payment</th>
              <th className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Cashier</th>
              <th className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                <button onClick={() => handleSort('salesperson')} className="flex items-center gap-1 hover:text-zinc-400">Salesperson <SortIcon column="salesperson" /></button>
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                <button onClick={() => handleSort('createdAt')} className="flex items-center gap-1 hover:text-zinc-400">Date <SortIcon column="createdAt" /></button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {paginated.map(sale => (
              <tr key={sale.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-blue-400 whitespace-nowrap">{sale.receiptNumber}</td>
                <td className="px-4 py-3 text-xs text-zinc-400">{sale.customer?.name ?? <span className="text-zinc-600">Walk-in</span>}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${STATUS_CLS[sale.status] ?? 'badge-ok'}`}>{sale.status.replace('_', ' ')}</span>
                </td>
                <td className="px-4 py-3 stat-num text-sm text-zinc-400">{sale._count.items}</td>
                <td className="px-4 py-3 stat-num text-xs text-amber-400">
                  {Number(sale.discountAmount) > 0 ? `-${fmt(Number(sale.discountAmount))}` : '—'}
                </td>
                <td className="px-4 py-3 stat-num text-xs text-zinc-500">{fmt(Number(sale.taxAmount))}</td>
                <td className="px-4 py-3 stat-num text-sm text-emerald-400 whitespace-nowrap">{fmt(Number(sale.total))}</td>
                <td className="px-4 py-3 stat-num text-xs text-blue-400">{fmt(Number(sale.profit))}</td>
                <td className="px-4 py-3 text-xs font-mono text-zinc-500 whitespace-nowrap">
                  {sale.payments.map(p => p.method.replace('_', ' ')).join(', ')}
                </td>
                <td className="px-4 py-3 text-xs font-mono text-zinc-500">
                  {sale.cashier.name ?? sale.cashier.email.split('@')[0]}
                </td>
                <td className="px-4 py-3 text-xs font-mono text-zinc-500">
                  {sale.salesperson?.name ?? sale.salesperson?.email?.split('@')[0] ?? sale.cashier.name ?? sale.cashier.email.split('@')[0]}
                </td>
                <td className="px-4 py-3 text-xs font-mono text-zinc-600 whitespace-nowrap">{formatDate(sale.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sales.length === 0 && (
        <div className="py-16 flex flex-col items-center gap-3 text-zinc-600">
          <p className="text-sm font-mono">No sales yet. Complete a sale from the POS screen.</p>
        </div>
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
