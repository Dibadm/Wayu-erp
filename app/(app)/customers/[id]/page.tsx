import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Phone, Mail, MapPin, ShoppingBag } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import CustomerModal from '@/components/CustomerModal'

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
    include: {
      sales: {
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          items:    { include: { product: { select: { name: true, sku: true } } } },
          payments: true,
          cashier:  { select: { name: true, email: true } },
        },
      },
    },
  })

  if (!customer) notFound()

  const totalSpent  = customer.sales.reduce((s, sale) => s + Number(sale.total), 0)
  const totalProfit = customer.sales.reduce((s, sale) => s + Number(sale.profit), 0)
  const avgSale     = customer.sales.length > 0 ? totalSpent / customer.sales.length : 0

  const STATUS_CLS: Record<string, string> = {
    COMPLETED:     'badge-ok',
    REFUNDED:      'badge-out',
    PARTIAL_REFUND:'badge-warning',
    VOIDED:        'badge-low',
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <Link href="/customers" className="inline-flex items-center gap-1 text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors">
        <ChevronLeft className="w-3 h-3" /> Customers
      </Link>

      {/* Customer card */}
      <div className="glass-card p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <span className="text-xl font-semibold text-blue-300">
                {customer.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-zinc-100">{customer.name}</h1>
              <div className="flex flex-col gap-0.5 mt-1">
                {customer.phone && (
                  <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-500">
                    <Phone className="w-3 h-3" /> {customer.phone}
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-500">
                    <Mail className="w-3 h-3" /> {customer.email}
                  </div>
                )}
                {customer.address && (
                  <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-500">
                    <MapPin className="w-3 h-3" /> {customer.address}
                  </div>
                )}
              </div>
            </div>
          </div>
          <CustomerModal customer={{ id: customer.id, name: customer.name, phone: customer.phone ?? '', email: customer.email ?? '', address: customer.address ?? '', notes: customer.notes ?? '' }} />
        </div>

        {customer.notes && (
          <div className="mt-4 pt-4 border-t border-zinc-800">
            <p className="text-xs font-mono text-zinc-600 uppercase tracking-widest mb-1">Notes</p>
            <p className="text-xs text-zinc-400">{customer.notes}</p>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4 mt-5 pt-4 border-t border-zinc-800">
          {[
            { label: 'Total Purchases', value: customer.sales.length.toString(),   mono: false },
            { label: 'Lifetime Value',  value: `₱${totalSpent.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, mono: true },
            { label: 'Avg Sale Value',  value: `₱${avgSale.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,    mono: true },
            { label: 'Total Profit',    value: `₱${totalProfit.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, mono: true },
          ].map(s => (
            <div key={s.label}>
              <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-1">{s.label}</p>
              <p className={`text-lg font-semibold text-zinc-100 ${s.mono ? 'font-mono' : ''}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Purchase history */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-100">Purchase History</h2>
          <p className="text-xs font-mono text-zinc-500 mt-0.5">Last 50 transactions</p>
        </div>
        {customer.sales.length === 0 ? (
          <div className="py-12 flex flex-col items-center gap-2 text-zinc-600">
            <ShoppingBag className="w-7 h-7" />
            <p className="text-xs font-mono">No purchases yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  {['Receipt', 'Status', 'Items', 'Total', 'Payment', 'Cashier', 'Date'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {customer.sales.map(sale => (
                  <tr key={sale.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-blue-400">{sale.receiptNumber}</td>
                    <td className="px-5 py-3">
                      <span className={`badge ${STATUS_CLS[sale.status] ?? 'badge-ok'}`}>{sale.status}</span>
                    </td>
                    <td className="px-5 py-3 stat-num text-sm text-zinc-400">{sale.items.length}</td>
                    <td className="px-5 py-3 stat-num text-sm text-emerald-400">
                      ₱{Number(sale.total).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3 text-xs font-mono text-zinc-500">
                      {sale.payments.map(p => p.method.replace('_', ' ')).join(', ')}
                    </td>
                    <td className="px-5 py-3 text-xs font-mono text-zinc-500">
                      {sale.cashier.name ?? sale.cashier.email.split('@')[0]}
                    </td>
                    <td className="px-5 py-3 text-xs font-mono text-zinc-600">{formatDate(sale.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
