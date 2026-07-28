'use client'

import { useState, useEffect } from 'react'
import { CreditCard, Users, FileText, ShieldCheck, AlertTriangle } from 'lucide-react'
import RiskBadge from './RiskBadge'
import CreditUtilizationBar from './CreditUtilizationBar'

export default function CreditDashboardClient({ role }: { role: string }) {
  const [data, setData] = useState<any>(null)
  const [riskData, setRiskData] = useState<any>(null)
  const [utilizationData, setUtilizationData] = useState<any>(null)
  const [applications, setApplications] = useState<any[]>([])
  const [cases, setCases] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/credit/dashboard').then(r => r.json()),
      fetch('/api/credit/reports?type=risk-analysis').then(r => r.json()),
      fetch('/api/credit/reports?type=utilization').then(r => r.json()),
      fetch('/api/credit-applications').then(r => r.json()),
      fetch('/api/collection-cases').then(r => r.json()),
      fetch('/api/overdue-notifications').then(r => r.json()),
    ]).then(([dashboard, risk, utilization, apps, cases, notifications]) => {
      setData(dashboard)
      setRiskData(risk)
      setUtilizationData(utilization)
      setApplications(apps)
      setCases(cases)
      setNotifications(notifications)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const fmt = (n: number) => `ETB ${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 })}`

  if (loading) return <div className="p-10 text-center text-xs font-mono text-zinc-600">Loading credit dashboard...</div>
  if (!data) return <div className="p-10 text-center text-xs font-mono text-zinc-600">Failed to load dashboard data.</div>

  const riskCounts = riskData?.data || { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 }
  const utilization = utilizationData?.data || []
  const topCustomers = utilization.sort((a: any, b: any) => b.utilized - a.utilized).slice(0, 5)
  const recentApplications = applications.slice(0, 5)
  const openCases = cases.filter((c: any) => c.status !== 'RESOLVED').slice(0, 5)
  const recentNotifications = notifications.slice(0, 5)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="glass-card p-5">
          <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4">
            <CreditCard className="w-4 h-4 text-purple-400" />
          </div>
          <p className="stat-num text-2xl text-purple-200">{fmt(data.totalOutstanding)}</p>
          <p className="text-xs font-medium text-zinc-400 mt-1">Total Outstanding</p>
        </div>
        <div className="glass-card p-5">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <p className="stat-num text-2xl text-blue-200">{data.activeCreditCustomers}</p>
          <p className="text-xs font-medium text-zinc-400 mt-1">Active Credit Customers</p>
        </div>
        <div className="glass-card p-5">
          <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
            <ShieldCheck className="w-4 h-4 text-red-400" />
          </div>
          <p className="stat-num text-2xl text-red-400">{data.overdueCount}</p>
          <p className="text-xs font-medium text-zinc-400 mt-1">Overdue Customers</p>
        </div>
        <div className="glass-card p-5">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
          </div>
          <p className="stat-num text-2xl text-amber-200">{data.openCollections}</p>
          <p className="text-xs font-medium text-zinc-400 mt-1">Open Collections</p>
        </div>
        <div className="glass-card p-5">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
            <FileText className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="stat-num text-2xl text-emerald-200">{data.pendingApplications}</p>
          <p className="text-xs font-medium text-zinc-400 mt-1">Pending Applications</p>
        </div>
      </div>

      {/* Risk Distribution + Top Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold text-zinc-100 mb-4">Risk Distribution</h2>
          <div className="grid grid-cols-4 gap-4">
            {Object.entries(riskCounts).map(([level, count]) => (
              <div key={level} className="text-center">
                <p className="stat-num text-xl text-zinc-100">{count as number}</p>
                <p className="text-[10px] font-mono uppercase tracking-widest mt-1" style={{ color: `var(--accent-${level === 'LOW' ? 'emerald' : level === 'MEDIUM' ? 'blue' : level === 'HIGH' ? 'amber' : 'red'})` }}>{level}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold text-zinc-100 mb-4">Top 5 by Outstanding</h2>
          <div className="space-y-3">
            {topCustomers.map((c: any, i: number) => (
              <div key={c.customerId} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-zinc-600 w-4">{i + 1}</span>
                  <span className="text-sm text-zinc-300">{c.customerName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <RiskBadge level={c.riskLevel} />
                  <span className="stat-num text-sm text-amber-400 w-24 text-right">{fmt(c.utilized)}</span>
                </div>
              </div>
            ))}
            {topCustomers.length === 0 && <div className="py-6 text-center text-xs font-mono text-zinc-600">No outstanding balances.</div>}
          </div>
        </div>
      </div>

      {/* Recent Applications + Collections Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-100">Recent Applications</h2>
          </div>
          <div className="divide-y divide-zinc-800/50">
            {recentApplications.map((a: any) => (
              <div key={a.id} className="px-5 py-3 flex items-center justify-between hover:bg-white/[0.02]">
                <div>
                  <p className="text-sm text-zinc-200">{a.applicationNo}</p>
                  <p className="text-[10px] font-mono text-zinc-600">{a.customer?.name}</p>
                </div>
                <div className="text-right">
                  <p className="stat-num text-sm">ETB {Number(a.requestedLimit).toLocaleString()}</p>
                  <span className={`badge ${a.status === 'APPROVED' ? 'badge-in' : a.status === 'REJECTED' ? 'badge-warning' : 'badge-outline'}`}>{a.status}</span>
                </div>
              </div>
            ))}
            {recentApplications.length === 0 && <div className="py-6 text-center text-xs font-mono text-zinc-600">No applications found.</div>}
          </div>
        </div>
        <div className="glass-card overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-100">Collections Queue</h2>
          </div>
          <div className="divide-y divide-zinc-800/50">
            {openCases.map((c: any) => (
              <div key={c.id} className="px-5 py-3 flex items-center justify-between hover:bg-white/[0.02]">
                <div>
                  <p className="text-sm text-zinc-200">{c.caseNo}</p>
                  <p className="text-[10px] font-mono text-zinc-600">{c.customer?.name}</p>
                </div>
                <div className="text-right">
                  <p className="stat-num text-sm text-amber-400">ETB {Number(c.amount).toLocaleString()}</p>
                  <span className={`badge ${c.priority === 'URGENT' ? 'badge-warning' : c.priority === 'HIGH' ? 'badge-outline' : 'badge-in'}`}>{c.priority}</span>
                </div>
              </div>
            ))}
            {openCases.length === 0 && <div className="py-6 text-center text-xs font-mono text-zinc-600">No open cases.</div>}
          </div>
        </div>
      </div>

      {/* Overdue Notifications */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-100">Overdue Notifications</h2>
        </div>
        <div className="divide-y divide-zinc-800/50">
          {recentNotifications.map((n: any) => (
            <div key={n.id} className="px-5 py-3 flex items-center justify-between hover:bg-white/[0.02]">
              <div>
                <p className="text-sm text-zinc-200">{n.customer?.name}</p>
                <p className="text-[10px] font-mono text-zinc-600">{n.daysOutstanding} days outstanding</p>
              </div>
              <div className="text-right">
                <p className="stat-num text-sm text-amber-400">ETB {Number(n.amount).toLocaleString()}</p>
                <p className="text-[10px] font-mono text-zinc-600">{n.channel}</p>
              </div>
            </div>
          ))}
          {recentNotifications.length === 0 && <div className="py-6 text-center text-xs font-mono text-zinc-600">No notifications found.</div>}
        </div>
      </div>
    </div>
  )
}
