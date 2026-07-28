'use client'

import { useState, useEffect } from 'react'
import { FileText, Plus, RefreshCw } from 'lucide-react'

interface Loan { id: string; lender: string; principal: number; interestRate: number; startDate: string; endDate: string | null; status: string; repaymentSummary: { totalRepaid: number; totalPrincipal: number; totalInterest: number; remainingPrincipal: number }; repayments: { id: string; amount: number; principal: number; interest: number; paidAt: string; reference: string | null; notes: string | null }[]; createdBy: { name: string } }

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ lender: '', principal: '', interestRate: '', startDate: '', endDate: '' })
  const [showRepay, setShowRepay] = useState<string | null>(null)
  const [repayForm, setRepayForm] = useState({ loanId: '', amount: '', principal: '', interest: '', paidAt: '', reference: '', notes: '' })
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const d = await fetch('/api/loans').then(r => r.json())
    setLoans(d)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/loans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, principal: Number(form.principal), interestRate: Number(form.interestRate), startDate: new Date(form.startDate) }) })
    if (res.ok) { setForm({ lender: '', principal: '', interestRate: '', startDate: '', endDate: '' }); setShowForm(false); load() }
  }

  async function recordRepayment(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/loans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...repayForm, loanId: repayForm.loanId, amount: Number(repayForm.amount), principal: Number(repayForm.principal), interest: Number(repayForm.interest), paidAt: new Date(repayForm.paidAt || new Date()) }) })
    if (res.ok) { setShowRepay(null); setRepayForm({ loanId: '', amount: '', principal: '', interest: '', paidAt: '', reference: '', notes: '' }); load() }
  }

  const fmt = (n: number) => 'ETB ' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 })

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Loans</h1>
          <p className="text-sm text-zinc-500 font-mono mt-0.5">Track loans and repayments</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> New Loan</button>
      </div>

      {showForm && (
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold mb-3">New Loan</h2>
          <form onSubmit={add} className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
            <input className="input w-full" placeholder="Lender" value={form.lender} onChange={e => setForm({ ...form, lender: e.target.value })} required />
            <input className="input w-full" type="number" step="0.01" placeholder="Principal" value={form.principal} onChange={e => setForm({ ...form, principal: e.target.value })} required />
            <input className="input w-full" type="number" step="0.01" placeholder="Interest Rate %" value={form.interestRate} onChange={e => setForm({ ...form, interestRate: e.target.value })} required />
            <input className="input w-full" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} required />
            <input className="input w-full" type="date" value={form.endDate ?? ''} onChange={e => setForm({ ...form, endDate: e.target.value || '' })} />
            <button className="btn-primary" type="submit">Create Loan</button>
          </form>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800"><h2 className="text-sm font-semibold text-zinc-100">Loans</h2></div>
        {loading ? <div className="p-10 flex justify-center"><RefreshCw className="w-5 h-5 animate-spin text-zinc-500" /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-zinc-800">
                {['Lender', 'Principal', 'Rate', 'Start Date', 'End Date', 'Status', 'Total Repaid', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-zinc-800/50">
                {loans.map(loan => (
                  <tr key={loan.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-sm text-zinc-200">{loan.lender}</td>
                    <td className="px-4 py-3 stat-num text-sm">{fmt(loan.principal)}</td>
                    <td className="px-4 py-3 stat-num text-sm">{loan.interestRate}%</td>
                    <td className="px-4 py-3 text-xs font-mono text-zinc-500">{new Date(loan.startDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-xs font-mono text-zinc-500">{loan.endDate ? new Date(loan.endDate).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3"><span className={`badge ${loan.status === 'PAID_OFF' ? 'badge-in' : loan.status === 'DEFAULTED' ? 'badge-low' : 'badge-warning'}`}>{loan.status}</span></td>
                    <td className="px-4 py-3 stat-num text-sm text-emerald-400">{fmt(loan.repaymentSummary.totalRepaid)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => { setShowRepay(loan.id); setRepayForm({ ...repayForm, loanId: loan.id }) }} className="text-xs px-3 py-1.5 rounded btn-primary">Repay</button>
                    </td>
                  </tr>
                ))}
                {loans.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-xs font-mono text-zinc-600">No loans recorded.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showRepay && (
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold mb-3">Record Loan Repayment</h2>
          <form onSubmit={recordRepayment} className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
            <input className="input w-full" type="number" step="0.01" placeholder="Total Amount" value={repayForm.amount} onChange={e => setRepayForm({ ...repayForm, amount: e.target.value })} required />
            <input className="input w-full" type="number" step="0.01" placeholder="Principal" value={repayForm.principal} onChange={e => setRepayForm({ ...repayForm, principal: e.target.value })} required />
            <input className="input w-full" type="number" step="0.01" placeholder="Interest" value={repayForm.interest} onChange={e => setRepayForm({ ...repayForm, interest: e.target.value })} required />
            <input className="input w-full" type="date" value={repayForm.paidAt} onChange={e => setRepayForm({ ...repayForm, paidAt: e.target.value })} />
            <input className="input w-full" placeholder="Reference" value={repayForm.reference} onChange={e => setRepayForm({ ...repayForm, reference: e.target.value })} />
            <input className="input w-full col-span-2" placeholder="Notes" value={repayForm.notes} onChange={e => setRepayForm({ ...repayForm, notes: e.target.value })} />
            <button className="btn-primary" type="submit">Record Repayment</button>
          </form>
        </div>
      )}

      {showRepay && loans.find(l => l.id === showRepay) && (
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold mb-3">Repayment History — {loans.find(l => l.id === showRepay)!.lender}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-zinc-800">
                {['Date', 'Principal', 'Interest', 'Total', 'Reference', 'Notes'].map(h => <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-zinc-800/50">
                {loans.find(l => l.id === showRepay)!.repayments.map(r => (
                  <tr key={r.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 text-xs font-mono text-zinc-500">{new Date(r.paidAt).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5 stat-num text-sm text-emerald-400">{fmt(r.principal)}</td>
                    <td className="px-4 py-2.5 stat-num text-sm text-red-400">{fmt(r.interest)}</td>
                    <td className="px-4 py-2.5 stat-num text-sm">{fmt(r.amount)}</td>
                    <td className="px-4 py-2.5 text-xs font-mono text-zinc-500">{r.reference ?? '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-zinc-500">{r.notes ?? '—'}</td>
                  </tr>
                ))}
                {loans.find(l => l.id === showRepay)!.repayments.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-xs font-mono text-zinc-600">No repayments yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
