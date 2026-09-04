'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, Download, Loader2 } from 'lucide-react'
import Link from 'next/link'
import Breadcrumb from '@/components/Breadcrumb'
import { formatDate } from '@/lib/utils'

type Tab = 'daily-cashflow' | 'weekly-cashflow' | 'monthly-cashflow' | 'bank-balance' | 'expense-analysis' | 'budget-vs-actual' | 'expense-category-summary' | 'cash-position' | 'loan-repayment' | 'investment-report' | 'financial-trend'

const TABS: { key: Tab; label: string }[] = [
  { key: 'daily-cashflow', label: 'Daily Cash Flow' },
  { key: 'weekly-cashflow', label: 'Weekly Cash Flow' },
  { key: 'monthly-cashflow', label: 'Monthly Cash Flow' },
  { key: 'bank-balance', label: 'Bank Balance' },
  { key: 'expense-analysis', label: 'Expense Analysis' },
  { key: 'budget-vs-actual', label: 'Budget vs Actual' },
  { key: 'expense-category-summary', label: 'Expense Category Summary' },
  { key: 'cash-position', label: 'Cash Position' },
  { key: 'loan-repayment', label: 'Loan Repayment' },
  { key: 'investment-report', label: 'Investment Report' },
  { key: 'financial-trend', label: 'Financial Trend Analysis' },
]

