// app/api/pos/checkout/route.ts
// The core POS checkout route. Atomically:
//   1. Validates stock availability
//   2. Selects batches using FEFO (First Expiry First Out)
//   3. Creates Sale + SaleItems + SalePayments
//   4. Creates OUT Movement per product (reuses existing movement model)
//   5. Depletes batches in FEFO order
//   6. Updates product.quantity
//   7. For BANK_TRANSFER: creates CashInflow records
//   8. For CREDIT: creates ARStatement records
//   9. Writes audit log
// Never duplicates inventory logic — updates same models as the movement system.

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { checkoutSchema } from '@/lib/validations'
import { writeAuditLog } from '@/lib/audit'
import { resolveCommissionRate } from '@/lib/commission'
import { recalcCreditProfile } from '@/lib/credit'

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

  const { items, customerId, salespersonId, taxable, discountAmount, taxRate, notes, payments } = parsed.data
  const cashierId = (session.user as any).id

  // Verify cashier exists in DB (defensive against stale sessions / FK violations)
  const cashier = await prisma.user.findUnique({ where: { id: cashierId } })
  if (!cashier) return NextResponse.json({ error: 'Cashier account not found. Please log in again.' }, { status: 401 })

  // Verify salesperson exists in DB if provided
  if (salespersonId) {
    const salesperson = await prisma.user.findUnique({ where: { id: salespersonId } })
    if (!salesperson) {
      return NextResponse.json({ error: 'Selected salesperson account no longer exists.' }, { status: 400 })
    }
  }

  // Verify customer exists in DB if provided
  if (customerId) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } })
    if (!customer) {
      return NextResponse.json({ error: 'Selected customer account no longer exists.' }, { status: 400 })
    }
  }

  // Validate bank accounts for BANK_TRANSFER payments
  const bankTransferPayments = payments.filter(p => p.method === 'BANK_TRANSFER')
  for (const p of bankTransferPayments) {
    if (!p.bankAccountId) {
      return NextResponse.json({ error: 'Bank account is required for bank transfer payments.' }, { status: 400 })
    }
    const account = await prisma.bankAccount.findUnique({ where: { id: p.bankAccountId } })
    if (!account) {
      return NextResponse.json({ error: 'Selected bank account not found.' }, { status: 400 })
    }
  }

  // ── Step 1: Load products + FEFO batches ────────────────────────────────────
  const productIds = items.map(i => i.productId)
  const products   = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: {
      batches: {
        where:   { status: 'ACTIVE', quantity: { gt: 0 } },
        orderBy: { expiryDate: 'asc' },
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
    fefoPlan[item.productId] = plan ?? []
  }

  // ── Step 3: Calculate totals ─────────────────────────────────────────────
  let subtotal  = 0
  let totalCost = 0
  const commissionRates = await Promise.all(
    items.map(item => resolveCommissionRate({
      salespersonId: salespersonId || undefined,
      productId:     item.productId,
      quantity:      item.quantity,
    }))
  )
  const saleItemsData = items.map((item, idx) => {
    const product   = productMap[item.productId]
    const unitPrice = item.unitPrice > 0 ? item.unitPrice : Number(product.sellingPrice ?? 0)
    const unitCost  = Number(product.costPrice ?? 0)
    const lineTotal = (unitPrice - item.discount) * item.quantity
    const lineCost  = unitCost * item.quantity
    const lineProfit= lineTotal - lineCost
    const rate      = commissionRates[idx]
    subtotal  += lineTotal
    totalCost += lineCost
    return {
      product:     { connect: { id: item.productId } },
      quantity:    item.quantity,
      unitPrice,
      unitCost,
      discount:    item.discount,
      lineTotal,
      profit:      lineProfit,
      commissionAmount: lineTotal * (rate.rate / 100),
      batchesUsed: fefoPlan[item.productId].length > 0
        ? JSON.stringify(fefoPlan[item.productId])
        : undefined,
    }
  })

  const afterDiscount = subtotal - discountAmount
  const taxAmount     = taxable ? (afterDiscount * taxRate) / 100 : 0
  const total         = afterDiscount + taxAmount
  const profit        = total - totalCost - discountAmount

  // Validate payment covers total (cash + bank transfer + credit)
  const totalPaid = payments.reduce((s, p) => s + (p.method === 'CREDIT' ? 0 : p.amount), 0)
  const totalCredit = payments.reduce((s, p) => s + (p.method === 'CREDIT' ? p.amount : 0), 0)
  if (totalPaid + totalCredit < total - 0.01) {
    return NextResponse.json({ error: `Payment of ETB ${(totalPaid + totalCredit).toFixed(2)} is less than total ETB ${total.toFixed(2)}` }, { status: 400 })
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
          ...(customerId ? { customerId } : {}),
          ...(salespersonId ? { salespersonId } : {}),
          taxable,
          subtotal,
          discountAmount,
          taxAmount,
          total,
          totalCost,
          profit,
          notes,
          status: 'COMPLETED',
          items: { create: saleItemsData },
          payments: { create: payments.map(p => ({
            method: p.method,
            amount: p.amount,
            reference: p.reference || null,
          }))},
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

      for (const { batchId, qty } of fefoPlan[item.productId]) {
        ops.push(
          prisma.batch.update({
            where: { id: batchId },
            data:  {
              quantity: { decrement: qty },
              status:   undefined,
            },
          })
        )
      }
    }

    const results = await prisma.$transaction(ops)
    sale = results[0]

    // Post-transaction: enrich sale with relations for the response
    sale = await prisma.sale.findUnique({
      where: { id: sale.id },
      include: {
        items:    { select: { commissionAmount: true, product: { select: { id: true, name: true, sku: true, unit: true } } } },
        payments: true,
        customer: { select: { name: true, phone: true } },
        cashier:  { select: { name: true, email: true } },
        salesperson: { select: { name: true, email: true } },
      },
    })

    // Post-transaction: mark depleted batches
    for (const item of items) {
      for (const { batchId } of fefoPlan[item.productId]) {
        const b = await prisma.batch.findUnique({ where: { id: batchId }, select: { quantity: true } })
        if (b && b.quantity <= 0) {
          await prisma.batch.update({ where: { id: batchId }, data: { status: 'DEPLETED' } })
        }
      }
    }

    // Post-transaction: create CashInflow for BANK_TRANSFER payments
    for (const p of bankTransferPayments) {
      await prisma.cashInflow.create({
        data: {
          amount: p.amount,
          category: 'SALES',
          reference: receiptNumber,
          description: `POS Sale ${receiptNumber} — bank transfer`,
          bankAccountId: p.bankAccountId!,
          createdById: cashierId,
          receivedAt: new Date(),
        },
      })
    }

    // Post-transaction: create ARStatement + CreditProfile + CreditAging for CREDIT payments
    if (customerId) {
      const creditPayments = payments.filter(p => p.method === 'CREDIT' && p.creditDays)
      const creditTotal = creditPayments.reduce((s, p) => s + p.amount, 0)

      if (creditTotal > 0) {
        const creditDays = creditPayments[0].creditDays!

        // Create ARStatements per payment
        for (const p of creditPayments) {
          const dueDate = new Date()
          dueDate.setDate(dueDate.getDate() + p.creditDays!)
          await prisma.aRStatement.create({
            data: {
              customerId,
              saleId: sale.id,
              invoiceNo: receiptNumber,
              issuedAt: new Date(),
              dueDate,
              amount: p.amount,
              status: 'OPEN',
            },
          })
        }

        // Create or update CreditProfile
        const existingProfile = await prisma.creditProfile.findUnique({
          where: { customerId },
        })

        if (!existingProfile) {
          const defaultLimit = Math.max(10000, Math.round(creditTotal * 2))
          await prisma.creditProfile.create({
            data: {
              customerId,
              creditLimit: defaultLimit,
              availableCredit: defaultLimit - creditTotal,
              utilizedCredit: creditTotal,
              paymentTerms: creditDays,
              approvedBy: cashierId,
              approvedAt: new Date(),
              riskLevel: 'LOW',
            },
          })
        } else {
          await prisma.creditProfile.update({
            where: { customerId },
            data: {
              utilizedCredit: { increment: creditTotal },
              availableCredit: { decrement: creditTotal },
            },
          })
        }

        // Create/update CreditAging snapshot
        const now = new Date()
        await prisma.creditAging.upsert({
          where: { customerId_asOf: { customerId, asOf: now } },
          update: {
            bucket0to30: { increment: creditTotal },
            total: { increment: creditTotal },
          },
          create: {
            customerId,
            bucket0to30: creditTotal,
            bucket31to60: 0,
            bucket61to90: 0,
            bucket90plus: 0,
            total: creditTotal,
            asOf: now,
          },
        })

        // Recalculate credit profile (utilization, risk, etc.)
        await recalcCreditProfile(customerId).catch(() => {})
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
    reason: `POS checkout — ${items.length} items, ETB ${total.toFixed(2)}`,
  })

  return NextResponse.json({ success: true, sale }, { status: 201 })
}
