import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') ?? ''
  if (!q.trim()) return NextResponse.json([])

  const products = await prisma.product.findMany({
    where: {
      quantity: { gt: 0 },  // only in-stock items on POS
      OR: [
        { name:     { contains: q, mode: 'insensitive' } },
        { sku:      { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true, sku: true, name: true, category: true,
      quantity: true, unit: true, sellingPrice: true, costPrice: true,
      batches: {
        where:   { status: 'ACTIVE', quantity: { gt: 0 } },
        orderBy: { expiryDate: 'asc' },  // FEFO order
        select:  { id: true, batchNumber: true, expiryDate: true, quantity: true },
        take: 5,
      },
    },
    take: 20,
  })

  return NextResponse.json(products)
}
