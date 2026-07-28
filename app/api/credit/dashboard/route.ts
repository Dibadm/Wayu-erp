import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requirePermission } from '@/lib/with-auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const guard = await requirePermission('credit:view')(null as any)
  if (guard) return guard
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [
    totalOutstanding,
    activeProfilesCount,
    overdueCount,
    openCasesCount,
    pendingAppsCount,
  ] = await Promise.all([
    prisma.aRStatement.aggregate({
      where: { status: { not: 'PAID' } },
      _sum: { amount: true },
    }),
    prisma.creditProfile.count({ where: { isActive: true } }),
    prisma.creditAging.aggregate({
      where: { total: { gt: 0 } },
      _sum: { total: true },
    }),
    prisma.collectionCase.count({ where: { status: { not: 'RESOLVED' } } }),
    prisma.creditApplication.count({ where: { status: 'PENDING' } }),
  ])

  return NextResponse.json({
    totalOutstanding: Number(totalOutstanding._sum.amount ?? 0),
    activeCreditCustomers: activeProfilesCount,
    overdueCount: Number(overdueCount._sum.total ?? 0),
    openCollections: openCasesCount,
    pendingApplications: pendingAppsCount,
  })
}
