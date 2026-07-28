import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getStockStatus } from '@/lib/utils'
import Link from 'next/link'
import AddProductModal from '@/components/AddProductModal'
import StockStatusBadge from '@/components/StockStatusBadge'
import InventoryTable from '@/components/InventoryTable'
import Breadcrumb from '@/components/Breadcrumb'
import { Package, Plus } from 'lucide-react'

export default async function InventoryPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const products = await prisma.product.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { movements: true } } },
  })

  const isAdmin = (session.user as any)?.role === 'ADMIN'

  return (
    <div className="space-y-6 animate-fade-in">
      <Breadcrumb />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Inventory</h1>
          <p className="text-sm text-zinc-500 font-mono mt-0.5">{products.length} products tracked</p>
        </div>
        {isAdmin && <AddProductModal />}
      </div>

      <InventoryTable products={products} />
    </div>
  )
}
