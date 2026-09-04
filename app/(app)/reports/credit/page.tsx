'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, Download, Loader2 } from 'lucide-react'
import Link from 'next/link'
import Breadcrumb from '@/components/Breadcrumb'
import { formatDate } from '@/lib/utils'

type Tab = 'outstanding-receivable' | 'aging-analysis' | 'customer-credit-summary' | 'overdue-customers' | 'collection-performance' | 'credit-exposure' | 'payment-history' | 'daily-collection'

const TABS: { key: Tab; label: string }[] = [
  { key: 'outstanding-receivable', label: 'Outstanding Receivable' },
  { key: 'aging-analysis', label: 'Aging Analysis' },
  { key: 'customer-credit-summary', label: 'Customer Credit Summary' },
  { key: 'overdue-customers', label: 'Overdue Customers' },
  { key: 'collection-performance', label: 'Collection Performance' },
  { key: 'credit-exposure', label: 'Credit Exposure' },
  { key: 'payment-history', label: 'Payment History' },
  { key: 'daily-collection', label: 'Daily Collection' },
]

export default function CreditReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('outstanding-receivable')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0] })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])

  const needsDateRange = activeTab === 'daily-collection'

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ type: activeTab, from: dateFrom, to: dateTo })
    fetch(`/api/reports/data?${params}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [activeTab, dateFrom, dateTo])

  const downloadExcel = () => {
    const params = new URLSearchParams({ type: 'credit-reports', format: 'excel', from: dateFrom, to: dateTo })
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
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Credit Reports</h1>
          <p className="text-sm text-zinc-500 font-mono mt-0.5">
            Outstanding receivables, aging analysis, customer credit summary, overdue customers, collection performance, credit exposure, payment history, and daily collection.
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
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-100">{TABS.find(t => t.key === activeTab)?.label}</h2>
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
            <CreditTable tab={activeTab} data={data} />
          </div>
        )}
      </div>
    </div>
  )
}

function CreditTable({ tab, data }: { tab: Tab; data: any }) {
  if (!data) return <div className="p-10 text-center text-xs font-mono text-zinc-600">No data available.</div>

  switch (tab) {
    case 'outstanding-receivable':
      return <OutstandingTable data={data} />
    case 'aging-analysis':
      return <AgingTable data={data} />
    case 'customer-credit-summary':
      return <CreditSummaryTable data={data} />
    case 'overdue-customers':
      return <OverdueTable data={data} />
    case 'collection-performance':
      return <CollectionTable data={data} />
    case 'credit-exposure':
      return <ExposureTable data={data} />
    case 'payment-history':
      return <PaymentTable data={data} />
    case 'daily-collection':
      return <DailyCollectionTable data={data} />
    default:
      return null
  }
}

function OutstandingTable({ data }: { data: any }) {
  const statements = data.statements ?? []
  return (
    <table className="w-full text-sm">
      <thead><tr className="border-b border-zinc-800">
        {['Customer', 'Invoice', 'Receipt', 'Issued', 'Due Date', 'Amount', 'Paid', 'Balance', 'Status'].map(h => (
          <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
        ))}
      </tr></thead>
      <tbody className="divide-y divide-zinc-800/50">
        {statements.map((s: any) => {
          const balance = Number(s.amount) - Number(s.paid)
          return (
            <tr key={s.id} className="hover:bg-zinc-100 dark:hover:bg-white/[0.02]">
              <td className="px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300">{s.customer?.name ?? '—'}</td>
              <td className="px-4 py-2.5 font-mono text-xs text-zinc-400">{s.invoiceNo}</td>
              <td className="px-4 py-2.5 font-mono text-xs text-zinc-500">{s.sale?.receiptNumber ?? '—'}</td>
              <td className="px-4 py-2.5 text-xs text-zinc-500">{formatDate(s.issuedAt)}</td>
              <td className="px-4 py-2.5 text-xs text-zinc-500">{s.dueDate ? formatDate(new Date(s.dueDate)) : '—'}</td>
              <td className="px-4 py-2.5 stat-num text-sm text-amber-400">ETB {Number(s.amount).toLocaleString()}</td>
              <td className="px-4 py-2.5 stat-num text-sm text-emerald-400">ETB {Number(s.paid).toLocaleString()}</td>
              <td className="px-4 py-2.5 stat-num text-sm text-red-400">ETB {balance.toLocaleString()}</td>
              <td className="px-4 py-2.5">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium tracking-wide border ${
                  s.status === 'OVERDUE' ? 'badge-warning' : s.status === 'OPEN' ? 'badge-outline border-amber-500/30 text-amber-400' : 'badge-in'
                }`}>{s.status}</span>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function AgingTable({ data }: { data: any }) {
  const report = data.report ?? []
  const totals = data.totals ?? {}
  return (
    <table className="w-full text-sm">
      <thead><tr className="border-b border-zinc-800">
        {['Customer', 'Current', '31-60', '61-90', '90+', 'Total', 'Terms', 'Risk'].map(h => (
          <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
        ))}
      </tr></thead>
      <tbody className="divide-y divide-zinc-800/50">
        {report.map((r: any) => (
          <tr key={r.id} className="hover:bg-zinc-100 dark:hover:bg-white/[0.02]">
            <td className="px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300">{r.name}</td>
            <td className="px-4 py-2.5 stat-num text-sm text-emerald-400">{Number(r.current).toLocaleString()}</td>
            <td className="px-4 py-2.5 stat-num text-sm text-amber-400">{Number(r.bucket31to60).toLocaleString()}</td>
            <td className="px-4 py-2.5 stat-num text-sm text-orange-400">{Number(r.bucket61to90).toLocaleString()}</td>
            <td className="px-4 py-2.5 stat-num text-sm text-red-400">{Number(r.bucket90plus).toLocaleString()}</td>
            <td className="px-4 py-2.5 stat-num text-sm">{Number(r.total).toLocaleString()}</td>
            <td className="px-4 py-2.5 text-xs text-zinc-500">{r.terms} days</td>
            <td className="px-4 py-2.5">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium tracking-wide border ${
                r.riskLevel === 'CRITICAL' ? 'badge-warning' : r.riskLevel === 'HIGH' ? 'badge-outline border-amber-500/30 text-amber-400' : r.riskLevel === 'MEDIUM' ? 'badge-outline border-yellow-500/30 text-yellow-400' : 'badge-in'
              }`}>{r.riskLevel}</span>
            </td>
          </tr>
        ))}
        <tr className="border-t border-zinc-700 bg-zinc-900/50">
          <td className="px-4 py-2.5 text-sm font-semibold text-zinc-200">TOTALS</td>
          <td className="px-4 py-2.5 stat-num text-sm font-semibold text-emerald-400">{Number(totals.current ?? 0).toLocaleString()}</td>
          <td className="px-4 py-2.5 stat-num text-sm font-semibold text-amber-400">{Number(totals.bucket31to60 ?? 0).toLocaleString()}</td>
          <td className="px-4 py-2.5 stat-num text-sm font-semibold text-orange-400">{Number(totals.bucket61to90 ?? 0).toLocaleString()}</td>
          <td className="px-4 py-2.5 stat-num text-sm font-semibold text-red-400">{Number(totals.bucket90plus ?? 0).toLocaleString()}</td>
          <td className="px-4 py-2.5 stat-num text-sm font-semibold">{Number(totals.total ?? 0).toLocaleString()}</td>
          <td className="px-4 py-2.5 text-xs text-zinc-500">—</td>
          <td className="px-4 py-2.5">—</td>
        </tr>
      </tbody>
    </table>
  )
}

function CreditSummaryTable({ data }: { data: any }) {
  const profiles = data.profiles ?? []
  return (
    <table className="w-full text-sm">
      <thead><tr className="border-b border-zinc-800">
        {['Customer', 'Email', 'Phone', 'Limit', 'Utilized', 'Available', 'Util%', 'Risk', 'Terms', 'Status'].map(h => (
          <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
        ))}
      </tr></thead>
      <tbody className="divide-y divide-zinc-800/50">
        {profiles.map((p: any) => {
          const utilPct = Number(p.creditLimit) > 0 ? Math.round((Number(p.utilizedCredit) / Number(p.creditLimit)) * 100) : 0
          return (
            <tr key={p.id} className="hover:bg-zinc-100 dark:hover:bg-white/[0.02]">
              <td className="px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300">{p.customer.name}</td>
              <td className="px-4 py-2.5 text-xs text-zinc-500">{p.customer.email ?? '—'}</td>
              <td className="px-4 py-2.5 text-xs text-zinc-500">{p.customer.phone ?? '—'}</td>
              <td className="px-4 py-2.5 stat-num text-sm">{Number(p.creditLimit).toLocaleString()}</td>
              <td className="px-4 py-2.5 stat-num text-sm text-amber-400">{Number(p.utilizedCredit).toLocaleString()}</td>
              <td className="px-4 py-2.5 stat-num text-sm text-emerald-400">{Number(p.availableCredit).toLocaleString()}</td>
              <td className="px-4 py-2.5 stat-num text-sm">{utilPct}%</td>
              <td className="px-4 py-2.5">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium tracking-wide border ${
                  p.riskLevel === 'CRITICAL' ? 'badge-warning' : p.riskLevel === 'HIGH' ? 'badge-outline border-amber-500/30 text-amber-400' : p.riskLevel === 'MEDIUM' ? 'badge-outline border-yellow-500/30 text-yellow-400' : 'badge-in'
                }`}>{p.riskLevel}</span>
              </td>
              <td className="px-4 py-2.5 text-xs text-zinc-500">{p.paymentTerms} days</td>
              <td className="px-4 py-2.5 text-xs text-zinc-500">{p.isActive ? 'Active' : 'Blocked'}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function OverdueTable({ data }: { data: any }) {
  const overdue = data.overdue ?? []
  return (
    <table className="w-full text-sm">
      <thead><tr className="border-b border-zinc-800">
        {['Customer', '31-60 Days', '61-90 Days', '90+ Days', 'Total Overdue', 'Risk'].map(h => (
          <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
        ))}
      </tr></thead>
      <tbody className="divide-y divide-zinc-800/50">
        {overdue.map((r: any) => {
          const totalOverdue = Number(r.bucket31to60) + Number(r.bucket61to90) + Number(r.bucket90plus)
          return (
            <tr key={r.id} className="hover:bg-zinc-100 dark:hover:bg-white/[0.02]">
              <td className="px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300">{r.name}</td>
              <td className="px-4 py-2.5 stat-num text-sm text-amber-400">{Number(r.bucket31to60).toLocaleString()}</td>
              <td className="px-4 py-2.5 stat-num text-sm text-orange-400">{Number(r.bucket61to90).toLocaleString()}</td>
              <td className="px-4 py-2.5 stat-num text-sm text-red-400">{Number(r.bucket90plus).toLocaleString()}</td>
              <td className="px-4 py-2.5 stat-num text-sm">{totalOverdue.toLocaleString()}</td>
              <td className="px-4 py-2.5">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium tracking-wide border ${
                  r.riskLevel === 'CRITICAL' ? 'badge-warning' : r.riskLevel === 'HIGH' ? 'badge-outline border-amber-500/30 text-amber-400' : r.riskLevel === 'MEDIUM' ? 'badge-outline border-yellow-500/30 text-yellow-400' : 'badge-in'
                }`}>{r.riskLevel}</span>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function CollectionTable({ data }: { data: any }) {
  const cases = data.cases ?? []
  return (
    <table className="w-full text-sm">
      <thead><tr className="border-b border-zinc-800">
        {['Case No', 'Customer', 'Amount', 'Paid', 'Outstanding', 'Priority', 'Status', 'Assigned To', 'Opened', 'Resolved'].map(h => (
          <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
        ))}
      </tr></thead>
      <tbody className="divide-y divide-zinc-800/50">
        {cases.map((c: any) => {
          const outstanding = Number(c.arStatement?.amount ?? 0) - Number(c.arStatement?.paid ?? 0)
          return (
            <tr key={c.id} className="hover:bg-zinc-100 dark:hover:bg-white/[0.02]">
              <td className="px-4 py-2.5 font-mono text-xs text-zinc-400">{c.caseNo}</td>
              <td className="px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300">{c.customer?.name ?? '—'}</td>
              <td className="px-4 py-2.5 stat-num text-sm text-amber-400">ETB {Number(c.amount).toLocaleString()}</td>
              <td className="px-4 py-2.5 stat-num text-sm text-emerald-400">ETB {Number(c.arStatement?.paid ?? 0).toLocaleString()}</td>
              <td className="px-4 py-2.5 stat-num text-sm text-red-400">ETB {outstanding.toLocaleString()}</td>
              <td className="px-4 py-2.5 text-xs text-zinc-500">{c.priority}</td>
              <td className="px-4 py-2.5">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium tracking-wide border ${
                  c.status === 'RESOLVED' ? 'badge-in' : c.status === 'IN_PROGRESS' ? 'badge-outline border-blue-500/30 text-blue-400' : 'badge-warning'
                }`}>{c.status}</span>
              </td>
              <td className="px-4 py-2.5 text-xs text-zinc-500">{c.assignedTo ?? '—'}</td>
              <td className="px-4 py-2.5 text-xs text-zinc-500">{formatDate(c.createdAt)}</td>
              <td className="px-4 py-2.5 text-xs text-zinc-500">{c.resolvedAt ? formatDate(c.resolvedAt) : '—'}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function ExposureTable({ data }: { data: any }) {
  const rows = data.data ?? []
  return (
    <table className="w-full text-sm">
      <thead><tr className="border-b border-zinc-800">
        {['Customer', 'Email', 'Phone', 'Exposure', 'Invoices', 'Limit', 'Utilized', 'Available', 'Risk'].map(h => (
          <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
        ))}
      </tr></thead>
      <tbody className="divide-y divide-zinc-800/50">
        {rows.map((r: any) => (
          <tr key={r.customer?.id} className="hover:bg-zinc-100 dark:hover:bg-white/[0.02]">
            <td className="px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300">{r.customer?.name ?? '—'}</td>
            <td className="px-4 py-2.5 text-xs text-zinc-500">{r.customer?.email ?? '—'}</td>
            <td className="px-4 py-2.5 text-xs text-zinc-500">{r.customer?.phone ?? '—'}</td>
            <td className="px-4 py-2.5 stat-num text-sm text-red-400">ETB {r.totalExposure.toLocaleString()}</td>
            <td className="px-4 py-2.5 stat-num text-sm">{r.openInvoices}</td>
            <td className="px-4 py-2.5 stat-num text-sm">{Number(r.creditLimit).toLocaleString()}</td>
            <td className="px-4 py-2.5 stat-num text-sm text-amber-400">{Number(r.utilized).toLocaleString()}</td>
            <td className="px-4 py-2.5 stat-num text-sm text-emerald-400">{Number(r.available).toLocaleString()}</td>
            <td className="px-4 py-2.5">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium tracking-wide border ${
                r.riskLevel === 'CRITICAL' ? 'badge-warning' : r.riskLevel === 'HIGH' ? 'badge-outline border-amber-500/30 text-amber-400' : r.riskLevel === 'MEDIUM' ? 'badge-outline border-yellow-500/30 text-yellow-400' : 'badge-in'
              }`}>{r.riskLevel}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function PaymentTable({ data }: { data: any }) {
  const payments = data.payments ?? []
  return (
    <table className="w-full text-sm">
      <thead><tr className="border-b border-zinc-800">
        {['Date', 'Receipt', 'Customer', 'Method', 'Amount', 'Reference', 'Sale Total'].map(h => (
          <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
        ))}
      </tr></thead>
      <tbody className="divide-y divide-zinc-800/50">
        {payments.map((p: any) => (
          <tr key={p.id} className="hover:bg-zinc-100 dark:hover:bg-white/[0.02]">
            <td className="px-4 py-2.5 text-xs text-zinc-500">{formatDate(p.sale.createdAt)}</td>
            <td className="px-4 py-2.5 font-mono text-xs text-zinc-400">{p.sale.receiptNumber}</td>
            <td className="px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300">{p.sale.customer?.name ?? '—'}</td>
            <td className="px-4 py-2.5">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium tracking-wide border ${
                p.method === 'CREDIT' ? 'badge-outline border-blue-500/30 text-blue-400' : p.method === 'CASH' ? 'badge-in' : 'badge-outline border-amber-500/30 text-amber-400'
              }`}>{p.method}</span>
            </td>
            <td className="px-4 py-2.5 stat-num text-sm text-emerald-400">ETB {Number(p.amount).toLocaleString()}</td>
            <td className="px-4 py-2.5 font-mono text-xs text-zinc-500">{p.reference ?? '—'}</td>
            <td className="px-4 py-2.5 stat-num text-sm">{Number(p.sale.total).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function DailyCollectionTable({ data }: { data: any }) {
  const rows = data.data ?? []
  return (
    <table className="w-full text-sm">
      <thead><tr className="border-b border-zinc-800">
        {['Date', 'Transactions', 'Cash', 'Bank Transfer', 'Total Sales', 'Other', 'Grand Total'].map(h => (
          <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
        ))}
      </tr></thead>
      <tbody className="divide-y divide-zinc-800/50">
        {rows.map((r: any) => (
          <tr key={r.date} className="hover:bg-zinc-100 dark:hover:bg-white/[0.02]">
            <td className="px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300">{r.date}</td>
            <td className="px-4 py-2.5 stat-num text-sm">{r.transactions}</td>
            <td className="px-4 py-2.5 stat-num text-sm text-emerald-400">ETB {Number(r.cash).toLocaleString()}</td>
            <td className="px-4 py-2.5 stat-num text-sm text-blue-400">ETB {Number(r.bank).toLocaleString()}</td>
            <td className="px-4 py-2.5 stat-num text-sm">{Number(r.sales).toLocaleString()}</td>
            <td className="px-4 py-2.5 stat-num text-sm text-amber-400">{Number(r.other).toLocaleString()}</td>
            <td className="px-4 py-2.5 stat-num text-sm font-semibold">{(Number(r.cash) + Number(r.bank) + Number(r.other)).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
