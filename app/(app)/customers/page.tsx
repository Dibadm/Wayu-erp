import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Users, Phone, Mail } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import CustomerModal from '@/components/CustomerModal'

export default async function CustomersPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { sales: true } },
      sales:  { select: { total: true }, orderBy: { createdAt: 'desc' } },
    },
  })

  const totalRevenue = customers.reduce((s, c) =>
    s + c.sales.reduce((cs, sale) => cs + Number(sale.total), 0), 0)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Customers</h1>
          <p className="text-sm text-zinc-500 font-mono mt-0.5">
            {customers.length} registered · ₱{totalRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })} total revenue
          </p>
        </div>
        <CustomerModal />
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                {['Customer', 'Contact', 'Total Purchases', 'Lifetime Value', 'Since', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {customers.map(c => {
                const ltv = c.sales.reduce((s, sale) => s + Number(sale.total), 0)
                return (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold text-blue-400">
                            {c.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-zinc-200">{c.name}</p>
                          {c.address && <p className="text-[10px] font-mono text-zinc-600 mt-0.5 truncate max-w-xs">{c.address}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {c.phone && (
                        <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-500">
                          <Phone className="w-3 h-3" /> {c.phone}
                        </div>
                      )}
                      {c.email && (
                        <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-500 mt-0.5">
                          <Mail className="w-3 h-3" /> {c.email}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 stat-num text-sm text-zinc-300">{c._count.sales}</td>
                    <td className="px-5 py-3 stat-num text-sm text-emerald-400">
                      ₱{ltv.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3 text-xs font-mono text-zinc-600">{formatDate(c.createdAt)}</td>
                    <td className="px-5 py-3">
                      <Link href={`/customers/${c.id}`}
                        className="text-xs font-mono text-blue-500 hover:text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity">
                        VIEW →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {customers.length === 0 && (
          <div className="py-16 flex flex-col items-center gap-3 text-zinc-600">
            <Users className="w-8 h-8" />
            <p className="text-sm font-mono">No customers yet. Add your first customer.</p>
          </div>
        )}
      </div>
    </div>
  )
}
