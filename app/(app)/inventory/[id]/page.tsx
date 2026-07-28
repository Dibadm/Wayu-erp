import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notFound, redirect } from 'next/navigation'
import { getStockStatus, formatDate } from '@/lib/utils'
import MovementsTable from '@/components/MovementsTable'
import StockMovementModal from '@/components/StockMovementModal'
import StockStatusBadge from '@/components/StockStatusBadge'
import Breadcrumb from '@/components/Breadcrumb'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default async function ProductPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: {
      movements: {
        orderBy: { timestamp: 'desc' },
        take: 20,
        include: { user: { select: { name: true, email: true } } },
      },
    },
  })

  if (!product) notFound()

  const status = getStockStatus(product.quantity, product.minStockLevel)
  const userId = (session.user as any).id

  // Augment movements with product info for table component
  const movements = product.movements.map(m => ({
    ...m,
    product: { name: product.name, sku: product.sku },
  }))

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <Breadcrumb productName={product.name} />
      {/* Back */}
      <Link href="/inventory" className="inline-flex items-center gap-1 text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors">
        <ChevronLeft className="w-3 h-3" /> Back to Inventory
      </Link>

      {/* Product header */}
      <div className="glass-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="sku mb-1">{product.sku}</p>
            <h1 className="text-xl font-semibold text-zinc-100">{product.name}</h1>
            {product.description && <p className="text-sm text-zinc-500 mt-1">{product.description}</p>}
            <div className="flex items-center gap-3 mt-3">
              <StockStatusBadge status={status} />
              <span className="text-xs font-mono text-zinc-600">{product.category}</span>
            </div>
          </div>
          <StockMovementModal productId={product.id} productName={product.name} userId={userId} />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-zinc-800">
          <div>
            <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Current Stock</p>
            <p className={`stat-num text-2xl mt-1 ${status === 'ok' ? 'text-zinc-100' : status === 'warning' ? 'text-amber-400' : 'text-red-400'}`}>
              {product.quantity.toLocaleString()}
            </p>
            <p className="text-xs font-mono text-zinc-600">{product.unit}</p>
          </div>
          <div>
            <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Min Level</p>
            <p className="stat-num text-2xl mt-1 text-zinc-400">{product.minStockLevel.toLocaleString()}</p>
            <p className="text-xs font-mono text-zinc-600">{product.unit}</p>
          </div>
          <div>
            <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Last Updated</p>
            <p className="text-sm font-mono text-zinc-400 mt-1">{formatDate(product.updatedAt)}</p>
          </div>
        </div>
      </div>

      {/* Movement history */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-100">Movement History</h2>
          <p className="text-xs font-mono text-zinc-500 mt-0.5">Last 20 transactions for this product</p>
        </div>
        <MovementsTable movements={movements} />
      </div>
    </div>
  )
}
