'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ChevronUp, ChevronDown, Package, Plus } from 'lucide-react'
import StockStatusBadge from './StockStatusBadge'
import { getStockStatus } from '@/lib/utils'
import EmptyState from './EmptyState'

type Product = {
  id: string
  sku: string
  name: string
  description?: string | null
  category: string
  quantity: number
  minStockLevel: number
  unit: string
}

type SortKey = 'sku' | 'name' | 'category' | 'quantity' | 'minStockLevel'
type SortDir = 'asc' | 'desc'

export default function InventoryTable({ products }: { products: Product[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(25)

  const sorted = useMemo(() => {
    const data = [...products]
    data.sort((a, b) => {
      let aVal: any = a[sortKey]
      let bVal: any = b[sortKey]
      if (sortKey === 'quantity' || sortKey === 'minStockLevel') {
        aVal = Number(aVal)
        bVal = Number(bVal)
      } else {
        aVal = String(aVal).toLowerCase()
        bVal = String(bVal).toLowerCase()
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return data
  }, [products, sortKey, sortDir])

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
                <button onClick={() => handleSort('sku')} className="flex items-center gap-1 hover:text-zinc-400">
                  SKU <SortIcon column="sku" />
                </button>
              </th>
              <th className="px-5 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                <button onClick={() => handleSort('name')} className="flex items-center gap-1 hover:text-zinc-400">
                  Product <SortIcon column="name" />
                </button>
              </th>
              <th className="px-5 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                <button onClick={() => handleSort('category')} className="flex items-center gap-1 hover:text-zinc-400">
                  Category <SortIcon column="category" />
                </button>
              </th>
              <th className="px-5 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                <button onClick={() => handleSort('quantity')} className="flex items-center gap-1 hover:text-zinc-400">
                  Stock <SortIcon column="quantity" />
                </button>
              </th>
              <th className="px-5 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Min Level</th>
              <th className="px-5 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Status</th>
              <th className="px-5 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {paginated.map(p => {
              const status = getStockStatus(p.quantity, p.minStockLevel)
              return (
                <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-5 py-3 sku">{p.sku}</td>
                  <td className="px-5 py-3">
                    <p className="text-zinc-200 font-medium">{p.name}</p>
                    {p.description && <p className="text-xs text-zinc-600 mt-0.5 truncate max-w-xs">{p.description}</p>}
                  </td>
                  <td className="px-5 py-3 text-xs font-mono text-zinc-500">{p.category}</td>
                  <td className="px-5 py-3">
                    <span className={`stat-num text-sm ${
                      status === 'ok' ? 'text-zinc-200' :
                      status === 'warning' ? 'text-amber-400' : 'text-red-400'
                    }`}>{p.quantity.toLocaleString()}</span>
                    <span className="text-xs font-mono text-zinc-600 ml-1">{p.unit}</span>
                  </td>
                  <td className="px-5 py-3 text-xs font-mono text-zinc-500">
                    {p.minStockLevel.toLocaleString()} {p.unit}
                  </td>
                  <td className="px-5 py-3">
                    <StockStatusBadge status={status} />
                  </td>
                  <td className="px-5 py-3">
                    <Link href={`/inventory/${p.id}`} className="text-xs font-mono text-blue-500 hover:text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity">
                      VIEW →
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

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

      {products.length === 0 && (
        <EmptyState
          icon={<Package className="w-6 h-6" />}
          title="No products yet"
          description="Add your first pharmaceutical product to start tracking inventory."
          cta={{ label: 'Add Product', href: '#' }}
        />
      )}
    </div>
  )
}
