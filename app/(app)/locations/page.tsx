'use client'

import { useEffect, useState } from 'react'
import { MapPin, Plus, Loader2, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Location {
  id: string; code: string; name: string; address?: string
  type: string; active: boolean
  _count: { inventory: number; movements: number }
}

const TYPE_COLORS: Record<string, string> = {
  WAREHOUSE: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  BRANCH:    'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  CLINIC:    'text-amber-400 bg-amber-500/10 border-amber-500/20',
  PHARMACY:  'text-purple-400 bg-purple-500/10 border-purple-500/20',
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ code: '', name: '', address: '', type: 'WAREHOUSE' })

  async function load() {
    setLoading(true)
    const res = await fetch('/api/locations')
    if (res.ok) setLocations(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    const res = await fetch('/api/locations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed'); setSaving(false); return }
    setOpen(false)
    setForm({ code: '', name: '', address: '', type: 'WAREHOUSE' })
    await load()
    setSaving(false)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Locations</h1>
          <p className="text-sm text-zinc-500 font-mono mt-0.5">Warehouses, branches, and storage sites</p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Location
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-zinc-600" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map(loc => (
            <div key={loc.id} className="glass-card p-5 hover:border-white/10 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-zinc-400" />
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${TYPE_COLORS[loc.type] ?? ''}`}>
                  {loc.type}
                </span>
              </div>
              <p className="sku mb-1">{loc.code}</p>
              <h3 className="text-sm font-semibold text-zinc-100">{loc.name}</h3>
              {loc.address && <p className="text-xs text-zinc-600 mt-0.5">{loc.address}</p>}
              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-zinc-800">
                <div className="text-center">
                  <p className="stat-num text-sm text-zinc-200">{loc._count.inventory}</p>
                  <p className="text-[10px] font-mono text-zinc-600">Products</p>
                </div>
                <div className="text-center">
                  <p className="stat-num text-sm text-zinc-200">{loc._count.movements}</p>
                  <p className="text-[10px] font-mono text-zinc-600">Movements</p>
                </div>
              </div>
            </div>
          ))}
          {locations.length === 0 && (
            <div className="col-span-3 py-16 text-center glass-card">
              <MapPin className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
              <p className="text-sm font-mono text-zinc-600">No locations yet. Add your first warehouse or branch.</p>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={e => e.target === e.currentTarget && setOpen(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              className="glass-card w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-semibold text-zinc-100">Add Location</h2>
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-500"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Code *</label>
                    <input className="input" placeholder="WH-MAIN" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Type</label>
                    <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                      {['WAREHOUSE','BRANCH','CLINIC','PHARMACY'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Name *</label>
                  <input className="input" placeholder="Main Warehouse" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Address</label>
                  <input className="input" placeholder="123 Pharma St, Manila" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                </div>
                {error && <p className="text-xs font-mono text-red-400">{error}</p>}
                <div className="flex gap-3 pt-1">
                  <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : 'Add Location'}
                  </button>
                  <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
