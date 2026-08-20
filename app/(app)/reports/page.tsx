'use client'

import { useState } from 'react'
import { FileSpreadsheet, FileText, Download, Loader2, ExternalLink, Building2, ShoppingCart, BadgeDollarSign, TrendingUp, TrendingDown, Banknote, Package, BarChart3, History, Activity, Receipt, Users, AlertTriangle, Target, DollarSign, Calendar, ShoppingBag, UserCheck } from 'lucide-react'
import Breadcrumb from '@/components/Breadcrumb'

const REPORTS = [
  {
    id: 'current-stock',
    title: 'Current Stock Report',
    desc: 'All products, stock levels, expiry dates, and low-stock alerts across all locations.',
    icon: Package,
    accent: 'emerald',
    format: 'excel',
    type: 'inventory',
    tabs: ['Inventory', 'Movements', 'Expiry Tracker', 'Low Stock Alerts'],
  },
  {
    id: 'stock-valuation',
    title: 'Stock Valuation Report',
    desc: 'Cost price, selling price, profit per unit, margin %, inventory cost, and retail value per product.',
    icon: BadgeDollarSign,
    accent: 'rose',
    format: 'excel',
    type: 'valuation',
    tabs: ['Inventory Valuation'],
  },
  {
    id: 'expiry-report',
    title: 'Expiry Report',
    desc: 'Batch expiry tracking with days remaining, alerts, and location details.',
    icon: AlertTriangle,
    accent: 'amber',
    format: 'excel',
    type: 'inventory',
    tabs: ['Expiry Tracker'],
  },
  {
    id: 'dead-stock',
    title: 'Dead Stock Report',
    desc: 'Products with no stock movement in 90+ days, showing stagnant inventory and estimated value.',
    icon: Package,
    accent: 'red',
    format: 'excel',
    type: 'dead-stock',
    tabs: ['Dead Stock'],
  },
  {
    id: 'inventory-movement',
    title: 'Inventory Movement Report',
    desc: 'All stock movements including IN, OUT, ADJUSTMENT, and TRANSFER with user and location details.',
    icon: Activity,
    accent: 'blue',
    format: 'excel',
    type: 'inventory',
    tabs: ['Movements'],
  },
  {
    id: 'batch-lot',
    title: 'Batch/Lot Report',
    desc: 'Active batch details with quantities, expiry dates, locations, and remaining shelf life.',
    icon: FileSpreadsheet,
    accent: 'purple',
    format: 'excel',
    type: 'inventory',
    tabs: ['Batches'],
  },
  {
    id: 'monthly-received',
    title: 'Monthly Received Quantity Report',
    desc: 'IN movements grouped by month and product, showing total quantities received per location.',
    icon: TrendingDown,
    accent: 'emerald',
    format: 'excel',
    type: 'monthly-received',
    tabs: ['Monthly Received'],
    dateRange: true,
  },
  {
    id: 'monthly-sold',
    title: 'Monthly Sold Quantity Report',
    desc: 'Sales grouped by month and product, showing quantities sold and revenue per item.',
    icon: TrendingUp,
    accent: 'blue',
    format: 'excel',
    type: 'monthly-sold',
    tabs: ['Monthly Sold'],
    dateRange: true,
  },
  {
    id: 'gross-profit',
    title: 'Gross Profit Report',
    desc: 'Product-level and total gross profit analysis with cost, revenue, and margin calculations.',
    icon: BadgeDollarSign,
    accent: 'rose',
    format: 'excel',
    type: 'valuation',
    tabs: ['Gross Profit'],
  },
  {
    id: 'product-performance',
    title: 'Product Performance Report',
    desc: 'Product sales performance with quantities, transactions, revenue, cost, profit, and margin %.',
    icon: BarChart3,
    accent: 'purple',
    format: 'excel',
    type: 'product-sales-analysis',
    tabs: ['Product Sales Analysis'],
    dateRange: true,
  },
  {
    id: 'fast-slow-moving',
    title: 'Fast/Slow Moving Item Report',
    desc: 'Two-sheet report: fast-moving products (≤30 days) and slow-moving products (>60 days) with velocity metrics.',
    icon: Activity,
    accent: 'amber',
    format: 'excel',
    type: 'fast-slow-moving',
    tabs: ['Fast Moving', 'Slow Moving'],
  },
  {
    id: 'adjustment-history',
    title: 'Adjustment History Report',
    desc: 'All stock adjustments with date, product, quantity, location, performed by, and notes.',
    icon: History,
    accent: 'red',
    format: 'excel',
    type: 'adjustment-history',
    tabs: ['Adjustment History'],
  },
  {
    id: 'outstanding-receivable',
    title: 'Outstanding Receivable Report',
    desc: 'All open and partial AR statements with customer details, invoice numbers, due dates, and balances.',
    icon: Receipt,
    accent: 'amber',
    format: 'excel',
    type: 'outstanding-receivable',
    tabs: ['Outstanding Receivables'],
  },
  {
    id: 'aging-analysis',
    title: 'Aging Analysis Report',
    desc: 'Customer receivables aged into buckets: Current, 31-60, 61-90, and 90+ days with totals.',
    icon: BarChart3,
    accent: 'blue',
    format: 'excel',
    type: 'aging-analysis',
    tabs: ['Aging Analysis'],
  },
  {
    id: 'customer-credit-summary',
    title: 'Customer Credit Summary',
    desc: 'All credit profiles with limits, utilized/available credit, utilization %, risk level, and terms.',
    icon: Users,
    accent: 'purple',
    format: 'excel',
    type: 'customer-credit-summary',
    tabs: ['Customer Credit Summary'],
  },
  {
    id: 'overdue-customers',
    title: 'Overdue Customer Report',
    desc: 'Customers with overdue balances broken down by 31-60, 61-90, and 90+ day buckets.',
    icon: AlertTriangle,
    accent: 'red',
    format: 'excel',
    type: 'overdue-customers',
    tabs: ['Overdue Customers'],
  },
  {
    id: 'collection-performance',
    title: 'Collection Performance Report',
    desc: 'Collection cases with amounts, priorities, status, assigned officers, and resolution metrics.',
    icon: Target,
    accent: 'amber',
    format: 'excel',
    type: 'collection-performance',
    tabs: ['Collection Performance', 'Summary'],
  },
  {
    id: 'credit-exposure',
    title: 'Credit Exposure Report',
    desc: 'Total credit exposure per customer with open invoices, limits, utilized/available credit, and risk.',
    icon: DollarSign,
    accent: 'rose',
    format: 'excel',
    type: 'credit-exposure',
    tabs: ['Credit Exposure'],
  },
  {
    id: 'payment-history',
    title: 'Payment History Report',
    desc: 'All sale payments with method, amount, reference, receipt number, and customer details.',
    icon: Receipt,
    accent: 'emerald',
    format: 'excel',
    type: 'payment-history',
    tabs: ['Payment History'],
  },
  {
    id: 'daily-collection',
    title: 'Daily Collection Report',
    desc: 'Daily cash and bank collections grouped by date with transaction counts and totals.',
    icon: Calendar,
    accent: 'blue',
    format: 'excel',
    type: 'daily-collection',
    tabs: ['Daily Collection'],
    dateRange: true,
  },
  {
    id: 'sales-daily',
    title: 'Daily Sales Report',
    desc: 'Sales grouped by day with transactions, items sold, total revenue, and gross profit.',
    icon: TrendingUp,
    accent: 'emerald',
    format: 'excel',
    type: 'sales-period',
    tabs: ['Daily Sales'],
    dateRange: true,
    period: 'day',
  },
  {
    id: 'sales-weekly',
    title: 'Weekly Sales Report',
    desc: 'Sales grouped by week with transactions, items sold, total revenue, and gross profit.',
    icon: TrendingUp,
    accent: 'blue',
    format: 'excel',
    type: 'sales-period',
    tabs: ['Weekly Sales'],
    dateRange: true,
    period: 'week',
  },
  {
    id: 'sales-monthly',
    title: 'Monthly Sales Report',
    desc: 'Sales grouped by month with transactions, items sold, total revenue, and gross profit.',
    icon: TrendingUp,
    accent: 'amber',
    format: 'excel',
    type: 'sales-period',
    tabs: ['Monthly Sales'],
    dateRange: true,
    period: 'month',
  },
  {
    id: 'product-sales-analysis',
    title: 'Product Sales Analysis',
    desc: 'Per-product breakdown of quantities sold, transactions, revenue, cost, profit, and margin %.',
    icon: ShoppingBag,
    accent: 'purple',
    format: 'excel',
    type: 'product-sales-analysis',
    tabs: ['Product Sales Analysis'],
    dateRange: true,
  },
  {
    id: 'customer-sales-analysis',
    title: 'Customer Sales Analysis',
    desc: 'Per-customer sales performance with transactions, total sales, payments, average order, and profit.',
    icon: Users,
    accent: 'blue',
    format: 'excel',
    type: 'customer-sales-analysis',
    tabs: ['Customer Sales Analysis'],
    dateRange: true,
  },
  {
    id: 'sales-trend',
    title: 'Sales Trend Report',
    desc: 'Daily sales trend with revenue, gross profit, and transaction counts over the selected period.',
    icon: TrendingUp,
    accent: 'emerald',
    format: 'excel',
    type: 'sales-trend',
    tabs: ['Sales Trend'],
    dateRange: true,
  },
  {
    id: 'top-selling-products',
    title: 'Top Selling Products',
    desc: 'Products ranked by revenue with quantities sold and category breakdown.',
    icon: BarChart3,
    accent: 'amber',
    format: 'excel',
    type: 'top-selling-products',
    tabs: ['Top Selling Products'],
    dateRange: true,
  },
  {
    id: 'salesperson-performance',
    title: 'Salesperson Performance Report',
    desc: 'Per-salesperson metrics: transactions, total sales, average sale value, gross profit, and commission.',
    icon: UserCheck,
    accent: 'purple',
    format: 'excel',
    type: 'salesperson-performance',
    tabs: ['Salesperson Performance'],
    dateRange: true,
  },
  {
    id: 'dispensing-pdf',
    title: 'Dispensing Summary (PDF)',
    desc: 'All OUT movements for a date range — formatted for printing and regulatory submission.',
    icon: FileText,
    accent: 'blue',
    format: 'pdf',
    type: 'dispensing',
    tabs: null,
    dateRange: true,
  },
  {
    id: 'cash-flow-daily',
    title: 'Daily Cash Flow Report',
    desc: 'Cash inflows and outflows for a selected date. Net cash position for the day.',
    icon: TrendingUp,
    accent: 'emerald',
    format: 'pdf',
    type: 'cash-flow-daily',
    tabs: ['Daily Summary'],
    dateRange: true,
  },
  {
    id: 'cash-flow-weekly',
    title: 'Weekly Cash Flow Report',
    desc: 'Cash inflows and outflows for a selected week. Weekly net cash position.',
    icon: TrendingUp,
    accent: 'blue',
    format: 'pdf',
    type: 'cash-flow-weekly',
    tabs: ['Weekly Summary'],
    dateRange: true,
  },
  {
    id: 'cash-flow-monthly',
    title: 'Monthly Cash Flow Report',
    desc: 'Cash inflows and outflows for a selected month. Monthly summary with net position.',
    icon: TrendingUp,
    accent: 'amber',
    format: 'pdf',
    type: 'cash-flow-monthly',
    tabs: ['Monthly Summary'],
    dateRange: true,
  },
  {
    id: 'expense-analysis',
    title: 'Expense Analysis Report',
    desc: 'Cash outflows broken down by category with percentage breakdown of total spend.',
    icon: TrendingDown,
    accent: 'red',
    format: 'pdf',
    type: 'expense-analysis',
    tabs: ['By Category'],
    dateRange: true,
  },
  {
    id: 'bank-balance',
    title: 'Bank Balance Report',
    desc: 'Current balances for all active bank accounts with latest inflows and outflows.',
    icon: Banknote,
    accent: 'blue',
    format: 'pdf',
    type: 'bank-balance',
    tabs: ['Account Balances'],
  },
]

