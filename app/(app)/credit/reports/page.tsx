'use client'

import { useState, useEffect } from 'react'
import { FileText, Download, TrendingUp, Users, ShieldCheck, Receipt, AlertTriangle, Activity } from 'lucide-react'
import { canAccess } from '@/lib/permissions'
import { useSession } from 'next-auth/react'

type Tab = 'aging-summary' | 'customer-profiles' | 'collections' | 'applications' | 'risk-analysis' | 'utilization'

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: 'aging-summary', label: 'Aging Summary', icon: TrendingUp },
  { key: 'customer-profiles', label: 'Customer Profiles', icon: Users },
  { key: 'collections', label: 'Collections', icon: ShieldCheck },
  { key: 'applications', label: 'Applications', icon: Receipt },
  { key: 'risk-analysis', label: 'Risk Analysis', icon: AlertTriangle },
  { key: 'utilization', label: 'Utilization', icon: Activity },
]

export default function CreditReportsPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role
  const [activeTab, setActiveTab] = useState<Tab>('aging-summary')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const canView = canAccess(role, 'reports:view', 'credit:view', 'aging:view', 'collections:view')

  useEffect(() => {
    if (!canView) return
    setLoading(true)
    let url = `/api/credit/reports?type=${activeTab}`
    if (activeTab === 'customer-profiles') {
      url += '&id=all'
    }
    fetch(url).then(r => r.json()).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [activeTab, canView])

  const exportCSV = () => {
    if (!data || !data.data) return
    const rows = data.data
    if (!Array.isArray(rows) || rows.length === 0) return
    const headers = Object.keys(rows[0])
    const csv = [headers, ...rows.map(r => headers.map(h => r[h] ?? '').join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `credit-report-${activeTab}.csv`
    link.click()
  }

  if (!canView) {
    return <div className="p-10 text-center text-xs font-mono text-zinc-600">You do not have permission to view this page.</div>
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Credit Reports</h1>
          <p className="text-sm text-zinc-500 font-mono mt-0.5">Detailed credit analytics and exports</p>
        </div>
        {data?.data?.length > 0 && (
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-emerald-400 hover:bg-emerald-500/20 transition-colors">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        )}
      </div>

      <div className="flex gap-2 border-b border-zinc-800">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab.key ? 'border-b-2 border-blue-500 text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
            <span className="flex items-center gap-1.5"><tab.icon className="w-4 h-4" />{tab.label}</span>
          </button>
        ))}
      </div>

      {loading && <div className="p-10 text-center text-xs font-mono text-zinc-600">Loading report...</div>}

      {!loading && data && (
        <div className="glass-card overflow-hidden">
          {activeTab === 'risk-analysis' && (
            <div className="p-5">
              <h2 className="text-sm font-semibold text-zinc-100 mb-4">Risk Distribution</h2>
              <div className="grid grid-cols-4 gap-4">
                {Object.entries(data.data || {}).map(([level, count]) => (
                  <div key={level} className="text-center">
                    <p className="stat-num text-xl text-zinc-100">{count as number}</p>
                    <p className="text-[10px] font-mono uppercase tracking-widest mt-1" style={{ color: `var(--accent-${level === 'LOW' ? 'emerald' : level === 'MEDIUM' ? 'blue' : level === 'HIGH' ? 'amber' : 'red'})` }}>{level}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-zinc-500 mt-4">Total profiles: {data.totalProfiles || 0}</p>
            </div>
          )}

          {activeTab === 'utilization' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    {['Customer', 'Credit Limit', 'Utilized', 'Available', 'Utilization %', 'Risk Level'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {(data.data || []).map((u: any) => (
                    <tr key={u.customerId} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-2.5 text-sm text-zinc-300">{u.customerName}</td>
                      <td className="px-4 py-2.5 stat-num text-sm">ETB {Number(u.creditLimit).toLocaleString()}</td>
                      <td className="px-4 py-2.5 stat-num text-sm text-amber-400">ETB {Number(u.utilized).toLocaleString()}</td>
                      <td className="px-4 py-2.5 stat-num text-sm text-emerald-400">ETB {Number(u.available).toLocaleString()}</td>
                      <td className="px-4 py-2.5 stat-num text-sm">{u.utilizationPct}%</td>
                      <td className="px-4 py-2.5"><span className={`badge ${u.riskLevel === 'HIGH' || u.riskLevel === 'CRITICAL' ? 'badge-warning' : 'badge-in'}`}>{u.riskLevel}</span></td>
                    </tr>
                  ))}
                  {(data.data || []).length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-xs font-mono text-zinc-600">No data found.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {(activeTab === 'aging-summary' || activeTab === 'collections' || activeTab === 'applications') && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    {data.type === 'aging-summary' && ['Customer', 'Current', '31-60', '61-90', '90+', 'Total', 'Terms', 'As Of'].map(h => <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>)}
                    {data.type === 'collections' && ['Case No', 'Customer', 'Amount', 'Priority', 'Status', 'Assigned To', 'Due Date'].map(h => <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>)}
                    {data.type === 'applications' && ['App No', 'Customer', 'Requested', 'Terms', 'Status', 'Date'].map(h => <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {(data.data || []).map((row: any) => (
                    <tr key={row.id || row.customerId} className="hover:bg-white/[0.02]">
                      {data.type === 'aging-summary' && (
                        <>
                          <td className="px-4 py-2.5 text-sm text-zinc-300">{row.name}</td>
                          <td className="px-4 py-2.5 stat-num text-sm text-emerald-400">ETB {Number(row.current).toLocaleString()}</td>
                          <td className="px-4 py-2.5 stat-num text-sm text-blue-400">ETB {Number(row.bucket31to60).toLocaleString()}</td>
                          <td className="px-4 py-2.5 stat-num text-sm text-amber-400">ETB {Number(row.bucket61to90).toLocaleString()}</td>
                          <td className="px-4 py-2.5 stat-num text-sm text-red-400">ETB {Number(row.bucket90plus).toLocaleString()}</td>
                          <td className="px-4 py-2.5 stat-num text-sm text-zinc-200">ETB {Number(row.total).toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-xs text-zinc-500">{row.terms} days</td>
                          <td className="px-4 py-2.5 text-xs text-zinc-500">{row.asOf ? new Date(row.asOf).toLocaleDateString() : '—'}</td>
                        </>
                      )}
                      {data.type === 'collections' && (
                        <>
                          <td className="px-4 py-2.5 font-mono text-xs text-zinc-400">{row.caseNo}</td>
                          <td className="px-4 py-2.5 text-sm text-zinc-300">{row.customer?.name}</td>
                          <td className="px-4 py-2.5 stat-num text-sm text-amber-400">ETB {Number(row.amount).toLocaleString()}</td>
                          <td className="px-4 py-2.5"><span className={`badge ${row.priority === 'URGENT' ? 'badge-warning' : row.priority === 'HIGH' ? 'badge-outline' : 'badge-in'}`}>{row.priority}</span></td>
                          <td className="px-4 py-2.5"><span className={`badge ${row.status === 'RESOLVED' ? 'badge-in' : 'badge-outline'}`}>{row.status}</span></td>
                          <td className="px-4 py-2.5 text-xs text-zinc-500">{row.assignedToUser?.name || '—'}</td>
                          <td className="px-4 py-2.5 text-xs text-zinc-500">{row.dueDate ? new Date(row.dueDate).toLocaleDateString() : '—'}</td>
                        </>
                      )}
                      {data.type === 'applications' && (
                        <>
                          <td className="px-4 py-2.5 font-mono text-xs text-zinc-400">{row.applicationNo}</td>
                          <td className="px-4 py-2.5 text-sm text-zinc-300">{row.customer?.name}</td>
                          <td className="px-4 py-2.5 stat-num text-sm">ETB {Number(row.requestedLimit).toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-xs text-zinc-500">{row.requestedTerms} days</td>
                          <td className="px-4 py-2.5"><span className={`badge ${row.status === 'APPROVED' ? 'badge-in' : row.status === 'REJECTED' ? 'badge-warning' : 'badge-outline'}`}>{row.status}</span></td>
                          <td className="px-4 py-2.5 text-xs text-zinc-500">{new Date(row.createdAt).toLocaleDateString()}</td>
                        </>
                      )}
                    </tr>
                  ))}
                  {(data.data || []).length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-xs font-mono text-zinc-600">No data found.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'customer-profiles' && data.data && (
            <div className="p-5">
              <pre className="text-xs font-mono text-zinc-400 whitespace-pre-wrap">{JSON.stringify(data.data, null, 2)}</pre>
            </div>
          )}
        </div>
      )}

      {!loading && !data && (
        <div className="p-10 text-center text-xs font-mono text-zinc-600">No report data available.</div>
      )}
    </div>
  )
}
