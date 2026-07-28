'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  TrendingUp, TrendingDown, DollarSign, Package, BarChart3,
  RefreshCw, Loader2, Activity, ShoppingCart, AlertTriangle,
  BadgeDollarSign, Heart, Zap, Calendar,
} from 'lucide-react'
import AnalyticsKPICard from '@/components/AnalyticsKPICard'
import AIAnalyticsReport from '@/components/AIAnalyticsReport'
import ChartCard from '@/components/charts/ChartCard'
import AreaChart from '@/components/charts/AreaChart'
import BarChart from '@/components/charts/BarChart'
import DonutChart from '@/components/charts/DonutChart'

// ─── Types ─────────────────────────────────────────────────────────────────────

type Period = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'

interface AnalyticsData {
  period: { label: string; start: string; end: string; days: number }
  kpis: {
    revenue: number; revenueTrend: number
    profit: number; profitTrend: number
    expenses: number; expensesTrend: number
    inventoryValue: number; inventoryCost: number
    unitsSold: number; unitsSoldTrend: number
    avgDailySales: number; inventoryTurnover: number
    marginPct: number; stockHealth: number; businessHealth: number
    totalProducts: number; lowStockCount: number; outOfStock: number
    totalUnits: number; expiryRisk: number
  }
  charts: {
    dailySeries: { date: string; revenue: number; cost: number; profit: number; units: number; purchases: number }[]
    monthlySeries: { date: string; revenue: number; cost: number; profit: number; units: number }[]
    topProducts: { name: string; sku: string; unitsSold: number; revenue: number }[]
    slowProducts: { name: string; sku: string; unitsSold: number }[]
    expiringData: { name: string; sku: string; quantity: number; daysLeft: number; value: number }[]
    categoryBreakdown: { name: string; units: number; revenue: number; cost: number; profit: number }[]
    productMovement: { name: string; in: number; out: number }[]
  }
}

// ─── Formatters ────────────────────────────────────────────────────────────────

const fmtPHP  = (n: number) => `₱${n >= 1000 ? (n / 1000).toFixed(1) + 'k' : n.toFixed(0)}`
const fmtFull = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtUnits = (n: number) => n.toLocaleString()

// Donut colour palette
const CAT_COLORS = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#f97316','#ec4899']

// Period options
const PERIODS: { value: Period; label: string }[] = [
  { value: 'today',   label: 'Today' },
  { value: 'week',    label: 'Week' },
  { value: 'month',   label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'year',    label: 'Year' },
  { value: 'custom',  label: 'Custom' },
]

