'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, Download, Loader2 } from 'lucide-react'
import Link from 'next/link'
import Breadcrumb from '@/components/Breadcrumb'
import { formatDate } from '@/lib/utils'

type Tab = 'current-stock' | 'valuation' | 'expiry' | 'dead-stock' | 'movements' | 'batches' | 'monthly-received' | 'monthly-sold' | 'gross-profit' | 'product-performance' | 'fast-slow-moving' | 'adjustment-history'

const TABS: { key: Tab; label: string }[] = [
  { key: 'current-stock', label: 'Current Stock' },
  { key: 'valuation', label: 'Stock Valuation' },
  { key: 'expiry', label: 'Expiry Report' },
  { key: 'dead-stock', label: 'Dead Stock' },
  { key: 'movements', label: 'Inventory Movement' },
  { key: 'batches', label: 'Batch/Lot Report' },
  { key: 'monthly-received', label: 'Monthly Received' },
  { key: 'monthly-sold', label: 'Monthly Sold' },
  { key: 'gross-profit', label: 'Gross Profit' },
  { key: 'product-performance', label: 'Product Performance' },
  { key: 'fast-slow-moving', label: 'Fast/Slow Moving' },
  { key: 'adjustment-history', label: 'Adjustment History' },
]

export default function InventoryReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('current-stock')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0] })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])

  const needsDateRange = ['monthly-received', 'monthly-sold', 'product-performance', 'fast-slow-moving', 'sales-trend', 'top-selling-products', 'salesperson-performance'].includes(activeTab)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ type: activeTab, from: dateFrom, to: dateTo })
    fetch(`/api/reports/data?${params}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [activeTab, dateFrom, dateTo])

  const downloadExcel = () => {
    const params = new URLSearchParams({ type: 'inventory-reports', format: 'excel' })
    window.open(`/api/reports?${params}`, '_blank')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Breadcrumb />
      <div className="flex items-center gap-4">
        <Link href="/reports" className="text-zinc-500 hover:text-zinc-300 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Inventory Reports</h1>
          <p className="text-sm text-zinc-500 font-mono mt-0.5">
            Current stock, valuation, expiry, dead stock, movements, batches, monthly received/sold, gross profit, product performance, fast/slow moving, and adjustment history.
          </p>
        </div>
      </div>

      {/* Date range filter */}
      {needsDateRange && (
        <div className="glass-card p-5">
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-3">Date Range</p>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-500">From</label>
              <input type="date" className="input w-auto" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <span className="text-zinc-600 font-mono">→</span>
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-500">To</label>
              <input type="date" className="input w-auto" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 text-xs font-mono rounded border transition-colors ${
              activeTab === tab.key
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-100">{TABS.find(t => t.key === activeTab)?.label}</h2>
        <button onClick={downloadExcel} className="btn-primary flex items-center gap-2">
          <Download className="w-4 h-4" /> Download Excel
        </button>
      </div>

      {/* Content */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table tab={activeTab} data={data} />
          </div>
        )}
      </div>
    </div>
  )
}

function Table({ tab, data }: { tab: Tab; data: any }) {
  if (!data) return <div className="p-10 text-center text-xs font-mono text-zinc-600">No data available.</div>

  switch (tab) {
    case 'current-stock':
      return <CurrentStockTable data={data} />
    case 'valuation':
      return <ValuationTable data={data} />
    case 'expiry':
      return <ExpiryTable data={data} />
    case 'dead-stock':
      return <DeadStockTable data={data} />
    case 'movements':
      return <MovementsTable data={data} />
    case 'batches':
      return <BatchesTable data={data} />
    case 'monthly-received':
      return <MonthlyReceivedTable data={data} />
    case 'monthly-sold':
      return <MonthlySoldTable data={data} />
    case 'gross-profit':
      return <GrossProfitTable data={data} />
    case 'product-performance':
      return <ProductPerformanceTable data={data} />
    case 'fast-slow-moving':
      return <FastSlowMovingTable data={data} />
    case 'adjustment-history':
      return <AdjustmentHistoryTable data={data} />
    default:
      return <div className="p-10 text-center text-xs font-mono text-zinc-600">Select a tab to view data.</div>
  }
}

function CurrentStockTable({ data }: { data: any }) {
  const products = data.products ?? []
  return (
    <table className="w-full text-sm">
      <thead><tr className="border-b border-zinc-800">
        {['SKU', 'Product Name', 'Category', 'Qty', 'Min', 'Unit', 'Status', 'Nearest Expiry'].map(h => (
          <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
        ))}
      </tr></thead>
      <tbody className="divide-y divide-zinc-800/50">
        {products.map((p: any) => (
          <tr key={p.id} className="hover:bg-white/[0.02]">
            <td className="px-4 py-2.5 font-mono text-xs text-zinc-400">{p.sku}</td>
            <td className="px-4 py-2.5 text-sm text-zinc-300">{p.name}</td>
            <td className="px-4 py-2.5 text-xs text-zinc-500">{p.category}</td>
            <td className="px-4 py-2.5 stat-num text-sm">{p.quantity}</td>
            <td className="px-4 py-2.5 stat-num text-sm">{p.minStockLevel}</td>
            <td className="px-4 py-2.5 text-xs text-zinc-500">{p.unit}</td>
            <td className="px-4 py-2.5">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium tracking-wide border ${
                p.quantity === 0 ? 'badge-warning' : p.quantity <= p.minStockLevel ? 'badge-outline border-amber-500/30 text-amber-400' : 'badge-in'
              }`}>
                {p.quantity === 0 ? 'OUT OF STOCK' : p.quantity <= p.minStockLevel ? 'LOW STOCK' : 'OK'}
              </span>
            </td>
            <td className="px-4 py-2.5 text-xs text-zinc-500">{p.batches?.[0]?.expiryDate ? new Date(p.batches[0].expiryDate).toLocaleDateString() : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ValuationTable({ data }: { data: any }) {
  const products = data.products ?? []
  return (
    <table className="w-full text-sm">
      <thead><tr className="border-b border-zinc-800">
        {['SKU', 'Product', 'Qty', 'Cost', 'Sell', 'Profit/Unit', 'Margin', 'Inv Cost', 'Inv Value', 'Est Profit'].map(h => (
          <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
        ))}
      </tr></thead>
      <tbody className="divide-y divide-zinc-800/50">
        {products.map((p: any) => {
          const cost = Number(p.costPrice ?? 0); const sell = Number(p.sellingPrice ?? 0)
          const profit = sell - cost; const margin = cost > 0 ? ((profit / cost) * 100) : 0
          const invCost = p.quantity * cost; const invVal = p.quantity * sell; const estProfit = invVal - invCost
          return (
            <tr key={p.id} className="hover:bg-white/[0.02]">
              <td className="px-4 py-2.5 font-mono text-xs text-zinc-400">{p.sku}</td>
              <td className="px-4 py-2.5 text-sm text-zinc-300">{p.name}</td>
              <td className="px-4 py-2.5 stat-num text-sm">{p.quantity}</td>
              <td className="px-4 py-2.5 stat-num text-sm">{cost > 0 ? cost.toFixed(2) : '—'}</td>
              <td className="px-4 py-2.5 stat-num text-sm">{sell > 0 ? sell.toFixed(2) : '—'}</td>
              <td className="px-4 py-2.5 stat-num text-sm">{(cost > 0 && sell > 0) ? profit.toFixed(2) : '—'}</td>
              <td className="px-4 py-2.5 stat-num text-sm" style={{ color: margin >= 20 ? 'var(--accent-emerald)' : margin >= 10 ? 'var(--accent-amber)' : 'var(--accent-red)' }}>
                {(cost > 0 && sell > 0) ? `${margin.toFixed(1)}%` : '—'}
              </td>
              <td className="px-4 py-2.5 stat-num text-sm">{cost > 0 ? invCost.toFixed(2) : '—'}</td>
              <td className="px-4 py-2.5 stat-num text-sm">{sell > 0 ? invVal.toFixed(2) : '—'}</td>
              <td className="px-4 py-2.5 stat-num text-sm">{(cost > 0 && sell > 0) ? estProfit.toFixed(2) : '—'}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function ExpiryTable({ data }: { data: any }) {
  const batches = data.batches ?? []
  const now = new Date()
  return (
    <table className="w-full text-sm">
      <thead><tr className="border-b border-zinc-800">
        {['SKU', 'Product', 'Batch', 'Qty', 'Location', 'Received', 'Expiry', 'Days Left', 'Alert'].map(h => (
          <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
        ))}
      </tr></thead>
      <tbody className="divide-y divide-zinc-800/50">
        {batches.map((b: any) => {
          const daysLeft = Math.floor((new Date(b.expiryDate).getTime() - now.getTime()) / 86400000)
          const alert = daysLeft < 0 ? 'EXPIRED' : daysLeft <= 30 ? 'CRITICAL' : daysLeft <= 90 ? 'WARNING' : 'OK'
          return (
            <tr key={b.id} className="hover:bg-white/[0.02]">
              <td className="px-4 py-2.5 font-mono text-xs text-zinc-400">{b.product.sku}</td>
              <td className="px-4 py-2.5 text-sm text-zinc-300">{b.product.name}</td>
              <td className="px-4 py-2.5 font-mono text-xs text-zinc-400">{b.batchNumber}</td>
              <td className="px-4 py-2.5 stat-num text-sm">{b.quantity}</td>
              <td className="px-4 py-2.5 text-xs text-zinc-500">{b.location.name}</td>
              <td className="px-4 py-2.5 text-xs text-zinc-500">{formatDate(b.receivedDate)}</td>
              <td className="px-4 py-2.5 text-xs text-zinc-500">{formatDate(b.expiryDate)}</td>
              <td className="px-4 py-2.5 stat-num text-sm">{daysLeft}</td>
              <td className="px-4 py-2.5">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium tracking-wide border ${
                  alert === 'EXPIRED' ? 'badge-warning' : alert === 'CRITICAL' ? 'badge-outline border-amber-500/30 text-amber-400' : alert === 'WARNING' ? 'badge-outline border-yellow-500/30 text-yellow-400' : 'badge-in'
                }`}>{alert}</span>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function DeadStockTable({ data }: { data: any }) {
  const items = data.deadStock ?? []
  return (
    <table className="w-full text-sm">
      <thead><tr className="border-b border-zinc-800">
        {['SKU', 'Product', 'Category', 'Qty', 'Unit', 'Last Movement', 'Days Stagnant', 'Est. Value'].map(h => (
          <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
        ))}
      </tr></thead>
      <tbody className="divide-y divide-zinc-800/50">
        {items.map((p: any) => (
          <tr key={p.id} className="hover:bg-white/[0.02]">
            <td className="px-4 py-2.5 font-mono text-xs text-zinc-400">{p.sku}</td>
            <td className="px-4 py-2.5 text-sm text-zinc-300">{p.name}</td>
            <td className="px-4 py-2.5 text-xs text-zinc-500">{p.category}</td>
            <td className="px-4 py-2.5 stat-num text-sm">{p.totalQty}</td>
            <td className="px-4 py-2.5 text-xs text-zinc-500">{p.unit}</td>
            <td className="px-4 py-2.5 text-xs text-zinc-500">{p.movements?.[0]?.timestamp ? formatDate(new Date(p.movements[0].timestamp)) : formatDate(new Date(p.createdAt))}</td>
            <td className="px-4 py-2.5 stat-num text-sm" style={{ color: p.daysSinceMovement > 180 ? 'var(--accent-red)' : 'var(--accent-amber)' }}>{p.daysSinceMovement}</td>
            <td className="px-4 py-2.5 stat-num text-sm">{(p.totalQty * Number(p.costPrice ?? 0)).toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function MovementsTable({ data }: { data: any }) {
  const movements = data.movements ?? []
  return (
    <table className="w-full text-sm">
      <thead><tr className="border-b border-zinc-800">
        {['Date/Time', 'Type', 'SKU', 'Product', 'Qty', 'Location', 'Batch', 'Performed By', 'Notes'].map(h => (
          <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
        ))}
      </tr></thead>
      <tbody className="divide-y divide-zinc-800/50">
        {movements.map((m: any) => (
          <tr key={m.id} className="hover:bg-white/[0.02]">
            <td className="px-4 py-2.5 text-xs text-zinc-500">{formatDate(m.timestamp)}</td>
            <td className="px-4 py-2.5"><span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium tracking-wide border ${
              m.type === 'IN' ? 'badge-in' : m.type === 'OUT' ? 'badge-outline border-red-500/30 text-red-400' : 'badge-warning'
            }`}>{m.type}</span></td>
            <td className="px-4 py-2.5 font-mono text-xs text-zinc-400">{m.product.sku}</td>
            <td className="px-4 py-2.5 text-sm text-zinc-300">{m.product.name}</td>
            <td className="px-4 py-2.5 stat-num text-sm">{m.quantity}</td>
            <td className="px-4 py-2.5 text-xs text-zinc-500">{m.location ? `${m.location.code} – ${m.location.name}` : '—'}</td>
            <td className="px-4 py-2.5 font-mono text-xs text-zinc-500">{m.batch?.batchNumber ?? '—'}</td>
            <td className="px-4 py-2.5 text-xs text-zinc-500">{m.user?.name ?? m.user?.email}</td>
            <td className="px-4 py-2.5 text-xs text-zinc-500 truncate max-w-xs">{m.notes ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function BatchesTable({ data }: { data: any }) {
  const batches = data.batches ?? []
  const now = new Date()
  return (
    <table className="w-full text-sm">
      <thead><tr className="border-b border-zinc-800">
        {['SKU', 'Product', 'Batch', 'Qty', 'Location', 'Received', 'Expiry', 'Days Left', 'Alert'].map(h => (
          <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
        ))}
      </tr></thead>
      <tbody className="divide-y divide-zinc-800/50">
        {batches.map((b: any) => {
          const daysLeft = Math.floor((new Date(b.expiryDate).getTime() - now.getTime()) / 86400000)
          const alert = daysLeft < 0 ? 'EXPIRED' : daysLeft <= 30 ? 'CRITICAL' : daysLeft <= 90 ? 'WARNING' : 'OK'
          return (
            <tr key={b.id} className="hover:bg-white/[0.02]">
              <td className="px-4 py-2.5 font-mono text-xs text-zinc-400">{b.product.sku}</td>
              <td className="px-4 py-2.5 text-sm text-zinc-300">{b.product.name}</td>
              <td className="px-4 py-2.5 font-mono text-xs text-zinc-400">{b.batchNumber}</td>
              <td className="px-4 py-2.5 stat-num text-sm">{b.quantity}</td>
              <td className="px-4 py-2.5 text-xs text-zinc-500">{b.location.name}</td>
              <td className="px-4 py-2.5 text-xs text-zinc-500">{formatDate(b.receivedDate)}</td>
              <td className="px-4 py-2.5 text-xs text-zinc-500">{formatDate(b.expiryDate)}</td>
              <td className="px-4 py-2.5 stat-num text-sm">{daysLeft}</td>
              <td className="px-4 py-2.5">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium tracking-wide border ${
                  alert === 'EXPIRED' ? 'badge-warning' : alert === 'CRITICAL' ? 'badge-outline border-amber-500/30 text-amber-400' : alert === 'WARNING' ? 'badge-outline border-yellow-500/30 text-yellow-400' : 'badge-in'
                }`}>{alert}</span>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function MonthlyReceivedTable({ data }: { data: any }) {
  const rows = data.data ?? []
  return (
    <table className="w-full text-sm">
      <thead><tr className="border-b border-zinc-800">
        {['Month', 'SKU', 'Product', 'Category', 'Total Qty', 'Locations'].map(h => (
          <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
        ))}
      </tr></thead>
      <tbody className="divide-y divide-zinc-800/50">
        {rows.map((r: any, i: number) => (
          <tr key={i} className="hover:bg-white/[0.02]">
            <td className="px-4 py-2.5 text-xs text-zinc-500">{r.month}</td>
            <td className="px-4 py-2.5 font-mono text-xs text-zinc-400">{r.sku}</td>
            <td className="px-4 py-2.5 text-sm text-zinc-300">{r.name}</td>
            <td className="px-4 py-2.5 text-xs text-zinc-500">{r.category}</td>
            <td className="px-4 py-2.5 stat-num text-sm">{r.totalQty}</td>
            <td className="px-4 py-2.5 text-xs text-zinc-500">{r.locations?.join(', ')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function MonthlySoldTable({ data }: { data: any }) {
  const rows = data.data ?? []
  return (
    <table className="w-full text-sm">
      <thead><tr className="border-b border-zinc-800">
        {['Month', 'SKU', 'Product', 'Category', 'Total Qty', 'Revenue'].map(h => (
          <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
        ))}
      </tr></thead>
      <tbody className="divide-y divide-zinc-800/50">
        {rows.map((r: any, i: number) => (
          <tr key={i} className="hover:bg-white/[0.02]">
            <td className="px-4 py-2.5 text-xs text-zinc-500">{r.month}</td>
            <td className="px-4 py-2.5 font-mono text-xs text-zinc-400">{r.sku}</td>
            <td className="px-4 py-2.5 text-sm text-zinc-300">{r.name}</td>
            <td className="px-4 py-2.5 text-xs text-zinc-500">{r.category}</td>
            <td className="px-4 py-2.5 stat-num text-sm">{r.totalQty}</td>
            <td className="px-4 py-2.5 stat-num text-sm text-emerald-400">ETB {Number(r.totalRevenue).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function GrossProfitTable({ data }: { data: any }) {
  const products = data.products ?? []
  return <ValuationTable data={data} />
}

function ProductPerformanceTable({ data }: { data: any }) {
  const rows = data.data ?? []
  return (
    <table className="w-full text-sm">
      <thead><tr className="border-b border-zinc-800">
        {['SKU', 'Product', 'Category', 'Qty Sold', 'Txns', 'Revenue', 'Cost', 'Profit', 'Margin'].map(h => (
          <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
        ))}
      </tr></thead>
      <tbody className="divide-y divide-zinc-800/50">
        {rows.map((r: any, i: number) => (
          <tr key={i} className="hover:bg-white/[0.02]">
            <td className="px-4 py-2.5 font-mono text-xs text-zinc-400">{r.sku}</td>
            <td className="px-4 py-2.5 text-sm text-zinc-300">{r.name}</td>
            <td className="px-4 py-2.5 text-xs text-zinc-500">{r.category}</td>
            <td className="px-4 py-2.5 stat-num text-sm">{r.totalQty}</td>
            <td className="px-4 py-2.5 stat-num text-sm">{r.transactions}</td>
            <td className="px-4 py-2.5 stat-num text-sm text-emerald-400">{Number(r.totalRevenue).toLocaleString()}</td>
            <td className="px-4 py-2.5 stat-num text-sm">{Number(r.totalCost).toLocaleString()}</td>
            <td className="px-4 py-2.5 stat-num text-sm">{(r.totalRevenue - r.totalCost).toFixed(2)}</td>
            <td className="px-4 py-2.5 stat-num text-sm">{r.margin}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function FastSlowMovingTable({ data }: { data: any }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-3">Fast Moving (≤30 days)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-zinc-800">
              {['SKU', 'Product', 'Stock', 'Sold', 'Days', 'Velocity'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-zinc-800/50">
              {(data.fastMoving ?? []).map((r: any) => (
                <tr key={r.sku} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5 font-mono text-xs text-zinc-400">{r.sku}</td>
                  <td className="px-4 py-2.5 text-sm text-zinc-300">{r.name}</td>
                  <td className="px-4 py-2.5 stat-num text-sm">{r.currentStock}</td>
                  <td className="px-4 py-2.5 stat-num text-sm">{r.totalSold}</td>
                  <td className="px-4 py-2.5 stat-num text-sm">{r.daysSinceLastSale}</td>
                  <td className="px-4 py-2.5 stat-num text-sm text-emerald-400">{r.velocity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-3">Slow Moving (&gt;60 days)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-zinc-800">
              {['SKU', 'Product', 'Stock', 'Sold', 'Days', 'Velocity'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-zinc-800/50">
              {(data.slowMoving ?? []).map((r: any) => (
                <tr key={r.sku} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5 font-mono text-xs text-zinc-400">{r.sku}</td>
                  <td className="px-4 py-2.5 text-sm text-zinc-300">{r.name}</td>
                  <td className="px-4 py-2.5 stat-num text-sm">{r.currentStock}</td>
                  <td className="px-4 py-2.5 stat-num text-sm">{r.totalSold}</td>
                  <td className="px-4 py-2.5 stat-num text-sm">{r.daysSinceLastSale}</td>
                  <td className="px-4 py-2.5 stat-num text-sm text-amber-400">{r.velocity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function AdjustmentHistoryTable({ data }: { data: any }) {
  const movements = data.movements ?? []
  return (
    <table className="w-full text-sm">
      <thead><tr className="border-b border-zinc-800">
        {['Date/Time', 'SKU', 'Product', 'Qty', 'Location', 'Performed By', 'Notes'].map(h => (
          <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
        ))}
      </tr></thead>
      <tbody className="divide-y divide-zinc-800/50">
        {movements.map((m: any) => (
          <tr key={m.id} className="hover:bg-white/[0.02]">
            <td className="px-4 py-2.5 text-xs text-zinc-500">{formatDate(m.timestamp)}</td>
            <td className="px-4 py-2.5 font-mono text-xs text-zinc-400">{m.product.sku}</td>
            <td className="px-4 py-2.5 text-sm text-zinc-300">{m.product.name}</td>
            <td className="px-4 py-2.5 stat-num text-sm">{m.quantity}</td>
            <td className="px-4 py-2.5 text-xs text-zinc-500">{m.location ? `${m.location.code} – ${m.location.name}` : '—'}</td>
            <td className="px-4 py-2.5 text-xs text-zinc-500">{m.user?.name ?? m.user?.email}</td>
            <td className="px-4 py-2.5 text-xs text-zinc-500 truncate max-w-xs">{m.notes ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
