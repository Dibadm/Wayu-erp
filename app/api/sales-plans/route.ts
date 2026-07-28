// app/api/sales-plans/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const start = searchParams.get('start') ? new Date(searchParams.get('start')!) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const plans = await prisma.salesPlan.findMany({ where: { periodStart: start }, include: { product: { select: { sku: true, name: true } } } })
  return NextResponse.json(plans)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  const body = await req.json()
  if (!body.productId || !body.periodStart) return NextResponse.json({ error: 'productId and periodStart required' }, { status: 400 })
  const start = new Date(body.periodStart)
  const created = await prisma.salesPlan.upsert({
    where: { productId_periodStart: { productId: body.productId, periodStart: start } },
    update: { plannedQty: body.plannedQty ?? 0, plannedValue: body.plannedValue ?? 0, periodLabel: start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) },
    create: {
      productId: body.productId, periodStart: start, plannedQty: body.plannedQty ?? 0,
      plannedValue: body.plannedValue ?? 0, periodLabel: start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    },
  })
  return NextResponse.json(created, { status: 201 })
}
