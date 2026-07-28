import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { poStatusSchema } from '@/lib/validations'
import { writeAuditLog } from '@/lib/audit'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const po = await prisma.purchaseOrder.findUnique({
    where: { id: params.id },
    include: {
      supplier:  true,
      createdBy: { select: { name: true, email: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, sku: true, unit: true, costPrice: true } },
        },
      },
    },
  })

  if (!po) return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })
  return NextResponse.json(po)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any)?.role === 'VIEWER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()

  // Status transition update
  const parsed = poStatusSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const existing = await prisma.purchaseOrder.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Guard illegal transitions
  const TERMINAL = ['COMPLETED', 'CANCELLED']
  if (TERMINAL.includes(existing.status)) {
    return NextResponse.json({ error: `Cannot update a ${existing.status} order.` }, { status: 400 })
  }

  const po = await prisma.purchaseOrder.update({
    where: { id: params.id },
    data:  { status: parsed.data.status },
  })

  await writeAuditLog({
    userId: (session.user as any).id,
    action: 'UPDATE',
    entity: 'PurchaseOrder',
    entityId: po.id,
    entityName: po.poNumber,
    changes: { status: { before: existing.status, after: parsed.data.status } },
    reason: parsed.data.notes,
  })

  return NextResponse.json(po)
}
