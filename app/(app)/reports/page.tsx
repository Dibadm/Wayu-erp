'use client'

import { useState } from 'react'
import { FileSpreadsheet, Download, Loader2, Package, Receipt, TrendingUp, ShoppingBag } from 'lucide-react'
import Breadcrumb from '@/components/Breadcrumb'

const REPORTS = [
  {
    id: 'inventory-reports',
    title: 'Inventory Reports',
    desc: 'Current stock, valuation, expiry, dead stock, movements, batches, monthly received/sold, gross profit, product performance, fast/slow moving, and adjustment history.',
    icon: Package,
    accent: 'emerald',
    format: 'excel',
    type: 'inventory-reports',
    tabs: ['Current Stock', 'Stock Valuation', 'Expiry Tracker', 'Dead Stock', 'Movements', 'Batches', 'Monthly Received', 'Monthly Sold', 'Gross Profit', 'Product Performance', 'Fast/Slow Moving', 'Adjustment History'],
  },
  {
    id: 'credit-reports',
    title: 'Credit Reports',
    desc: 'Outstanding receivables, aging analysis, customer credit summary, overdue customers, collection performance, credit exposure, payment history, and daily collection.',
    icon: Receipt,
    accent: 'amber',
    format: 'excel',
    type: 'credit-reports',
    tabs: ['Outstanding Receivables', 'Aging Analysis', 'Customer Credit Summary', 'Overdue Customers', 'Collection Performance', 'Payment History'],
  },
  {
    id: 'cashflow-reports',
    title: 'Cash Flow Reports',
    desc: 'Daily, weekly, and monthly cash flow statements; bank balances; expense analysis; budget vs actual; expense category summary; cash position; loan repayment; and investment reports.',
    icon: TrendingUp,
    accent: 'blue',
    format: 'excel',
    type: 'cashflow-reports',
    tabs: ['Daily Cash Flow', 'Weekly Cash Flow', 'Monthly Cash Flow', 'Bank Balance', 'Expense Analysis', 'Budget vs Actual', 'Expense Category', 'Cash Position', 'Loan Repayment', 'Investment'],
    dateRange: true,
  },
  {
    id: 'sales-reports',
    title: 'Sales Reports',
    desc: 'Daily, weekly, and monthly sales; product and customer sales analysis; sales trend; top selling products; and salesperson performance.',
    icon: ShoppingBag,
    accent: 'purple',
    format: 'excel',
    type: 'sales-reports',
    tabs: ['Daily Sales', 'Weekly Sales', 'Monthly Sales', 'Product Sales Analysis', 'Customer Sales Analysis', 'Sales Trend', 'Top Selling Products', 'Salesperson Performance'],
    dateRange: true,
  },
]

const ACCENT_MAP: Record<string, string> = {
  emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  blue:    'bg-blue-500/10 border-blue-500/20 text-blue-400',
  purple:  'bg-purple-500/10 border-purple-500/20 text-purple-400',
  amber:   'bg-amber-500/10 border-amber-500/20 text-amber-400',
  rose:    'bg-rose-500/10 border-rose-500/20 text-rose-400',
}

export default function ReportsPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])

  async function download(report: typeof REPORTS[0]) {
    setLoading(report.id)
    try {
      const params = new URLSearchParams({
        type:   report.type,
        format: report.format,
        from:   new Date(dateFrom).toISOString(),
        to:     new Date(dateTo).toISOString(),
      })
      const res = await fetch(`/api/reports?${params}`)
      if (!res.ok) { alert('Export failed. Please try again.'); return }

      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `wayu-${report.type}-${dateFrom}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Breadcrumb />
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Reports & Export</h1>
        <p className="text-sm text-zinc-500 font-mono mt-0.5">
          Generate Excel and PDF reports for management, regulatory submission, and accounting
        </p>
      </div>

      {/* Date range filter — used by Cash Flow and Sales reports */}
      <div className="glass-card p-5">
        <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-3">
          Date Range <span className="text-zinc-700 normal-case tracking-normal">(used for Cash Flow and Sales reports)</span>
        </p>
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

      {/* 4 report bundle cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {REPORTS.map(report => {
          const Icon      = report.icon
          const accentCls = ACCENT_MAP[report.accent] ?? ACCENT_MAP.blue
          const isLoading = loading === report.id

          return (
            <div key={report.id} className="glass-card p-6 flex flex-col gap-4 hover:border-white/10 transition-colors">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border flex-shrink-0 ${accentCls}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-zinc-100">{report.title}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{report.desc}</p>
                </div>
              </div>

              {/* Sheet tabs */}
              {report.tabs && (
                <div className="flex flex-wrap gap-1.5">
                  {report.tabs.map(tab => (
                    <span key={tab} className="px-2 py-0.5 text-[10px] font-mono bg-zinc-900 border border-zinc-800 rounded text-zinc-500">
                      {tab}
                    </span>
                  ))}
                </div>
              )}

              <button
                onClick={() => download(report)}
                disabled={!!loading}
                className="btn-primary flex items-center gap-2 w-fit mt-auto"
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Generating…</>
                ) : (
                  <><Download className="w-4 h-4" />Download Excel</>
                )}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
