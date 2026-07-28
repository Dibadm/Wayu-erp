// app/api/expenses/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ExpenseType } from '@prisma/client'
import { writeAuditLog } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined
  const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined
  const where = from || to ? { incurredAt: { ...(from && { gte: from }), ...(to && { lte: to }) } } : {}
  const expenses = await prisma.expense.findMany({
    where, orderBy: { incurredAt: 'desc' }, include: { createdBy: { select: { name: true } } },
  })
  return NextResponse.json(expenses)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  if (!body.category || !body.amount) return NextResponse.json({ error: 'category and amount required' }, { status: 400 })
  const created = await prisma.expense.create({
    data: {
      category: body.category, description: body.description ?? null,
      amount: body.amount, type: (body.type as ExpenseType) ?? 'DEBIT',
      reference: body.reference ?? null, createdById: (session.user as any).id,
    },
  })
  await writeAuditLog({ userId: (session.user as any).id, action: 'CREATE', entity: 'Expense', entityId: created.id, entityName: body.category, reason: 'Expense recorded' })
  return NextResponse.json(created, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await prisma.expense.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
