import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 86400000)

  const [overdueNotifications, lowStockProducts, expiringBatches] = await Promise.all([
    prisma.overdueNotification.findMany({
      orderBy: { notifiedAt: 'desc' },
      take: 20,
      include: {
        customer: { select: { id: true, name: true } },
        arStatement: { select: { id: true, invoiceNo: true } },
      },
    }),
    await prisma.$queryRaw<{ id: string; name: string; sku: string; quantity: number; minStockLevel: number; unit: string }[]>`
      SELECT id, name, sku, quantity, min_stock_level AS "minStockLevel", unit
      FROM products
      WHERE quantity <= min_stock_level
      ORDER BY name ASC
      LIMIT 20
    `,
    prisma.batch.findMany({
      where: {
        expiryDate: { lte: sevenDaysFromNow },
        status: 'ACTIVE',
      },
      orderBy: { expiryDate: 'asc' },
      take: 20,
      include: {
        product: { select: { name: true, sku: true } },
        location: { select: { name: true, code: true } },
      },
    }),
  ])

  const expiring = expiringBatches.map(b => ({
    ...b,
    daysUntilExpiry: Math.floor((b.expiryDate.getTime() - now.getTime()) / 86400000),
  }))

  return NextResponse.json({
    overdue: overdueNotifications,
    lowStock: lowStockProducts,
    expiring,
  })
}
