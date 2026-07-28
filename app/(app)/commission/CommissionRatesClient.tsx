'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Save, X } from 'lucide-react'
import { CommissionScope } from '@prisma/client'

interface Rate {
  id: string
  scope: CommissionScope
  salespersonId?: string | null
  salesperson?: { id: string; name: string | null; email: string } | null
  productId?: string | null
  product?: { id: string; name: string; sku: string } | null
  tierFromQty: number
  tierToQty: number | null
  rate: number
  active: boolean
  createdAt: string
}

interface Product { id: string; name: string; sku: string }
interface User { id: string; name: string; email: string; role: string }

const SCOPES: { value: CommissionScope; label: string }[] = [
  { value: 'GLOBAL', label: 'Global' },
  { value: 'SALESPERSON', label: 'Per Salesperson' },
  { value: 'PRODUCT', label: 'Per Product' },
  { value: 'COMBO', label: 'Combo (Salesperson + Product)' },
]

const SCOPE_LABELS: Record<string, string> = {
  GLOBAL: 'Global',
  SALESPERSON: 'Per Salesperson',
  PRODUCT: 'Per Product',
  COMBO: 'Combo',
}

export default function CommissionRatesClient({ initialRates, products, users }: { initialRates: Rate[]; products: Product[]; users: User[] }) {
  const [rates, setRates] = useState<Rate[]>(initialRates)
  const [form, setForm] = useState({
    id: '',
    scope: 'GLOBAL' as CommissionScope,
    salespersonId: '',
    productId: '',
    tierFromQty: 0,
    tierToQty: '',
    rate: 0,
    active: true,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => { setRates(initialRates) }, [initialRates])

  const resetForm = () => setForm({
    id: '', scope: 'GLOBAL', salespersonId: '', productId: '', tierFromQty: 0, tierToQty: '', rate: 0, active: true,
  })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const payload: any = {
      scope: form.scope,
      tierFromQty: form.tierFromQty,
      tierToQty: form.tierToQty === '' ? null : Number(form.tierToQty),
      rate: Number(form.rate),
      active: form.active,
    }
    if (form.scope === 'SALESPERSON' || form.scope === 'COMBO') payload.salespersonId = form.salespersonId
    if (form.scope === 'PRODUCT' || form.scope === 'COMBO') payload.productId = form.productId

    const url = form.id ? `/api/commission-rates` : `/api/commission-rates`
    const method = form.id ? 'PATCH' : 'POST'
    const body = form.id ? { ...payload, id: form.id } : payload

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const saved = await res.json()
      setRates(prev => {
        const idx = prev.findIndex(r => r.id === saved.id)
        const next = [...prev]
        if (idx >= 0) next[idx] = saved
        else next.push(saved)
        return next.sort((a, b) => a.scope.localeCompare(b.scope) || a.tierFromQty - b.tierFromQty)
      })
      resetForm()
    }
    setSaving(false)
  }

  const edit = (r: Rate) => {
    setForm({
      id: r.id,
      scope: r.scope,
      salespersonId: r.salespersonId ?? '',
      productId: r.productId ?? '',
      tierFromQty: r.tierFromQty,
      tierToQty: r.tierToQty?.toString() ?? '',
      rate: Number(r.rate),
      active: r.active,
    })
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this commission rate?')) return
    await fetch(`/api/commission-rates?id=${id}`, { method: 'DELETE' })
    setRates(prev => prev.filter(r => r.id !== id))
  }

  const fmt = (n: number) => `${n.toFixed(2)}%`

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Commission Rates</h1>
        <p className="text-sm text-zinc-500 font-mono mt-0.5">Configure tiered commission rates by scope</p>
      </div>

      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold mb-4">{form.id ? 'Edit Rate' : 'Add Rate'}</h2>
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <select className="input w-full" value={form.scope} onChange={e => setForm({ ...form, scope: e.target.value as CommissionScope })}>
            {SCOPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          {(form.scope === 'SALESPERSON' || form.scope === 'COMBO') && (
            <select className="input w-full" value={form.salespersonId} onChange={e => setForm({ ...form, salespersonId: e.target.value })}>
              <option value="">Select salesperson</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
            </select>
          )}
          {(form.scope === 'PRODUCT' || form.scope === 'COMBO') && (
            <select className="input w-full" value={form.productId} onChange={e => setForm({ ...form, productId: e.target.value })}>
              <option value="">Select product</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
            </select>
          )}
          <input className="input w-full" type="number" min={0} placeholder="From Qty" value={form.tierFromQty} onChange={e => setForm({ ...form, tierFromQty: parseInt(e.target.value || '0') })} />
          <input className="input w-full" type="number" min={0} placeholder="To Qty (blank=∞)" value={form.tierToQty} onChange={e => setForm({ ...form, tierToQty: e.target.value })} />
          <input className="input w-full" type="number" min={0} max={100} step="0.01" placeholder="Rate %" value={form.rate} onChange={e => setForm({ ...form, rate: parseFloat(e.target.value || '0') })} />
          <label className="flex items-center gap-2 text-xs text-zinc-400">
            <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} />
            Active
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-1 text-xs px-3 py-2">
              <Save className="w-3.5 h-3.5" /> {form.id ? 'Update' : 'Save'}
            </button>
            {form.id && (
              <button type="button" onClick={resetForm} className="btn-ghost text-xs px-3 py-2"><X className="w-3.5 h-3.5" /></button>
            )}
          </div>
        </form>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                {['Scope', 'Salesperson', 'Product', 'Tier', 'Rate', 'Active', 'Created', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {rates.map(r => (
                <tr key={r.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5"><span className="badge badge-ok">{SCOPE_LABELS[r.scope] ?? r.scope}</span></td>
                  <td className="px-4 py-2.5 text-xs text-zinc-400">{r.salesperson?.name ?? r.salesperson?.email ?? '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-zinc-400">{r.product?.name ?? r.product?.sku ?? '—'}</td>
                  <td className="px-4 py-2.5 text-xs font-mono text-zinc-500">{r.tierFromQty}{r.tierToQty ? ` – ${r.tierToQty}` : '+'}</td>
                  <td className="px-4 py-2.5 stat-num text-xs text-emerald-400">{fmt(Number(r.rate))}</td>
                  <td className="px-4 py-2.5"><span className={`badge ${r.active ? 'badge-ok' : 'badge-out'}`}>{r.active ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-4 py-2.5 text-xs font-mono text-zinc-600">{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5 text-right flex gap-2 justify-end">
                    <button onClick={() => edit(r)} className="text-xs text-blue-400 hover:text-blue-300">Edit</button>
                    <button onClick={() => remove(r.id)} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {rates.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-xs font-mono text-zinc-600">No commission rates configured.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}