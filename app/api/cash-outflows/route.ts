import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { writeAuditLog } from '@/lib/audit'
import { CashFlowCategory } from '@prisma/client'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get('accountId')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const category = searchParams.get('category') as CashFlowCategory | null
  const where: any = {}
  if (accountId) where.bankAccountId = accountId
  if (from || to) {
    where.paidAt = {
      ...(from && { gte: new Date(from) }),
      ...(to && { lte: new Date(to) }),
    }
  }
  if (category) where.category = category
  const outflows = await prisma.cashOutflow.findMany({
    where, orderBy: { paidAt: 'desc' }, include: { bankAccount: { select: { accountName: true } }, createdBy: { select: { name: true } } },
  })
  return NextResponse.json(outflows)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  if (!body.amount || !body.bankAccountId) {
    return NextResponse.json({ error: 'amount and bankAccountId are required' }, { status: 400 })
  }
  const created = await prisma.$transaction(async (tx) => {
    const outflow = await tx.cashOutflow.create({
      data: {
        amount: body.amount, category: body.category as CashFlowCategory,
        reference: body.reference ?? null, description: body.description ?? null,
        paidAt: body.paidAt ? new Date(body.paidAt) : new Date(),
        bankAccountId: body.bankAccountId, createdById: (session.user as any).id,
      },
    })
    await tx.bankAccount.update({
      where: { id: body.bankAccountId },
      data: { currentBalance: { decrement: body.amount } },
    })
    return outflow
  })
  await writeAuditLog({ userId: (session.user as any).id, action: 'CREATE', entity: 'CashOutflow', entityId: created.id, entityName: `Outflow ${created.amount}`, reason: 'Cash outflow recorded' })
  return NextResponse.json(created, { status: 201 })
}