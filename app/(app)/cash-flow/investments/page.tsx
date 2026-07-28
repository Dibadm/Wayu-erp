'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Plus, RefreshCw } from 'lucide-react'

interface Investment { id: string; name: string; type: string; amount: number; expectedReturn: number; startDate: string; maturityDate: string | null; status: string; notes: string | null; createdBy: { name: string } }

const INVESTMENT_TYPES = ['FIXED_DEPOSIT', 'STOCKS', 'BONDS', 'PROPERTY', 'OTHER']
const STATUSES = ['ACTIVE', 'MATURED', 'SOLD', 'LOST']

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Investment | null>(null)
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

  const startEdit = (inv: Investment) => {
    setEditing(inv)
    setForm({ name: inv.name, type: inv.type, amount: String(inv.amount), expectedReturn: String(inv.expectedReturn), startDate: inv.startDate.slice(0, 10), maturityDate: inv.maturityDate ? inv.maturityDate.slice(0, 10) : '', status: inv.status, notes: inv.notes ?? '' })
    setShowForm(true)
  }

  const fmt = (n: number) => 'ETB ' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 })

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Investments</h1>
          <p className="text-sm text-zinc-500 font-mono mt-0.5">Track company investments</p>
        </div>
        <button onClick={() => { setEditing(null); setForm({ name: '', type: 'FIXED_DEPOSIT', amount: '', expectedReturn: '', startDate: '', maturityDate: '', status: 'ACTIVE', notes: '' }); setShowForm(!showForm) }} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> {editing ? 'Cancel' : 'New Investment'}</button>
      </div>

      {showForm && (
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold mb-3">{editing ? 'Edit Investment' : 'New Investment'}</h2>
          <form onSubmit={add} className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
            <input className="input w-full" placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            <select className="input w-full" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              {INVESTMENT_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
            <input className="input w-full" type="number" step="0.01" placeholder="Amount" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
            <input className="input w-full" type="number" step="0.01" placeholder="Expected Return" value={form.expectedReturn} onChange={e => setForm({ ...form, expectedReturn: e.target.value })} />
            <input className="input w-full" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} required />
            <input className="input w-full" type="date" value={form.maturityDate ?? ''} onChange={e => setForm({ ...form, maturityDate: e.target.value || '' })} />
            <select className="input w-full" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input className="input w-full col-span-2" placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            <button className="btn-primary" type="submit">{editing ? 'Update' : 'Save Investment'}</button>
          </form>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-zinc-800">
              {['Name', 'Type', 'Amount', 'Expected Return', 'Start Date', 'Maturity', 'Status', 'Created By', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-zinc-800/50">
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-10 flex justify-center"><RefreshCw className="w-5 h-5 animate-spin text-zinc-500" /></td></tr>
              ) : investments.map(inv => (
                <tr key={inv.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-sm text-zinc-200">{inv.name}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{inv.type.replace('_', ' ')}</td>
                  <td className="px-4 py-3 stat-num text-sm">{fmt(inv.amount)}</td>
                  <td className="px-4 py-3 stat-num text-sm text-emerald-400">{fmt(inv.expectedReturn)}</td>
                  <td className="px-4 py-3 text-xs font-mono text-zinc-500">{new Date(inv.startDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-xs font-mono text-zinc-500">{inv.maturityDate ? new Date(inv.maturityDate).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3"><span className="badge badge-in">{inv.status}</span></td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{inv.createdBy?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => startEdit(inv)} className="text-blue-400 hover:text-blue-300 mr-2"><span className="text-xs font-mono">Edit</span></button>
                  </td>
                </tr>
              ))}
              {!loading && investments.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-xs font-mono text-zinc-600">No investments recorded.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
