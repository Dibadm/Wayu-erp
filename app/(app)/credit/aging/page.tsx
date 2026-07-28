'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Download } from 'lucide-react'
import { canAccess } from '@/lib/permissions'
import { useSession } from 'next-auth/react'

export default function CreditAgingPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role
  const [aging, setAging] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [limit] = useState(100)
  const [riskFilter, setRiskFilter] = useState('')
  const [minTotal, setMinTotal] = useState('')
  const [loading, setLoading] = useState(true)

  const canView = canAccess(role, 'aging:view', 'credit:view')

  useEffect(() => {
    let url = `/api/credit-aging?page=${page}&limit=${limit}`
    if (riskFilter) url += `&customerId=${riskFilter}`
    fetch(url).then(r => r.json()).then(d => {
      setAging(d.aging || [])
      setTotal(d.total || 0)
      setLoading(false)
    })
  }, [page, limit, riskFilter])

  const fmt = (n: number) => `ETB ${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 })}`

  const filtered = minTotal ? aging.filter((a: any) => Number(a.total) >= Number(minTotal)) : aging
  const totals = filtered.reduce((acc, a) => {
    acc.current += Number(a.bucket0to30 || 0)
    acc.bucket31to60 += Number(a.bucket31to60 || 0)
    acc.bucket61to90 += Number(a.bucket61to90 || 0)
    acc.bucket90plus += Number(a.bucket90plus || 0)
    acc.total += Number(a.total || 0)
    return acc
  }, { current: 0, bucket31to60: 0, bucket61to90: 0, bucket90plus: 0, total: 0 })

  const maxTotal = Math.max(totals.total, 1)

  const exportCSV = () => {
    const headers = ['Customer', '0-30 Days', '31-60 Days', '61-90 Days', '90+ Days', 'Total', 'As Of']
    const rows = filtered.map(a => [a.customer?.name || '—', a.bucket0to30, a.bucket31to60, a.bucket61to90, a.bucket90plus, a.total, new Date(a.asOf).toLocaleDateString()])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'credit-aging.csv'
    link.click()
  }

  if (!canView) {
    return <div className="p-10 text-center text-xs font-mono text-zinc-600">You do not have permission to view this page.</div>
  }

  if (loading) {
    return <div className="p-10 text-center text-xs font-mono text-zinc-600">Loading aging report...</div>
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Credit Aging</h1>
          <p className="text-sm text-zinc-500 font-mono mt-0.5">Outstanding receivables by aging bucket</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-emerald-400 hover:bg-emerald-500/20 transition-colors">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="glass-card p-4 flex items-center gap-4">
        <label className="text-xs font-mono text-zinc-500">Min Total:</label>
        <input type="number" value={minTotal} onChange={e => setMinTotal(e.target.value)} placeholder="0" className="bg-transparent border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 w-32" />
        <span className="text-xs text-zinc-500">Filter customers with total outstanding above this amount</span>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                {['Customer', '0-30 Days', '31-60 Days', '61-90 Days', '90+ Days', 'Total', '% of Total', 'As Of'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {filtered.map((a: any) => {
                const total = Number(a.total || 0)
                const pct = maxTotal > 0 ? ((total / maxTotal) * 100).toFixed(1) : '0.0'
                return (
                  <tr key={a.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 text-sm text-zinc-300">{a.customer?.name ?? '—'}</td>
                    <td className="px-4 py-2.5 stat-num text-sm text-emerald-400">{fmt(a.bucket0to30)}</td>
                    <td className="px-4 py-2.5 stat-num text-sm text-blue-400">{fmt(a.bucket31to60)}</td>
                    <td className="px-4 py-2.5 stat-num text-sm text-amber-400">{fmt(a.bucket61to90)}</td>
                    <td className="px-4 py-2.5 stat-num text-sm text-red-400">{fmt(a.bucket90plus)}</td>
                    <td className="px-4 py-2.5 stat-num text-sm text-zinc-200">{fmt(total)}</td>
                    <td className="px-4 py-2.5 text-xs text-zinc-500">{pct}%</td>
                    <td className="px-4 py-2.5 text-xs text-zinc-500">{new Date(a.asOf).toLocaleDateString()}</td>
                  </tr>
                )
              })}
              {filtered.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-xs font-mono text-zinc-600">No aging data found.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-zinc-800 flex items-center justify-between">
          <p className="text-xs font-mono text-zinc-500">Page {page} of {Math.ceil(total / limit) || 1} ({total} total)</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-xs rounded border border-zinc-700 disabled:opacity-50 hover:bg-zinc-800 transition-colors">Prev</button>
            <button disabled={page >= Math.ceil(total / limit)} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-xs rounded border border-zinc-700 disabled:opacity-50 hover:bg-zinc-800 transition-colors">Next</button>
          </div>
        </div>
      </div>

      {/* Visual stacked bars */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold text-zinc-100 mb-4">Aging Visualization</h2>
        <div className="space-y-3">
          {filtered.slice(0, 10).map((a: any) => {
            const total = Number(a.total || 0)
            if (total <= 0) return null
            const w0 = (Number(a.bucket0to30 || 0) / maxTotal) * 100
            const w1 = (Number(a.bucket31to60 || 0) / maxTotal) * 100
            const w2 = (Number(a.bucket61to90 || 0) / maxTotal) * 100
            const w3 = (Number(a.bucket90plus || 0) / maxTotal) * 100
            return (
              <div key={a.id} className="flex items-center gap-3">
                <span className="text-xs text-zinc-400 w-40 truncate">{a.customer?.name || '—'}</span>
                <div className="flex-1 h-4 rounded-full overflow-hidden flex">
                  <div className="bg-emerald-500 h-full" style={{ width: `${w0}%` }} title={`0-30: ${fmt(a.bucket0to30)}`} />
                  <div className="bg-blue-500 h-full" style={{ width: `${w1}%` }} title={`31-60: ${fmt(a.bucket31to60)}`} />
                  <div className="bg-amber-500 h-full" style={{ width: `${w2}%` }} title={`61-90: ${fmt(a.bucket61to90)}`} />
                  <div className="bg-red-500 h-full" style={{ width: `${w3}%` }} title={`90+: ${fmt(a.bucket90plus)}`} />
                </div>
                <span className="stat-num text-xs text-zinc-500 w-24 text-right">{fmt(total)}</span>
              </div>
            )
          })}
          {filtered.length === 0 && <div className="py-6 text-center text-xs font-mono text-zinc-600">No data to visualize.</div>}
        </div>
        <div className="flex items-center gap-4 mt-4 text-[10px] font-mono text-zinc-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500" /> 0-30</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500" /> 31-60</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500" /> 61-90</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500" /> 90+</span>
        </div>
      </div>
    </div>
  )
}
