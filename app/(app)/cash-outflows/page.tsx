'use client'

import { useState, useEffect } from 'react'
import { ArrowUpRight, Plus, RefreshCw } from 'lucide-react'

interface CashOutflow { id: string; amount: number; category: string; reference: string | null; description: string | null; paidAt: string; bankAccount: { accountName: string } }

const CATEGORIES = ['SALES', 'PURCHASE', 'SALARY', 'FUEL', 'TAX', 'PENSION', 'COMMISSION', 'INCENTIVE', 'RTGS', 'LOAN_REPAYMENT', 'INVESTMENT', 'UTILITIES', 'RENT', 'TRANSPORT', 'MISCELLANEOUS', 'TRANSFER', 'DEPOSIT', 'WITHDRAWAL', 'INTEREST', 'OTHER_INCOME']

export default function CashOutflowsPage() {
  const [outflows, setOutflows] = useState<CashOutflow[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ amount: '', bankAccountId: '', category: 'SALARY', reference: '', description: '', paidAt: '' })
  const [accounts, setAccounts] = useState<{ id: string; accountName: string }[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const [d, a] = await Promise.all([fetch('/api/cash-outflows').then(r => r.json()), fetch('/api/bank-accounts').then(r => r.json())])
    setOutflows(d)
    setAccounts(a)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/cash-outflows', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, amount: Number(form.amount), paidAt: form.paidAt || new Date().toISOString() }) })
    if (res.ok) { setForm({ amount: '', bankAccountId: '', category: 'SALARY', reference: '', description: '', paidAt: '' }); setShowForm(false); load() }
  }

  const fmt = (n: number) => `ETB ${Number(n).toLocaleString('en-ET', { minimumFractionDigits: 2 })}`

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Cash Outflows</h1>
          <p className="text-sm text-zinc-500 font-mono mt-0.5">Record money going out of the business</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> New Outflow</button>
      </div>

      {showForm && (
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold mb-3">Record Cash Outflow</h2>
          <form onSubmit={add} className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
            <input className="input w-full" type="number" step="0.01" placeholder="Amount" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
            <select className="input w-full" value={form.bankAccountId} onChange={e => setForm({ ...form, bankAccountId: e.target.value })} required>
              <option value="">Select Account</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.accountName}</option>)}
            </select>
            <select className="input w-full" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
            </select>
            <input className="input w-full" type="date" value={form.paidAt} onChange={e => setForm({ ...form, paidAt: e.target.value })} />
            <input className="input w-full" placeholder="Reference" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} />
            <input className="input w-full col-span-2" placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            <button className="btn-primary" type="submit">Record Outflow</button>
          </form>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2"><ArrowUpRight className="w-4 h-4 text-red-400" /><h2 className="text-sm font-semibold text-zinc-100">Outflows</h2></div>
        {loading ? <div className="p-10 flex justify-center"><RefreshCw className="w-5 h-5 animate-spin text-zinc-500" /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-zinc-800">{['Date', 'Account', 'Category', 'Amount', 'Reference', 'Description'].map(h => <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-zinc-800/50">
                {outflows.map(f => (
                  <tr key={f.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 text-xs font-mono text-zinc-500">{new Date(f.paidAt).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5 text-sm text-zinc-300">{f.bankAccount?.accountName ?? '—'}</td>
                    <td className="px-4 py-2.5"><span className="badge badge-low">{f.category.replace('_', ' ')}</span></td>
                    <td className="px-4 py-2.5 stat-num text-sm text-red-400">{fmt(f.amount)}</td>
                    <td className="px-4 py-2.5 text-xs font-mono text-zinc-500">{f.reference ?? '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-zinc-500">{f.description ?? '—'}</td>
                  </tr>
                ))}
                {outflows.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-xs font-mono text-zinc-600">No outflows recorded.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}