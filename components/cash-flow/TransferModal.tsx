'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, Plus, ArrowLeftRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  trigger?: React.ReactNode
  onSuccess?: () => void
}

const EMPTY = { fromAccountId: '', toAccountId: '', amount: '', description: '', reference: '' }

export default function TransferModal({ trigger, onSuccess }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [accounts, setAccounts] = useState<{ id: string; accountName: string; currentBalance: number }[]>([])
  const [form, setForm] = useState(EMPTY)

  useEffect(() => {
    if (!open) return
    setForm(EMPTY)
    fetch('/api/bank-accounts').then(r => r.json()).then(setAccounts).catch(() => setAccounts([]))
  }, [open])

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.fromAccountId === form.toAccountId) {
      setError('Source and target accounts must differ')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/bank-transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: Number(form.amount) }),
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
            <Plus className="w-4 h-4" /> New Transfer
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
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <ArrowLeftRight className="w-4 h-4 text-blue-400" />
                  </div>
                  <h2 className="text-sm font-semibold text-zinc-100">New Bank Transfer</h2>
                </div>
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-zinc-300 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">From Account *</label>
                  <select className="input" value={form.fromAccountId} onChange={e => set('fromAccountId', e.target.value)} required>
                    <option value="">Select account</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.accountName} (Balance: {Number(a.currentBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB)</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">To Account *</label>
                  <select className="input" value={form.toAccountId} onChange={e => set('toAccountId', e.target.value)} required>
                    <option value="">Select account</option>
                    {accounts.filter(a => a.id !== form.fromAccountId).map(a => <option key={a.id} value={a.id}>{a.accountName}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Amount *</label>
                  <input type="number" step="0.01" className="input" placeholder="0.00" value={form.amount} onChange={e => set('amount', e.target.value)} required />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Reference</label>
                  <input className="input" placeholder="REF-001" value={form.reference} onChange={e => set('reference', e.target.value)} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Description</label>
                  <textarea className="input resize-none" rows={2} placeholder="Optional details..." value={form.description} onChange={e => set('description', e.target.value)} />
                </div>

                {error && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                    <p className="text-xs font-mono text-red-400">{error}</p>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-1">
                  <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Transferring...</> : 'Transfer'}
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