// ─── Component ─────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [period, setPeriod]       = useState<Period>('month')
  const [from, setFrom]           = useState('')
  const [to, setTo]               = useState('')
  const [data, setData]           = useState<AnalyticsData | null>(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ period })
      if (period === 'custom' && from) params.set('from', new Date(from).toISOString())
      if (period === 'custom' && to)   params.set('to',   new Date(to).toISOString())
      const res = await fetch(`/api/analytics?${params}`)
      if (!res.ok) { setError('Failed to load analytics.'); return }
      setData(await res.json())
    } catch {
      setError('Network error.')
    } finally {
      setLoading(false)
    }
  }, [period, from, to])

  useEffect(() => {
    if (period !== 'custom') load()
  }, [period])

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto" />
          <p className="text-sm font-mono text-zinc-500">Loading analytics…</p>
        </div>
      </div>
    )
  }

  const k = data?.kpis
  const c = data?.charts

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Analytics</h1>
          <p className="text-sm text-zinc-500 font-mono mt-0.5">
            {data?.period.label} · {data?.period.days} days
          </p>
        </div>

        {/* Period filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-1 gap-1">
            {PERIODS.map(p => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 text-xs font-mono rounded-md transition-all duration-150 ${
                  period === p.value
                    ? 'bg-blue-600 text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom date range */}
          {period === 'custom' && (
            <div className="flex items-center gap-2">
              <input type="date" className="input w-auto text-xs" value={from} onChange={e => setFrom(e.target.value)} />
              <span className="text-zinc-600 font-mono text-sm">→</span>
              <input type="date" className="input w-auto text-xs" value={to} onChange={e => setTo(e.target.value)} />
              <button onClick={load} className="btn-primary text-xs flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Apply
              </button>
            </div>
          )}

          <button
            onClick={load}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-zinc-300 transition-colors border border-zinc-800"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-mono text-red-400">
          {error}
        </div>
      )}

      {k && c && (
        <>
          {/* ── Row 1: Financial KPIs ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <AnalyticsKPICard
              title="Revenue" value={fmtFull(k.revenue)}
              subtitle={`${k.unitsSold.toLocaleString()} units sold`}
              trend={k.revenueTrend} icon={TrendingUp} accent="emerald"
            />
            <AnalyticsKPICard
              title="Gross Profit" value={fmtFull(k.profit)}
              subtitle={`${k.marginPct}% margin`}
              trend={k.profitTrend} icon={BadgeDollarSign} accent="blue"
            />
            <AnalyticsKPICard
              title="Expenses" value={fmtFull(k.expenses)}
              subtitle="Purchase orders"
              trend={k.expensesTrend} icon={ShoppingCart} accent="amber"
            />
            <AnalyticsKPICard
              title="Inventory Value" value={fmtFull(k.inventoryValue)}
              subtitle={`Cost: ${fmtFull(k.inventoryCost)}`}
              icon={DollarSign} accent="purple"
            />
          </div>

          {/* ── Row 2: Operational KPIs ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <AnalyticsKPICard
              title="Avg Daily Sales" value={`${k.avgDailySales}`}
              subtitle="units / day"
              icon={Activity} accent="blue"
            />
            <AnalyticsKPICard
              title="Inventory Turnover" value={`${k.inventoryTurnover}×`}
              subtitle="annualised rate"
              icon={RefreshCw} accent="emerald"
            />
            <AnalyticsKPICard
              title="Stock Health" value={`${k.stockHealth}%`}
              subtitle={`${k.lowStockCount} low · ${k.outOfStock} out`}
              icon={Package} accent={k.stockHealth >= 70 ? 'emerald' : k.stockHealth >= 40 ? 'amber' : 'red'}
              scoreBar={k.stockHealth}
            />
            <AnalyticsKPICard
              title="Business Health" value={`${k.businessHealth}%`}
              subtitle="Composite score"
              icon={Heart} accent={k.businessHealth >= 70 ? 'emerald' : k.businessHealth >= 40 ? 'amber' : 'red'}
              scoreBar={k.businessHealth}
            />
          </div>

          {/* ── Revenue & Profit area chart ── */}
          <ChartCard
            title="Revenue & Profit Trend"
            subtitle={`Daily breakdown over ${data.period.label.toLowerCase()}`}
          >
            <AreaChart
              data={c.dailySeries}
              xKey="date"
              series={[
                { key: 'revenue', label: 'Revenue',  color: '#10b981' },
                { key: 'profit',  label: 'Profit',   color: '#3b82f6' },
                { key: 'purchases', label: 'Purchases', color: '#f59e0b' },
              ]}
              formatY={fmtPHP}
              formatX={(v: string) => v.slice(5)} // MM-DD
              height={240}
            />
          </ChartCard>

          {/* ── Two-column: units sold + monthly growth ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Units Sold Per Day" subtitle="OUT movement volume">
              <AreaChart
                data={c.dailySeries}
                xKey="date"
                series={[{ key: 'units', label: 'Units Sold', color: '#8b5cf6' }]}
                formatY={fmtUnits}
                formatX={(v: string) => v.slice(5)}
                height={200}
              />
            </ChartCard>

            <ChartCard title="Monthly Growth" subtitle="Last 12 months revenue & profit">
              <AreaChart
                data={c.monthlySeries}
                xKey="date"
                series={[
                  { key: 'revenue', label: 'Revenue', color: '#10b981' },
                  { key: 'profit',  label: 'Profit',  color: '#3b82f6' },
                ]}
                formatY={fmtPHP}
                height={200}
              />
            </ChartCard>
          </div>

          {/* ── Top products + Slow products ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Top Products" subtitle="By units sold (last 30 days)">
              {c.topProducts.length > 0 ? (
                <BarChart
                  data={c.topProducts}
                  bars={[{ key: 'unitsSold', label: 'Units Sold', color: '#10b981' }]}
                  xKey="name"
                  layout="vertical"
                  formatY={fmtUnits}
                  height={260}
                />
              ) : (
                <div className="h-48 flex items-center justify-center text-xs font-mono text-zinc-600">
                  No sales data for this period
                </div>
              )}
            </ChartCard>

            <ChartCard title="Slow & Zero-Sales Products" subtitle="Products needing attention">
              {c.slowProducts.length > 0 ? (
                <BarChart
                  data={c.slowProducts}
                  bars={[{ key: 'unitsSold', label: 'Units Sold', color: '#f59e0b' }]}
                  xKey="name"
                  layout="vertical"
                  formatY={fmtUnits}
                  height={260}
                />
              ) : (
                <div className="h-48 flex items-center justify-center text-xs font-mono text-zinc-600">
                  All products have sales — great!
                </div>
              )}
            </ChartCard>
          </div>

          {/* ── Category breakdown donut + Product movement ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Revenue by Category" subtitle="Category distribution">
              {c.categoryBreakdown.length > 0 ? (
                <div className="flex items-center gap-6">
                  <DonutChart
                    data={c.categoryBreakdown.map((cat, i) => ({
                      name:  cat.name,
                      value: cat.revenue,
                      color: CAT_COLORS[i % CAT_COLORS.length],
                    }))}
                    height={200}
                    formatValue={fmtFull}
                  />
                  <div className="flex-1 space-y-2 min-w-0">
                    {c.categoryBreakdown.slice(0, 6).map((cat, i) => (
                      <div key={cat.name} className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: CAT_COLORS[i % CAT_COLORS.length] }} />
                          <span className="font-mono text-zinc-400 truncate">{cat.name}</span>
                        </div>
                        <span className="font-mono text-zinc-300 flex-shrink-0">{fmtPHP(cat.revenue)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-xs font-mono text-zinc-600">No category data</div>
              )}
            </ChartCard>

            <ChartCard title="Product Movement" subtitle="IN vs OUT by product (current period)">
              {c.productMovement.length > 0 ? (
                <BarChart
                  data={c.productMovement}
                  bars={[
                    { key: 'in',  label: 'Stock In',  color: '#10b981' },
                    { key: 'out', label: 'Stock Out', color: '#ef4444' },
                  ]}
                  xKey="name"
                  layout="vertical"
                  formatY={fmtUnits}
                  height={260}
                />
              ) : (
                <div className="h-48 flex items-center justify-center text-xs font-mono text-zinc-600">No movements in period</div>
              )}
            </ChartCard>
          </div>

          {/* ── Expiring products chart ── */}
          {c.expiringData.length > 0 && (
            <ChartCard
              title="Expiring Products — Inventory at Risk"
              subtitle={`₱${k.expiryRisk.toLocaleString('en-PH', { minimumFractionDigits: 2 })} total value at risk`}
              action={
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 border border-red-500/20 rounded-full">
                  <AlertTriangle className="w-3 h-3 text-red-400" />
                  <span className="text-[10px] font-mono text-red-400">{c.expiringData.length} batches</span>
                </div>
              }
            >
              <BarChart
                data={c.expiringData.map(b => ({
                  name:     b.name,
                  quantity: b.quantity,
                  value:    b.value,
                  daysLeft: b.daysLeft,
                }))}
                bars={[
                  { key: 'quantity', label: 'Units',        color: '#f59e0b' },
                  { key: 'value',    label: 'Value at Risk', color: '#ef4444' },
                ]}
                xKey="name"
                layout="vertical"
                formatY={fmtUnits}
                height={Math.max(200, c.expiringData.length * 36)}
              />
            </ChartCard>
          )}

          {/* ── Inventory value composition ── */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-zinc-100 mb-4">Inventory Value Composition</h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Cost Value',   val: fmtFull(k.inventoryCost),  sub: 'At purchase price', color: 'text-blue-400' },
                { label: 'Retail Value', val: fmtFull(k.inventoryValue), sub: 'At selling price',  color: 'text-emerald-400' },
                { label: 'Potential Profit', val: fmtFull(k.inventoryValue - k.inventoryCost), sub: 'If all stock sold', color: 'text-purple-400' },
              ].map(s => (
                <div key={s.label} className="text-center p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                  <p className={`stat-num text-xl ${s.color}`}>{s.val}</p>
                  <p className="text-xs font-medium text-zinc-400 mt-1">{s.label}</p>
                  <p className="text-[10px] font-mono text-zinc-600 mt-0.5">{s.sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── AI Analytics Report ── */}
          <AIAnalyticsReport
            period={period}
            from={period === 'custom' ? from : undefined}
            to={period === 'custom' ? to : undefined}
          />
        </>
      )}
    </div>
  )
}
