import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { writeAuditLog } from '@/lib/audit'
import { Role } from '@prisma/client'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const accounts = await prisma.bankAccount.findMany({
    where: { isActive: true }, orderBy: { accountName: 'asc' },
    include: { cashInflows: { take: 1 }, cashOutflows: { take: 1 } },
  })
  return NextResponse.json(accounts)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as any).role
  if (role !== Role.ADMIN) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  const body = await req.json()
  if (!body.accountName || !body.accountNumber || !body.bankName) {
    return NextResponse.json({ error: 'accountName, accountNumber, and bankName are required' }, { status: 400 })
  }
  const created = await prisma.bankAccount.create({
    data: {
      accountName: body.accountName, accountNumber: body.accountNumber, bankName: body.bankName,
      accountType: body.accountType ?? 'SAVINGS', currency: body.currency ?? 'ETB',
      openingBalance: body.openingBalance ?? 0, currentBalance: body.openingBalance ?? 0,
      createdById: (session.user as any).id,
    },
  })
  await writeAuditLog({ userId: (session.user as any).id, action: 'CREATE', entity: 'BankAccount', entityId: created.id, entityName: created.accountName, reason: 'Bank account created' })
  return NextResponse.json(created, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as any).role
  if (role !== Role.ADMIN) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  const body = await req.json()
  const { id, ...rest } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const updated = await prisma.bankAccount.update({ where: { id }, data: rest })
  await writeAuditLog({ userId: (session.user as any).id, action: 'UPDATE', entity: 'BankAccount', entityId: updated.id, entityName: updated.accountName, reason: 'Bank account updated' })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as any).role
  if (role !== Role.ADMIN) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const updated = await prisma.bankAccount.update({ where: { id }, data: { isActive: false } })
  await writeAuditLog({ userId: (session.user as any).id, action: 'DELETE', entity: 'BankAccount', entityId: updated.id, entityName: updated.accountName, reason: 'Bank account soft deleted' })
  return NextResponse.json(updated)
}