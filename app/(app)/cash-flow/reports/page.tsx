'use client'

import { useState, useEffect } from 'react'
import { FileBarChart, Download, Loader2 } from 'lucide-react'

interface ReportRow { category: string; total: number; pct?: number }

export default function CashFlowReportsPage() {
  const [reportType, setReportType] = useState('daily')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  async function generate() {
    setLoading(true)
    let url = '/api/cash-flow/reports?type=' + reportType
    if (reportType === 'daily') url += '&date=' + date
    else if (reportType === 'weekly') url += '&start=' + (start || date)
    else if (reportType === 'monthly') url += '&month=' + month
    else if (reportType === 'bank-balance') url += '&bankAccountId='
    else if (reportType === 'expense-analysis') url += '&from=' + (start || '2025-01-01') + '&to=' + (end || new Date().toISOString().split('T')[0])
    else if (reportType === 'budget-vs-actual') url += '&periodStart=' + (start || '2025-01-01') + '&periodEnd=' + (end || new Date().toISOString().split('T')[0])
    else if (reportType === 'loan-repayment') { const id = prompt('Enter Loan ID:'); if (id) url += '&loanId=' + id }
    const d = await fetch(url).then(r => r.json())
    setResult(d)
    setLoading(false)
  }

  const fmt = (n: number) => 'ETB ' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 })

  async function downloadExcel() {
    const rows = result ? JSON.stringify(result) : ''
    const blob = new Blob([rows], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'report-' + reportType + '.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Cash Flow Reports</h1>
          <p className="text-sm text-zinc-500 font-mono mt-0.5">Generate daily, weekly, monthly, and analytical reports</p>
        </div>
        {result && (
          <button onClick={downloadExcel} className="btn-ghost flex items-center gap-2 text-xs">
            <Download className="w-3 h-3" /> Export JSON
          </button>
        )}
      </div>

      <div className="glass-card p-5">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
          <select className="input w-full" value={reportType} onChange={e => setReportType(e.target.value)}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="bank-balance">Bank Balance</option>
            <option value="expense-analysis">Expense Analysis</option>
            <option value="budget-vs-actual">Budget vs Actual</option>
            <option value="expense-category-summary">Expense Category Summary</option>
            <option value="loan-repayment">Loan Repayment</option>
            <option value="investment-report">Investment Report</option>
          </select>
          {reportType === 'daily' && <input className="input w-full" type="date" value={date} onChange={e => setDate(e.target.value)} />}
          {reportType === 'weekly' && <input className="input w-full" type="date" value={start} onChange={e => setStart(e.target.value)} placeholder="Start date" />}
          {reportType === 'monthly' && <input className="input w-full" type="month" value={month} onChange={e => setMonth(e.target.value)} />}
          {(reportType === 'expense-analysis' || reportType === 'budget-vs-actual') && (
            <>
              <input className="input w-full" type="date" value={start} onChange={e => setStart(e.target.value)} placeholder="From" />
              <input className="input w-full" type="date" value={end} onChange={e => setEnd(e.target.value)} placeholder="To" />
            </>
          )}
          <button onClick={generate} className="btn-primary flex items-center gap-2"><FileBarChart className="w-4 h-4" /> Generate</button>
        </div>
      </div>

      {loading && <div className="p-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-zinc-500" /></div>}

      {result && (
        <div className="space-y-4">
          {result.type === 'daily' && (
            <div className="glass-card p-5">
              <h2 className="text-sm font-semibold mb-3">Daily Summary — {result.date}</h2>
              <div className="grid grid-cols-3 gap-4">
                <div><p className="text-[10px] font-mono text-zinc-600">Inflows</p><p className="stat-num text-emerald-400">{fmt(result.totalInflows)}</p></div>
                <div><p className="text-[10px] font-mono text-zinc-600">Outflows</p><p className="stat-num text-red-400">{fmt(result.totalOutflows)}</p></div>
                <div><p className="text-[10px] font-mono text-zinc-600">Net</p><p className="stat-num" style={{ color: result.net >= 0 ? 'var(--accent-emerald)' : 'var(--accent-red)' }}>{fmt(result.net)}</p></div>
              </div>
            </div>
          )}
          {result.type === 'weekly' && (
            <div className="glass-card p-5">
              <h2 className="text-sm font-semibold mb-3">Weekly Summary</h2>
              <div className="grid grid-cols-3 gap-4">
                <div><p className="text-[10px] font-mono text-zinc-600">Inflows</p><p className="stat-num text-emerald-400">{fmt(result.totalInflows)}</p></div>
                <div><p className="text-[10px] font-mono text-zinc-600">Outflows</p><p className="stat-num text-red-400">{fmt(result.totalOutflows)}</p></div>
                <div><p className="text-[10px] font-mono text-zinc-600">Net</p><p className="stat-num" style={{ color: result.net >= 0 ? 'var(--accent-emerald)' : 'var(--accent-red)' }}>{fmt(result.net)}</p></div>
              </div>
            </div>
          )}
          {result.type === 'monthly' && (
            <div className="glass-card p-5">
              <h2 className="text-sm font-semibold mb-3">Monthly Summary — {result.month}</h2>
              <div className="grid grid-cols-3 gap-4">
                <div><p className="text-[10px] font-mono text-zinc-600">Inflows</p><p className="stat-num text-emerald-400">{fmt(result.totalInflows)}</p></div>
                <div><p className="text-[10px] font-mono text-zinc-600">Outflows</p><p className="stat-num text-red-400">{fmt(result.totalOutflows)}</p></div>
                <div><p className="text-[10px] font-mono text-zinc-600">Net</p><p className="stat-num" style={{ color: result.net >= 0 ? 'var(--accent-emerald)' : 'var(--accent-red)' }}>{fmt(result.net)}</p></div>
              </div>
            </div>
          )}
          {result.type === 'bank-balance' && (
            <div className="glass-card overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-800"><h2 className="text-sm font-semibold text-zinc-100">Bank Balance Report</h2></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-zinc-800">
                    <th className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase">Account</th>
                    <th className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase">Number</th>
                    <th className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase">Bank</th>
                    <th className="px-4 py-3 text-right text-[10px] font-mono text-zinc-600 uppercase">Balance</th>
                  </tr></thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {result.accounts?.map((a: any) => (
                      <tr key={a.id} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-2.5 text-sm text-zinc-300">{a.accountName}</td>
                        <td className="px-4 py-2.5 text-xs font-mono text-zinc-500">{a.accountNumber}</td>
                        <td className="px-4 py-2.5 text-xs text-zinc-500">{a.bankName}</td>
                        <td className="px-4 py-2.5 stat-num text-sm text-right" style={{ color: 'var(--accent-emerald)' }}>{fmt(a.currentBalance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {result.type === 'expense-analysis' && (
            <div className="glass-card overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-800"><h2 className="text-sm font-semibold text-zinc-100">Expense Analysis</h2></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-zinc-800">
                    <th className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase">Category</th>
                    <th className="px-4 py-3 text-right text-[10px] font-mono text-zinc-600 uppercase">Total</th>
                    <th className="px-4 py-3 text-right text-[10px] font-mono text-zinc-600 uppercase">%</th>
                  </tr></thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {result.byCategory?.map((r: ReportRow, i: number) => (
                      <tr key={i} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-2.5 text-sm text-zinc-300">{r.category.replace('_', ' ')}</td>
                        <td className="px-4 py-2.5 stat-num text-sm text-red-400 text-right">{fmt(r.total)}</td>
                        <td className="px-4 py-2.5 text-xs font-mono text-zinc-500 text-right">{(r.pct ?? 0).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr className="border-t border-zinc-800">
                    <td className="px-4 py-2.5 text-sm font-semibold text-zinc-100">Grand Total</td>
                    <td className="px-4 py-2.5 stat-num text-sm font-semibold text-red-400 text-right">{fmt(result.grandTotal)}</td>
                    <td></td>
                  </tr></tfoot>
                </table>
              </div>
            </div>
          )}
          {result.type === 'budget-vs-actual' && (
            <div className="glass-card overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-800"><h2 className="text-sm font-semibold text-zinc-100">Budget vs Actual</h2></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-zinc-800">
                    <th className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase">Category</th>
                    <th className="px-4 py-3 text-right text-[10px] font-mono text-zinc-600 uppercase">Planned</th>
                    <th className="px-4 py-3 text-right text-[10px] font-mono text-zinc-600 uppercase">Inflows</th>
                    <th className="px-4 py-3 text-right text-[10px] font-mono text-zinc-600 uppercase">Outflows</th>
                    <th className="px-4 py-3 text-right text-[10px] font-mono text-zinc-600 uppercase">Variance</th>
                  </tr></thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {result.budgets?.map((b: any, i: number) => (
                      <tr key={i} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-2.5"><span className="badge badge-in">{b.category}</span></td>
                        <td className="px-4 py-2.5 stat-num text-sm text-right">{fmt(b.planned)}</td>
                        <td className="px-4 py-2.5 stat-num text-sm text-emerald-400 text-right">{fmt(b.actualInflows ?? 0)}</td>
                        <td className="px-4 py-2.5 stat-num text-sm text-red-400 text-right">{fmt(b.actualOutflows ?? 0)}</td>
                        <td className="px-4 py-2.5 stat-num text-sm text-right" style={{ color: (b.variance ?? 0) >= 0 ? 'var(--accent-emerald)' : 'var(--accent-red)' }}>{fmt(Math.abs(b.variance ?? 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {result.type === 'expense-category-summary' && (
            <div className="glass-card overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-800"><h2 className="text-sm font-semibold text-zinc-100">Expense Category Summary</h2></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-zinc-800">
                    <th className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase">Category</th>
                    <th className="px-4 py-3 text-right text-[10px] font-mono text-zinc-600 uppercase">Total</th>
                  </tr></thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {result.summary?.map((s: any, i: number) => (
                      <tr key={i} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-2.5 text-sm text-zinc-300">{s.category.replace('_', ' ')}</td>
                        <td className="px-4 py-2.5 stat-num text-sm text-red-400 text-right">{fmt(s.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {result.type === 'loan-repayment' && result.loan && (
            <div className="glass-card p-5">
              <h2 className="text-sm font-semibold mb-3">Repayment Report — {result.loan.lender}</h2>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div><p className="text-[10px] font-mono text-zinc-600">Principal</p><p className="stat-num">{fmt(result.loan.principal)}</p></div>
                <div><p className="text-[10px] font-mono text-zinc-600">Total Repaid</p><p className="stat-num text-emerald-400">{fmt(result.summary.totalRepaid)}</p></div>
                <div><p className="text-[10px] font-mono text-zinc-600">Interest</p><p className="stat-num text-red-400">{fmt(result.summary.totalInterest)}</p></div>
                <div><p className="text-[10px] font-mono text-zinc-600">Remaining</p><p className="stat-num" style={{ color: result.summary.remainingPrincipal > 0 ? 'var(--accent-amber)' : 'var(--accent-emerald)' }}>{fmt(result.summary.remainingPrincipal)}</p></div>
              </div>
              {result.repayments?.length > 0 && (
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-zinc-800">
                    <th className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600">Date</th>
                    <th className="px-4 py-3 text-right text-[10px] font-mono text-zinc-600">Principal</th>
                    <th className="px-4 py-3 text-right text-[10px] font-mono text-zinc-600">Interest</th>
                    <th className="px-4 py-3 text-right text-[10px] font-mono text-zinc-600">Total</th>
                  </tr></thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {result.repayments.map((r: any, i: number) => (
                      <tr key={i} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-2.5 text-xs font-mono text-zinc-500">{new Date(r.paidAt).toLocaleDateString()}</td>
                        <td className="px-4 py-2.5 stat-num text-sm text-emerald-400 text-right">{fmt(r.principal)}</td>
                        <td className="px-4 py-2.5 stat-num text-sm text-red-400 text-right">{fmt(r.interest)}</td>
                        <td className="px-4 py-2.5 stat-num text-sm text-right">{fmt(r.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
          {result.type === 'investment-report' && (
            <div className="glass-card overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-800"><h2 className="text-sm font-semibold text-zinc-100">Investment Report</h2></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-zinc-800">
                    <th className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase">Type</th>
                    <th className="px-4 py-3 text-right text-[10px] font-mono text-zinc-600 uppercase">Amount</th>
                    <th className="px-4 py-3 text-right text-[10px] font-mono text-zinc-600 uppercase">Expected Return</th>
                    <th className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase">Status</th>
                  </tr></thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {result.investments?.map((inv: any, i: number) => (
                      <tr key={inv.id ?? i} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-2.5 text-sm text-zinc-300">{inv.name}</td>
                        <td className="px-4 py-2.5 text-xs text-zinc-500">{inv.type.replace('_', ' ')}</td>
                        <td className="px-4 py-2.5 stat-num text-sm text-right">{fmt(inv.amount)}</td>
                        <td className="px-4 py-2.5 stat-num text-sm text-emerald-400 text-right">{fmt(inv.expectedReturn)}</td>
                        <td className="px-4 py-2.5"><span className="badge badge-in">{inv.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
