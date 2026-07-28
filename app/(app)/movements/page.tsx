import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import MovementsTable from '@/components/MovementsTable'
import Breadcrumb from '@/components/Breadcrumb'

export default async function MovementsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const movements = await prisma.movement.findMany({
    orderBy: { timestamp: 'desc' },
    take: 100,
    include: {
      product: { select: { name: true, sku: true } },
      user: { select: { name: true, email: true } },
    },
  })

  const inCount = movements.filter(m => m.type === 'IN').length
  const outCount = movements.filter(m => m.type === 'OUT').length

  return (
    <div className="space-y-6 animate-fade-in">
      <Breadcrumb />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Movements</h1>
          <p className="text-sm text-zinc-500 font-mono mt-0.5">Full stock transaction history</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="badge-in">{inCount} IN</span>
          <span className="badge-out">{outCount} OUT</span>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <MovementsTable movements={movements} />
      </div>
    </div>
  )
}
