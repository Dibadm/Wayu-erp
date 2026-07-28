// app/api/purchase-orders/[id]/receive/route.ts
// Goods receiving endpoint.
// Delegates ALL inventory updates to the existing /api/movements route logic
// (prisma.$transaction: movement + product qty + location inventory + batch).
// Never duplicates inventory logic — just orchestrates existing primitives.

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { receiveItemsSchema } from '@/lib/validations'
import { writeAuditLog } from '@/lib/audit'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any)?.role === 'VIEWER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const parsed = receiveItemsSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const po = await prisma.purchaseOrder.findUnique({
    where: { id: params.id },
    include: {
      items: { include: { product: true } },
      supplier: { select: { name: true } },
    },
  })

  if (!po) return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })
  if (po.status === 'COMPLETED' || po.status === 'CANCELLED') {
    return NextResponse.json({ error: `Cannot receive against a ${po.status} order.` }, { status: 400 })
  }

  const userId = (session.user as any).id
  const { locationId, items } = parsed.data
  const receivedResults: string[] = []
  const errors: string[] = []

  for (const receiveItem of items) {
    const poItem = po.items.find(i => i.id === receiveItem.purchaseOrderItemId)
    if (!poItem) { errors.push(`Item ${receiveItem.purchaseOrderItemId} not found in PO`); continue }

    const remaining = poItem.quantityOrdered - poItem.quantityReceived
    if (receiveItem.quantityReceived > remaining) {
      errors.push(`${poItem.product.name}: cannot receive ${receiveItem.quantityReceived} — only ${remaining} remaining`)
      continue
    }

    const batchNumber = receiveItem.batchNumber ?? poItem.batchNumber
    const expiryDate  = receiveItem.expiryDate  ? new Date(receiveItem.expiryDate)
                       : poItem.expiryDate       ? new Date(poItem.expiryDate)
                       : null

    // ── Delegate to the existing movement primitives ──────────────────────────
    // This is exactly what StockMovementModal calls via /api/movements POST.
    // We call prisma directly here to do it in one transaction per item.

    const delta = receiveItem.quantityReceived

    try {
      await prisma.$transaction(async (tx) => {
        // 1. Create movement (same shape as /api/movements POST)
        await tx.movement.create({
          data: {
            type:      'IN',
            quantity:  delta,
            notes:     `Received against ${po.poNumber} from ${po.supplier.name}`,
            reference: po.poNumber,
            productId: poItem.productId,
            userId,
            locationId,
          },
        })

        // 2. Update product total quantity
        await tx.product.update({
          where: { id: poItem.productId },
          data:  { quantity: { increment: delta } },
        })

        // 3. Update per-location inventory
        await tx.locationInventory.upsert({
          where:  { locationId_productId: { locationId, productId: poItem.productId } },
          update: { quantity: { increment: delta } },
          create: { locationId, productId: poItem.productId, quantity: delta },
        })

        // 4. Create batch record if expiry date provided
        if (expiryDate && batchNumber) {
          await tx.batch.create({
            data: {
              productId:  poItem.productId,
              locationId,
              batchNumber,
              quantity:   delta,
              expiryDate,
              receivedDate: new Date(),
            },
          })
        }

        // 5. Update PO item received quantity
        await tx.purchaseOrderItem.update({
          where: { id: poItem.id },
          data:  { quantityReceived: { increment: delta } },
        })
      })

      receivedResults.push(`${poItem.product.name}: +${delta} units`)
    } catch (err: any) {
      errors.push(`${poItem.product.name}: ${err.message}`)
    }
  }

  // Update PO status based on received quantities
  const updatedPO = await prisma.purchaseOrder.findUnique({
    where: { id: params.id },
    include: { items: true },
  })

  if (updatedPO) {
    const allComplete  = updatedPO.items.every(i => i.quantityReceived >= i.quantityOrdered)
    const anyReceived  = updatedPO.items.some(i => i.quantityReceived > 0)
    const newStatus    = allComplete ? 'COMPLETED' : anyReceived ? 'PARTIALLY_RECEIVED' : po.status

    if (newStatus !== po.status) {
      await prisma.purchaseOrder.update({
        where: { id: params.id },
        data:  { status: newStatus as any },
      })
    }
  }

  await writeAuditLog({
    userId,
    action: 'UPDATE',
    entity: 'PurchaseOrder',
    entityId: po.id,
    entityName: po.poNumber,
    changes: { received: { before: 'pending', after: receivedResults.join('; ') } },
    reason: `Goods received at location ${locationId}`,
  })

  return NextResponse.json({
    success: receivedResults.length > 0,
    received: receivedResults,
    errors,
  })
}
