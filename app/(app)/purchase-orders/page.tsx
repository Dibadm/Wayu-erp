import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ShoppingCart, Plus, Clock, CheckCircle, XCircle, Package } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import CreatePOModal from '@/components/CreatePOModal'

// Status display config
const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  DRAFT:              { label: 'Draft',              cls: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
  PENDING:            { label: 'Pending',            cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  APPROVED:           { label: 'Approved',           cls: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  ORDERED:            { label: 'Ordered',            cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  PARTIALLY_RECEIVED: { label: 'Partial',            cls: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  COMPLETED:          { label: 'Completed',          cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  CANCELLED:          { label: 'Cancelled',          cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
}

export default async function PurchaseOrdersPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const [orders, suppliers, openCount] = await Promise.all([
    prisma.purchaseOrder.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        supplier:  { select: { name: true } },
        createdBy: { select: { name: true, email: true } },
        _count:    { select: { items: true } },
      },
    }),
    prisma.supplier.findMany({ where: { status: 'ACTIVE' }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.purchaseOrder.count({ where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
  ])

  const totalValue = orders.reduce((s, o) => s + Number(o.totalCost), 0)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Purchase Orders</h1>
          <p className="text-sm text-zinc-500 font-mono mt-0.5">
            {orders.length} orders · {openCount} open
          </p>
        </div>
        <CreatePOModal />
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Orders', value: orders.length, icon: ShoppingCart, color: 'blue' },
          { label: 'Open Orders',  value: openCount,     icon: Clock,        color: openCount > 0 ? 'amber' : 'emerald' },
          { label: 'Completed',    value: orders.filter(o => o.status === 'COMPLETED').length,  icon: CheckCircle, color: 'emerald' },
          { label: 'Cancelled',    value: orders.filter(o => o.status === 'CANCELLED').length,  icon: XCircle,     color: 'zinc' },
        ].map(t => {
          const Icon = t.icon
          const colors: Record<string, string> = {
            blue:   'bg-blue-500/10 border-blue-500/20 text-blue-400',
            amber:  'bg-amber-500/10 border-amber-500/20 text-amber-400',
            emerald:'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
            zinc:   'bg-zinc-500/10 border-zinc-500/20 text-zinc-500',
          }
          return (
            <div key={t.label} className={`rounded-xl border p-4 ${colors[t.color]}`}>
              <Icon className="w-4 h-4 mb-2" />
              <p className="stat-num text-2xl">{t.value}</p>
              <p className="text-xs font-mono mt-0.5 opacity-80">{t.label}</p>
            </div>
          )
        })}
      </div>

      {/* PO table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                {['PO Number', 'Supplier', 'Status', 'Items', 'Total Cost', 'Expected Delivery', 'Created By', 'Date', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {orders.map(o => {
                const cfg = STATUS_CONFIG[o.status] ?? STATUS_CONFIG.DRAFT
                return (
                  <tr key={o.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs text-blue-400">{o.poNumber}</span>
                    </td>
                    <td className="px-5 py-3 text-xs text-zinc-300">{o.supplier.name}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono border ${cfg.cls}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 stat-num text-sm text-zinc-400">{o._count.items}</td>
                    <td className="px-5 py-3 stat-num text-sm text-zinc-200">
                      ETB {Number(o.totalCost).toLocaleString('en-ET', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3 text-xs font-mono text-zinc-500">
                      {o.expectedDelivery ? formatDate(o.expectedDelivery) : '—'}
                    </td>
                    <td className="px-5 py-3 text-xs font-mono text-zinc-500">
                      {o.createdBy.name ?? o.createdBy.email.split('@')[0]}
                    </td>
                    <td className="px-5 py-3 text-xs font-mono text-zinc-600">
                      {formatDate(o.createdAt)}
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/purchase-orders/${o.id}`}
                        className="text-xs font-mono text-blue-500 hover:text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        VIEW →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {orders.length === 0 && (
          <div className="py-16 flex flex-col items-center gap-3 text-zinc-600">
            <ShoppingCart className="w-8 h-8" />
            <p className="text-sm font-mono">No purchase orders yet. Create your first PO.</p>
          </div>
        )}
      </div>
    </div>
  )
}
