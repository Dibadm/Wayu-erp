'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, Plus, TrendingUp } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Investment {
  id?: string
  name: string
  type: string
  amount: number
  expectedReturn: number
  startDate: string
  maturityDate?: string
  status: string
  notes?: string
}

interface Props {
  investment?: Investment
  trigger?: React.ReactNode
  onSuccess?: () => void
}

const TYPES = ['FIXED_DEPOSIT', 'STOCKS', 'BONDS', 'PROPERTY', 'OTHER']
const STATUSES = ['ACTIVE', 'MATURED', 'SOLD', 'LOST']

const EMPTY: Investment = { name: '', type: 'FIXED_DEPOSIT', amount: 0, expectedReturn: 0, startDate: '', maturityDate: '', status: 'ACTIVE', notes: '' }

export default function InvestmentModal({ investment, trigger, onSuccess }: Props) {
  const router = useRouter()
  const isEdit = !!investment?.id
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<Investment>(investment ?? EMPTY)

  useEffect(() => {
    if (!open) return
    setForm({
      ...investment ?? EMPTY,
      startDate: investment?.startDate ? new Date(investment.startDate).toISOString().slice(0, 10) : '',
      maturityDate: investment?.maturityDate ? new Date(investment.maturityDate).toISOString().slice(0, 10) : '',
    })
  }, [open, investment])

  function set(field: keyof Investment, value: string | number) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const url = isEdit ? `/api/investments?id=${investment!.id}` : '/api/investments'
      const method = 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount),
          expectedReturn: Number(form.expectedReturn),
          startDate: new Date(form.startDate).toISOString(),
          maturityDate: form.maturityDate ? new Date(form.maturityDate).toISOString() : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed'); return }
      setOpen(false)
      if (onSuccess) onSuccess()
      else router.refresh()
    } catch {
      setError('Network error.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div onClick={() => setOpen(true)} className="cursor-pointer">
        {trigger ?? (
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> {isEdit ? 'Edit Investment' : 'New Investment'}
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={e => e.target === e.currentTarget && setOpen(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.2 }}
              className="glass-card w-full max-w-lg p-6 shadow-2xl max-h-[85vh] overflow-y-auto">

              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  </div>
                  <h2 className="text-sm font-semibold text-zinc-100">{isEdit ? 'Edit Investment' : 'New Investment'}</h2>
                </div>
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-zinc-300 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Name *</label>
                  <input className="input" placeholder="Investment name" value={form.name} onChange={e => set('name', e.target.value)} required />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Type *</label>
                    <select className="input" value={form.type} onChange={e => set('type', e.target.value)}>
                      {TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Status</label>
                    <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Amount *</label>
                    <input type="number" step="0.01" className="input" placeholder="0.00" value={form.amount} onChange={e => set('amount', parseFloat(e.target.value) || 0)} required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Expected Return</label>
                    <input type="number" step="0.01" className="input" placeholder="0.00" value={form.expectedReturn} onChange={e => set('expectedReturn', parseFloat(e.target.value) || 0)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Start Date *</label>
                    <input type="date" className="input" value={form.startDate} onChange={e => set('startDate', e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Maturity Date</label>
                    <input type="date" className="input" value={form.maturityDate} onChange={e => set('maturityDate', e.target.value)} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Notes</label>
                  <textarea className="input resize-none" rows={2} placeholder="Optional details..." value={form.notes} onChange={e => set('notes', e.target.value)} />
                </div>

                {error && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                    <p className="text-xs font-mono text-red-400">{error}</p>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-1">
                  <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : isEdit ? 'Save Changes' : 'Save Investment'}
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
