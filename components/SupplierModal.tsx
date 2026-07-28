'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Loader2, Edit2, Building2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Supplier {
  id: string; name: string; contactPerson?: string; email?: string
  phone?: string; address?: string; taxNumber?: string; notes?: string; status: string
}

interface Props {
  supplier?: Supplier   // if provided → edit mode
  trigger?: React.ReactNode
}

const EMPTY = { name: '', contactPerson: '', email: '', phone: '', address: '', taxNumber: '', notes: '', status: 'ACTIVE' }

export default function SupplierModal({ supplier, trigger }: Props) {
  const router = useRouter()
  const [open, setOpen]     = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const [form, setForm]     = useState(EMPTY)

  // Populate form in edit mode
  useEffect(() => {
    if (open && supplier) {
      setForm({
        name:          supplier.name          ?? '',
        contactPerson: supplier.contactPerson ?? '',
        email:         supplier.email         ?? '',
        phone:         supplier.phone         ?? '',
        address:       supplier.address       ?? '',
        taxNumber:     supplier.taxNumber     ?? '',
        notes:         supplier.notes         ?? '',
        status:        supplier.status        ?? 'ACTIVE',
      })
    } else if (open && !supplier) {
      setForm(EMPTY)
    }
  }, [open, supplier])

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const url    = supplier ? `/api/suppliers/${supplier.id}` : '/api/suppliers'
      const method = supplier ? 'PATCH' : 'POST'
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error?.fieldErrors ? JSON.stringify(data.error.fieldErrors) : data.error ?? 'Failed'); return }
      setOpen(false)
      router.refresh()
    } catch { setError('Network error.') }
    finally { setLoading(false) }
  }

  const defaultTrigger = supplier ? (
    <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-zinc-400 hover:text-zinc-200 hover:bg-white/5 rounded-lg transition-colors border border-zinc-800 hover:border-zinc-700">
      <Edit2 className="w-3.5 h-3.5" /> Edit
    </button>
  ) : (
    <button className="btn-primary flex items-center gap-2">
      <Plus className="w-4 h-4" /> Add Supplier
    </button>
  )

  return (
    <>
      <div onClick={() => setOpen(true)}>{trigger ?? defaultTrigger}</div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={e => e.target === e.currentTarget && setOpen(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.2 }}
              className="glass-card w-full max-w-lg p-6 shadow-2xl">

              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-400" />
                  <h2 className="text-sm font-semibold text-zinc-100">
                    {supplier ? 'Edit Supplier' : 'Add New Supplier'}
                  </h2>
                </div>
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-zinc-300 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Company Name *</label>
                  <input className="input" placeholder="PharmaCorp Inc." value={form.name}
                    onChange={e => set('name', e.target.value)} required />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Contact Person</label>
                    <input className="input" placeholder="Juan dela Cruz" value={form.contactPerson}
                      onChange={e => set('contactPerson', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Phone</label>
                    <input className="input" placeholder="+63 917 000 0000" value={form.phone}
                      onChange={e => set('phone', e.target.value)} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Email</label>
                  <input className="input" type="email" placeholder="orders@pharmacorp.com" value={form.email}
                    onChange={e => set('email', e.target.value)} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Address</label>
                  <input className="input" placeholder="123 Industrial Ave, Manila" value={form.address}
                    onChange={e => set('address', e.target.value)} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Tax / VAT Number</label>
                    <input className="input" placeholder="123-456-789-000" value={form.taxNumber}
                      onChange={e => set('taxNumber', e.target.value)} />
                  </div>
                  {supplier && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Status</label>
                      <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Notes</label>
                  <textarea className="input resize-none" rows={2} placeholder="Payment terms, delivery notes..."
                    value={form.notes} onChange={e => set('notes', e.target.value)} />
                </div>

                {error && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                    <p className="text-xs font-mono text-red-400">{error}</p>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-1">
                  <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : supplier ? 'Save Changes' : 'Create Supplier'}
                  </button>
                  <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
