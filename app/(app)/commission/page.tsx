import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import CommissionRatesClient from './CommissionRatesClient'

export default async function CommissionPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if ((session.user as any).role !== 'ADMIN') redirect('/dashboard')

  const [rates, products, users] = await Promise.all([
    prisma.commissionRate.findMany({
      orderBy: [{ scope: 'asc' }, { tierFromQty: 'asc' }],
      include: {
        salesperson: { select: { id: true, name: true, email: true } },
        product: { select: { id: true, name: true, sku: true } },
      },
    }),
    prisma.product.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, sku: true } }),
    prisma.user.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, email: true, role: true } }),
  ])

  const serializedRates = rates.map(r => ({
    ...r,
    rate: Number(r.rate),
    createdAt: r.createdAt.toISOString(),
  }))

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Commission Rates</h1>
          <p className="text-sm text-zinc-500 font-mono mt-0.5">Configure tiered commission rates by scope</p>
        </div>
        <a href="/commission/performance" className="text-xs font-mono text-blue-400 hover:text-blue-300">Salesperson Performance →</a>
      </div>
      <CommissionRatesClient initialRates={serializedRates} products={products} users={users} />
    </div>
  )
}