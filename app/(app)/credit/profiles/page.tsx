'use client'

import { useState, useEffect } from 'react'
import { Users, Plus, ShieldCheck, Edit2, Ban, CheckCircle, XCircle } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { canAccess } from '@/lib/permissions'

export default function CreditProfilesPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role
  const [profiles, setProfiles] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [limit] = useState(100)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ customerId: '', creditLimit: '', paymentTerms: '30', notes: '' })
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const canEdit = canAccess(role, 'credit:manage')

  useEffect(() => {
    fetch(`/api/credit-profiles?page=${page}&limit=${limit}`).then(r => r.json()).then(d => {
      setProfiles(d.profiles || [])
      setTotal(d.total || 0)
      setLoading(false)
    })
    fetch('/api/customers').then(r => r.json()).then(setCustomers)
  }, [page, limit])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const url = editingId ? `/api/credit-profiles/${editingId}` : '/api/credit-profiles'
    const method = editingId ? 'PATCH' : 'POST'
    const body = editingId ? { ...form, creditLimit: Number(form.creditLimit), paymentTerms: Number(form.paymentTerms) } : { ...form, creditLimit: Number(form.creditLimit), paymentTerms: Number(form.paymentTerms) }

    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.ok) {
      setShowForm(false)
      setEditingId(null)
      setForm({ customerId: '', creditLimit: '', paymentTerms: '30', notes: '' })
      fetch(`/api/credit-profiles?page=${page}&limit=${limit}`).then(r => r.json()).then(d => { setProfiles(d.profiles || []); setTotal(d.total || 0) })
    }
  }

  const edit = (p: any) => {
    setEditingId(p.id)
    setForm({ customerId: p.customerId, creditLimit: String(p.creditLimit), paymentTerms: String(p.paymentTerms), notes: p.notes || '' })
    setShowForm(true)
  }

  const toggleBlock = async (p: any) => {
    await fetch(`/api/credit-profiles/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isBlocked: !p.isBlocked, blockReason: !p.isBlocked ? 'Blocked by admin' : '' }),
    })
    fetch(`/api/credit-profiles?page=${page}&limit=${limit}`).then(r => r.json()).then(d => { setProfiles(d.profiles || []); setTotal(d.total || 0) })
  }

  const fmt = (n: number) => `ETB ${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 })}`

  const totalPages = Math.ceil(total / limit) || 1

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Credit Profiles</h1>
          <p className="text-sm text-zinc-500 font-mono mt-0.5">Customer credit limits and risk levels</p>
        </div>
        {canEdit && (
          <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ customerId: '', creditLimit: '', paymentTerms: '30', notes: '' }) }} className="flex items-center gap-1.5 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm text-blue-400 hover:bg-blue-500/20 transition-colors">
            <Plus className="w-4 h-4" /> New Profile
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={submit} className="glass-card p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <select value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })} className="bg-transparent border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200" required disabled={!!editingId}>
              <option value="">Select customer</option>
              {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="number" placeholder="Credit Limit" value={form.creditLimit} onChange={e => setForm({ ...form, creditLimit: e.target.value })} className="bg-transparent border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200" required />
            <input type="number" placeholder="Payment Terms (days)" value={form.paymentTerms} onChange={e => setForm({ ...form, paymentTerms: e.target.value })} className="bg-transparent border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200" />
          </div>
          <textarea placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full bg-transparent border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200" rows={2} />
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors">{editingId ? 'Update' : 'Create'} Profile</button>
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null) }} className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-sm hover:bg-zinc-700 transition-colors">Cancel</button>
          </div>
        </form>
      )}

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                {['Customer', 'Limit', 'Available', 'Utilized', 'Utilization %', 'Risk', 'Terms', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {profiles.map((p: any) => {
                const utilPct = p.creditLimit > 0 ? Math.round((Number(p.utilizedCredit) / Number(p.creditLimit)) * 100) : 0
                return (
                  <tr key={p.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 text-sm text-zinc-300">{p.customer?.name ?? '—'}</td>
                    <td className="px-4 py-2.5 stat-num text-sm">{fmt(p.creditLimit)}</td>
                    <td className="px-4 py-2.5 stat-num text-sm text-emerald-400">{fmt(p.availableCredit)}</td>
                    <td className="px-4 py-2.5 stat-num text-sm text-amber-400">{fmt(p.utilizedCredit)}</td>
                    <td className="px-4 py-2.5 stat-num text-sm">{utilPct}%</td>
                    <td className="px-4 py-2.5"><span className={`badge ${p.riskLevel === 'HIGH' || p.riskLevel === 'CRITICAL' ? 'badge-warning' : 'badge-in'}`}>{p.riskLevel}</span></td>
                    <td className="px-4 py-2.5 text-xs text-zinc-500">{p.paymentTerms} days</td>
                    <td className="px-4 py-2.5"><span className={`badge ${p.isActive ? 'badge-in' : 'badge-warning'}`}>{p.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td className="px-4 py-2.5 flex gap-2">
                      {canEdit && <button onClick={() => edit(p)} className="p-1.5 bg-blue-500/10 border border-blue-500/20 rounded text-blue-400 hover:bg-blue-500/20 transition-colors"><Edit2 className="w-4 h-4" /></button>}
                      {canEdit && <button onClick={() => toggleBlock(p)} className={`p-1.5 rounded border transition-colors ${p.isBlocked ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'}`}><Ban className="w-4 h-4" /></button>}
                    </td>
                  </tr>
                )
              })}
              {profiles.length === 0 && <tr><td colSpan={9} className="px-4 py-10 text-center text-xs font-mono text-zinc-600">No credit profiles found.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-zinc-800 flex items-center justify-between">
          <p className="text-xs font-mono text-zinc-500">Page {page} of {totalPages} ({total} total)</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-xs rounded border border-zinc-700 disabled:opacity-50 hover:bg-zinc-800 transition-colors">Prev</button>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-xs rounded border border-zinc-700 disabled:opacity-50 hover:bg-zinc-800 transition-colors">Next</button>
          </div>
        </div>
      </div>
    </div>
  )
}
