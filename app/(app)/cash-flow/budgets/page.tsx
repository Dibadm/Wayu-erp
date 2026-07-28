'use client'

import { useState, useEffect } from 'react'
import { Plus, RefreshCw, Download } from 'lucide-react'

interface Budget { id: string; category: string; periodLabel: string; periodStart: string; periodEnd: string; plannedAmount: number }

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [actuals, setActuals] = useState<any>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ category: 'SALES', periodLabel: '', periodStart: '', periodEnd: '', plannedAmount: '' })
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const [b, a] = await Promise.all([fetch('/api/budgets').then(r => r.json()), fetch('/api/cash-flow/reports?type=budget-vs-actual').then(r => r.json()).catch(() => ({ budgets: [] }))])
    setBudgets(Array.isArray(b) ? b : (b.budgets ?? b))
    setActuals(Array.isArray(a) ? a : (a.budgets ?? a))
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const pl = form.periodLabel || form.periodStart?.slice(0, 7) || 'Budget'
    const res = await fetch('/api/budgets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, plannedAmount: Number(form.plannedAmount), periodLabel: pl }) })
    if (res.ok) { setForm({ category: 'SALES', periodLabel: '', periodStart: '', periodEnd: '', plannedAmount: '' }); setShowForm(false); load() }
  }

  const fmt = (n: number) => 'ETB ' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 })

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Budgets</h1>
          <p className="text-sm text-zinc-500 font-mono mt-0.5">Plan and track cash flow budgets</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> New Budget</button>
      </div>

      {showForm && (
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold mb-3">New Budget</h2>
          <form onSubmit={add} className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
            <select className="input w-full" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              <option value="SALES">Sales</option><option value="PURCHASE">Purchase</option><option value="SALARY">Salary</option><option value="FUEL">Fuel</option><option value="TAX">Tax</option><option value="UTILITIES">Utilities</option><option value="RENT">Rent</option><option value="TRANSPORT">Transport</option><option value="MISCELLANEOUS">Miscellaneous</option>
            </select>
            <input className="input w-full" placeholder="Period Label" value={form.periodLabel} onChange={e => setForm({ ...form, periodLabel: e.target.value })} />
            <input className="input w-full" type="date" value={form.periodStart} onChange={e => setForm({ ...form, periodStart: e.target.value })} required />
            <input className="input w-full" type="date" value={form.periodEnd} onChange={e => setForm({ ...form, periodEnd: e.target.value })} required />
            <input className="input w-full" type="number" step="0.01" placeholder="Planned Amount" value={form.plannedAmount} onChange={e => setForm({ ...form, plannedAmount: e.target.value })} required />
            <button className="btn-primary" type="submit">Save Budget</button>
          </form>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2"><Download className="w-4 h-4 text-amber-400" /><h2 className="text-sm font-semibold text-zinc-100">Budget vs Actual</h2></div>
          <button onClick={() => {
            const csv = ((Array.isArray(actuals) && actuals.length > 0 ? actuals : budgets) as any[]).map(b => [b.category, b.periodLabel, b.plannedAmount, b.actualInflows ?? 0, b.actualOutflows ?? 0, b.variance ?? 0].join(',')).join('\n')
            const blob = new Blob([csv], { type: 'text/csv' })
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'budgets.csv'; a.click()
          }} className="text-xs font-mono text-blue-400 hover:text-blue-300">Export CSV</button>
        </div>
        {loading ? <div className="p-10 flex justify-center"><RefreshCw className="w-5 h-5 animate-spin text-zinc-500" /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-zinc-800">
                {['Category', 'Period', 'Planned', 'Inflows', 'Outflows', 'Variance'].map(h => <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-zinc-800/50">
                {(Array.isArray(actuals) && actuals.length > 0 ? actuals : budgets).map((b: any, i: number) => (
                  <tr key={b.id ?? i} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5"><span className="badge badge-in">{b.category}</span></td>
                    <td className="px-4 py-2.5 text-xs font-mono text-zinc-400">{b.periodLabel ?? b.periodStart?.slice(0, 7)}</td>
                    <td className="px-4 py-2.5 stat-num text-sm">{fmt(b.plannedAmount)}</td>
                    <td className="px-4 py-2.5 stat-num text-sm text-emerald-400">{fmt(b.actualInflows ?? 0)}</td>
                    <td className="px-4 py-2.5 stat-num text-sm text-red-400">{fmt(b.actualOutflows ?? 0)}</td>
                    <td className="px-4 py-2.5 stat-num text-sm" style={{ color: (b.variance ?? 0) >= 0 ? 'var(--accent-emerald)' : 'var(--accent-red)' }}>{fmt(Math.abs(b.variance ?? 0))} {(b.variance ?? 0) >= 0 ? 'under' : 'over'}</td>
                  </tr>
                ))}
                {((Array.isArray(actuals) && actuals.length === 0) && budgets.length === 0) && <tr><td colSpan={6} className="px-4 py-10 text-center text-xs font-mono text-zinc-600">No budgets defined yet.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
