'use client'

import { useState, useEffect } from 'react'
import { Target, Plus } from 'lucide-react'

export default function SalesPlanPage() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [rows, setRows] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [form, setForm] = useState({ productId: '', plannedQty: '', plannedValue: '' })

  async function load() {
    const start = new Date(month + '-01').toISOString()
    const [plan, prod] = await Promise.all([
      fetch(`/api/reports/sales-plan?start=${encodeURIComponent(start)}`).then(r => r.json()),
      fetch('/api/products?take=500').then(r => r.json()).then(d => d.products ?? d).catch(() => []),
    ])
    setRows(plan.rows ?? [])
    setProducts(prod)
  }
  useEffect(() => { load() }, [month])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/sales-plans', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, plannedQty: Number(form.plannedQty), plannedValue: Number(form.plannedValue), periodStart: month + '-01' }),
    })
    if (res.ok) { setForm({ productId: '', plannedQty: '', plannedValue: '' }); load() }
  }

  const fmt = (n: number) => `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Sales Plan</h1>
          <p className="text-sm text-zinc-500 font-mono mt-0.5">Budget vs actual per product/month (CF19 19 Sells plan)</p>
        </div>
        <input type="month" className="input w-auto" value={month} onChange={e => setMonth(e.target.value)} />
      </div>

      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2"><Plus className="w-4 h-4 text-blue-400" /> Set Plan</h2>
        <form onSubmit={add} className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <select className="input w-full" value={form.productId} onChange={e => setForm({ ...form, productId: e.target.value })} required>
            <option value="">Product…</option>{products.map((p: any) => <option key={p.id} value={p.id}>{p.sku}</option>)}
          </select>
          <input className="input w-full" type="number" placeholder="Planned Qty" value={form.plannedQty} onChange={e => setForm({ ...form, plannedQty: e.target.value })} />
          <input className="input w-full" type="number" step="0.01" placeholder="Planned Value" value={form.plannedValue} onChange={e => setForm({ ...form, plannedValue: e.target.value })} />
          <button className="btn-primary" type="submit">Save</button>
        </form>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2">
          <Target className="w-4 h-4 text-emerald-400" /><h2 className="text-sm font-semibold text-zinc-100">Budget vs Actual</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                {['Product', 'Plan Qty', 'Actual Qty', 'Plan Value', 'Actual Value', 'Variance', 'Achievement'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5 text-sm text-zinc-300">{r.sku} — {r.name}</td>
                  <td className="px-4 py-2.5 stat-num text-sm text-zinc-400">{r.plannedQty}</td>
                  <td className="px-4 py-2.5 stat-num text-sm text-zinc-300">{r.actualQty}</td>
                  <td className="px-4 py-2.5 stat-num text-sm text-zinc-400">{fmt(r.plannedValue)}</td>
                  <td className="px-4 py-2.5 stat-num text-sm text-zinc-300">{fmt(r.actualValue)}</td>
                  <td className="px-4 py-2.5 stat-num text-sm" style={{ color: r.varianceQty >= 0 ? 'var(--accent-emerald)' : 'var(--accent-red)' }}>{r.varianceQty}</td>
                  <td className="px-4 py-2.5 text-xs font-mono" style={{ color: r.achievementPct >= 100 ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>{r.achievementPct.toFixed(0)}%</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-xs font-mono text-zinc-600">No plan set for this month.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
