'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Coins, UserPlus, Trash2, Percent, Save, AlertTriangle } from 'lucide-react'

interface SettingMap { costMethod: string | null; calendarDefault: string | null; amharicLabels: string | null }
interface UserRow { id: string; name: string; email: string; role: string; isSalesperson: boolean; createdAt: string }
interface RateRow { id: string; scope: string; salespersonId: string | null; productId: string | null; tierFromQty: number; tierToQty: number | null; rate: number; active: boolean }
interface ProductOpt { id: string; sku: string; name: string }
interface SalespersonOpt { id: string; name: string }

export default function AdminSettings() {
  const { data: session } = useSession()
  const isAdmin = (session?.user as any)?.role === 'ADMIN'

  const [settings, setSettings] = useState<SettingMap>({ costMethod: null, calendarDefault: 'gregorian', amharicLabels: 'false' })
  const [users, setUsers] = useState<UserRow[]>([])
  const [rates, setRates] = useState<RateRow[]>([])
  const [products, setProducts] = useState<ProductOpt[]>([])
  const [salespeople, setSalespeople] = useState<SalespersonOpt[]>([])
  const [msg, setMsg] = useState('')

  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'STAFF', isSalesperson: false })
  const [newRate, setNewRate] = useState({ scope: 'GLOBAL', salespersonId: '', productId: '', tierFromQty: 0, tierToQty: '', rate: 0 })

  useEffect(() => {
    if (!isAdmin) return
    ;(async () => {
      const [s, u, r] = await Promise.all([
        fetch('/api/settings').then(r => r.json()),
        fetch('/api/users').then(r => r.json()),
        fetch('/api/commission-rates').then(r => r.json()),
      ])
      setSettings(s)
      setUsers(u)
      setRates(r)
      const p = await fetch('/api/products?take=500').then(r => r.json()).catch(() => [])
      setProducts((p.products ?? p).map((x: any) => ({ id: x.id, sku: x.sku, name: x.name })).slice(0, 500))
      setSalespeople(u.filter((x: any) => x.isSalesperson || x.role === 'ADMIN').map((x: any) => ({ id: x.id, name: x.name })))
    })()
  }, [isAdmin])

  async function saveSettings(patch: Partial<SettingMap>) {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (res.ok) { setSettings(await res.json()); setMsg('Settings saved'); setTimeout(() => setMsg(''), 2000) }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/users', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newUser),
    })
    if (res.ok) { setUsers([...users, await res.json()]); setNewUser({ name: '', email: '', password: '', role: 'STAFF', isSalesperson: false }); setMsg('User created') }
    else setMsg((await res.json()).error ?? 'Failed')
    setTimeout(() => setMsg(''), 3000)
  }

  async function deleteUser(id: string) {
    if (!confirm('Delete this user?')) return
    const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' })
    if (res.ok) setUsers(users.filter(u => u.id !== id))
  }

  async function createRate(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/commission-rates', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newRate,
        salespersonId: newRate.scope === 'SALESPERSON' || newRate.scope === 'COMBO' ? newRate.salespersonId || null : null,
        productId: newRate.scope === 'PRODUCT' || newRate.scope === 'COMBO' ? newRate.productId || null : null,
        tierToQty: newRate.tierToQty === '' ? null : Number(newRate.tierToQty),
      }),
    })
    if (res.ok) { setRates([...rates, await res.json()]); setMsg('Rate added') }
    else setMsg((await res.json()).error ?? 'Failed')
    setTimeout(() => setMsg(''), 3000)
  }

  async function deleteRate(id: string) {
    const res = await fetch(`/api/commission-rates?id=${id}`, { method: 'DELETE' })
    if (res.ok) setRates(rates.filter(r => r.id !== id))
  }

  async function toggleRate(id: string, active: boolean) {
    const res = await fetch('/api/commission-rates', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, active: !active }),
    })
    if (res.ok) setRates(rates.map(r => r.id === id ? { ...r, active: !active } : r))
  }

  if (!isAdmin) return null

  const inputCls = 'input w-full'
  const labelCls = 'text-[10px] font-mono uppercase tracking-widest mb-1 block'
  const sectionIcon = { color: 'var(--accent-blue)' }

  return (
    <div className="space-y-6">
      {msg && (
        <div className="glass-card p-3 text-sm font-mono text-emerald-400 flex items-center gap-2">
          <Save className="w-4 h-4" /> {msg}
        </div>
      )}

      {/* ── Cost method + calendar (decision #2, #4) ── */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Coins className="w-4 h-4" style={sectionIcon} />
          <h2 className="text-sm font-semibold">Cost Basis &amp; Calendar</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelCls} style={{ color: 'var(--text-muted)' }}>Cost Method (FIFO/FEFO)</label>
            <select
              className={inputCls}
              value={settings.costMethod ?? ''}
              onChange={e => saveSettings({ costMethod: e.target.value === '' ? null : e.target.value })}
            >
              <option value="">Not set (choose post-delivery)</option>
              <option value="FEFO">FEFO — First Expiry First Out</option>
              <option value="FIFO">FIFO — First In First Out</option>
            </select>
            <p className="text-[10px] font-mono mt-1" style={{ color: 'var(--text-muted)' }}>
              Default unset until admin selects after delivery.
            </p>
          </div>
          <div>
            <label className={labelCls} style={{ color: 'var(--text-muted)' }}>Default Calendar</label>
            <select
              className={inputCls}
              value={settings.calendarDefault ?? 'gregorian'}
              onChange={e => saveSettings({ calendarDefault: e.target.value })}
            >
              <option value="gregorian">Gregorian (default)</option>
              <option value="ethiopian">Ethiopian</option>
            </select>
          </div>
          <div>
            <label className={labelCls} style={{ color: 'var(--text-muted)' }}>Amharic Labels</label>
            <select
              className={inputCls}
              value={settings.amharicLabels ?? 'false'}
              onChange={e => saveSettings({ amharicLabels: e.target.value === 'true' ? 'true' : 'false' })}
            >
              <option value="false">English month names</option>
              <option value="true">Amharic month names</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── User management (decision #7) ── */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="w-4 h-4" style={{ color: 'var(--accent-purple)' }} />
          <h2 className="text-sm font-semibold">Users &amp; Passwords</h2>
        </div>
        <form onSubmit={createUser} className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4 items-end">
          <div><label className={labelCls} style={{ color: 'var(--text-muted)' }}>Name</label><input className={inputCls} value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} required /></div>
          <div><label className={labelCls} style={{ color: 'var(--text-muted)' }}>Email</label><input type="email" className={inputCls} value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} required /></div>
          <div><label className={labelCls} style={{ color: 'var(--text-muted)' }}>Password</label><input className={inputCls} value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required minLength={6} /></div>
          <div>
            <label className={labelCls} style={{ color: 'var(--text-muted)' }}>Role</label>
            <select className={inputCls} value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
              <option value="STAFF">STAFF</option><option value="ADMIN">ADMIN</option><option value="VIEWER">VIEWER</option>
            </select>
          </div>
          <button type="submit" className="btn-primary">Create</button>
        </form>
        <label className="flex items-center gap-2 text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={newUser.isSalesperson} onChange={e => setNewUser({ ...newUser, isSalesperson: e.target.checked })} />
          Mark as salesperson (eligible for commission)
        </label>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                {['Name', 'Email', 'Role', 'Salesperson', ''].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {users.map(u => (
                <tr key={u.id}>
                  <td className="px-3 py-2 text-sm">{u.name}</td>
                  <td className="px-3 py-2 font-mono text-xs">{u.email}</td>
                  <td className="px-3 py-2"><span className={`badge ${u.role === 'ADMIN' ? 'badge-in' : 'badge-warning'}`}>{u.role}</span></td>
                  <td className="px-3 py-2 text-xs">{u.isSalesperson ? 'Yes' : '—'}</td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => deleteUser(u.id)} className="text-red-400 hover:text-red-300" title="Delete"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Commission rate manager (decision #1) ── */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Percent className="w-4 h-4" style={{ color: 'var(--accent-emerald)' }} />
          <h2 className="text-sm font-semibold">Commission Rates</h2>
          <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>salesperson × product × tier · on pre-tax amount</span>
        </div>
        <form onSubmit={createRate} className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4 items-end">
          <div>
            <label className={labelCls} style={{ color: 'var(--text-muted)' }}>Scope</label>
            <select className={inputCls} value={newRate.scope} onChange={e => setNewRate({ ...newRate, scope: e.target.value })}>
              <option value="GLOBAL">Global</option>
              <option value="SALESPERSON">Salesperson</option>
              <option value="PRODUCT">Product</option>
              <option value="COMBO">Salesperson+Product</option>
            </select>
          </div>
          {(newRate.scope === 'SALESPERSON' || newRate.scope === 'COMBO') && (
            <div><label className={labelCls} style={{ color: 'var(--text-muted)' }}>Salesperson</label>
              <select className={inputCls} value={newRate.salespersonId} onChange={e => setNewRate({ ...newRate, salespersonId: e.target.value })}>
                <option value="">—</option>{salespeople.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select></div>
          )}
          {(newRate.scope === 'PRODUCT' || newRate.scope === 'COMBO') && (
            <div><label className={labelCls} style={{ color: 'var(--text-muted)' }}>Product</label>
              <select className={inputCls} value={newRate.productId} onChange={e => setNewRate({ ...newRate, productId: e.target.value })}>
                <option value="">—</option>{products.map(p => <option key={p.id} value={p.id}>{p.sku}</option>)}
              </select></div>
          )}
          <div><label className={labelCls} style={{ color: 'var(--text-muted)' }}>From Qty</label><input type="number" className={inputCls} value={newRate.tierFromQty} onChange={e => setNewRate({ ...newRate, tierFromQty: Number(e.target.value) })} /></div>
          <div><label className={labelCls} style={{ color: 'var(--text-muted)' }}>To Qty (∞)</label><input type="number" className={inputCls} value={newRate.tierToQty} onChange={e => setNewRate({ ...newRate, tierToQty: e.target.value })} placeholder="∞" /></div>
          <div><label className={labelCls} style={{ color: 'var(--text-muted)' }}>Rate %</label><input type="number" step="0.01" className={inputCls} value={newRate.rate} onChange={e => setNewRate({ ...newRate, rate: Number(e.target.value) })} /></div>
          <button type="submit" className="btn-primary md:col-span-6 w-fit">Add Rate</button>
        </form>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                {['Scope', 'Target', 'Tier', 'Rate %', 'Active', ''].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {rates.map(r => (
                <tr key={r.id}>
                  <td className="px-3 py-2 text-xs"><span className="badge badge-ok">{r.scope}</span></td>
                  <td className="px-3 py-2 text-xs font-mono">{r.salespersonId ? 'SP' : ''}{r.productId ? ' · PROD' : ''}</td>
                  <td className="px-3 py-2 text-xs font-mono">{r.tierFromQty}–{r.tierToQty ?? '∞'}</td>
                  <td className="px-3 py-2 stat-num text-sm text-emerald-400">{r.rate}%</td>
                  <td className="px-3 py-2">
                    <button onClick={() => toggleRate(r.id, r.active)} className={`badge ${r.active ? 'badge-in' : 'badge-low'}`}>{r.active ? 'ON' : 'OFF'}</button>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => deleteRate(r.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {rates.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                  <AlertTriangle className="w-4 h-4 inline mr-1" /> No rates yet — commission is 0 until you configure them.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
