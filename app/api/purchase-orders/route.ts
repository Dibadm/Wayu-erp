import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { purchaseOrderSchema } from '@/lib/validations'
import { writeAuditLog } from '@/lib/audit'

// Auto-generate PO number: PO-YYYY-NNNN
async function generatePONumber(): Promise<string> {
  const year = new Date().getFullYear()
  const counterId = `PO-${year}`
  const counter = await prisma.sequenceCounter.upsert({
    where: { id: counterId },
    create: { id: counterId, sequence: 1 },
    update: { sequence: { increment: 1 } },
  })
  return `PO-${year}-${String(counter.sequence).padStart(4, '0')}`
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status     = searchParams.get('status')
  const supplierId = searchParams.get('supplierId')
  const take       = parseInt(searchParams.get('take') ?? '50')

  const orders = await prisma.purchaseOrder.findMany({
    where: {
      ...(status     && { status: status as any }),
      ...(supplierId && { supplierId }),
    },
    orderBy: { createdAt: 'desc' },
    take,
    include: {
      supplier:  { select: { id: true, name: true } },
      createdBy: { select: { name: true, email: true } },
      _count:    { select: { items: true } },
    },
  })

  return NextResponse.json(orders)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role === 'VIEWER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const parsed = purchaseOrderSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const poNumber = await generatePONumber()

  // Calculate total cost from items
  const totalCost = parsed.data.items.reduce(
    (sum, item) => sum + item.quantityOrdered * item.unitCost, 0
  )

  const po = await prisma.purchaseOrder.create({
    data: {
      poNumber,
      supplierId:       parsed.data.supplierId,
      expectedDelivery: parsed.data.expectedDelivery ? new Date(parsed.data.expectedDelivery) : null,
      notes:            parsed.data.notes,
      totalCost,
      createdById:      session.user.id,
      items: {
        create: parsed.data.items.map(item => ({
          productId:       item.productId,
          quantityOrdered: item.quantityOrdered,
          unitCost:        item.unitCost,
          totalCost:       item.quantityOrdered * item.unitCost,
          batchNumber:     item.batchNumber,
          expiryDate:      item.expiryDate ? new Date(item.expiryDate) : null,
          notes:           item.notes,
        })),
      },
    },
    include: {
      supplier: { select: { name: true } },
      items: { include: { product: { select: { name: true, sku: true } } } },
    },
  })

  await writeAuditLog({
    userId: session.user.id,
    action: 'CREATE',
    entity: 'PurchaseOrder',
    entityId: po.id,
    entityName: po.poNumber,
    changes: { totalCost: { before: null, after: totalCost }, itemCount: { before: null, after: parsed.data.items.length } },
  })

  return NextResponse.json(po, { status: 201 })
}
