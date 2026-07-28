import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Building2, Mail, Phone, MapPin, FileText } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import SupplierModal from '@/components/SupplierModal'

const PO_STATUS_COLORS: Record<string, string> = {
  DRAFT:              'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  PENDING:            'bg-blue-500/10 text-blue-400 border-blue-500/20',
  APPROVED:           'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  ORDERED:            'bg-amber-500/10 text-amber-400 border-amber-500/20',
  PARTIALLY_RECEIVED: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  COMPLETED:          'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  CANCELLED:          'bg-red-500/10 text-red-400 border-red-500/20',
}

export default async function SupplierDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const supplier = await prisma.supplier.findUnique({
    where: { id: params.id },
    include: {
      purchaseOrders: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          createdBy: { select: { name: true } },
          _count: { select: { items: true } },
        },
      },
    },
  })

  if (!supplier) notFound()

  const totalSpend = supplier.purchaseOrders
    .filter(po => po.status === 'COMPLETED')
    .reduce((s, po) => s + Number(po.totalCost), 0)

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <Link href="/suppliers" className="inline-flex items-center gap-1 text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors">
        <ChevronLeft className="w-3 h-3" /> Back to Suppliers
      </Link>

      {/* Supplier header card */}
      <div className="glass-card p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-zinc-100">{supplier.name}</h1>
                <span className={`badge ${supplier.status === 'ACTIVE' ? 'badge-ok' : 'badge-low'}`}>{supplier.status}</span>
              </div>
              {supplier.contactPerson && <p className="text-sm text-zinc-500 mt-0.5">{supplier.contactPerson}</p>}
            </div>
          </div>
          <SupplierModal supplier={supplier as any} />
        </div>

        {/* Contact details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t border-zinc-800">
          {supplier.email && (
            <div>
              <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest flex items-center gap-1"><Mail className="w-3 h-3" />Email</p>
              <p className="text-xs font-mono text-zinc-300 mt-1 break-all">{supplier.email}</p>
            </div>
          )}
          {supplier.phone && (
            <div>
              <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest flex items-center gap-1"><Phone className="w-3 h-3" />Phone</p>
              <p className="text-xs font-mono text-zinc-300 mt-1">{supplier.phone}</p>
            </div>
          )}
          {supplier.taxNumber && (
            <div>
              <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Tax Number</p>
              <p className="text-xs font-mono text-zinc-300 mt-1">{supplier.taxNumber}</p>
            </div>
          )}
          <div>
            <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Total Spend</p>
            <p className="stat-num text-sm text-zinc-100 mt-1">₱{totalSpend.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        {supplier.address && (
          <div className="mt-3 flex items-start gap-1.5 text-xs text-zinc-500">
            <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> {supplier.address}
          </div>
        )}
        {supplier.notes && (
          <div className="mt-3 flex items-start gap-1.5 text-xs text-zinc-500">
            <FileText className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> {supplier.notes}
          </div>
        )}
      </div>

      {/* PO history */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-100">Purchase Order History</h2>
          <span className="text-xs font-mono text-zinc-500">{supplier.purchaseOrders.length} orders</span>
        </div>
        <div className="divide-y divide-zinc-800/50">
          {supplier.purchaseOrders.map(po => (
            <Link key={po.id} href={`/purchase-orders/${po.id}`}
              className="flex items-center gap-4 px-5 py-3 hover:bg-white/[0.02] transition-colors group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-mono font-semibold text-zinc-200">{po.poNumber}</p>
                  <span className={`badge border ${PO_STATUS_COLORS[po.status] ?? ''}`}>{po.status.replace('_', ' ')}</span>
                </div>
                <p className="text-[11px] font-mono text-zinc-600 mt-0.5">
                  {po._count.items} item{po._count.items !== 1 ? 's' : ''} · Created by {po.createdBy.name ?? 'User'} · {formatDate(po.createdAt)}
                </p>
              </div>
              <p className="stat-num text-sm text-zinc-300 flex-shrink-0">
                ₱{Number(po.totalCost).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </p>
            </Link>
          ))}
          {supplier.purchaseOrders.length === 0 && (
            <div className="py-10 text-center text-sm font-mono text-zinc-600">No purchase orders yet.</div>
          )}
        </div>
      </div>
    </div>
  )
}
