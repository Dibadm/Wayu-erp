import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sale = await prisma.sale.findUnique({
    where: { id: params.id },
    include: {
      items: {
        include: { product: { select: { name: true, sku: true, unit: true } } },
      },
      payments: true,
      customer: true,
      cashier:  { select: { name: true, email: true } },
    },
  })

  if (!sale) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(sale)
}
