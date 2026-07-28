'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, UserPlus, User } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Customer {
  id?: string; name: string; phone: string; email: string; address: string; notes: string
}

interface Props {
  customer?: Customer   // pass to edit, omit to create
  trigger?: React.ReactNode
  onSuccess?: (customer: any) => void
}

const EMPTY: Customer = { name: '', phone: '', email: '', address: '', notes: '' }

export default function CustomerModal({ customer, trigger, onSuccess }: Props) {
  const router  = useRouter()
  const isEdit  = !!customer?.id
  const [open,    setOpen]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [form,    setForm]    = useState<Customer>(customer ?? EMPTY)

  useEffect(() => { if (open) setForm(customer ?? EMPTY) }, [open])

  function set(field: keyof Customer, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const url    = isEdit ? `/api/customers/${customer!.id}` : '/api/customers'
      const method = isEdit ? 'PATCH' : 'POST'
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed'); return }
      setOpen(false)
      if (onSuccess) onSuccess(data)
      else { router.refresh() }
    } catch {
      setError('Network error.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Trigger button */}
      <div onClick={() => setOpen(true)} className="cursor-pointer">
        {trigger ?? (
          <button className="btn-primary flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            {isEdit ? 'Edit Customer' : 'Add Customer'}
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={e => e.target === e.currentTarget && setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2 }}
              className="glass-card w-full max-w-md p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-100">{isEdit ? 'Edit Customer' : 'New Customer'}</h2>
                    <p className="text-xs font-mono text-zinc-500 mt-0.5">Customer account details</p>
                  </div>
                </div>
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-zinc-300 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Full Name *</label>
                  <input className="input" placeholder="Juan dela Cruz" value={form.name}
                    onChange={e => set('name', e.target.value)} required />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Phone</label>
                    <input className="input" placeholder="+63 917 000 0000" value={form.phone}
                      onChange={e => set('phone', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Email</label>
                    <input className="input" type="email" placeholder="juan@email.com" value={form.email}
                      onChange={e => set('email', e.target.value)} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Address</label>
                  <input className="input" placeholder="Street, City, Province" value={form.address}
                    onChange={e => set('address', e.target.value)} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Notes</label>
                  <textarea className="input resize-none" rows={2} placeholder="Allergies, preferences, etc."
                    value={form.notes} onChange={e => set('notes', e.target.value)} />
                </div>

                {error && (
                  <p className="text-xs font-mono text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
                )}

                <div className="flex gap-3 pt-1">
                  <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : isEdit ? 'Save Changes' : 'Create Customer'}
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
