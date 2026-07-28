'use client'

import { useState, useEffect } from 'react'
import { Receipt, Plus, Trash2 } from 'lucide-react'

interface ExpenseRow { id: string; category: string; description: string | null; amount: number; type: string; incurredAt: string; reference: string | null; createdBy: { name: string } }

export default function ExpensesPage() {
  const [report, setReport] = useState<any>(null)
  const [list, setList] = useState<ExpenseRow[]>([])
  const [form, setForm] = useState({ category: '', description: '', amount: '', type: 'DEBIT', reference: '' })

  async function load() {
    const d = await fetch('/api/reports/expenses').then(r => r.json())
    setReport(d)
    setList(d.expenses ?? [])
  }
  useEffect(() => { load() }, [])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/expenses', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, amount: Number(form.amount) }),
    })
    if (res.ok) { setForm({ category: '', description: '', amount: '', type: 'DEBIT', reference: '' }); load() }
  }

  async function remove(id: string) {
    if (!confirm('Delete expense?')) return
    await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' })
    load()
  }

  const fmt = (n: number) => `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Expenses</h1>
        <p className="text-sm text-zinc-500 font-mono mt-0.5">General ledger — by category (CF19 Trans → All Exp)</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="glass-card p-5"><p className="text-[10px] font-mono uppercase text-zinc-500">Total Debit</p><p className="stat-num text-xl text-red-400">{fmt(report?.totalDebit ?? 0)}</p></div>
        <div className="glass-card p-5"><p className="text-[10px] font-mono uppercase text-zinc-500">Total Credit</p><p className="stat-num text-xl text-emerald-400">{fmt(report?.totalCredit ?? 0)}</p></div>
        <div className="glass-card p-5"><p className="text-[10px] font-mono uppercase text-zinc-500">Net</p><p className="stat-num text-xl text-zinc-300">{fmt(report?.net ?? 0)}</p></div>
      </div>

      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2"><Plus className="w-4 h-4 text-blue-400" /> Add Expense</h2>
        <form onSubmit={add} className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
          <input className="input w-full" placeholder="Category" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required />
          <input className="input w-full" placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <input className="input w-full" type="number" step="0.01" placeholder="Amount" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
          <select className="input w-full" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
            <option value="DEBIT">Debit (cost)</option><option value="CREDIT">Credit (refund)</option>
          </select>
          <button className="btn-primary" type="submit">Add</button>
        </form>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2">
          <Receipt className="w-4 h-4 text-purple-400" /><h2 className="text-sm font-semibold text-zinc-100">Expense Ledger</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                {['Category', 'Description', 'Type', 'Amount', 'Date', 'By', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {list.map(e => (
                <tr key={e.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5 text-sm text-zinc-300">{e.category}</td>
                  <td className="px-4 py-2.5 text-xs text-zinc-500">{e.description ?? '—'}</td>
                  <td className="px-4 py-2.5"><span className={`badge ${e.type === 'DEBIT' ? 'badge-low' : 'badge-in'}`}>{e.type}</span></td>
                  <td className="px-4 py-2.5 stat-num text-sm" style={{ color: e.type === 'DEBIT' ? 'var(--accent-red)' : 'var(--accent-emerald)' }}>{fmt(e.amount)}</td>
                  <td className="px-4 py-2.5 text-xs font-mono text-zinc-500">{new Date(e.incurredAt).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5 text-xs text-zinc-500">{e.createdBy.name}</td>
                  <td className="px-4 py-2.5 text-right"><button onClick={() => remove(e.id)} className="text-red-400"><Trash2 className="w-4 h-4" /></button></td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-xs font-mono text-zinc-600">No expenses recorded.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
