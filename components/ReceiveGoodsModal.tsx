'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PackageCheck, X, Loader2, CheckCircle, AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface POItem {
  id: string
  quantityOrdered: number
  quantityReceived: number
  batchNumber: string | null
  expiryDate: string | null
  product: { name: string; sku: string; unit: string }
}

interface Location { id: string; name: string; code: string }

interface Props { poId: string; poNumber: string; items: POItem[] }

export default function ReceiveGoodsModal({ poId, poNumber, items }: Props) {
  const router = useRouter()
  const [open, setOpen]         = useState(false)
  const [loading, setLoading]   = useState(false)
  const [locations, setLocations] = useState<Location[]>([])
  const [locationId, setLocationId] = useState('')
  const [receiving, setReceiving] = useState<Record<string, { qty: number; batch: string; expiry: string }>>({})
  const [result, setResult]     = useState<{ received: string[]; errors: string[] } | null>(null)
  const [error, setError]       = useState('')

  const pendingItems = items.filter(i => i.quantityReceived < i.quantityOrdered)

  useEffect(() => {
    if (!open) return
    fetch('/api/locations').then(r => r.json()).then(data => {
      setLocations(data)
      if (data.length === 1) setLocationId(data[0].id)
    })
    // Pre-fill receiving quantities with remaining amounts
    const init: typeof receiving = {}
    pendingItems.forEach(item => {
      init[item.id] = {
        qty:    item.quantityOrdered - item.quantityReceived,
        batch:  item.batchNumber ?? '',
        expiry: item.expiryDate ? item.expiryDate.split('T')[0] : '',
      }
    })
    setReceiving(init)
    setResult(null)
  }, [open])

  async function handleSubmit() {
    if (!locationId) { setError('Please select a receiving location.'); return }
    setLoading(true); setError('')

    const itemsToSend = pendingItems
      .filter(item => (receiving[item.id]?.qty ?? 0) > 0)
      .map(item => ({
        purchaseOrderItemId: item.id,
        quantityReceived:    receiving[item.id].qty,
        batchNumber:         receiving[item.id].batch || undefined,
        expiryDate:          receiving[item.id].expiry ? new Date(receiving[item.id].expiry).toISOString() : undefined,
      }))

    if (!itemsToSend.length) { setError('No items to receive.'); setLoading(false); return }

    try {
      const res  = await fetch(`/api/purchase-orders/${poId}/receive`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId, items: itemsToSend }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed'); return }
      setResult(data)
      router.refresh()
    } catch { setError('Network error.') }
    finally { setLoading(false) }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} disabled={!pendingItems.length}
        className="btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
        <PackageCheck className="w-4 h-4" /> Receive Goods
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={e => e.target === e.currentTarget && setOpen(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.2 }}
              className="glass-card w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">

              <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 flex-shrink-0">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-100">Receive Goods — {poNumber}</h2>
                  <p className="text-xs font-mono text-zinc-500 mt-0.5">Stock will update automatically on confirm</p>
                </div>
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-500"><X className="w-4 h-4" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {result ? (
                  <div className="space-y-3">
                    {result.received.length > 0 && (
                      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2"><CheckCircle className="w-4 h-4 text-emerald-400" /><p className="text-xs font-semibold text-emerald-400">Stock Updated</p></div>
                        {result.received.map(r => <p key={r} className="text-xs font-mono text-emerald-300">✓ {r}</p>)}
                      </div>
                    )}
                    {result.errors.length > 0 && (
                      <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-red-400" /><p className="text-xs font-semibold text-red-400">Issues</p></div>
                        {result.errors.map(e => <p key={e} className="text-xs font-mono text-red-300">✗ {e}</p>)}
                      </div>
                    )}
                    <button onClick={() => setOpen(false)} className="btn-primary w-full">Done</button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Receiving Location *</label>
                      <select className="input" value={locationId} onChange={e => setLocationId(e.target.value)}>
                        <option value="">Select location...</option>
                        {locations.map(l => <option key={l.id} value={l.id}>{l.name} ({l.code})</option>)}
                      </select>
                    </div>

                    {pendingItems.map(item => {
                      const rec = receiving[item.id] ?? { qty: 0, batch: '', expiry: '' }
                      const remaining = item.quantityOrdered - item.quantityReceived
                      return (
                        <div key={item.id} className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-xs font-medium text-zinc-200">{item.product.name}</p>
                              <p className="sku mt-0.5">{item.product.sku}</p>
                            </div>
                            <span className="text-xs font-mono text-zinc-500">{item.quantityReceived}/{item.quantityOrdered} received</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <label className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Qty to Receive</label>
                              <input type="number" min={0} max={remaining} className="input text-xs py-1.5"
                                value={rec.qty}
                                onChange={e => setReceiving(prev => ({ ...prev, [item.id]: { ...prev[item.id], qty: Math.min(parseInt(e.target.value) || 0, remaining) } }))} />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Batch No.</label>
                              <input className="input text-xs py-1.5" placeholder="optional" value={rec.batch}
                                onChange={e => setReceiving(prev => ({ ...prev, [item.id]: { ...prev[item.id], batch: e.target.value } }))} />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Expiry Date</label>
                              <input type="date" className="input text-xs py-1.5" value={rec.expiry}
                                onChange={e => setReceiving(prev => ({ ...prev, [item.id]: { ...prev[item.id], expiry: e.target.value } }))} />
                            </div>
                          </div>
                        </div>
                      )
                    })}

                    {error && <p className="text-xs font-mono text-red-400">{error}</p>}
                  </>
                )}
              </div>

              {!result && (
                <div className="flex items-center gap-3 px-5 py-4 border-t border-zinc-800 flex-shrink-0">
                  <button onClick={handleSubmit} disabled={loading} className="btn-primary flex items-center gap-2">
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Processing...</> : <><PackageCheck className="w-4 h-4" />Confirm Receipt</>}
                  </button>
                  <button onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
