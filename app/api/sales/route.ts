import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined
  const to   = searchParams.get('to')   ? new Date(searchParams.get('to')!)   : undefined
  const take = parseInt(searchParams.get('take') ?? '50')

  const sales = await prisma.sale.findMany({
    where: {
      ...(from || to ? { createdAt: { ...(from && { gte: from }), ...(to && { lte: to }) } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take,
    include: {
      customer: { select: { name: true, phone: true } },
      cashier:  { select: { name: true, email: true } },
      payments: true,
      _count:   { select: { items: true } },
    },
  })

  return NextResponse.json(sales)
}
