import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { writeAuditLog } from '@/lib/audit'
import { Role } from '@prisma/client'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const transfers = await prisma.bankTransfer.findMany({
    orderBy: { transferredAt: 'desc' },
    include: { fromAccount: { select: { accountName: true } }, toAccount: { select: { accountName: true } }, createdBy: { select: { name: true } } },
  })
  return NextResponse.json(transfers)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as any).role
  if (role !== Role.ADMIN) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  const body = await req.json()
  if (!body.fromAccountId || !body.toAccountId || !body.amount) {
    return NextResponse.json({ error: 'fromAccountId, toAccountId, and amount are required' }, { status: 400 })
  }
  if (body.fromAccountId === body.toAccountId) {
    return NextResponse.json({ error: 'Source and target accounts must differ' }, { status: 400 })
  }
  const created = await prisma.$transaction(async (tx) => {
    const fromAccount = await tx.bankAccount.findUniqueOrThrow({ where: { id: body.fromAccountId } })
    const toAccount = await tx.bankAccount.findUniqueOrThrow({ where: { id: body.toAccountId } })
    if (fromAccount.currentBalance < body.amount) {
      throw new Error('Insufficient balance in source account')
    }
    await tx.bankAccount.update({
      where: { id: body.fromAccountId },
      data: { currentBalance: { decrement: body.amount } },
    })
    await tx.bankAccount.update({
      where: { id: body.toAccountId },
      data: { currentBalance: { increment: body.amount } },
    })
    const transfer = await tx.bankTransfer.create({
      data: {
        amount: body.amount, description: body.description ?? null, reference: body.reference ?? null,
        fromAccountId: body.fromAccountId, toAccountId: body.toAccountId,
        createdById: (session.user as any).id,
      },
    })
    return transfer
  })
  await writeAuditLog({ userId: (session.user as any).id, action: 'CREATE', entity: 'BankTransfer', entityId: created.id, entityName: `Transfer ${created.amount}`, reason: 'Bank transfer recorded' })
  return NextResponse.json(created, { status: 201 })
}