import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getExpiryBatchDetails, getExpiryCounts, expiryTierColors, expiryTierLabel } from '@/lib/expiry'
import { FlaskConical, AlertTriangle, XCircle } from 'lucide-react'
import ExpiryAIAdvice from '@/components/ExpiryAIAdvice'
import Breadcrumb from '@/components/Breadcrumb'
import BatchesTable from '@/components/BatchesTable'

export default async function BatchesPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const [batches, counts] = await Promise.all([
    getExpiryBatchDetails(),
    getExpiryCounts(),
  ])

  return (
    <div className="space-y-6 animate-fade-in">
      <Breadcrumb />
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Batch & Expiry Tracker</h1>
          <p className="text-sm text-zinc-500 font-mono mt-0.5">{batches.length} batches with expiry activity</p>
        </div>
        <ExpiryAIAdvice />
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Already Expired', count: counts.expired,  icon: XCircle,       cls: counts.expired  > 0 ? 'border-red-500/25 bg-red-500/10'     : 'border-zinc-800 bg-zinc-900/30', num: counts.expired  > 0 ? 'text-red-400'    : 'text-zinc-600' },
          { label: 'Expires ≤ 7 Days', count: counts.within7,  icon: AlertTriangle, cls: counts.within7  > 0 ? 'border-orange-500/25 bg-orange-500/10' : 'border-zinc-800 bg-zinc-900/30', num: counts.within7  > 0 ? 'text-orange-400' : 'text-zinc-600' },
          { label: 'Expires ≤ 14 Days',count: counts.within14, icon: AlertTriangle, cls: counts.within14 > 0 ? 'border-amber-500/25 bg-amber-500/10'   : 'border-zinc-800 bg-zinc-900/30', num: counts.within14 > 0 ? 'text-amber-400'  : 'text-zinc-600' },
          { label: 'Expires ≤ 30 Days',count: counts.within30, icon: FlaskConical,  cls: counts.within30 > 0 ? 'border-yellow-500/20 bg-yellow-500/5'  : 'border-zinc-800 bg-zinc-900/30', num: counts.within30 > 0 ? 'text-yellow-400' : 'text-zinc-600' },
        ].map(t => {
          const Icon = t.icon
          return (
            <div key={t.label} className={`rounded-xl border p-4 ${t.cls}`}>
              <Icon className={`w-4 h-4 mb-2 ${t.num}`} />
              <p className={`stat-num text-2xl ${t.num}`}>{t.count}</p>
              <p className="text-xs font-mono text-zinc-500 mt-0.5">{t.label}</p>
            </div>
          )
        })}
      </div>

      <BatchesTable batches={batches} />
    </div>
  )
}
