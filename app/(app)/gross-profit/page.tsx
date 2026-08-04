'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Download, Calendar, Loader2 } from 'lucide-react'

export default function GrossProfitPage() {
  const [calendar, setCalendar] = useState<'gregorian' | 'ethiopian'>('gregorian')
  const [amharic, setAmharic] = useState(false)
  const [rows, setRows] = useState<any[]>([])
  const [totals, setTotals] = useState({ sell: 0, cogs: 0, profit: 0, qty: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/reports/gross-profit?calendar=${calendar}&amharic=${amharic}`)
      .then(r => r.json())
      .then(d => { setRows(d.rows ?? []); setTotals(d.totals ?? { sell: 0, cogs: 0, profit: 0, qty: 0 }) })
      .finally(() => setLoading(false))
  }, [calendar, amharic])

  function download() {
    window.open(`/api/export?sheet=gp&calendar=${calendar}&amharic=${amharic}`)
  }

  const fmt = (n: number) => `ETB ${Number(n).toLocaleString('en-ET', { minimumFractionDigits: 2 })}`
  const margin = totals.sell > 0 ? (totals.profit / totals.sell) * 100 : 0

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Gross Profit</h1>
          <p className="text-sm text-zinc-500 font-mono mt-0.5">By product &amp; month — mirrors GP 2,18</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCalendar(c => c === 'gregorian' ? 'ethiopian' : 'gregorian')} className="btn-secondary flex items-center gap-2">
            <Calendar className="w-4 h-4" /> {calendar === 'gregorian' ? 'Gregorian' : 'Ethiopian'}
          </button>
          {calendar === 'ethiopian' && (
            <label className="text-xs flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
              <input type="checkbox" checked={amharic} onChange={e => setAmharic(e.target.checked)} /> Amharic
            </label>
          )}
          <button onClick={download} className="btn-primary flex items-center gap-2"><Download className="w-4 h-4" /> Export</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[{ l: 'Sell (G)', v: fmt(totals.sell), c: 'emerald' }, { l: 'COGS (R)', v: fmt(totals.cogs), c: 'blue' }, { l: 'Profit (S)', v: fmt(totals.profit), c: 'purple' }, { l: 'Margin', v: `${margin.toFixed(1)}%`, c: 'amber' }].map(t => (
          <div key={t.l} className="glass-card p-5">
            <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{t.l}</p>
            <p className="stat-num text-xl mt-1" style={{ color: t.c === 'emerald' ? 'var(--accent-emerald)' : t.c === 'blue' ? 'var(--accent-blue)' : t.c === 'purple' ? 'var(--accent-purple)' : 'var(--accent-amber)' }}>{t.v}</p>
          </div>
        ))}
      </div>

      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-zinc-100">GP by Product / Month</h2>
        </div>
        {loading ? <div className="p-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-zinc-500" /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  {['SKU', 'Product', 'Month', 'Qty', 'Sell', 'COGS', 'Profit', 'Margin %'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {rows.map((r, i) => {
                  const m = r.sellValue > 0 ? (r.profit / r.sellValue) * 100 : 0
                  return (
                    <tr key={i} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-2.5 font-mono text-xs text-blue-400">{r.sku}</td>
                      <td className="px-4 py-2.5 text-xs text-zinc-300">{r.productName}</td>
                      <td className="px-4 py-2.5 text-xs font-mono text-zinc-400">{r.monthKey}</td>
                      <td className="px-4 py-2.5 stat-num text-sm text-zinc-400">{r.quantity}</td>
                      <td className="px-4 py-2.5 stat-num text-sm text-emerald-400">{fmt(r.sellValue)}</td>
                      <td className="px-4 py-2.5 stat-num text-sm text-zinc-400">{fmt(r.cogs)}</td>
                      <td className="px-4 py-2.5 stat-num text-sm text-purple-400">{fmt(r.profit)}</td>
                      <td className="px-4 py-2.5 text-xs font-mono" style={{ color: m >= 20 ? 'var(--accent-emerald)' : m >= 10 ? 'var(--accent-amber)' : 'var(--accent-red)' }}>{m.toFixed(1)}%</td>
                    </tr>
                  )
                })}
                {rows.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-xs font-mono text-zinc-600">No sales yet.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
