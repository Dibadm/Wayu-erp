'use client'

import { useState } from 'react'
import { FileSpreadsheet, FileText, Download, Loader2, ExternalLink, Building2, ShoppingCart, BadgeDollarSign, TrendingUp, TrendingDown, Banknote } from 'lucide-react'
import Breadcrumb from '@/components/Breadcrumb'

const REPORTS = [
  {
    id: 'inventory-excel',
    title: 'Full Inventory Report',
    desc: 'All products, stock levels, expiry dates, and low-stock alerts across all locations.',
    icon: FileSpreadsheet,
    accent: 'emerald',
    format: 'excel',
    type: 'inventory',
    tabs: ['Inventory', 'Movements', 'Expiry Tracker', 'Low Stock Alerts'],
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
    id: 'suppliers-excel',
    title: 'Supplier Report',
    desc: 'All suppliers with contact details, status, total orders, and purchase value.',
    icon: Building2,
    accent: 'purple',
    format: 'excel',
    type: 'suppliers',
    tabs: ['Suppliers'],
  },
  {
    id: 'purchase-orders-excel',
    title: 'Purchase Orders Report',
    desc: 'All purchase orders with line items, received quantities, costs, and batch details.',
    icon: ShoppingCart,
    accent: 'amber',
    format: 'excel',
    type: 'purchase-orders',
    tabs: ['Purchase Orders', 'PO Line Items'],
  },
  {
    id: 'valuation-excel',
    title: 'Inventory Valuation Report',
    desc: 'Cost price, selling price, profit per unit, margin %, inventory cost, and retail value per product.',
    icon: BadgeDollarSign,
    accent: 'rose',
    format: 'excel',
    type: 'valuation',
    tabs: ['Inventory Valuation'],
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

      {/* Date range filter — only relevant for dispensing PDF */}
      <div className="glass-card p-5">
        <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-3">
          Date Range <span className="text-zinc-700 normal-case tracking-normal">(used for Dispensing Summary PDF)</span>
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
