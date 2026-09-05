'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Banknote, Building2, FileText, Plus, Trash2, Loader2 } from 'lucide-react'

export interface Payment {
  method: string
  amount: number
  reference?: string
  bankAccountId?: string
  creditDays?: number
}

interface BankAccount {
  id: string
  bankName: string
  accountName: string
  accountNumber: string
}

const METHODS = [
  { id: 'CASH',          label: 'Cash',          icon: Banknote,    color: 'text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  { id: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Building2,   color: 'text-amber-500 dark:text-amber-400 bg-amber-500/10 border-amber-500/20' },
  { id: 'CREDIT',        label: 'Credit',        icon: FileText,    color: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20' },
]

interface Props {
  total:     number
  onConfirm: (payments: Payment[]) => void
  onClose:   () => void
  loading:   boolean
}

export default function PaymentModal({ total, onConfirm, onClose, loading }: Props) {
  const [payments, setPayments] = useState<Payment[]>([{ method: 'CASH', amount: total }])
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(false)

  useEffect(() => {
    setLoadingAccounts(true)
    fetch('/api/bank-accounts')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setBankAccounts)
      .catch(() => setBankAccounts([]))
      .finally(() => setLoadingAccounts(false))
  }, [])

  function updatePayment(idx: number, patch: Partial<Payment>) {
    setPayments(p => p.map((item, i) => i === idx ? { ...item, ...patch } : item))
  }

  function addPayment() {
    setPayments(p => [...p, { method: 'CASH', amount: 0 }])
  }

  function removePayment(idx: number) {
    setPayments(p => p.filter((_, i) => i !== idx))
  }

  function selectMethod(method: string) {
    if (method === 'BANK_TRANSFER') {
      const defaultAccount = bankAccounts[0]?.id
      setPayments([{ method, amount: total, bankAccountId: defaultAccount }])
    } else if (method === 'CREDIT') {
      setPayments([{ method, amount: total, creditDays: 30 }])
    } else {
      setPayments([{ method, amount: total }])
    }
  }

  const totalPaid = payments.reduce((s, p) => s + (p.method === 'CREDIT' ? 0 : p.amount), 0)
  const totalCredit = payments.reduce((s, p) => s + (p.method === 'CREDIT' ? p.amount : 0), 0)
  const change    = totalPaid - total
  const isValid   = totalPaid + totalCredit >= total - 0.01 && payments.every(p => p.amount > 0) &&
    payments.filter(p => p.method === 'BANK_TRANSFER').every(p => p.bankAccountId) &&
    payments.filter(p => p.method === 'CREDIT').every(p => p.creditDays && p.creditDays > 0)

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
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Payment</h2>
            <p className="text-xs font-mono text-zinc-500 mt-0.5">
              Total due: <span className="text-emerald-500 dark:text-emerald-400 font-semibold">ETB {total.toFixed(2)}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-white/5 text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Quick method buttons */}
          <div className="grid grid-cols-3 gap-2">
            {METHODS.map(m => {
              const Icon = m.icon
              const selected = payments.length === 1 && payments[0].method === m.id
              return (
                <button
                  key={m.id}
                  onClick={() => selectMethod(m.id)}
                  className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg border text-xs font-mono transition-all ${
                    selected ? m.color : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-500 dark:hover:text-zinc-400'
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
                <div key={idx} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <select
                      className="input text-xs flex-shrink-0 w-36"
                      value={p.method}
                      onChange={e => {
                        const method = e.target.value
                        if (method === 'BANK_TRANSFER') {
                          updatePayment(idx, { method, bankAccountId: bankAccounts[0]?.id })
                        } else if (method === 'CREDIT') {
                          updatePayment(idx, { method, creditDays: 30 })
                        } else {
                          updatePayment(idx, { method })
                        }
                      }}
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
                      <button onClick={() => removePayment(idx)} className="text-zinc-700 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Bank account selector for bank transfers */}
                  {p.method === 'BANK_TRANSFER' && (
                    <div className="ml-10">
                      <select
                        className="input text-xs w-full"
                        value={p.bankAccountId || ''}
                        onChange={e => updatePayment(idx, { bankAccountId: e.target.value })}
                      >
                        <option value="">{loadingAccounts ? 'Loading accounts…' : 'Select bank account'}</option>
                        {bankAccounts.map(acc => (
                          <option key={acc.id} value={acc.id}>
                            {acc.bankName} — {acc.accountName} ({acc.accountNumber})
                          </option>
                        ))}
                      </select>
                      {bankAccounts.length === 0 && !loadingAccounts && (
                        <p className="text-[10px] font-mono text-amber-500 dark:text-amber-400 mt-1">No bank accounts configured. Add one in Settings.</p>
                      )}
                    </div>
                  )}

                  {/* Credit days selector for credit payments */}
                  {p.method === 'CREDIT' && (
                    <div className="ml-10 flex items-center gap-2">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Credit term</span>
                      <input
                        type="number" min={1} max={365}
                        className="input text-xs w-20"
                        value={p.creditDays || ''}
                        placeholder="Days"
                        onChange={e => updatePayment(idx, { creditDays: parseInt(e.target.value) || 0 })}
                      />
                      <span className="text-[10px] font-mono text-zinc-600">days</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <button onClick={addPayment} className="flex items-center gap-1.5 text-xs font-mono text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add payment method
          </button>

          {/* Summary */}
          <div className="bg-zinc-900 rounded-xl p-4 space-y-2 font-mono text-xs border border-zinc-200 dark:border-zinc-800">
            <div className="flex justify-between text-zinc-500">
              <span>Total Due</span><span>ETB {total.toFixed(2)}</span>
            </div>
            {totalPaid > 0 && (
              <div className="flex justify-between text-zinc-600 dark:text-zinc-300">
                <span>Paid Now</span>
                <span className="text-emerald-500 dark:text-emerald-400">ETB {totalPaid.toFixed(2)}</span>
              </div>
            )}
            {totalCredit > 0 && (
              <div className="flex justify-between text-zinc-600 dark:text-zinc-300">
                <span>On Credit</span>
                <span className="text-blue-600 dark:text-blue-400">ETB {totalCredit.toFixed(2)}</span>
              </div>
            )}
            {change > 0 && (
              <div className="flex justify-between font-semibold text-emerald-500 dark:text-emerald-400 pt-1 border-t border-zinc-200 dark:border-zinc-800">
                <span>Change</span><span>ETB {change.toFixed(2)}</span>
              </div>
            )}
            {(totalPaid + totalCredit) < total && (
              <div className="flex justify-between text-red-500 dark:text-red-400 pt-1 border-t border-zinc-200 dark:border-zinc-800">
                <span>Still owed</span><span>ETB {(total - totalPaid - totalCredit).toFixed(2)}</span>
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
