'use client'

import { useState, useEffect } from 'react'
import { FileText, Plus, RefreshCw } from 'lucide-react'

interface Loan { id: string; lender: string; principal: number; interestRate: number; startDate: string; endDate: string | null; status: string; repaymentSummary: { totalRepaid: number; totalPrincipal: number; totalInterest: number; remainingPrincipal: number } }

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ lender: '', principal: '', interestRate: '', startDate: '', endDate: '' })
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

  async function recordRepayment(loanId: string) {
    const amount = prompt('Repayment amount?')
    if (!amount) return
    const principal = prompt('Principal portion?')
    if (!principal) return
    const res = await fetch('/api/loans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ loanId, amount: Number(amount), principal: Number(principal), interest: Number(amount) - Number(principal) }) })
    if (res.ok) load()
  }

  const fmt = (n: number) => `ETB ${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {loading ? <div className="col-span-full p-10 flex justify-center"><RefreshCw className="w-5 h-5 animate-spin text-zinc-500" /></div> : loans.map(loan => (
          <div key={loan.id} className="glass-card p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">{loan.lender}</h3>
                <p className="text-xs font-mono text-zinc-500">{loan.status} — {loan.interestRate}% p.a.</p>
              </div>
              <span className={`badge ${loan.status === 'PAID_OFF' ? 'badge-in' : loan.status === 'DEFAULTED' ? 'badge-low' : 'badge-blue'}`}>{loan.status}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><span className="text-zinc-600">Principal</span><p className="stat-num text-sm">{fmt(loan.principal)}</p></div>
              <div><span className="text-zinc-600">Remaining</span><p className="stat-num text-sm" style={{ color: 'var(--accent-amber)' }}>{fmt(loan.repaymentSummary.remainingPrincipal)}</p></div>
              <div><span className="text-zinc-600">Repaid</span><p className="stat-num text-sm text-emerald-400">{fmt(loan.repaymentSummary.totalRepaid)}</p></div>
              <div><span className="text-zinc-600">Interest Paid</span><p className="stat-num text-sm text-red-400">{fmt(loan.repaymentSummary.totalInterest)}</p></div>
            </div>
            <button onClick={() => recordRepayment(loan.id)} className="mt-3 text-xs px-3 py-1.5 rounded btn-primary">Record Repayment</button>
          </div>
        ))}
        {loans.length === 0 && <div className="col-span-full p-10 text-center text-xs font-mono text-zinc-600">No loans recorded.</div>}
      </div>
    </div>
  )
}