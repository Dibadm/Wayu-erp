'use client'

import { useState, useEffect } from 'react'
import { ShieldCheck, Plus, CheckCircle } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { canAccess } from '@/lib/permissions'

export default function CollectionsPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role
  const [cases, setCases] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [limit] = useState(100)
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ customerId: '', arStatementId: '', amount: '', priority: 'MEDIUM', dueDate: '', notes: '' })
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const canEdit = canAccess(role, 'collections:manage', 'credit:manage')

  useEffect(() => {
    let url = `/api/collection-cases?page=${page}&limit=${limit}`
    if (statusFilter) url += `&status=${statusFilter}`
    if (priorityFilter) url += `&priority=${priorityFilter}`
    fetch(url).then(r => r.json()).then(d => {
      setCases(d.cases || [])
      setTotal(d.total || 0)
      setLoading(false)
    })
    fetch('/api/customers').then(r => r.json()).then(setCustomers)
  }, [page, limit, statusFilter, priorityFilter])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/collection-cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, amount: Number(form.amount), dueDate: form.dueDate || undefined }),
    })
    if (res.ok) {
      setShowForm(false)
      setForm({ customerId: '', arStatementId: '', amount: '', priority: 'MEDIUM', dueDate: '', notes: '' })
      let url = `/api/collection-cases?page=${page}&limit=${limit}`
      if (statusFilter) url += `&status=${statusFilter}`
      fetch(url).then(r => r.json()).then(d => { setCases(d.cases || []); setTotal(d.total || 0) })
    }
  }

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/collection-cases/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    let url = `/api/collection-cases?page=${page}&limit=${limit}`
    if (statusFilter) url += `&status=${statusFilter}`
    fetch(url).then(r => r.json()).then(d => { setCases(d.cases || []); setTotal(d.total || 0) })
  }

  const totalPages = Math.ceil(total / limit) || 1

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Collection Cases</h1>
          <p className="text-sm text-zinc-500 font-mono mt-0.5">Track and resolve overdue receivables</p>
        </div>
        {canEdit && (
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm text-blue-400 hover:bg-blue-500/20 transition-colors">
            <Plus className="w-4 h-4" /> New Case
          </button>
        )}
      </div>

      <div className="glass-card p-4 flex items-center gap-4">
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} className="bg-transparent border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200">
          <option value="">All Status</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="WRITTEN_OFF">Written Off</option>
        </select>
        <select value={priorityFilter} onChange={e => { setPriorityFilter(e.target.value); setPage(1) }} className="bg-transparent border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200">
          <option value="">All Priority</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>
      </div>

      {showForm && (
        <form onSubmit={submit} className="glass-card p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <select value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })} className="bg-transparent border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200" required>
              <option value="">Select customer</option>
              {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="number" placeholder="Amount" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="bg-transparent border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200" required />
            <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} className="bg-transparent border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200" />
          </div>
          <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="bg-transparent border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200">
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
          <textarea placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full bg-transparent border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200" rows={2} />
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors">Create Case</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-sm hover:bg-zinc-700 transition-colors">Cancel</button>
          </div>
        </form>
      )}

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                {['Case No', 'Customer', 'Amount', 'Priority', 'Status', 'Assigned To', 'Due Date', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {cases.map((c: any) => (
                <tr key={c.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5 font-mono text-xs text-zinc-400">{c.caseNo}</td>
                  <td className="px-4 py-2.5 text-sm text-zinc-300">{c.customer?.name ?? '—'}</td>
                  <td className="px-4 py-2.5 stat-num text-sm text-amber-400">ETB {Number(c.amount).toLocaleString()}</td>
                  <td className="px-4 py-2.5"><span className={`badge ${c.priority === 'URGENT' ? 'badge-warning' : c.priority === 'HIGH' ? 'badge-outline' : 'badge-in'}`}>{c.priority}</span></td>
                  <td className="px-4 py-2.5"><span className={`badge ${c.status === 'RESOLVED' ? 'badge-in' : c.status === 'IN_PROGRESS' ? 'badge-outline' : 'badge-warning'}`}>{c.status}</span></td>
                  <td className="px-4 py-2.5 text-xs text-zinc-500">{c.assignedToUser?.name || '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-zinc-500">{c.dueDate ? new Date(c.dueDate).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-2.5">
                    {canEdit && c.status !== 'RESOLVED' && (
                      <button onClick={() => updateStatus(c.id, 'RESOLVED')} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Resolve</button>
                    )}
                  </td>
                </tr>
              ))}
              {cases.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-xs font-mono text-zinc-600">No collection cases found.</td></tr>}
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
