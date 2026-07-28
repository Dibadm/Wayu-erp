import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { writeAuditLog } from '@/lib/audit'
import { Role } from '@prisma/client'
import { LoanStatus } from '@prisma/client'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const loanId = searchParams.get('loanId')
  const where: any = {}
  if (loanId) where.id = loanId
  const loans = await prisma.loan.findMany({
    where, orderBy: { createdAt: 'desc' },
    include: {
      repayments: { orderBy: { paidAt: 'desc' }, select: { amount: true, principal: true, interest: true, paidAt: true } },
      createdBy: { select: { name: true } },
    },
  })
  const result = loans.map(loan => {
    const totalRepaid = loan.repayments.reduce((sum, r) => sum + Number(r.amount), 0)
    const totalPrincipal = loan.repayments.reduce((sum, r) => sum + Number(r.principal), 0)
    const totalInterest = loan.repayments.reduce((sum, r) => sum + Number(r.interest), 0)
    const remainingPrincipal = Number(loan.principal) - totalPrincipal
    return { ...loan, repaymentSummary: { totalRepaid, totalPrincipal, totalInterest, remainingPrincipal } }
  })
  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const role = (session.user as any).role
  if (body.loanId) {
    const repayment = await prisma.loanRepayment.create({
      data: {
        amount: body.amount, principal: body.principal, interest: body.interest,
        paidAt: body.paidAt ? new Date(body.paidAt) : new Date(),
        reference: body.reference ?? null, notes: body.notes ?? null,
        loanId: body.loanId, createdById: (session.user as any).id,
      },
    })
    const loan = await prisma.loan.findUnique({ where: { id: body.loanId }, include: { repayments: true } })
    const totalRepaid = loan!.repayments.reduce((sum, r) => sum + Number(r.amount), 0)
    const allRepaid = totalRepaid >= Number(loan!.principal)
    const newStatus = allRepaid ? LoanStatus.PAID_OFF : loan!.status
    if (newStatus !== loan!.status) {
      await prisma.loan.update({ where: { id: body.loanId }, data: { status: newStatus } })
    }
    await writeAuditLog({ userId: (session.user as any).id, action: 'CREATE', entity: 'LoanRepayment', entityId: repayment.id, entityName: `Repayment ${repayment.amount}`, reason: 'Loan repayment recorded' })
    return NextResponse.json(repayment, { status: 201 })
  }
  if (role !== Role.ADMIN) return NextResponse.json({ error: 'Admin only for creating loans' }, { status: 403 })
  const loan = await prisma.loan.create({
    data: {
      lender: body.lender, principal: body.principal, interestRate: body.interestRate,
      startDate: new Date(body.startDate), endDate: body.endDate ? new Date(body.endDate) : null,
      status: body.status ?? 'ACTIVE', createdById: (session.user as any).id,
    },
  })
  await writeAuditLog({ userId: (session.user as any).id, action: 'CREATE', entity: 'Loan', entityId: loan.id, entityName: `${loan.lender} - ${loan.principal}`, reason: 'Loan created' })
  return NextResponse.json(loan, { status: 201 })
}