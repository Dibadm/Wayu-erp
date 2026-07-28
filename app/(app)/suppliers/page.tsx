import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Building2, Phone, Mail, Package } from 'lucide-react'
import SupplierModal from '@/components/SupplierModal'

export default async function SuppliersPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { purchaseOrders: true } } },
  })

  const activeCount   = suppliers.filter(s => s.status === 'ACTIVE').length
  const inactiveCount = suppliers.filter(s => s.status === 'INACTIVE').length

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Suppliers</h1>
          <p className="text-sm text-zinc-500 font-mono mt-0.5">
            {activeCount} active · {inactiveCount} inactive
          </p>
        </div>
        <SupplierModal />
      </div>

      {/* Grid of supplier cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {suppliers.map(s => (
          <Link key={s.id} href={`/suppliers/${s.id}`}
            className="glass-card p-5 hover:border-white/10 transition-all hover:scale-[1.01] block">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-blue-400" />
              </div>
              <span className={`badge ${s.status === 'ACTIVE' ? 'badge-ok' : 'badge-low'}`}>
                {s.status}
              </span>
            </div>

            <h3 className="text-sm font-semibold text-zinc-100 mb-1">{s.name}</h3>
            {s.contactPerson && <p className="text-xs text-zinc-500 mb-2">{s.contactPerson}</p>}

            <div className="space-y-1 mt-3">
              {s.email && (
                <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-500">
                  <Mail className="w-3 h-3" /> {s.email}
                </div>
              )}
              {s.phone && (
                <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-500">
                  <Phone className="w-3 h-3" /> {s.phone}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-zinc-800">
              <Package className="w-3.5 h-3.5 text-zinc-600" />
              <span className="text-xs font-mono text-zinc-500">
                {s._count.purchaseOrders} purchase order{s._count.purchaseOrders !== 1 ? 's' : ''}
              </span>
            </div>
          </Link>
        ))}

        {suppliers.length === 0 && (
          <div className="col-span-3 glass-card py-16 flex flex-col items-center gap-3 text-zinc-600">
            <Building2 className="w-8 h-8" />
            <p className="text-sm font-mono">No suppliers yet. Add your first supplier.</p>
          </div>
        )}
      </div>
    </div>
  )
}
