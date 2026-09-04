'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, Download, Loader2 } from 'lucide-react'
import Link from 'next/link'
import Breadcrumb from '@/components/Breadcrumb'

type Tab = 'daily-sales' | 'weekly-sales' | 'monthly-sales' | 'product-sales-analysis' | 'customer-sales-analysis' | 'gross-profit-analysis' | 'sales-trend' | 'top-selling-products' | 'salesperson-performance'

const TABS: { key: Tab; label: string }[] = [
  { key: 'daily-sales', label: 'Daily Sales' },
  { key: 'weekly-sales', label: 'Weekly Sales' },
  { key: 'monthly-sales', label: 'Monthly Sales' },
  { key: 'product-sales-analysis', label: 'Product Sales Analysis' },
  { key: 'customer-sales-analysis', label: 'Customer Sales Analysis' },
  { key: 'gross-profit-analysis', label: 'Gross Profit Analysis' },
  { key: 'sales-trend', label: 'Sales Trend' },
  { key: 'top-selling-products', label: 'Top Selling Products' },
  { key: 'salesperson-performance', label: 'Salesperson Performance' },
]

export default function SalesReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('daily-sales')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0] })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])

  const needsDateRange = ['daily-sales', 'weekly-sales', 'monthly-sales', 'product-sales-analysis', 'customer-sales-analysis', 'gross-profit-analysis', 'sales-trend', 'top-selling-products', 'salesperson-performance'].includes(activeTab)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ type: activeTab, from: dateFrom, to: dateTo })
    fetch(`/api/reports/data?${params}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [activeTab, dateFrom, dateTo])

  const downloadExcel = () => {
    const params = new URLSearchParams({ type: 'sales-reports', format: 'excel', from: dateFrom, to: dateTo })
    window.open(`/api/reports?${params}`, '_blank')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Breadcrumb />
      <div className="flex items-center gap-4">
        <Link href="/reports" className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Sales Reports</h1>
          <p className="text-sm text-zinc-500 font-mono mt-0.5">
            Daily, weekly, and monthly sales; product and customer sales analysis; sales trend; top selling products; and salesperson performance.
          </p>
        </div>
      </div>

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

      <div className="flex flex-wrap gap-2">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 text-xs font-mono rounded border transition-colors ${
              activeTab === tab.key
                ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                : 'bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{TABS.find(t => t.key === activeTab)?.label}</h2>
        <button onClick={downloadExcel} className="btn-primary flex items-center gap-2">
          <Download className="w-4 h-4" /> Download Excel
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <SalesTable tab={activeTab} data={data} />
          </div>
        )}
      </div>
    </div>
  )
}

function SalesTable({ tab, data }: { tab: Tab; data: any }) {
  if (!data) return <div className="p-10 text-center text-xs font-mono text-zinc-600">No data available.</div>

  switch (tab) {
    case 'daily-sales':
    case 'weekly-sales':
    case 'monthly-sales': {
      const rows = data.data ?? []
      const columns = tab === 'daily-sales' ? ['Period', 'Transactions', 'Items Sold', 'Revenue', 'Gross Profit'] : tab === 'weekly-sales' ? ['Period', 'Transactions', 'Items Sold', 'Revenue', 'Gross Profit'] : ['Period', 'Transactions', 'Items Sold', 'Revenue', 'Gross Profit']
      return (
        <table className="w-full text-sm">
          <thead><tr className="border-b border-zinc-200 dark:border-zinc-800">
            {columns.map(h => <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-zinc-200/50 dark:divide-zinc-800/50">
            {rows.map((r: any) => (
              <tr key={r.period} className="hover:bg-zinc-100 dark:hover:bg-white/[0.02]">
                <td className="px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300">{r.period}</td>
                <td className="px-4 py-2.5 stat-num text-sm">{r.transactions}</td>
                <td className="px-4 py-2.5 stat-num text-sm">{r.items}</td>
                <td className="px-4 py-2.5 stat-num text-sm text-emerald-400">ETB {Number(r.revenue).toLocaleString()}</td>
                <td className="px-4 py-2.5 stat-num text-sm text-blue-400">ETB {Number(r.profit).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )
    }
    case 'product-sales-analysis':
      return <ProductSalesTable data={data} />
    case 'customer-sales-analysis':
      return <CustomerSalesTable data={data} />
    case 'gross-profit-analysis':
      return <GrossProfitTable data={data} />
    case 'sales-trend':
      return <SalesTrendTable data={data} />
    case 'top-selling-products':
      return <TopProductsTable data={data} />
    case 'salesperson-performance':
      return <SalespersonTable data={data} />
    default:
      return null
  }
}

function ProductSalesTable({ data }: { data: any }) {
  const rows = data.data ?? []
  return (
    <table className="w-full text-sm">
      <thead><tr className="border-b border-zinc-200 dark:border-zinc-800">
        {['SKU', 'Product', 'Category', 'Qty Sold', 'Txns', 'Revenue', 'Cost', 'Profit', 'Margin'].map(h => (
          <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
        ))}
      </tr></thead>
      <tbody className="divide-y divide-zinc-200/50 dark:divide-zinc-800/50">
        {rows.map((r: any) => (
          <tr key={r.sku} className="hover:bg-zinc-100 dark:hover:bg-white/[0.02]">
            <td className="px-4 py-2.5 font-mono text-xs text-zinc-400">{r.sku}</td>
            <td className="px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300">{r.name}</td>
            <td className="px-4 py-2.5 text-xs text-zinc-500">{r.category}</td>
            <td className="px-4 py-2.5 stat-num text-sm">{r.totalQty}</td>
            <td className="px-4 py-2.5 stat-num text-sm">{r.transactions}</td>
            <td className="px-4 py-2.5 stat-num text-sm text-emerald-400">{Number(r.totalRevenue).toLocaleString()}</td>
            <td className="px-4 py-2.5 stat-num text-sm">{Number(r.totalCost).toLocaleString()}</td>
            <td className="px-4 py-2.5 stat-num text-sm text-blue-400">{(r.totalRevenue - r.totalCost).toFixed(2)}</td>
            <td className="px-4 py-2.5 stat-num text-sm">{r.margin}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function CustomerSalesTable({ data }: { data: any }) {
  const rows = data.data ?? []
  return (
    <table className="w-full text-sm">
      <thead><tr className="border-b border-zinc-200 dark:border-zinc-800">
        {['Customer', 'Email', 'Phone', 'Txns', 'Total Sales', 'Total Paid', 'Avg Order', 'Gross Profit'].map(h => (
          <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
        ))}
      </tr></thead>
      <tbody className="divide-y divide-zinc-200/50 dark:divide-zinc-800/50">
        {rows.map((r: any) => (
          <tr key={r.customerName} className="hover:bg-zinc-100 dark:hover:bg-white/[0.02]">
            <td className="px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300">{r.customerName}</td>
            <td className="px-4 py-2.5 text-xs text-zinc-500">{r.email}</td>
            <td className="px-4 py-2.5 text-xs text-zinc-500">{r.phone}</td>
            <td className="px-4 py-2.5 stat-num text-sm">{r.transactions}</td>
            <td className="px-4 py-2.5 stat-num text-sm text-emerald-400">ETB {Number(r.totalSales).toLocaleString()}</td>
            <td className="px-4 py-2.5 stat-num text-sm text-blue-400">ETB {Number(r.totalPaid).toLocaleString()}</td>
            <td className="px-4 py-2.5 stat-num text-sm">{Number(r.avgOrderValue).toLocaleString()}</td>
            <td className="px-4 py-2.5 stat-num text-sm">{(r.totalProfit).toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function GrossProfitTable({ data }: { data: any }) {
  return <ProductSalesTable data={data} />
}

function SalesTrendTable({ data }: { data: any }) {
  const rows = data.data ?? []
  return (
    <table className="w-full text-sm">
      <thead><tr className="border-b border-zinc-200 dark:border-zinc-800">
        {['Date', 'Transactions', 'Revenue', 'Gross Profit'].map(h => (
          <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
        ))}
      </tr></thead>
      <tbody className="divide-y divide-zinc-200/50 dark:divide-zinc-800/50">
        {rows.map((r: any) => (
          <tr key={r.date} className="hover:bg-zinc-100 dark:hover:bg-white/[0.02]">
            <td className="px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300">{r.date}</td>
            <td className="px-4 py-2.5 stat-num text-sm">{r.transactions}</td>
            <td className="px-4 py-2.5 stat-num text-sm text-emerald-400">ETB {Number(r.revenue).toLocaleString()}</td>
            <td className="px-4 py-2.5 stat-num text-sm text-blue-400">ETB {Number(r.profit).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function TopProductsTable({ data }: { data: any }) {
  const rows = data.data ?? []
  return (
    <table className="w-full text-sm">
      <thead><tr className="border-b border-zinc-200 dark:border-zinc-800">
        {['SKU', 'Product', 'Category', 'Qty Sold', 'Revenue'].map(h => (
          <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
        ))}
      </tr></thead>
      <tbody className="divide-y divide-zinc-200/50 dark:divide-zinc-800/50">
        {rows.map((r: any) => (
          <tr key={r.sku} className="hover:bg-zinc-100 dark:hover:bg-white/[0.02]">
            <td className="px-4 py-2.5 font-mono text-xs text-zinc-400">{r.sku}</td>
            <td className="px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300">{r.name}</td>
            <td className="px-4 py-2.5 text-xs text-zinc-500">{r.category}</td>
            <td className="px-4 py-2.5 stat-num text-sm">{r.totalQty}</td>
            <td className="px-4 py-2.5 stat-num text-sm text-emerald-400">ETB {Number(r.totalRevenue).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function SalespersonTable({ data }: { data: any }) {
  const rows = data.data ?? []
  return (
    <table className="w-full text-sm">
      <thead><tr className="border-b border-zinc-200 dark:border-zinc-800">
        {['Salesperson', 'Email', 'Transactions', 'Total Sales', 'Avg Sale', 'Gross Profit', 'Commission'].map(h => (
          <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
        ))}
      </tr></thead>
      <tbody className="divide-y divide-zinc-200/50 dark:divide-zinc-800/50">
        {rows.map((r: any) => (
          <tr key={r.name} className="hover:bg-zinc-100 dark:hover:bg-white/[0.02]">
            <td className="px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300">{r.name}</td>
            <td className="px-4 py-2.5 text-xs text-zinc-500">{r.email}</td>
            <td className="px-4 py-2.5 stat-num text-sm">{r.transactions}</td>
            <td className="px-4 py-2.5 stat-num text-sm text-emerald-400">ETB {Number(r.totalSales).toLocaleString()}</td>
            <td className="px-4 py-2.5 stat-num text-sm">{Number(r.avgSaleValue).toLocaleString()}</td>
            <td className="px-4 py-2.5 stat-num text-sm text-blue-400">ETB {Number(r.totalProfit).toLocaleString()}</td>
            <td className="px-4 py-2.5 stat-num text-sm text-amber-400">ETB {Number(r.totalCommission).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
