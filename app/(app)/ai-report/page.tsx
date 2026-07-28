'use client'

import { useState } from 'react'
import { Bot, Loader2, RefreshCw, TrendingUp, AlertTriangle, Package, ShoppingCart, Clock } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Stats {
  totalProducts: number; totalStockUnits: number
  lowStockCount: number; outOfStockCount: number
  todaySales: { units: number; transactions: number }
  weeklySales: { units: number; transactions: number }
  monthlySales: { units: number; transactions: number }
  expiredCount: number; expiringIn30Days: number; urgentReorders: number
}

export default function AIReportPage() {
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<string | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function generate() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/ai/report')
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to generate report'); return }
      setReport(data.report)
      setStats(data.stats)
      setGeneratedAt(data.generatedAt)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">AI Inventory Report</h1>
          <p className="text-sm text-zinc-500 font-mono mt-0.5">Real-time statistics interpreted by AI into management insights</p>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="btn-primary flex items-center gap-2"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" />Generating…</>
            : <><Bot className="w-4 h-4" />{report ? 'Regenerate' : 'Generate AI Report'}</>
          }
        </button>
      </div>

      {!report && !loading && (
        <div className="glass-card p-10 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Bot className="w-7 h-7 text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-200">AI Management Summary</p>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm">
              Click Generate to pull live stats from your database and have AI write a professional management report with insights and action items.
            </p>
          </div>
          <button onClick={generate} className="btn-primary flex items-center gap-2 mt-2">
            <Bot className="w-4 h-4" /> Generate AI Report
          </button>
        </div>
      )}

      {loading && (
        <div className="glass-card p-10 flex flex-col items-center gap-4 text-center">
          <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
          <div>
            <p className="text-sm font-semibold text-zinc-300">Calculating statistics…</p>
            <p className="text-xs font-mono text-zinc-600 mt-1">Querying database → Sending to AI → Writing report</p>
          </div>
        </div>
      )}

      {error && (
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-xs font-mono text-red-400">{error}</p>
        </div>
      )}

      {stats && !loading && (
        <>
          {/* Stat cards row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Products', value: stats.totalProducts, icon: Package, color: 'blue' },
              { label: 'Total Stock Units', value: stats.totalStockUnits.toLocaleString(), icon: TrendingUp, color: 'emerald' },
              { label: 'Urgent Reorders', value: stats.urgentReorders, icon: AlertTriangle, color: stats.urgentReorders > 0 ? 'red' : 'emerald' },
              { label: "Today's Sales", value: `${stats.todaySales.units} units`, icon: ShoppingCart, color: 'amber' },
              { label: 'Expiring (30d)', value: stats.expiringIn30Days, icon: Clock, color: stats.expiringIn30Days > 0 ? 'amber' : 'emerald' },
              { label: 'Expired Batches', value: stats.expiredCount, icon: AlertTriangle, color: stats.expiredCount > 0 ? 'red' : 'emerald' },
            ].map(s => {
              const Icon = s.icon
              const colors = {
                blue:    'bg-blue-500/10 border-blue-500/20 text-blue-400',
                emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
                amber:   'bg-amber-500/10 border-amber-500/20 text-amber-400',
                red:     'bg-red-500/10 border-red-500/20 text-red-400',
              }[s.color] ?? ''
              return (
                <div key={s.label} className="glass-card p-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center border mb-3 ${colors}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <p className="stat-num text-lg text-zinc-100">{s.value}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{s.label}</p>
                </div>
              )
            })}
          </div>

          {/* AI narrative report */}
          {report && (
            <div className="glass-card p-6">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-zinc-800">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-200">AI Management Summary</p>
                  {generatedAt && <p className="text-[10px] font-mono text-zinc-600">Generated {formatDate(generatedAt)}</p>}
                </div>
                <button onClick={generate} disabled={loading} className="ml-auto p-1.5 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-zinc-300 transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="prose prose-invert prose-sm max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-sm text-zinc-300 leading-relaxed">{report}</pre>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
