'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CreditCard, Banknote, Smartphone, Building2, Plus, Trash2, Loader2 } from 'lucide-react'

export interface Payment { method: string; amount: number; reference?: string }

const METHODS = [
  { id: 'CASH',          label: 'Cash',          icon: Banknote,    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  { id: 'CARD',          label: 'Card',          icon: CreditCard,  color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  { id: 'MOBILE_MONEY',  label: 'Mobile Money',  icon: Smartphone,  color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  { id: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Building2,   color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
]

interface Props {
  total:     number
  onConfirm: (payments: Payment[]) => void
  onClose:   () => void
  loading:   boolean
}

export default function PaymentModal({ total, onConfirm, onClose, loading }: Props) {
  const [payments, setPayments] = useState<Payment[]>([{ method: 'CASH', amount: total }])

  function updatePayment(idx: number, patch: Partial<Payment>) {
    setPayments(p => p.map((item, i) => i === idx ? { ...item, ...patch } : item))
  }

  function addPayment() {
    setPayments(p => [...p, { method: 'CASH', amount: 0 }])
  }

  function removePayment(idx: number) {
    setPayments(p => p.filter((_, i) => i !== idx))
  }

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0)
  const change    = totalPaid - total
  const isValid   = totalPaid >= total - 0.01 && payments.every(p => p.amount > 0)

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
        className="glass-card w-full max-w-md shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Payment</h2>
            <p className="text-xs font-mono text-zinc-500 mt-0.5">
              Total due: <span className="text-emerald-400 font-semibold">ETB {total.toFixed(2)}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-zinc-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Quick method buttons */}
          <div className="grid grid-cols-4 gap-2">
            {METHODS.map(m => {
              const Icon = m.icon
              const selected = payments.length === 1 && payments[0].method === m.id
              return (
                <button
                  key={m.id}
                  onClick={() => setPayments([{ method: m.id, amount: total }])}
                  className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg border text-xs font-mono transition-all ${
                    selected ? m.color : 'border-zinc-800 text-zinc-600 hover:border-zinc-700 hover:text-zinc-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[9px]">{m.label}</span>
                </button>
              )
            })}
          </div>

          {/* Payment lines */}
          <div className="space-y-2">
            {payments.map((p, idx) => {
              const cfg = METHODS.find(m => m.id === p.method) ?? METHODS[0]
              const Icon = cfg.icon
              return (
                <div key={idx} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <select
                    className="input text-xs flex-shrink-0 w-36"
                    value={p.method}
                    onChange={e => updatePayment(idx, { method: e.target.value })}
                  >
                    {METHODS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                  <input
                    type="number" min={0} step={0.01}
                    className="input text-xs text-right flex-1"
                    value={p.amount || ''}
                    placeholder="0.00"
                    onChange={e => updatePayment(idx, { amount: parseFloat(e.target.value) || 0 })}
                  />
                  {payments.length > 1 && (
                    <button onClick={() => removePayment(idx)} className="text-zinc-700 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          <button onClick={addPayment} className="flex items-center gap-1.5 text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add payment method
          </button>

          {/* Summary */}
          <div className="bg-zinc-900 rounded-xl p-4 space-y-2 font-mono text-xs border border-zinc-800">
            <div className="flex justify-between text-zinc-500">
              <span>Total Due</span><span>ETB {total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-zinc-300">
              <span>Total Paid</span>
              <span className={totalPaid >= total ? 'text-emerald-400' : 'text-red-400'}>ETB {totalPaid.toFixed(2)}</span>
            </div>
            {change > 0 && (
              <div className="flex justify-between font-semibold text-emerald-400 pt-1 border-t border-zinc-800">
                <span>Change</span><span>ETB {change.toFixed(2)}</span>
              </div>
            )}
            {totalPaid < total && (
              <div className="flex justify-between text-red-400 pt-1 border-t border-zinc-800">
                <span>Still owed</span><span>ETB {(total - totalPaid).toFixed(2)}</span>
              </div>
            )}
          </div>

          <button
            onClick={() => onConfirm(payments)}
            disabled={!isValid || loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" />Processing…</>
              : `Complete Sale · ETB ${total.toFixed(2)}`
            }
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
