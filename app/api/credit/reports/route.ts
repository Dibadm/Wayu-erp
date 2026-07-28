import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requirePermission } from '@/lib/with-auth'
import { prisma } from '@/lib/db'
import { getARAgingReport, recalcCreditProfile } from '@/lib/credit'
import { num } from '@/lib/finance'

function getPagination(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '100')))
  const skip = (page - 1) * limit
  return { page, limit, skip }
}

export async function GET(req: NextRequest) {
  const guard = await requirePermission('reports:view', 'credit:view', 'aging:view', 'collections:view')(null as any)
  if (guard) return guard
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') ?? 'aging-summary'
  const customerId = searchParams.get('id')
  const { page, limit, skip } = getPagination(req)

  switch (type) {
    case 'aging-summary': {
      const { report, totals } = await getARAgingReport()
      const start = skip
      const end = skip + limit
      return NextResponse.json({
        type: 'aging-summary',
        data: report.slice(start, end),
        totals,
        total: report.length,
        page,
        limit,
      })
    }

    case 'customer-profile': {
      if (!customerId) return NextResponse.json({ error: 'id required' }, { status: 400 })
      const profile = await prisma.creditProfile.findUnique({
        where: { id: customerId },
        include: {
          customer: { select: { id: true, name: true, email: true, phone: true } },
          approvedByUser: { select: { name: true } },
          transactions: { orderBy: { createdAt: 'desc' }, take: 50 },
        },
      })
      if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json({ type: 'customer-profile', data: profile })
    }

    case 'collections': {
      const where: any = {}
      const status = searchParams.get('status')
      if (status) where.status = status

      const [cases, total] = await Promise.all([
        prisma.collectionCase.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            customer: { select: { id: true, name: true } },
            arStatement: { select: { id: true, invoiceNo: true } },
            assignedToUser: { select: { name: true } },
          },
        }),
        prisma.collectionCase.count({ where }),
      ])
      return NextResponse.json({ type: 'collections', data: cases, total, page, limit })
    }

    case 'applications': {
      const where: any = {}
      const status = searchParams.get('status')
      if (status) where.status = status

      const [applications, total] = await Promise.all([
        prisma.creditApplication.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            customer: { select: { id: true, name: true, email: true } },
            profile: { select: { id: true, creditLimit: true } },
          },
        }),
        prisma.creditApplication.count({ where }),
      ])
      return NextResponse.json({ type: 'applications', data: applications, total, page, limit })
    }

    case 'risk-analysis': {
      const profiles = await prisma.creditProfile.findMany({
        include: {
          customer: { select: { id: true, name: true, email: true } },
        },
      })
      const riskCounts = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 }
      for (const p of profiles) {
        riskCounts[p.riskLevel] = (riskCounts[p.riskLevel] || 0) + 1
      }
      return NextResponse.json({ type: 'risk-analysis', data: riskCounts, totalProfiles: profiles.length })
    }

    case 'utilization': {
      const profiles = await prisma.creditProfile.findMany({
        include: {
          customer: { select: { id: true, name: true } },
        },
      })
      const utilization = profiles.map(p => ({
        customerId: p.customerId,
        customerName: p.customer.name,
        creditLimit: Number(p.creditLimit),
        utilized: Number(p.utilizedCredit),
        available: Number(p.availableCredit),
        utilizationPct: num(p.creditLimit) > 0 ? Math.round((Number(p.utilizedCredit) / Number(p.creditLimit)) * 100) : 0,
        riskLevel: p.riskLevel,
      }))
      return NextResponse.json({ type: 'utilization', data: utilization, total: utilization.length })
    }

    default:
      return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
  }
}
