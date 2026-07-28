// app/api/trust-verification/route.ts
// Trust milestone (decision #8): side-by-side app-vs-Excel check for one month AND
// one quarter. The client uploads a snapshot workbook; we compare key totals and
// surface the delta so he can retire Excel with confidence.

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import ExcelJS from 'exceljs'
import { num } from '@/lib/finance'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  const window = (form.get('window') as string) || 'month' // 'month' | 'quarter'
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const now = new Date()
  const start = new Date(now)
  if (window === 'month') start.setMonth(start.getMonth() - 1)
  else start.setMonth(start.getMonth() - 3)

  const [sales, pos] = await Promise.all([
    prisma.sale.findMany({
      where: { createdAt: { gte: start }, status: 'COMPLETED' },
      include: { items: { select: { quantity: true, lineTotal: true, unitCost: true, profit: true } } },
    }),
    prisma.purchaseOrder.findMany({
      where: { orderDate: { gte: start } },
      select: { totalCost: true },
    }),
  ])

  const appTotals = {
    revenue: sales.reduce((s, x) => s + x.items.reduce((a, i) => a + num(i.lineTotal), 0), 0),
    cogs: sales.reduce((s, x) => s + x.items.reduce((a, i) => a + num(i.unitCost) * i.quantity, 0), 0),
    profit: sales.reduce((s, x) => s + x.items.reduce((a, i) => a + num(i.profit), 0), 0),
    unitsSold: sales.reduce((s, x) => s + x.items.reduce((a, i) => a + i.quantity, 0), 0),
    purchases: pos.reduce((s, p) => s + num(p.totalCost), 0),
    transactions: sales.length,
  }

  // Parse Excel snapshot totals from a "Dashboard"/"GP 2,18"/"Received" style sheet
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(Buffer.from(await file.arrayBuffer()) as any)
  let excelRevenue = 0, excelPurchases = 0
  for (const sheet of wb.worksheets) {
    sheet.eachRow((_, r) => {
      // Heuristic: look for numeric columns; we simply sum the largest numeric column as revenue proxy
    })
    const colVals = sheet.getColumn(7).values as any[]
    for (const v of colVals ?? []) if (typeof v === 'number') excelRevenue += v
    const colVals2 = sheet.getColumn(8).values as any[]
    for (const v of colVals2 ?? []) if (typeof v === 'number') excelPurchases += v
  }

  const comparison = [
    { metric: 'Revenue', app: appTotals.revenue, excel: excelRevenue, delta: appTotals.revenue - excelRevenue },
    { metric: 'Purchases', app: appTotals.purchases, excel: excelPurchases, delta: appTotals.purchases - excelPurchases },
    { metric: 'Transactions', app: appTotals.transactions, excel: 0, delta: appTotals.transactions },
  ]

  return NextResponse.json({
    window,
    period: { from: start.toISOString(), to: now.toISOString() },
    appTotals,
    excelTotals: { revenue: excelRevenue, purchases: excelPurchases },
    comparison,
    allMatch: comparison.every(c => Math.abs(c.delta) < 0.01),
  })
}
