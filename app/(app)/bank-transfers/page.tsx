'use client'

import { useState, useEffect } from 'react'
import { ArrowLeftRight, Plus, RefreshCw } from 'lucide-react'

interface BankTransfer { id: string; amount: number; description: string | null; reference: string | null; transferredAt: string; fromAccount: { accountName: string }; toAccount: { accountName: string } }

export default function BankTransfersPage() {
  const [transfers, setTransfers] = useState<BankTransfer[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ fromAccountId: '', toAccountId: '', amount: '', description: '', reference: '' })
  const [accounts, setAccounts] = useState<{ id: string; accountName: string; currentBalance: number }[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const [t, a] = await Promise.all([fetch('/api/bank-transfers').then(r => r.json()), fetch('/api/bank-accounts').then(r => r.json())])
    setTransfers(t)
    setAccounts(a)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/bank-transfers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, amount: Number(form.amount) }) })
    if (res.ok) { setForm({ fromAccountId: '', toAccountId: '', amount: '', description: '', reference: '' }); setShowForm(false); load() }
  }

  const fmt = (n: number) => `ETB ${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Bank Transfers</h1>
          <p className="text-sm text-zinc-500 font-mono mt-0.5">Transfer funds between accounts</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> New Transfer</button>
      </div>

      {showForm && (
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold mb-3">New Bank Transfer</h2>
          <form onSubmit={add} className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
            <select className="input w-full" value={form.fromAccountId} onChange={e => setForm({ ...form, fromAccountId: e.target.value })} required>
              <option value="">From Account</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.accountName} (Balance: {fmt(a.currentBalance)})</option>)}
            </select>
            <select className="input w-full" value={form.toAccountId} onChange={e => setForm({ ...form, toAccountId: e.target.value })} required>
              <option value="">To Account</option>{accounts.filter(a => a.id !== form.fromAccountId).map(a => <option key={a.id} value={a.id}>{a.accountName}</option>)}
            </select>
            <input className="input w-full" type="number" step="0.01" placeholder="Amount" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
            <input className="input w-full" placeholder="Reference" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} />
            <input className="input w-full col-span-2" placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            <button className="btn-primary" type="submit">Transfer</button>
          </form>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2"><ArrowLeftRight className="w-4 h-4 text-blue-400" /><h2 className="text-sm font-semibold text-zinc-100">Transfers</h2></div>
        {loading ? <div className="p-10 flex justify-center"><RefreshCw className="w-5 h-5 animate-spin text-zinc-500" /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-zinc-800">{['Date', 'From', 'To', 'Amount', 'Reference', 'Description'].map(h => <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-zinc-800/50">
                {transfers.map(t => (
                  <tr key={t.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 text-xs font-mono text-zinc-500">{new Date(t.transferredAt).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5 text-sm text-zinc-300">{t.fromAccount?.accountName ?? '—'}</td>
                    <td className="px-4 py-2.5 text-sm text-zinc-300">{t.toAccount?.accountName ?? '—'}</td>
                    <td className="px-4 py-2.5 stat-num text-sm text-blue-400">{fmt(t.amount)}</td>
                    <td className="px-4 py-2.5 text-xs font-mono text-zinc-500">{t.reference ?? '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-zinc-500">{t.description ?? '—'}</td>
                  </tr>
                ))}
                {transfers.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-xs font-mono text-zinc-600">No transfers recorded.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}