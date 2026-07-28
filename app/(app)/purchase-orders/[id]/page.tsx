'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft, ShoppingCart, Package, CheckCircle, Loader2,
  AlertTriangle, Building2, Calendar, FileText, ArrowDownLeft
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface POItem {
  id: string
  quantityOrdered: number
  quantityReceived: number
  unitCost: number
  totalCost: number
  batchNumber: string | null
  expiryDate: string | null
  notes: string | null
  product: { id: string; name: string; sku: string; unit: string; costPrice: number | null }
}

interface PO {
  id: string; poNumber: string; status: string
  orderDate: string; expectedDelivery: string | null; notes: string | null
  totalCost: number; createdAt: string
  supplier: { id: string; name: string; contactPerson: string | null; email: string | null; phone: string | null }
  createdBy: { name: string | null; email: string }
  items: POItem[]
}

interface Location { id: string; code: string; name: string }

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  DRAFT:              { label: 'Draft',    cls: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
  PENDING:            { label: 'Pending',  cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  APPROVED:           { label: 'Approved', cls: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  ORDERED:            { label: 'Ordered',  cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  PARTIALLY_RECEIVED: { label: 'Partial',  cls: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  COMPLETED:          { label: 'Completed',cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  CANCELLED:          { label: 'Cancelled',cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
}

const STATUS_FLOW = ['DRAFT', 'PENDING', 'APPROVED', 'ORDERED']
const TERMINAL    = ['COMPLETED', 'CANCELLED']

// ─── Component ─────────────────────────────────────────────────────────────────

export default function PODetailPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()

  const [po, setPO]              = useState<PO | null>(null)
  const [locations, setLocations]= useState<Location[]>([])
  const [loading, setLoading]    = useState(true)
  const [showReceive, setShowReceive] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)
  const [error, setError]        = useState('')

  // Receive form state
  const [receiveLocationId, setReceiveLocationId] = useState('')
  const [receiveQtys, setReceiveQtys]   = useState<Record<string, number>>({})
  const [receiveBatch, setReceiveBatch] = useState<Record<string, string>>({})
  const [receiveExpiry, setReceiveExpiry]= useState<Record<string, string>>({})
  const [receiving, setReceiving]       = useState(false)
  const [receiveResult, setReceiveResult]= useState<{ success: boolean; received: string[]; errors: string[] } | null>(null)

  async function load() {
    setLoading(true)
    const [poRes, locRes] = await Promise.all([
      fetch(`/api/purchase-orders/${id}`),
      fetch('/api/locations'),
    ])
    if (poRes.ok) {
      const data = await poRes.json()
      setPO(data)
      // Pre-fill receive quantities with remaining
      const qtys: Record<string, number> = {}
      data.items.forEach((item: POItem) => {
        qtys[item.id] = item.quantityOrdered - item.quantityReceived
      })
      setReceiveQtys(qtys)
    }
    if (locRes.ok) setLocations(await locRes.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function advanceStatus(newStatus: string) {
    setStatusLoading(true)
    setError('')
    const res = await fetch(`/api/purchase-orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) await load()
    else { const d = await res.json(); setError(d.error ?? 'Failed') }
    setStatusLoading(false)
  }

  async function handleReceive() {
    if (!receiveLocationId) { setError('Please select a receiving location.'); return }
    const items = po!.items
      .filter(item => (receiveQtys[item.id] ?? 0) > 0)
      .map(item => ({
        purchaseOrderItemId: item.id,
        quantityReceived:    receiveQtys[item.id] ?? 0,
        batchNumber:         receiveBatch[item.id] || undefined,
        expiryDate:          receiveExpiry[item.id] ? new Date(receiveExpiry[item.id]).toISOString() : undefined,
      }))

    if (!items.length) { setError('No quantities entered.'); return }

    setReceiving(true)
    setError('')
    const res = await fetch(`/api/purchase-orders/${id}/receive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locationId: receiveLocationId, items }),
    })
    const data = await res.json()
    setReceiveResult(data)
    setReceiving(false)
    if (data.success) {
      await load()
      setShowReceive(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
      </div>
    )
  }

  if (!po) return <div className="text-zinc-500 font-mono text-sm py-10">Purchase order not found.</div>

  const cfg       = STATUS_CONFIG[po.status] ?? STATUS_CONFIG.DRAFT
  const isTerminal= TERMINAL.includes(po.status)
  const canReceive= ['APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED'].includes(po.status)
  const nextStatus= STATUS_FLOW[STATUS_FLOW.indexOf(po.status) + 1]

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Back */}
      <Link href="/purchase-orders" className="inline-flex items-center gap-1 text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors">
        <ChevronLeft className="w-3 h-3" /> Purchase Orders
      </Link>

      {/* PO header card */}
      <div className="glass-card p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-lg text-blue-400 font-semibold">{po.poNumber}</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono border ${cfg.cls}`}>{cfg.label}</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 mb-1">
              <Building2 className="w-3.5 h-3.5" />
              {po.supplier.name}
              {po.supplier.contactPerson && ` · ${po.supplier.contactPerson}`}
            </div>
            {po.expectedDelivery && (
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
                <Calendar className="w-3.5 h-3.5" />
                Expected: {formatDate(po.expectedDelivery)}
              </div>
            )}
            {po.notes && (
              <div className="flex items-start gap-2 text-xs text-zinc-500 mt-2">
                <FileText className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                {po.notes}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 items-end">
            <div className="text-right">
              <p className="text-xs font-mono text-zinc-600">Total Cost</p>
              <p className="stat-num text-xl text-zinc-100">
                ₱{Number(po.totalCost).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              {!isTerminal && nextStatus && (
                <button
                  onClick={() => advanceStatus(nextStatus)}
                  disabled={statusLoading}
                  className="btn-primary flex items-center gap-1.5 text-xs"
                >
                  {statusLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Advance to {STATUS_CONFIG[nextStatus]?.label}
                </button>
              )}
              {canReceive && (
                <button
                  onClick={() => setShowReceive(v => !v)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/15 rounded-lg text-xs font-medium transition-colors"
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  Receive Goods
                </button>
              )}
              {!isTerminal && (
                <button
                  onClick={() => advanceStatus('CANCELLED')}
                  disabled={statusLoading}
                  className="btn-danger text-xs"
                >
                  Cancel PO
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Meta row */}
        <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-zinc-800 text-xs font-mono">
          <div>
            <p className="text-zinc-600 uppercase tracking-widest text-[10px] mb-1">Created By</p>
            <p className="text-zinc-400">{po.createdBy.name ?? po.createdBy.email.split('@')[0]}</p>
          </div>
          <div>
            <p className="text-zinc-600 uppercase tracking-widest text-[10px] mb-1">Order Date</p>
            <p className="text-zinc-400">{formatDate(po.orderDate)}</p>
          </div>
          <div>
            <p className="text-zinc-600 uppercase tracking-widest text-[10px] mb-1">Items</p>
            <p className="text-zinc-400">{po.items.length} product{po.items.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-xs font-mono text-red-400">{error}</p>
        </div>
      )}

      {receiveResult && (
        <div className={`px-4 py-3 rounded-xl border text-xs font-mono space-y-1 ${receiveResult.success ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
          {receiveResult.received.map((r, i) => <p key={i} className="text-emerald-400">✓ {r}</p>)}
          {receiveResult.errors.map((e, i) => <p key={i} className="text-red-400">✗ {e}</p>)}
        </div>
      )}

      {/* Receive Goods form */}
      <AnimatePresence>
        {showReceive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-100">Receive Goods</h2>
              <p className="text-xs font-mono text-zinc-500 mt-0.5">Enter quantities received. Inventory and batches will be updated automatically.</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5 max-w-xs">
                <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Receiving Location *</label>
                <select className="input" value={receiveLocationId} onChange={e => setReceiveLocationId(e.target.value)}>
                  <option value="">Select location…</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.code} — {l.name}</option>)}
                </select>
              </div>

              <div className="space-y-3">
                {po.items.map(item => {
                  const remaining = item.quantityOrdered - item.quantityReceived
                  if (remaining <= 0) return null
                  return (
                    <div key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-xs font-medium text-zinc-200">{item.product.name}</p>
                          <p className="sku mt-0.5">{item.product.sku}</p>
                        </div>
                        <div className="text-right text-xs font-mono text-zinc-500">
                          <p>{item.quantityReceived}/{item.quantityOrdered} received</p>
                          <p className="text-zinc-600">{remaining} remaining</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Qty to Receive</label>
                          <input className="input text-xs" type="number" min={0} max={remaining}
                            value={receiveQtys[item.id] ?? 0}
                            onChange={e => setReceiveQtys(p => ({ ...p, [item.id]: parseInt(e.target.value) || 0 }))} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Batch No.</label>
                          <input className="input text-xs" placeholder={item.batchNumber ?? 'optional'}
                            value={receiveBatch[item.id] ?? ''}
                            onChange={e => setReceiveBatch(p => ({ ...p, [item.id]: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Expiry Date</label>
                          <input className="input text-xs" type="date"
                            value={receiveExpiry[item.id] ?? (item.expiryDate?.split('T')[0] ?? '')}
                            onChange={e => setReceiveExpiry(p => ({ ...p, [item.id]: e.target.value }))} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={handleReceive} disabled={receiving} className="btn-primary flex items-center gap-2">
                  {receiving ? <><Loader2 className="w-4 h-4 animate-spin" />Processing…</> : <><CheckCircle className="w-4 h-4" />Confirm Receipt</>}
                </button>
                <button onClick={() => setShowReceive(false)} className="btn-ghost">Cancel</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Line items table */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-100">Order Items</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                {['Product', 'Ordered', 'Received', 'Remaining', 'Unit Cost', 'Total', 'Batch', 'Expiry'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {po.items.map(item => {
                const remaining = item.quantityOrdered - item.quantityReceived
                const complete  = remaining <= 0
                return (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-zinc-200 font-medium text-xs">{item.product.name}</p>
                      <p className="sku mt-0.5">{item.product.sku}</p>
                    </td>
                    <td className="px-5 py-3 stat-num text-sm text-zinc-300">{item.quantityOrdered}</td>
                    <td className="px-5 py-3 stat-num text-sm text-emerald-400">{item.quantityReceived}</td>
                    <td className="px-5 py-3">
                      <span className={`stat-num text-sm ${complete ? 'text-zinc-600' : 'text-amber-400'}`}>
                        {remaining}
                      </span>
                      {complete && <span className="ml-1.5 text-[10px] font-mono text-emerald-500">✓</span>}
                    </td>
                    <td className="px-5 py-3 stat-num text-xs text-zinc-400">
                      ₱{Number(item.unitCost).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3 stat-num text-xs text-zinc-300">
                      ₱{Number(item.totalCost).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-zinc-500">{item.batchNumber ?? '—'}</td>
                    <td className="px-5 py-3 font-mono text-xs text-zinc-500">
                      {item.expiryDate ? item.expiryDate.split('T')[0] : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
