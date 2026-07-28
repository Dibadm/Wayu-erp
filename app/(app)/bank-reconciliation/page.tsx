'use client'

import { useState, useEffect } from 'react'
import { Landmark, Plus } from 'lucide-react'

export default function BankRecPage() {
  const [recs, setRecs] = useState<any[]>([])
  const [form, setForm] = useState({ title: '', bookBalance: '', bankBalance: '', notes: '' })

  async function load() {
    setRecs(await fetch('/api/bank-reconciliations').then(r => r.json()))
  }
  useEffect(() => { load() }, [])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/bank-reconciliations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, bookBalance: Number(form.bookBalance), bankBalance: Number(form.bankBalance) }),
    })
    if (res.ok) { setForm({ title: '', bookBalance: '', bankBalance: '', notes: '' }); load() }
  }

  const fmt = (n: number) => `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Bank Reconciliation</h1>
        <p className="text-sm text-zinc-500 font-mono mt-0.5">Reconcile book vs bank (CF19 Recon1888 / All Bank)</p>
      </div>

      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2"><Plus className="w-4 h-4 text-blue-400" /> New Reconciliation</h2>
        <form onSubmit={add} className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
          <input className="input w-full" placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
          <input className="input w-full" type="number" step="0.01" placeholder="Book Balance" value={form.bookBalance} onChange={e => setForm({ ...form, bookBalance: e.target.value })} required />
          <input className="input w-full" type="number" step="0.01" placeholder="Bank Balance" value={form.bankBalance} onChange={e => setForm({ ...form, bankBalance: e.target.value })} required />
          <input className="input w-full" placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          <button className="btn-primary" type="submit">Save</button>
        </form>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2">
          <Landmark className="w-4 h-4 text-purple-400" /><h2 className="text-sm font-semibold text-zinc-100">History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                {['Title', 'As Of', 'Book', 'Bank', 'Difference', 'Status', 'By'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {recs.map(r => (
                <tr key={r.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5 text-sm text-zinc-300">{r.title}</td>
                  <td className="px-4 py-2.5 text-xs font-mono text-zinc-500">{new Date(r.asOf).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5 stat-num text-sm text-zinc-400">{fmt(Number(r.bookBalance))}</td>
                  <td className="px-4 py-2.5 stat-num text-sm text-zinc-400">{fmt(Number(r.bankBalance))}</td>
                  <td className="px-4 py-2.5 stat-num text-sm" style={{ color: Math.abs(Number(r.difference)) < 0.01 ? 'var(--accent-emerald)' : 'var(--accent-red)' }}>{fmt(Number(r.difference))}</td>
                  <td className="px-4 py-2.5"><span className={`badge ${r.status === 'RECONCILED' ? 'badge-in' : 'badge-warning'}`}>{r.status}</span></td>
                  <td className="px-4 py-2.5 text-xs text-zinc-500">{r.createdBy.name}</td>
                </tr>
              ))}
              {recs.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-xs font-mono text-zinc-600">No reconciliations yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
