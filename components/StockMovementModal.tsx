'use client'

import { useState } from 'react'
import { ArrowLeftRight, Loader2, ArrowDownLeft, ArrowUpRight, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'

type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT'

interface Props {
  productId: string
  productName: string
  userId: string
}

const TYPE_CONFIG = {
  IN:         { label: 'Stock In',    icon: ArrowDownLeft,  color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  OUT:        { label: 'Stock Out',   icon: ArrowUpRight,   color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20' },
  ADJUSTMENT: { label: 'Adjustment',  icon: RefreshCw,      color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20' },
}

export default function StockMovementModal({ productId, productName }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [type, setType] = useState<MovementType>('IN')
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, type, quantity, notes }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to record movement.')
      } else {
        setOpen(false)
        setQuantity(1)
        setNotes('')
        router.refresh()
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary flex items-center gap-2">
        <ArrowLeftRight className="w-4 h-4" /> Record Movement
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Record Stock Movement" size="md">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Movement type selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Movement Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(TYPE_CONFIG) as MovementType[]).map(t => {
                const { label, icon: Icon, color, bg } = TYPE_CONFIG[t]
                const active = type === t
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-mono transition-all duration-150 ${
                      active ? `${bg} ${color}` : 'border-zinc-800 text-zinc-600 hover:border-zinc-700 hover:text-zinc-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Quantity */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Quantity *</label>
            <input
              className="input text-lg"
              type="number"
              min={1}
              value={quantity}
              onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              required
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Notes</label>
            <textarea
              className="input resize-none"
              rows={2}
              placeholder="e.g. Received from supplier, batch #..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
              <p className="text-xs font-mono text-red-400">{error}</p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Recording...</> : 'Record Movement'}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
          </div>
        </form>
      </Modal>
    </>
  )
}
