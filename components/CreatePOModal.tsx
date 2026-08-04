'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Loader2, Trash2, ShoppingCart } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Supplier { id: string; name: string }
interface Product  { id: string; name: string; sku: string; unit: string; costPrice: number | null }

interface LineItem {
  productId: string; productName: string; sku: string; unit: string
  quantityOrdered: number; unitCost: number
  batchNumber: string; expiryDate: string
}

export default function CreatePOModal() {
  const router = useRouter()
  const [open, setOpen]         = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts]   = useState<Product[]>([])
  const [supplierId, setSupplierId]           = useState('')
  const [expectedDelivery, setExpectedDelivery] = useState('')
  const [notes, setNotes]       = useState('')
  const [items, setItems]       = useState<LineItem[]>([])
  const [productSearch, setProductSearch] = useState('')

  useEffect(() => {
    if (!open) return
    Promise.all([
      fetch('/api/suppliers?status=ACTIVE').then(r => r.json()),
      fetch('/api/products').then(r => r.json()),
    ]).then(([s, p]) => {
      setSuppliers(s)
      setProducts(p)
    })
  }, [open])

  function addProduct(p: Product) {
    if (items.find(i => i.productId === p.id)) return
    setItems(prev => [...prev, {
      productId: p.id, productName: p.name, sku: p.sku, unit: p.unit,
      quantityOrdered: 1, unitCost: Number(p.costPrice ?? 0),
      batchNumber: '', expiryDate: '',
    }])
    setProductSearch('')
  }

  function updateItem(idx: number, field: keyof LineItem, value: string | number) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  function removeItem(idx: number) { setItems(prev => prev.filter((_, i) => i !== idx)) }

  const total = items.reduce((s, i) => s + i.quantityOrdered * i.unitCost, 0)

  const filteredProducts = productSearch.length > 1
    ? products.filter(p =>
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.sku.toLowerCase().includes(productSearch.toLowerCase())
      ).slice(0, 8)
    : []

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!supplierId) { setError('Please select a supplier.'); return }
    if (!items.length) { setError('Add at least one item.'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId,
          expectedDelivery: expectedDelivery ? new Date(expectedDelivery).toISOString() : undefined,
          notes,
          items: items.map(i => ({
            productId:       i.productId,
            quantityOrdered: i.quantityOrdered,
            unitCost:        i.unitCost,
            batchNumber:     i.batchNumber || undefined,
            expiryDate:      i.expiryDate ? new Date(i.expiryDate).toISOString() : undefined,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed'); return }
      setOpen(false)
      setSupplierId(''); setNotes(''); setExpectedDelivery(''); setItems([])
      router.push(`/purchase-orders/${data.id}`)
    } catch { setError('Network error.') }
    finally { setLoading(false) }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary flex items-center gap-2">
        <ShoppingCart className="w-4 h-4" /> New Purchase Order
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={e => e.target === e.currentTarget && setOpen(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.2 }}
              className="glass-card w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 flex-shrink-0">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-100">Create Purchase Order</h2>
                  <p className="text-xs font-mono text-zinc-500 mt-0.5">PO number assigned automatically</p>
                </div>
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-zinc-300 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* Supplier + dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Supplier *</label>
                    <select className="input" value={supplierId} onChange={e => setSupplierId(e.target.value)} required>
                      <option value="">Select supplier...</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Expected Delivery</label>
                    <input type="date" className="input" value={expectedDelivery}
                      onChange={e => setExpectedDelivery(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Notes</label>
                  <input className="input" placeholder="Payment terms, delivery instructions..."
                    value={notes} onChange={e => setNotes(e.target.value)} />
                </div>

                {/* Product search */}
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Add Products</label>
                  <div className="relative">
                    <input className="input" placeholder="Search by name or SKU..."
                      value={productSearch} onChange={e => setProductSearch(e.target.value)} />
                    {filteredProducts.length > 0 && (
                      <div className="absolute top-full mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg z-10 divide-y divide-zinc-800 shadow-xl">
                        {filteredProducts.map(p => (
                          <button key={p.id} type="button" onClick={() => addProduct(p)}
                            className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors text-left">
                            <div>
                              <p className="text-xs text-zinc-200">{p.name}</p>
                              <p className="sku mt-0.5">{p.sku}</p>
                            </div>
                            <Plus className="w-3.5 h-3.5 text-zinc-500" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Line items */}
                {items.length > 0 && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-12 gap-2 px-2">
                      {['Product', 'Qty', 'Unit Cost', 'Batch No.', 'Expiry', ''].map(h => (
                        <p key={h} className={`text-[10px] font-mono text-zinc-600 uppercase tracking-widest ${h === 'Product' ? 'col-span-3' : h === '' ? 'col-span-1' : 'col-span-2'}`}>{h}</p>
                      ))}
                    </div>
                    {items.map((item, idx) => (
                      <div key={item.productId} className="grid grid-cols-12 gap-2 items-center bg-zinc-900/40 border border-zinc-800 rounded-lg p-2">
                        <div className="col-span-3">
                          <p className="text-xs text-zinc-200 truncate">{item.productName}</p>
                          <p className="sku mt-0.5">{item.sku}</p>
                        </div>
                        <div className="col-span-2">
                          <input type="number" min={1} className="input text-xs py-1.5" value={item.quantityOrdered}
                            onChange={e => updateItem(idx, 'quantityOrdered', parseInt(e.target.value) || 1)} />
                        </div>
                        <div className="col-span-2">
                          <input type="number" min={0} step={0.01} className="input text-xs py-1.5" value={item.unitCost}
                            onChange={e => updateItem(idx, 'unitCost', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className="col-span-2">
                          <input className="input text-xs py-1.5" placeholder="optional" value={item.batchNumber}
                            onChange={e => updateItem(idx, 'batchNumber', e.target.value)} />
                        </div>
                        <div className="col-span-2">
                          <input type="date" className="input text-xs py-1.5" value={item.expiryDate}
                            onChange={e => updateItem(idx, 'expiryDate', e.target.value)} />
                        </div>
                        <button type="button" onClick={() => removeItem(idx)}
                          className="col-span-1 flex justify-center text-zinc-600 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    {/* Total */}
                    <div className="flex justify-end pt-2 border-t border-zinc-800">
                      <div className="text-right">
                        <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Total Cost</p>
                        <p className="stat-num text-lg text-zinc-100">ETB {total.toLocaleString('en-ET', { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                    <p className="text-xs font-mono text-red-400">{error}</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center gap-3 px-6 py-4 border-t border-zinc-800 flex-shrink-0">
                <button onClick={handleSubmit} disabled={loading || !items.length || !supplierId}
                  className="btn-primary flex items-center gap-2">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Creating...</> : 'Create Purchase Order'}
                </button>
                <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
                {items.length > 0 && <p className="ml-auto text-xs font-mono text-zinc-500">{items.length} item{items.length !== 1 ? 's' : ''}</p>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
