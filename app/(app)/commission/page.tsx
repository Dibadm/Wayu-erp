'use client'

import { useState, useEffect } from 'react'
import { Percent, Download } from 'lucide-react'

export default function CommissionPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [calendar, setCalendar] = useState<'gregorian' | 'ethiopian'>('gregorian')
  const [amharic, setAmharic] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/reports/commission?calendar=${calendar}&amharic=${amharic}`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [calendar, amharic])

  const fmt = (n: number) => `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Commission</h1>
          <p className="text-sm text-zinc-500 font-mono mt-0.5">Per salesperson — rate manager in Settings</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCalendar(c => c === 'gregorian' ? 'ethiopian' : 'gregorian')} className="btn-secondary">{calendar === 'gregorian' ? 'Gregorian' : 'Ethiopian'}</button>
          {calendar === 'ethiopian' && <label className="text-xs"><input type="checkbox" checked={amharic} onChange={e => setAmharic(e.target.checked)} /> Amharic</label>}
          <button onClick={() => window.open(`/api/export?sheet=commission&calendar=${calendar}&amharic=${amharic}`)} className="btn-primary flex items-center gap-2"><Download className="w-4 h-4" /> Export</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="glass-card p-5">
          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Total Commission</p>
          <p className="stat-num text-2xl text-emerald-400">{fmt(data?.totalCommission ?? 0)}</p>
          <p className="text-xs font-mono text-zinc-600 mt-1">Pre-tax basis</p>
        </div>
      </div>

      {loading ? <div className="glass-card p-10 text-center text-zinc-500">Loading…</div> : (
        <div className="glass-card overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2">
            <Percent className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-zinc-100">By Salesperson</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  {['Salesperson', 'Units', 'Pre-Tax Base', 'Commission'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {(data?.bySalesperson ?? []).map((p: any) => (
                  <tr key={p.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 text-sm text-zinc-300">{p.name}</td>
                    <td className="px-4 py-2.5 stat-num text-sm text-zinc-400">{p.qty}</td>
                    <td className="px-4 py-2.5 stat-num text-sm text-zinc-400">{fmt(p.preTaxBase)}</td>
                    <td className="px-4 py-2.5 stat-num text-sm text-emerald-400">{fmt(p.commission)}</td>
                  </tr>
                ))}
                {(data?.bySalesperson ?? []).length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-xs font-mono text-zinc-600">No commission yet. Configure rates in Settings.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
