'use client'

import { useState, useEffect } from 'react'
import { ShieldCheck, FileText, TrendingUp, Users, AlertTriangle, Clock, CreditCard, Activity } from 'lucide-react'
import { useSession } from 'next-auth/react'
import Breadcrumb from '@/components/Breadcrumb'

export default function CreditDashboard() {
  const { data: session } = useSession()
  const [data, setData] = useState<any>(null)
  const [riskData, setRiskData] = useState<any>(null)
  const [utilizationData, setUtilizationData] = useState<any>(null)
  const [applications, setApplications] = useState<any[]>([])
  const [cases, setCases] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [upcoming, setUpcoming] = useState<{ counts: any } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/credit/dashboard').then(r => r.ok ? r.json() : Promise.reject(r.statusText)),
      fetch('/api/credit/reports?type=risk-analysis').then(r => r.ok ? r.json() : Promise.reject(r.statusText)),
      fetch('/api/credit/reports?type=utilization').then(r => r.ok ? r.json() : Promise.reject(r.statusText)),
      fetch('/api/credit-applications').then(r => r.ok ? r.json() : Promise.reject(r.statusText)),
      fetch('/api/collection-cases').then(r => r.ok ? r.json() : Promise.reject(r.statusText)),
      fetch('/api/overdue-notifications').then(r => r.ok ? r.json() : Promise.reject(r.statusText)),
      fetch('/api/credit/upcoming').then(r => r.ok ? r.json() : Promise.reject(r.statusText)),
    ]).then(([dashboard, risk, utilization, apps, cases, notifs, upcm]) => {
      setData(dashboard)
      setRiskData(risk)
      setUtilizationData(utilization)
      setApplications(Array.isArray(apps) ? apps : [])
      setCases(Array.isArray(cases) ? cases : [])
      setNotifications(Array.isArray(notifs) ? notifs : [])
      setUpcoming(upcm?.counts ? upcm : null)
    }).catch(() => {
      setData({ totalOutstanding: 0, activeCreditCustomers: 0, overdueCount: 0, openCollections: 0, pendingApplications: 0 })
      setRiskData({ data: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 } })
      setUtilizationData({ data: [] })
      setApplications([])
      setCases([])
      setNotifications([])
      setUpcoming(null)
    }).finally(() => setLoading(false))
  }, [])

  const fmt = (n: number | undefined | null) => `ETB ${Number(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`

  if (loading) {
    return <div className="p-10 text-center text-xs font-mono text-zinc-600">Loading credit dashboard...</div>
  }

  const riskCounts = riskData?.data || { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 }
  const utilization = utilizationData?.data || []
  const topCustomers = utilization.sort((a: any, b: any) => (b.utilized ?? 0) - (a.utilized ?? 0)).slice(0, 5)
  const recentApplications = applications.slice(0, 5)
  const openCases = cases.filter((c: any) => c.status !== 'RESOLVED').slice(0, 5)
  const recentNotifications = notifications.slice(0, 5)

  return (
    <div className="space-y-6 animate-fade-in">
      <Breadcrumb />
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Credit Dashboard</h1>
        <p className="text-sm text-zinc-500 font-mono mt-0.5">Customer credit overview, risk, and collections</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="glass-card p-5">
          <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4">
            <CreditCard className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <p className="stat-num text-2xl text-purple-200">{fmt(data?.totalOutstanding)}</p>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-1">Total Outstanding</p>
          <p className="text-[11px] font-mono text-zinc-600 mt-0.5">AR total</p>
        </div>
        <div className="glass-card p-5">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="stat-num text-2xl text-blue-200">{data?.activeCreditCustomers ?? 0}</p>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-1">Active Credit Customers</p>
          <p className="text-[11px] font-mono text-zinc-600 mt-0.5">With profiles</p>
        </div>
        <div className="glass-card p-5">
          <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
            <Activity className="w-4 h-4 text-red-500 dark:text-red-400" />
          </div>
          <p className="stat-num text-2xl text-red-500 dark:text-red-400">{data?.overdueCount ?? 0}</p>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-1">Overdue Customers</p>
          <p className="text-[11px] font-mono text-zinc-600 mt-0.5">Past due</p>
        </div>
        <div className="glass-card p-5">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
            <ShieldCheck className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          </div>
          <p className="stat-num text-2xl text-amber-200">{data?.openCollections ?? 0}</p>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-1">Open Collections</p>
          <p className="text-[11px] font-mono text-zinc-600 mt-0.5">Active cases</p>
        </div>
        <div className="glass-card p-5">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
            <FileText className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          </div>
          <p className="stat-num text-2xl text-emerald-200">{data?.pendingApplications ?? 0}</p>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-1">Pending Applications</p>
          <p className="text-[11px] font-mono text-zinc-600 mt-0.5">Awaiting review</p>
        </div>
      </div>

      {/* Risk Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Risk Distribution</h2>
          <div className="grid grid-cols-4 gap-4">
            {Object.entries(riskCounts).map(([level, count]) => (
              <div key={level} className="text-center">
                <p className="stat-num text-xl text-zinc-900 dark:text-zinc-100">{count as number}</p>
                <p className="text-[10px] font-mono uppercase tracking-widest mt-1" style={{ color: `var(--accent-${level === 'LOW' ? 'emerald' : level === 'MEDIUM' ? 'blue' : level === 'HIGH' ? 'amber' : 'red'})` }}>{level}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Top 5 by Outstanding</h2>
          <div className="space-y-3">
            {topCustomers.map((c: any, i: number) => (
              <div key={c.customerId} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-zinc-600 w-4">{i + 1}</span>
                  <span className="text-sm text-zinc-600 dark:text-zinc-300">{c.customerName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`badge ${c.riskLevel === 'HIGH' || c.riskLevel === 'CRITICAL' ? 'badge-warning' : 'badge-in'}`}>{c.riskLevel}</span>
                  <span className="stat-num text-sm text-amber-500 dark:text-amber-400 w-24 text-right">{fmt(c.utilized)}</span>
                </div>
              </div>
            ))}
            {topCustomers.length === 0 && <div className="py-6 text-center text-xs font-mono text-zinc-600">No outstanding balances.</div>}
          </div>
        </div>
      </div>

      {/* Upcoming AR */}
      {upcoming && (
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Upcoming AR (next 30 days)</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { key: 'overdue', label: 'Overdue', color: 'red', icon: AlertTriangle },
              { key: 'critical', label: 'Due ≤7d', color: 'amber', icon: Clock },
              { key: 'warning', label: 'Due ≤14d', color: 'yellow', icon: Clock },
              { key: 'soon', label: 'Due ≤30d', color: 'blue', icon: Clock },
            ].map(item => (
              <div key={item.key} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-${item.color}-500/10 border border-${item.color}-500/20 flex items-center justify-center">
                  <item.icon className="w-4 h-4 text-${item.color}-400" />
                </div>
                <div>
                  <p className="stat-num text-lg text-zinc-900 dark:text-zinc-100">{upcoming.counts[item.key] ?? 0}</p>
                  <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{item.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Applications & Collections Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Recent Applications</h2>
            <p className="text-xs font-mono text-zinc-500 mt-0.5">Last 5 submitted</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  {['App No', 'Customer', 'Requested', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/50">
                {recentApplications.map((a: any) => (
                  <tr key={a.id} className="hover:bg-zinc-100 dark:hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 font-mono text-xs text-zinc-500 dark:text-zinc-400">{a.applicationNo}</td>
                    <td className="px-4 py-2.5 text-sm text-zinc-600 dark:text-zinc-300">{a.customer?.name ?? '—'}</td>
                    <td className="px-4 py-2.5 stat-num text-sm">{fmt(a.requestedLimit)}</td>
                    <td className="px-4 py-2.5"><span className={`badge ${a.status === 'APPROVED' ? 'badge-in' : a.status === 'REJECTED' ? 'badge-warning' : 'badge-outline'}`}>{a.status}</span></td>
                  </tr>
                ))}
                {recentApplications.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-xs font-mono text-zinc-600">No applications found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Collections Queue</h2>
            <p className="text-xs font-mono text-zinc-500 mt-0.5">Open cases requiring action</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  {['Case No', 'Customer', 'Amount', 'Priority', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/50">
                {openCases.map((c: any) => (
                  <tr key={c.id} className="hover:bg-zinc-100 dark:hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 font-mono text-xs text-zinc-500 dark:text-zinc-400">{c.caseNo}</td>
                    <td className="px-4 py-2.5 text-sm text-zinc-600 dark:text-zinc-300">{c.customer?.name ?? '—'}</td>
                    <td className="px-4 py-2.5 stat-num text-sm text-amber-500 dark:text-amber-400">{fmt(c.amount)}</td>
                    <td className="px-4 py-2.5"><span className={`badge ${c.priority === 'URGENT' ? 'badge-warning' : c.priority === 'HIGH' ? 'badge-outline' : 'badge-in'}`}>{c.priority}</span></td>
                    <td className="px-4 py-2.5"><span className={`badge ${c.status === 'RESOLVED' ? 'badge-in' : 'badge-outline'}`}>{c.status}</span></td>
                  </tr>
                ))}
                {openCases.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-xs font-mono text-zinc-600">No open cases.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Overdue Notifications */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Overdue Notifications</h2>
          <p className="text-xs font-mono text-zinc-500 mt-0.5">Recent alerts</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                {['Customer', 'Days', 'Amount', 'Channel', 'Notified At'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/50">
              {recentNotifications.map((n: any) => (
                <tr key={n.id} className="hover:bg-zinc-100 dark:hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5 text-sm text-zinc-600 dark:text-zinc-300">{n.customer?.name ?? '—'}</td>
                  <td className="px-4 py-2.5 stat-num text-sm text-red-500 dark:text-red-400">{n.daysOutstanding} days</td>
                  <td className="px-4 py-2.5 stat-num text-sm text-amber-500 dark:text-amber-400">{fmt(n.amount)}</td>
                  <td className="px-4 py-2.5 text-xs text-zinc-500">{n.channel}</td>
                  <td className="px-4 py-2.5 text-xs text-zinc-500">{new Date(n.notifiedAt).toLocaleString()}</td>
                </tr>
              ))}
              {recentNotifications.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-xs font-mono text-zinc-600">No notifications found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
