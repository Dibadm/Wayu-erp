'use client'

import { useState, useEffect } from 'react'
import { CalendarDays, Download } from 'lucide-react'

export default function WeeklyGPPage() {
  const [calendar, setCalendar] = useState<'gregorian' | 'ethiopian'>('gregorian')
  const [amharic, setAmharic] = useState(false)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    fetch(`/api/reports/weekly-gp?calendar=${calendar}&amharic=${amharic}&weeks=12`)
      .then(r => r.json()).then(setData)
  }, [calendar, amharic])

  const fmt = (n: number) => `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Weekly Gross Profit</h1>
          <p className="text-sm text-zinc-500 font-mono mt-0.5">Per week rollup (CF19 wky R 19)</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCalendar(c => c === 'gregorian' ? 'ethiopian' : 'gregorian')} className="btn-secondary">{calendar === 'gregorian' ? 'Gregorian' : 'Ethiopian'}</button>
          {calendar === 'ethiopian' && <label className="text-xs"><input type="checkbox" checked={amharic} onChange={e => setAmharic(e.target.checked)} /> Amharic</label>}
          <button onClick={() => window.open(`/api/export?sheet=dashboard&calendar=${calendar}&amharic=${amharic}`)} className="btn-primary flex items-center gap-2"><Download className="w-4 h-4" /> Export</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="glass-card p-5"><p className="text-[10px] font-mono uppercase text-zinc-500">Total Gross</p><p className="stat-num text-xl text-emerald-400">{fmt(data?.totalGross ?? 0)}</p></div>
        <div className="glass-card p-5"><p className="text-[10px] font-mono uppercase text-zinc-500">Total Profit</p><p className="stat-num text-xl text-purple-400">{fmt(data?.totalProfit ?? 0)}</p></div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-blue-400" /><h2 className="text-sm font-semibold text-zinc-100">Weekly Rollup</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                {['Week', 'Qty', 'Gross', 'COGS', 'Profit', 'Ratio %'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {(data?.rows ?? []).map((r: any, i: number) => {
                const ratio = r.gross > 0 ? (r.profit / r.gross) * 100 : 0
                return (
                  <tr key={i} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 text-xs font-mono text-zinc-300">{r.label}</td>
                    <td className="px-4 py-2.5 stat-num text-sm text-zinc-400">{r.qty}</td>
                    <td className="px-4 py-2.5 stat-num text-sm text-emerald-400">{fmt(r.gross)}</td>
                    <td className="px-4 py-2.5 stat-num text-sm text-zinc-400">{fmt(r.cogs)}</td>
                    <td className="px-4 py-2.5 stat-num text-sm text-purple-400">{fmt(r.profit)}</td>
                    <td className="px-4 py-2.5 text-xs font-mono" style={{ color: ratio >= 20 ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>{ratio.toFixed(1)}%</td>
                  </tr>
                )
              })}
              {(data?.rows ?? []).length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-xs font-mono text-zinc-600">No weekly data yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
