'use client'

import { useState, useEffect } from 'react'
import { FileText, CheckCircle, XCircle, Plus } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { canAccess } from '@/lib/permissions'

export default function CreditApplicationsPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role
  const [applications, setApplications] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [limit] = useState(100)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ customerId: '', requestedLimit: '', requestedTerms: '30', purpose: '' })
  const [customers, setCustomers] = useState<any[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const loading = false

  const canReview = canAccess(role, 'credit:manage')

  useEffect(() => {
    let url = `/api/credit-applications?page=${page}&limit=${limit}`
    if (statusFilter) url += `&status=${statusFilter}`
    fetch(url).then(r => r.json()).then(d => { setApplications(d.applications || []); setTotal(d.total || 0) })
    fetch('/api/customers').then(r => r.json()).then(setCustomers)
  }, [page, limit, statusFilter])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/credit-applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, requestedLimit: Number(form.requestedLimit), requestedTerms: Number(form.requestedTerms) }),
    })
    if (res.ok) { setShowForm(false); setForm({ customerId: '', requestedLimit: '', requestedTerms: '30', purpose: '' }) }
  }

  const review = async (id: string, status: string) => {
    await fetch(`/api/credit-applications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    let url = `/api/credit-applications?page=${page}&limit=${limit}`
    if (statusFilter) url += `&status=${statusFilter}`
    fetch(url).then(r => r.json()).then(d => { setApplications(d.applications || []); setTotal(d.total || 0) })
  }

  const totalPages = Math.ceil(total / limit) || 1

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Credit Applications</h1>
          <p className="text-sm text-zinc-500 font-mono mt-0.5">Customer credit limit applications</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} className="bg-transparent border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200">
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm text-blue-400 hover:bg-blue-500/20 transition-colors">
            <Plus className="w-4 h-4" /> New Application
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={submit} className="glass-card p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <select value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })} className="bg-transparent border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200" required>
              <option value="">Select customer</option>
              {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="number" placeholder="Requested Limit" value={form.requestedLimit} onChange={e => setForm({ ...form, requestedLimit: e.target.value })} className="bg-transparent border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200" required />
            <input type="number" placeholder="Terms (days)" value={form.requestedTerms} onChange={e => setForm({ ...form, requestedTerms: e.target.value })} className="bg-transparent border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200" />
          </div>
          <textarea placeholder="Purpose" value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })} className="w-full bg-transparent border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200" rows={2} />
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors">Submit Application</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-sm hover:bg-zinc-700 transition-colors">Cancel</button>
          </div>
        </form>
      )}

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                {['App No', 'Customer', 'Requested', 'Terms', 'Purpose', 'Status', 'Date'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
                ))}
                {canReview && <th className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {applications.map((a: any) => (
                <tr key={a.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5 font-mono text-xs text-zinc-400">{a.applicationNo}</td>
                  <td className="px-4 py-2.5 text-sm text-zinc-300">{a.customer?.name ?? '—'}</td>
                  <td className="px-4 py-2.5 stat-num text-sm">ETB {Number(a.requestedLimit).toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-xs text-zinc-500">{a.requestedTerms} days</td>
                  <td className="px-4 py-2.5 text-xs text-zinc-500 max-w-xs truncate">{a.purpose || '—'}</td>
                  <td className="px-4 py-2.5"><span className={`badge ${a.status === 'APPROVED' ? 'badge-in' : a.status === 'REJECTED' ? 'badge-warning' : 'badge-outline'}`}>{a.status}</span></td>
                  <td className="px-4 py-2.5 text-xs text-zinc-500">{new Date(a.createdAt).toLocaleDateString()}</td>
                  {canReview && a.status === 'PENDING' && (
                    <td className="px-4 py-2.5 flex gap-2">
                      <button onClick={() => review(a.id, 'APPROVED')} className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-emerald-400 hover:bg-emerald-500/20 transition-colors"><CheckCircle className="w-4 h-4" /></button>
                      <button onClick={() => review(a.id, 'REJECTED')} className="p-1.5 bg-red-500/10 border border-red-500/20 rounded text-red-400 hover:bg-red-500/20 transition-colors"><XCircle className="w-4 h-4" /></button>
                    </td>
                  )}
                </tr>
              ))}
              {applications.length === 0 && <tr><td colSpan={canReview ? 8 : 7} className="px-4 py-10 text-center text-xs font-mono text-zinc-600">No applications found.</td></tr>}
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