export default function CashFlowReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('daily-cashflow')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0] })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ type: activeTab, from: dateFrom, to: dateTo })
    fetch(`/api/reports/data?${params}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [activeTab, dateFrom, dateTo])

  const downloadExcel = () => {
    const params = new URLSearchParams({ type: 'cashflow-reports', format: 'excel', from: dateFrom, to: dateTo })
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
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Cash Flow Reports</h1>
          <p className="text-sm text-zinc-500 font-mono mt-0.5">
            Daily, weekly, and monthly cash flow statements; bank balances; expense analysis; budget vs actual; expense category summary; cash position; loan repayment; and investment reports.
          </p>
        </div>
      </div>

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

      <div className="flex flex-wrap gap-2">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 text-xs font-mono rounded border transition-colors ${
              activeTab === tab.key
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
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
            <CashFlowTable tab={activeTab} data={data} />
          </div>
        )}
      </div>
    </div>
  )
}

function CashFlowTable({ tab, data }: { tab: Tab; data: any }) {
  if (!data) return <div className="p-10 text-center text-xs font-mono text-zinc-600">No data available.</div>

  switch (tab) {
    case 'daily-cashflow':
    case 'weekly-cashflow':
    case 'monthly-cashflow': {
      const rows = data.data ?? []
      const columns = tab === 'daily-cashflow' ? ['Date', 'Inflows', 'Outflows', 'Net'] : tab === 'weekly-cashflow' ? ['Week Starting', 'Inflows', 'Outflows', 'Net'] : ['Month', 'Inflows', 'Outflows', 'Net']
      const keyMap = tab === 'daily-cashflow' ? { date: 'date', in: 'inflows', out: 'outflows', net: 'net' } : tab === 'weekly-cashflow' ? { date: 'start', in: 'inflows', out: 'outflows', net: 'net' } : { date: 'label', in: 'inflows', out: 'outflows', net: 'net' }
      return (
        <table className="w-full text-sm">
          <thead><tr className="border-b border-zinc-800">
            {columns.map(h => <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-zinc-800/50">
            {rows.map((r: any) => (
              <tr key={keyMap.date in r ? r[keyMap.date] : r.label} className="hover:bg-white/[0.02]">
                <td className="px-4 py-2.5 text-sm text-zinc-300">{r[keyMap.date]}</td>
                <td className="px-4 py-2.5 stat-num text-sm text-emerald-400">ETB {Number(r[keyMap.in]).toLocaleString()}</td>
                <td className="px-4 py-2.5 stat-num text-sm text-red-400">ETB {Number(r[keyMap.out]).toLocaleString()}</td>
                <td className="px-4 py-2.5 stat-num text-sm font-semibold" style={{ color: (Number(r[keyMap.net]) >= 0 ? 'var(--accent-emerald)' : 'var(--accent-red)') }}>ETB {Number(r[keyMap.net]).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )
    }
    case 'bank-balance':
      return <BankBalanceTable data={data} />
    case 'expense-analysis':
    case 'expense-category-summary':
      return <ExpenseTable data={data} />
    case 'budget-vs-actual':
      return <BudgetTable data={data} />
    case 'cash-position':
      return <CashPositionTable data={data} />
    case 'loan-repayment':
      return <LoanTable data={data} />
    case 'investment-report':
      return <InvestmentTable data={data} />
    case 'financial-trend':
      return <div className="p-10 text-center text-xs font-mono text-zinc-600">Financial trend analysis requires integration with sales and expense data over time. Use the Sales Trend and Expense Analysis tabs for trend insights.</div>
    default:
      return null
  }
}

function BankBalanceTable({ data }: { data: any }) {
  const accounts = data.accounts ?? []
  return (
    <table className="w-full text-sm">
      <thead><tr className="border-b border-zinc-800">
        {['Account Name', 'Account Number', 'Bank Name', 'Type', 'Opening Balance', 'Current Balance'].map(h => (
          <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
        ))}
      </tr></thead>
      <tbody className="divide-y divide-zinc-800/50">
        {accounts.map((a: any) => (
          <tr key={a.id} className="hover:bg-white/[0.02]">
            <td className="px-4 py-2.5 text-sm text-zinc-300">{a.accountName}</td>
            <td className="px-4 py-2.5 font-mono text-xs text-zinc-400">{a.accountNumber}</td>
            <td className="px-4 py-2.5 text-sm text-zinc-300">{a.bankName}</td>
            <td className="px-4 py-2.5 text-xs text-zinc-500">{a.accountType}</td>
            <td className="px-4 py-2.5 stat-num text-sm">{Number(a.openingBalance).toLocaleString()}</td>
            <td className="px-4 py-2.5 stat-num text-sm text-emerald-400">{Number(a.currentBalance).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ExpenseTable({ data }: { data: any }) {
  const rows = data.data ?? []
  return (
    <table className="w-full text-sm">
      <thead><tr className="border-b border-zinc-800">
        {['Category', 'Total', 'Percentage'].map(h => (
          <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
        ))}
      </tr></thead>
      <tbody className="divide-y divide-zinc-800/50">
        {rows.map((r: any) => (
          <tr key={r.category} className="hover:bg-white/[0.02]">
            <td className="px-4 py-2.5 text-sm text-zinc-300">{r.category}</td>
            <td className="px-4 py-2.5 stat-num text-sm text-red-400">ETB {Number(r.total).toLocaleString()}</td>
            <td className="px-4 py-2.5 stat-num text-sm">{r.pct}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function BudgetTable({ data }: { data: any }) {
  const rows = data.data ?? []
  return (
    <table className="w-full text-sm">
      <thead><tr className="border-b border-zinc-800">
        {['Period', 'Category', 'Planned', 'Actual In', 'Actual Out', 'Variance'].map(h => (
          <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
        ))}
      </tr></thead>
      <tbody className="divide-y divide-zinc-800/50">
        {rows.map((r: any) => (
          <tr key={`${r.period}-${r.category}`} className="hover:bg-white/[0.02]">
            <td className="px-4 py-2.5 text-sm text-zinc-300">{r.period}</td>
            <td className="px-4 py-2.5 text-xs text-zinc-500">{r.category}</td>
            <td className="px-4 py-2.5 stat-num text-sm">{Number(r.planned).toLocaleString()}</td>
            <td className="px-4 py-2.5 stat-num text-sm text-emerald-400">{Number(r.actualIn).toLocaleString()}</td>
            <td className="px-4 py-2.5 stat-num text-sm text-red-400">{Number(r.actualOut).toLocaleString()}</td>
            <td className="px-4 py-2.5 stat-num text-sm" style={{ color: Number(r.variance) >= 0 ? 'var(--accent-emerald)' : 'var(--accent-red)' }}>{Number(r.variance).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function CashPositionTable({ data }: { data: any }) {
  const accounts = data.accounts ?? []
  return (
    <table className="w-full text-sm">
      <thead><tr className="border-b border-zinc-800">
        {['Account', 'Bank', 'Opening', 'Current'].map(h => (
          <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
        ))}
      </tr></thead>
      <tbody className="divide-y divide-zinc-800/50">
        {accounts.map((a: any) => (
          <tr key={a.id} className="hover:bg-white/[0.02]">
            <td className="px-4 py-2.5 text-sm text-zinc-300">{a.accountName} ({a.accountNumber})</td>
            <td className="px-4 py-2.5 text-xs text-zinc-500">{a.bankName}</td>
            <td className="px-4 py-2.5 stat-num text-sm">{Number(a.openingBalance).toLocaleString()}</td>
            <td className="px-4 py-2.5 stat-num text-sm text-emerald-400">{Number(a.currentBalance).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function LoanTable({ data }: { data: any }) {
  const loans = data.loans ?? []
  return (
    <table className="w-full text-sm">
      <thead><tr className="border-b border-zinc-800">
        {['Lender', 'Principal', 'Interest Rate', 'Start Date', 'End Date', 'Status'].map(h => (
          <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
        ))}
      </tr></thead>
      <tbody className="divide-y divide-zinc-800/50">
        {loans.map((l: any) => (
          <tr key={l.id} className="hover:bg-white/[0.02]">
            <td className="px-4 py-2.5 text-sm text-zinc-300">{l.lender}</td>
            <td className="px-4 py-2.5 stat-num text-sm">{Number(l.principal).toLocaleString()}</td>
            <td className="px-4 py-2.5 stat-num text-sm">{l.interestRate}%</td>
            <td className="px-4 py-2.5 text-xs text-zinc-500">{formatDate(l.startDate)}</td>
            <td className="px-4 py-2.5 text-xs text-zinc-500">{l.endDate ? formatDate(l.endDate) : '—'}</td>
            <td className="px-4 py-2.5">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium tracking-wide border ${
                l.status === 'PAID_OFF' ? 'badge-in' : l.status === 'ACTIVE' ? 'badge-outline border-blue-500/30 text-blue-400' : 'badge-warning'
              }`}>{l.status}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function InvestmentTable({ data }: { data: any }) {
  const investments = data.investments ?? []
  return (
    <table className="w-full text-sm">
      <thead><tr className="border-b border-zinc-800">
        {['Name', 'Type', 'Amount', 'Expected Return', 'Start Date', 'Maturity', 'Status'].map(h => (
          <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
        ))}
      </tr></thead>
      <tbody className="divide-y divide-zinc-800/50">
        {investments.map((inv: any) => (
          <tr key={inv.id} className="hover:bg-white/[0.02]">
            <td className="px-4 py-2.5 text-sm text-zinc-300">{inv.name}</td>
            <td className="px-4 py-2.5 text-xs text-zinc-500">{inv.type}</td>
            <td className="px-4 py-2.5 stat-num text-sm">{Number(inv.amount).toLocaleString()}</td>
            <td className="px-4 py-2.5 stat-num text-sm text-emerald-400">{Number(inv.expectedReturn).toLocaleString()}</td>
            <td className="px-4 py-2.5 text-xs text-zinc-500">{formatDate(inv.startDate)}</td>
            <td className="px-4 py-2.5 text-xs text-zinc-500">{inv.maturityDate ? formatDate(inv.maturityDate) : '—'}</td>
            <td className="px-4 py-2.5">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium tracking-wide border ${
                inv.status === 'ACTIVE' ? 'badge-in' : inv.status === 'MATURED' ? 'badge-outline border-emerald-500/30 text-emerald-400' : 'badge-warning'
              }`}>{inv.status}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
