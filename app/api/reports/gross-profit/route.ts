// app/api/reports/gross-profit/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { rollupGrossProfit, num } from '@/lib/finance'
import { CalendarMode } from '@/lib/ethiopian-calendar'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const mode = (searchParams.get('calendar') ?? 'gregorian') as CalendarMode
  const amharic = searchParams.get('amharic') === 'true'

  const sales = await prisma.sale.findMany({
    where: { status: 'COMPLETED' },
    include: { items: { include: { product: { select: { id: true, sku: true, name: true } } } } },
  })
  const lines = sales.flatMap(s => s.items.map(it => ({
    productId: it.product.id, productName: it.product.name, sku: it.product.sku,
    date: s.createdAt, sellValue: num(it.lineTotal), cogs: num(it.unitCost) * it.quantity,
    profit: num(it.profit), quantity: it.quantity,
  })))
  const rows = rollupGrossProfit(lines, mode, amharic)
  const totals = rows.reduce((acc, r) => {
    acc.sell += r.sellValue; acc.cogs += r.cogs; acc.profit += r.profit; acc.qty += r.quantity
    return acc
  }, { sell: 0, cogs: 0, profit: 0, qty: 0 })

  return NextResponse.json({ rows, totals })
}
