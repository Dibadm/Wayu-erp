'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, Plus, Target } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Budget {
  id?: string
  category: string
  periodLabel?: string
  periodStart: string
  periodEnd: string
  plannedAmount: number
}

interface Props {
  budget?: Budget
  trigger?: React.ReactNode
  onSuccess?: () => void
}

const CATEGORIES = ['SALES', 'PURCHASE', 'SALARY', 'FUEL', 'TAX', 'UTILITIES', 'RENT', 'TRANSPORT', 'MISCELLANEOUS']

const EMPTY: Budget = { category: 'SALES', periodLabel: '', periodStart: '', periodEnd: '', plannedAmount: 0 }

export default function BudgetModal({ budget, trigger, onSuccess }: Props) {
  const router = useRouter()
  const isEdit = !!budget?.id
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<Budget>(budget ?? EMPTY)

  useEffect(() => {
    if (!open) return
    setForm({
      ...budget ?? EMPTY,
      periodStart: budget?.periodStart ? new Date(budget.periodStart).toISOString().slice(0, 10) : '',
      periodEnd: budget?.periodEnd ? new Date(budget.periodEnd).toISOString().slice(0, 10) : '',
    })
  }, [open, budget])

  function set(field: keyof Budget, value: string | number) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const url = isEdit ? `/api/budgets` : '/api/budgets'
      const method = 'POST'
      const pl = form.periodLabel || form.periodStart?.slice(0, 7) || 'Budget'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, plannedAmount: Number(form.plannedAmount), periodLabel: pl }),
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
            <Plus className="w-4 h-4" /> {isEdit ? 'Edit Budget' : 'New Budget'}
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
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                    <Target className="w-4 h-4 text-purple-400" />
                  </div>
                  <h2 className="text-sm font-semibold text-zinc-100">{isEdit ? 'Edit Budget' : 'New Budget'}</h2>
                </div>
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-zinc-300 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Category *</label>
                  <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Period Label</label>
                  <input className="input" placeholder="e.g. Jan 2026" value={form.periodLabel} onChange={e => set('periodLabel', e.target.value)} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Period Start *</label>
                    <input type="date" className="input" value={form.periodStart} onChange={e => set('periodStart', e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Period End *</label>
                    <input type="date" className="input" value={form.periodEnd} onChange={e => set('periodEnd', e.target.value)} required />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Planned Amount *</label>
                  <input type="number" step="0.01" className="input" placeholder="0.00" value={form.plannedAmount} onChange={e => set('plannedAmount', parseFloat(e.target.value) || 0)} required />
                </div>

                {error && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                    <p className="text-xs font-mono text-red-400">{error}</p>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-1">
                  <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : isEdit ? 'Save Changes' : 'Save Budget'}
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
