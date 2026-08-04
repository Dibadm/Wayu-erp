'use client'

import { useState, useEffect } from 'react'
import { ArrowDownLeft, Plus, RefreshCw } from 'lucide-react'

interface CashInflow { id: string; amount: number; category: string; reference: string | null; description: string | null; receivedAt: string; bankAccount: { accountName: string } }

const CATEGORIES = ['SALES', 'PURCHASE', 'SALARY', 'FUEL', 'TAX', 'PENSION', 'COMMISSION', 'INCENTIVE', 'RTGS', 'LOAN_REPAYMENT', 'INVESTMENT', 'UTILITIES', 'RENT', 'TRANSPORT', 'MISCELLANEOUS', 'TRANSFER', 'DEPOSIT', 'WITHDRAWAL', 'INTEREST', 'OTHER_INCOME']

export default function CashInflowsPage() {
  const [inflows, setInflows] = useState<CashInflow[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ amount: '', bankAccountId: '', category: 'SALES', reference: '', description: '', receivedAt: '' })
  const [accounts, setAccounts] = useState<{ id: string; accountName: string }[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const [d, a] = await Promise.all([fetch('/api/cash-inflows').then(r => r.json()), fetch('/api/bank-accounts').then(r => r.json())])
    setInflows(d)
    setAccounts(a)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/cash-inflows', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, amount: Number(form.amount), receivedAt: form.receivedAt || new Date().toISOString() }) })
    if (res.ok) { setForm({ amount: '', bankAccountId: '', category: 'SALES', reference: '', description: '', receivedAt: '' }); setShowForm(false); load() }
  }

  const fmt = (n: number) => `ETB ${Number(n).toLocaleString('en-ET', { minimumFractionDigits: 2 })}`

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Cash Inflows</h1>
          <p className="text-sm text-zinc-500 font-mono mt-0.5">Record money coming into the business</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> New Inflow</button>
      </div>

      {showForm && (
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold mb-3">Record Cash Inflow</h2>
          <form onSubmit={add} className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
            <input className="input w-full" type="number" step="0.01" placeholder="Amount" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
            <select className="input w-full" value={form.bankAccountId} onChange={e => setForm({ ...form, bankAccountId: e.target.value })} required>
              <option value="">Select Account</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.accountName}</option>)}
            </select>
            <select className="input w-full" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
            </select>
            <input className="input w-full" type="date" value={form.receivedAt} onChange={e => setForm({ ...form, receivedAt: e.target.value })} />
            <input className="input w-full" placeholder="Reference" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} />
            <input className="input w-full col-span-2" placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            <button className="btn-primary" type="submit">Record Inflow</button>
          </form>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2"><ArrowDownLeft className="w-4 h-4 text-emerald-400" /><h2 className="text-sm font-semibold text-zinc-100">Inflows</h2></div>
        {loading ? <div className="p-10 flex justify-center"><RefreshCw className="w-5 h-5 animate-spin text-zinc-500" /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-zinc-800">{['Date', 'Account', 'Category', 'Amount', 'Reference', 'Description'].map(h => <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-zinc-800/50">
                {inflows.map(f => (
                  <tr key={f.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 text-xs font-mono text-zinc-500">{new Date(f.receivedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5 text-sm text-zinc-300">{f.bankAccount?.accountName ?? '—'}</td>
                    <td className="px-4 py-2.5"><span className="badge badge-in">{f.category.replace('_', ' ')}</span></td>
                    <td className="px-4 py-2.5 stat-num text-sm text-emerald-400">{fmt(f.amount)}</td>
                    <td className="px-4 py-2.5 text-xs font-mono text-zinc-500">{f.reference ?? '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-zinc-500">{f.description ?? '—'}</td>
                  </tr>
                ))}
                {inflows.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-xs font-mono text-zinc-600">No inflows recorded.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}