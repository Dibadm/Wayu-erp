'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Plus, RefreshCw } from 'lucide-react'

interface Investment { id: string; name: string; type: string; amount: number; expectedReturn: number; startDate: string; maturityDate: string | null; status: string; notes: string | null }

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'FIXED_DEPOSIT', amount: '', expectedReturn: '', startDate: '', maturityDate: '', status: 'ACTIVE', notes: '' })
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const d = await fetch('/api/investments').then(r => r.json())
    setInvestments(d)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/investments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, amount: Number(form.amount), expectedReturn: Number(form.expectedReturn), startDate: new Date(form.startDate), maturityDate: form.maturityDate ? new Date(form.maturityDate) : null }) })
    if (res.ok) { setForm({ name: '', type: 'FIXED_DEPOSIT', amount: '', expectedReturn: '', startDate: '', maturityDate: '', status: 'ACTIVE', notes: '' }); setShowForm(false); load() }
  }

  const fmt = (n: number) => `ETB ${Number(n).toLocaleString('en-ET', { minimumFractionDigits: 2 })}`

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Investments</h1>
          <p className="text-sm text-zinc-500 font-mono mt-0.5">Track company investments</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> New Investment</button>
      </div>

      {showForm && (
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold mb-3">New Investment</h2>
          <form onSubmit={add} className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
            <input className="input w-full" placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            <select className="input w-full" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              <option value="FIXED_DEPOSIT">Fixed Deposit</option><option value="STOCKS">Stocks</option><option value="BONDS">Bonds</option><option value="PROPERTY">Property</option><option value="OTHER">Other</option>
            </select>
            <input className="input w-full" type="number" step="0.01" placeholder="Amount" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
            <input className="input w-full" type="number" step="0.01" placeholder="Expected Return" value={form.expectedReturn} onChange={e => setForm({ ...form, expectedReturn: e.target.value })} />
            <input className="input w-full" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} required />
            <input className="input w-full" type="date" value={form.maturityDate ?? ''} onChange={e => setForm({ ...form, maturityDate: e.target.value || '' })} />
            <select className="input w-full" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              <option value="ACTIVE">Active</option><option value="MATURED">Matured</option><option value="SOLD">Sold</option><option value="LOST">Lost</option>
            </select>
            <input className="input w-full col-span-2" placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            <button className="btn-primary" type="submit">Save Investment</button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? <div className="col-span-full p-10 flex justify-center"><RefreshCw className="w-5 h-5 animate-spin text-zinc-500" /></div> : investments.map(inv => (
          <div key={inv.id} className="glass-card p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">{inv.name}</h3>
                <p className="text-xs font-mono text-zinc-500">{inv.type}</p>
              </div>
              <span className="badge badge-in">{inv.status}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><span className="text-zinc-600">Amount</span><p className="stat-num text-sm">{fmt(inv.amount)}</p></div>
              <div><span className="text-zinc-600">Expected Return</span><p className="stat-num text-sm text-emerald-400">{fmt(inv.expectedReturn)}</p></div>
              <div><span className="text-zinc-600">Start Date</span><p className="text-xs font-mono text-zinc-400">{new Date(inv.startDate).toLocaleDateString()}</p></div>
              <div><span className="text-zinc-600">Maturity</span><p className="text-xs font-mono text-zinc-400">{inv.maturityDate ? new Date(inv.maturityDate).toLocaleDateString() : '—'}</p></div>
            </div>
          </div>
        ))}
        {investments.length === 0 && <div className="col-span-full p-10 text-center text-xs font-mono text-zinc-600">No investments recorded.</div>}
      </div>
    </div>
  )
}