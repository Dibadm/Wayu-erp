'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, RefreshCw, Eye } from 'lucide-react'

interface BankAccount { id: string; accountName: string; accountNumber: string; bankName: string; accountType: string; currency: string; openingBalance: number; currentBalance: number; isActive: boolean; createdAt: string }

export default function BankAccountsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<BankAccount | null>(null)
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

  async function update(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    const res = await fetch('/api/bank-accounts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, ...form, openingBalance: Number(form.openingBalance) || editing.openingBalance }) })
    if (res.ok) { setEditing(null); setForm({ accountName: '', accountNumber: '', bankName: '', accountType: 'SAVINGS', currency: 'ETB', openingBalance: '' }); load() }
  }

  async function remove(id: string) {
    if (!confirm('Deactivate this account?')) return
    await fetch('/api/bank-accounts?method=DELETE', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  const startEdit = (a: BankAccount) => {
    setEditing(a)
    setForm({ accountName: a.accountName, accountNumber: a.accountNumber, bankName: a.bankName, accountType: a.accountType, currency: a.currency, openingBalance: String(a.openingBalance) })
    setShowForm(true)
  }

  const fmt = (n: number) => 'ETB ' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 })

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Bank Accounts</h1>
          <p className="text-sm text-zinc-500 font-mono mt-0.5">Manage bank accounts and current balances</p>
        </div>
        <button onClick={() => { setEditing(null); setForm({ accountName: '', accountNumber: '', bankName: '', accountType: 'SAVINGS', currency: 'ETB', openingBalance: '' }); setShowForm(!showForm) }} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> {editing ? 'Cancel' : 'New Account'}</button>
      </div>

      {showForm && (
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold mb-3">{editing ? 'Edit Bank Account' : 'New Bank Account'}</h2>
          <form onSubmit={editing ? update : add} className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
            <input className="input w-full" placeholder="Account Name" value={form.accountName} onChange={e => setForm({ ...form, accountName: e.target.value })} required />
            <input className="input w-full" placeholder="Account Number" value={form.accountNumber} onChange={e => setForm({ ...form, accountNumber: e.target.value })} required />
            <input className="input w-full" placeholder="Bank Name" value={form.bankName} onChange={e => setForm({ ...form, bankName: e.target.value })} required />
            <select className="input w-full" value={form.accountType} onChange={e => setForm({ ...form, accountType: e.target.value })}>
              <option value="SAVINGS">Savings</option><option value="CURRENT">Current</option><option value="MOBILE_MONEY">Mobile Money</option><option value="PETTY_CASH">Petty Cash</option>
            </select>
            <input className="input w-full" type="number" step="0.01" placeholder="Opening Balance" value={form.openingBalance} onChange={e => setForm({ ...form, openingBalance: e.target.value })} />
            <select className="input w-full" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
              <option value="ETB">ETB</option><option value="USD">USD</option>
            </select>
            <button className="btn-primary" type="submit">{editing ? 'Update Account' : 'Create Account'}</button>
          </form>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-zinc-800">
              {['Account Name', 'Bank', 'Account Number', 'Type', 'Opening Balance', 'Current Balance', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-zinc-800/50">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-10 flex justify-center"><RefreshCw className="w-5 h-5 animate-spin text-zinc-500" /></td></tr>
              ) : accounts.map(a => (
                <tr key={a.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-sm text-zinc-200">{a.accountName}</td>
                  <td className="px-4 py-3 text-xs text-zinc-400">{a.bankName}</td>
                  <td className="px-4 py-3 text-xs font-mono text-zinc-500">{a.accountNumber}</td>
                  <td className="px-4 py-3"><span className="badge badge-in">{a.accountType.replace('_', ' ')}</span></td>
                  <td className="px-4 py-3 stat-num text-sm text-zinc-400">{fmt(a.openingBalance)}</td>
                  <td className="px-4 py-3 stat-num text-sm" style={{ color: Number(a.currentBalance) >= 0 ? 'var(--accent-emerald)' : 'var(--accent-red)' }}>{fmt(a.currentBalance)}</td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => startEdit(a)} className="text-blue-400 hover:text-blue-300"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => remove(a.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
              {!loading && accounts.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-xs font-mono text-zinc-600">No bank accounts yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