const ACCENT_MAP: Record<string, string> = {
  emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  blue:    'bg-blue-500/10 border-blue-500/20 text-blue-400',
  purple:  'bg-purple-500/10 border-purple-500/20 text-purple-400',
  amber:   'bg-amber-500/10 border-amber-500/20 text-amber-400',
  rose:    'bg-rose-500/10 border-rose-500/20 text-rose-400',
  red:     'bg-red-500/10 border-red-500/20 text-red-400',
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
      if (report.period) params.set('period', report.period)
      const res = await fetch(`/api/reports?${params}`)
      if (!res.ok) { alert('Export failed. Please try again.'); return }

      if (report.format === 'pdf') {
        const html = await res.text()
        const win  = window.open('', '_blank')
        win?.document.write(html)
        win?.document.close()
        win?.focus()
      } else {
        const blob = await res.blob()
        const url  = URL.createObjectURL(blob)
        const a    = document.createElement('a')
        a.href     = url
        a.download = `wayu-${report.type}-${dateFrom}.xlsx`
        a.click()
        URL.revokeObjectURL(url)
      }
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

      {/* Date range filter */}
      <div className="glass-card p-5">
        <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-3">
          Date Range <span className="text-zinc-700 normal-case tracking-normal">(used for time-based reports)</span>
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

      {/* Report cards — 2 columns on md+, 3 on xl */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
                ) : report.format === 'pdf' ? (
                  <><ExternalLink className="w-4 h-4" />Open PDF Preview</>
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
