// app/api/pos/checkout/route.ts
// The core POS checkout route. Atomically:
//   1. Validates stock availability
//   2. Selects batches using FEFO (First Expiry First Out)
//   3. Creates Sale + SaleItems + SalePayments
//   4. Creates OUT Movement per product (reuses existing movement model)
//   5. Depletes batches in FEFO order
//   6. Updates product.quantity
//   7. Writes audit log
// Never duplicates inventory logic — updates same models as the movement system.

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { checkoutSchema } from '@/lib/validations'
import { writeAuditLog } from '@/lib/audit'

// Generate receipt number: RCP-YYYYMMDD-XXXX
async function generateReceiptNumber(): Promise<string> {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const counterId = `RCP-${today}`
  const counter = await prisma.sequenceCounter.upsert({
    where: { id: counterId },
    create: { id: counterId, sequence: 1 },
    update: { sequence: { increment: 1 } },
  })
  return `RCP-${today}-${String(counter.sequence).padStart(4, '0')}`
}

// FEFO: returns [{batchId, qty}] to deplete, or null if insufficient stock
function planFEFO(
  batches: { id: string; quantity: number; expiryDate: Date }[],
  needed: number
): { batchId: string; qty: number }[] | null {
  const plan: { batchId: string; qty: number }[] = []
  let remaining = needed
  // Batches already ordered by expiryDate asc from the query
  for (const b of batches) {
    if (remaining <= 0) break
    const take = Math.min(b.quantity, remaining)
    plan.push({ batchId: b.id, qty: take })
    remaining -= take
  }
  return remaining > 0 ? null : plan
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body   = await req.json()
  const parsed = checkoutSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { items, customerId, discountAmount, taxRate, notes, payments } = parsed.data
  const cashierId = (session.user as any).id

  // ── Step 1: Load products + FEFO batches ────────────────────────────────────
  const productIds = items.map(i => i.productId)
  const products   = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: {
      batches: {
        where:   { status: 'ACTIVE', quantity: { gt: 0 } },
        orderBy: { expiryDate: 'asc' },  // FEFO
        select:  { id: true, quantity: true, expiryDate: true, batchNumber: true },
      },
    },
  })

  const productMap = Object.fromEntries(products.map(p => [p.id, p]))

  // ── Step 2: Validate stock + plan FEFO ────────────────────────────────────
  const fefoPlan: Record<string, { batchId: string; qty: number }[]> = {}
  for (const item of items) {
    const product = productMap[item.productId]
    if (!product) return NextResponse.json({ error: `Product ${item.productId} not found` }, { status: 404 })
    if (product.quantity < item.quantity) {
      return NextResponse.json({
        error: `Insufficient stock for ${product.name}. Available: ${product.quantity} ${product.unit}`,
      }, { status: 400 })
    }
    const plan = planFEFO(product.batches, item.quantity)
    // plan may be null if batches don't cover full qty (product.quantity covers it but batches may not be registered)
    fefoPlan[item.productId] = plan ?? []
  }

  // ── Step 3: Calculate totals ─────────────────────────────────────────────
  let subtotal  = 0
  let totalCost = 0
  const saleItemsData = items.map(item => {
    const product   = productMap[item.productId]
    const unitPrice = item.unitPrice > 0 ? item.unitPrice : Number(product.sellingPrice ?? 0)
    const unitCost  = Number(product.costPrice ?? 0)
    const lineTotal = (unitPrice - item.discount) * item.quantity
    const lineCost  = unitCost * item.quantity
    const lineProfit= lineTotal - lineCost
    subtotal  += lineTotal
    totalCost += lineCost
    return {
      productId:   item.productId,
      product:     { connect: { id: item.productId } },
      quantity:    item.quantity,
      unitPrice,
      unitCost,
      discount:    item.discount,
      lineTotal,
      profit:      lineProfit,
      batchesUsed: fefoPlan[item.productId].length > 0
        ? JSON.stringify(fefoPlan[item.productId])
        : undefined,
    }
  })

  const afterDiscount = subtotal - discountAmount
  const taxAmount     = (afterDiscount * taxRate) / 100
  const total         = afterDiscount + taxAmount
  const profit        = total - totalCost - discountAmount

  // Validate payment covers total
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0)
  if (totalPaid < total - 0.01) {  // 0.01 tolerance for floating point
    return NextResponse.json({ error: `Payment of ₱${totalPaid.toFixed(2)} is less than total ₱${total.toFixed(2)}` }, { status: 400 })
  }

  // ── Step 4: Atomic transaction ───────────────────────────────────────────
  const receiptNumber = await generateReceiptNumber()

  let sale: any
  try {
    const ops: any[] = []

    // Create Sale with items and payments
    ops.push(
      prisma.sale.create({
        data: {
          receiptNumber,
          cashierId,
          customerId:     customerId || undefined,
          subtotal,
          discountAmount,
          taxAmount,
          total,
          totalCost,
          profit,
          notes,
          status:  'COMPLETED',
          items:   { create: saleItemsData },
          payments:{ create: payments.map(p => ({
            method:    p.method,
            amount:    p.amount,
            reference: p.reference,
          }))},
        },
        include: {
          items:    { include: { product: { select: { id: true, name: true, sku: true, unit: true } } } },
          payments: true,
          customer: { select: { name: true, phone: true } },
          cashier:  { select: { name: true, email: true } },
        },
      })
    )

    // Create OUT movements + update product quantity per item
    for (const item of items) {
      const product = productMap[item.productId]
      ops.push(
        prisma.movement.create({
          data: {
            productId: item.productId,
            userId:    cashierId,
            type:      'OUT',
            quantity:  item.quantity,
            notes:     `POS Sale ${receiptNumber}`,
            reference: receiptNumber,
          },
        }),
        prisma.product.update({
          where: { id: item.productId },
          data:  { quantity: { decrement: item.quantity } },
        })
      )

      // Deplete batches in FEFO order
      for (const { batchId, qty } of fefoPlan[item.productId]) {
        ops.push(
          prisma.batch.update({
            where: { id: batchId },
            data:  {
              quantity: { decrement: qty },
              status:   undefined, // will be set to DEPLETED by the update below if qty reaches 0
            },
          })
        )
      }
    }

    const results = await prisma.$transaction(ops)
    sale = results[0]

    // Post-transaction: mark depleted batches
    for (const item of items) {
      for (const { batchId } of fefoPlan[item.productId]) {
        const b = await prisma.batch.findUnique({ where: { id: batchId }, select: { quantity: true } })
        if (b && b.quantity <= 0) {
          await prisma.batch.update({ where: { id: batchId }, data: { status: 'DEPLETED' } })
        }
      }
    }
  } catch (err: any) {
    console.error('[Checkout]', err)
    return NextResponse.json({ error: 'Checkout failed: ' + err.message }, { status: 500 })
  }

  // ── Step 5: Audit log ────────────────────────────────────────────────────
  await writeAuditLog({
    userId:     cashierId,
    action:     'CREATE',
    entity:     'Sale',
    entityId:   sale.id,
    entityName: receiptNumber,
    changes:    {
      total:    { before: null, after: total },
      items:    { before: null, after: items.length },
      payment:  { before: null, after: payments.map(p => p.method).join(', ') },
    },
    reason: `POS checkout — ${items.length} items, ₱${total.toFixed(2)}`,
  })

  return NextResponse.json({ success: true, sale }, { status: 201 })
}
