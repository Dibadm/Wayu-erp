'use client'

import { useState, useEffect } from 'react'
import { Banknote, Plus, Pencil, Trash2, RefreshCw } from 'lucide-react'

interface BankAccount { id: string; accountName: string; accountNumber: string; bankName: string; accountType: string; currency: string; currentBalance: number; isActive: boolean; createdAt: string }

export default function BankAccountsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ accountName: '', accountNumber: '', bankName: '', accountType: 'SAVINGS', currency: 'ETB', openingBalance: '' })
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const d = await fetch('/api/bank-accounts').then(r => r.json())
    setAccounts(d)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/bank-accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, openingBalance: Number(form.openingBalance) }) })
    if (res.ok) { setForm({ accountName: '', accountNumber: '', bankName: '', accountType: 'SAVINGS', currency: 'ETB', openingBalance: '' }); setShowForm(false); load() }
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch('/api/bank-accounts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, isActive: !current }) })
    load()
  }

  async function remove(id: string) {
    if (!confirm('Deactivate this account?')) return
    await fetch('/api/bank-accounts', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  const fmt = (n: number) => `ETB ${Number(n).toLocaleString('en-ET', { minimumFractionDigits: 2 })}`

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Bank Accounts</h1>
          <p className="text-sm text-zinc-500 font-mono mt-0.5">Manage bank accounts and current balances</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> New Account</button>
      </div>

      {showForm && (
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold mb-3">New Bank Account</h2>
          <form onSubmit={add} className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
            <input className="input w-full" placeholder="Account Name" value={form.accountName} onChange={e => setForm({ ...form, accountName: e.target.value })} required />
            <input className="input w-full" placeholder="Account Number" value={form.accountNumber} onChange={e => setForm({ ...form, accountNumber: e.target.value })} required />
            <input className="input w-full" placeholder="Bank Name" value={form.bankName} onChange={e => setForm({ ...form, bankName: e.target.value })} required />
            <select className="input w-full" value={form.accountType} onChange={e => setForm({ ...form, accountType: e.target.value })}>
              <option value="SAVINGS">Savings</option><option value="CURRENT">Current</option><option value="MOBILE_MONEY">Mobile Money</option><option value="PETTY_CASH">Petty Cash</option>
            </select>
            <input className="input w-full" type="number" step="0.01" placeholder="Opening Balance" value={form.openingBalance} onChange={e => setForm({ ...form, openingBalance: e.target.value })} />
            <button className="btn-primary" type="submit">Create Account</button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? <div className="col-span-full p-10 flex justify-center"><RefreshCw className="w-5 h-5 animate-spin text-zinc-500" /></div> : accounts.map(a => (
          <div key={a.id} className="glass-card p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">{a.accountName}</h3>
                <p className="text-xs font-mono text-zinc-500">{a.accountNumber} — {a.bankName}</p>
              </div>
              <span className={`badge ${a.isActive ? 'badge-in' : 'badge-low'}`}>{a.isActive ? 'Active' : 'Inactive'}</span>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-mono uppercase text-zinc-600">Balance</span>
              <span className="stat-num text-lg" style={{ color: 'var(--accent-emerald)' }}>{fmt(a.currentBalance)}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => toggleActive(a.id, a.isActive)} className="text-xs px-2 py-1 rounded btn-secondary">{a.isActive ? 'Deactivate' : 'Activate'}</button>
              <button onClick={() => remove(a.id)} className="text-xs px-2 py-1 rounded text-red-400 hover:bg-red-500/10"><Trash2 className="w-3 h-3" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}