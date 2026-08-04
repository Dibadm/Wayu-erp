'use client'

import { useState } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'

const CATEGORIES = ['Antibiotics', 'Analgesics', 'NSAIDs', 'Antacids', 'Antidiabetics', 'Antihypertensives', 'Antihistamines', 'Vitamins', 'Cough & Cold', 'General']

export default function AddProductModal() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    sku: '', name: '', description: '', category: 'General',
    quantity: 0, minStockLevel: 10, unit: 'tablets',
  })

  function set(field: string, value: string | number) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to create product.')
      } else {
        setOpen(false)
        setForm({ sku: '', name: '', description: '', category: 'General', quantity: 0, minStockLevel: 10, unit: 'tablets' })
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
        <Plus className="w-4 h-4" /> Add Product
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Add New Product" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">SKU *</label>
              <input className="input" placeholder="WY-AMX-500" value={form.sku}
                onChange={e => set('sku', e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Category</label>
              <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Product Name *</label>
            <input className="input" placeholder="Amoxicillin 500mg" value={form.name}
              onChange={e => set('name', e.target.value)} required />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Description</label>
            <input className="input" placeholder="Optional description" value={form.description}
              onChange={e => set('description', e.target.value)} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Initial Qty</label>
              <input className="input" type="number" min={0} value={form.quantity}
                onChange={e => set('quantity', parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Min Level</label>
              <input className="input" type="number" min={0} value={form.minStockLevel}
                onChange={e => set('minStockLevel', parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Unit</label>
              <select className="input" value={form.unit} onChange={e => set('unit', e.target.value)}>
                {['tablets','capsules','vials','bottles','units','ml','mg'].map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Pricing fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Cost Price (ETB)</label>
              <input className="input" type="number" min={0} step="0.01" placeholder="0.00"
                value={(form as any).costPrice ?? ''}
                 onChange={e => set('costPrice', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Selling Price (ETB)</label>
              <input className="input" type="number" min={0} step="0.01" placeholder="0.00"
                value={(form as any).sellingPrice ?? ''}
                 onChange={e => set('sellingPrice', parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
              <p className="text-xs font-mono text-red-400">{error}</p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : 'Create Product'}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
          </div>
        </form>
      </Modal>
    </>
  )
}
