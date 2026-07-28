'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

export default function ApplicationModal({ open, onClose, onSubmit, customers }: any) {
  const [form, setForm] = useState({ customerId: '', requestedLimit: '', requestedTerms: '30', purpose: '' })

  useEffect(() => {
    if (open) setForm({ customerId: '', requestedLimit: '', requestedTerms: '30', purpose: '' })
  }, [open])

  if (!open) return null

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="glass-card p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-zinc-100">New Credit Application</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <select value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })} className="w-full bg-transparent border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200" required>
            <option value="">Select customer</option>
            {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input type="number" placeholder="Requested Limit" value={form.requestedLimit} onChange={e => setForm({ ...form, requestedLimit: e.target.value })} className="w-full bg-transparent border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200" required />
          <input type="number" placeholder="Terms (days)" value={form.requestedTerms} onChange={e => setForm({ ...form, requestedTerms: e.target.value })} className="w-full bg-transparent border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200" />
          <textarea placeholder="Purpose" value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })} className="w-full bg-transparent border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200" rows={2} />
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors">Submit Application</button>
            <button type="button" onClick={onClose} className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-sm hover:bg-zinc-700 transition-colors">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}
