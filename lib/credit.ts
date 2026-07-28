import { prisma } from '@/lib/db'
import { num } from '@/lib/finance'
import { CreditRisk, CreditAppStatus, CreditTxnType, CollectionPriority, CollectionStatus } from '@prisma/client'

export type { CreditRisk, CreditAppStatus, CreditTxnType, CollectionPriority, CollectionStatus }

export function creditUtilization(utilized: number, limit: number): number {
  if (limit <= 0) return 0
  return Math.round((utilized / limit) * 100)
}

export function assessRisk(utilizationPct: number, avgDaysOverdue: number): CreditRisk {
  if (utilizationPct >= 90 || avgDaysOverdue > 60) return 'CRITICAL'
  if (utilizationPct >= 70 || avgDaysOverdue > 30) return 'HIGH'
  if (utilizationPct >= 50 || avgDaysOverdue > 0) return 'MEDIUM'
  return 'LOW'
}

export async function recalcCreditProfile(customerId: string) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      creditProfile: true,
      sales: {
        where: { status: { in: ['COMPLETED', 'PARTIAL_REFUND'] } },
        include: { payments: { select: { amount: true } } },
      },
    },
  }) as any
  if (!customer || !customer.creditProfile) return null

  const profile = customer.creditProfile
  let totalOutstanding = 0
  let totalOverdue = 0
  let totalCurrent = 0
  const now = new Date()

  for (const sale of customer.sales) {
    const paid = sale.payments.reduce((s: number, p: any) => s + num(p.amount), 0)
    const outstanding = num(sale.total) - paid
    if (outstanding <= 0.01) continue
    totalOutstanding += outstanding

    const daysSince = Math.floor((now.getTime() - sale.createdAt.getTime()) / 86400000)
    if (daysSince > profile.paymentTerms) {
      totalOverdue += outstanding
    } else {
      totalCurrent += outstanding
    }
  }

  const utilized = totalOutstanding
  const available = Math.max(0, num(profile.creditLimit) - utilized)
  const utilizationPct = creditUtilization(utilized, num(profile.creditLimit))
  const avgDaysOverdue = totalOverdue > 0 ? Math.floor((now.getTime() - customer.createdAt.getTime()) / 86400000) : 0

  const risk = assessRisk(utilizationPct, avgDaysOverdue)

  const updated = await prisma.creditProfile.update({
    where: { id: profile.id },
    data: {
      utilizedCredit: utilized,
      availableCredit: available,
      riskLevel: risk,
    },
  })

  return { ...updated, totalOutstanding: utilized, totalCurrent, totalOverdue }
}

export async function getCustomerAging(customerId: string) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      sales: {
        where: { status: { in: ['COMPLETED', 'PARTIAL_REFUND'] } },
        include: { payments: { select: { amount: true } } },
      },
      creditProfile: true,
    },
  }) as any
  if (!customer) return null

  const terms = customer.creditProfile?.paymentTerms ?? 30
  const now = new Date()
  const buckets = { current: 0, bucket31to60: 0, bucket61to90: 0, bucket90plus: 0 }

  for (const sale of customer.sales) {
    const paid = sale.payments.reduce((s: number, p: any) => s + num(p.amount), 0)
    const outstanding = num(sale.total) - paid
    if (outstanding <= 0.01) continue

    const daysSince = Math.floor((now.getTime() - sale.createdAt.getTime()) / 86400000)
    const overdue = daysSince - terms

    if (overdue <= 0) buckets.current += outstanding
    else if (overdue <= 30) buckets.bucket31to60 += outstanding
    else if (overdue <= 60) buckets.bucket61to90 += outstanding
    else buckets.bucket90plus += outstanding
  }

  return {
    customerId,
    customerName: customer.name,
    terms,
    ...buckets,
    total: buckets.current + buckets.bucket31to60 + buckets.bucket61to90 + buckets.bucket90plus,
  }
}

export async function getARAgingReport() {
  const customers = await prisma.customer.findMany({
    include: {
      creditProfile: true,
      sales: {
        where: { status: { in: ['COMPLETED', 'PARTIAL_REFUND'] } },
        include: { payments: { select: { amount: true } } },
      },
    },
  }) as any[]

  const report = []
  for (const c of customers) {
    const aging = await getCustomerAging(c.id)
    if (aging && aging.total > 0.01) {
      report.push({
        name: c.name,
        riskLevel: c.creditProfile?.riskLevel ?? 'LOW',
        ...aging,
      })
    }
  }

  const totals = report.reduce(
    (acc, r) => {
      acc.current += r.current
      acc.bucket31to60 += r.bucket31to60
      acc.bucket61to90 += r.bucket61to90
      acc.bucket90plus += r.bucket90plus
      acc.total += r.total
      return acc
    },
    { current: 0, bucket31to60: 0, bucket61to90: 0, bucket90plus: 0, total: 0 }
  )

  return { report, totals }
}

export async function estimateCreditScore(customerId: string): Promise<number | null> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      creditProfile: true,
      sales: {
        where: { status: { in: ['COMPLETED', 'PARTIAL_REFUND', 'REFUNDED'] } },
        include: { payments: { select: { amount: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  }) as any
  if (!customer || !customer.creditProfile) return null

  const profile = customer.creditProfile
  let score = 650

  const util = creditUtilization(num(profile.utilizedCredit), num(profile.creditLimit))
  if (util < 30) score += 80
  else if (util < 50) score += 40
  else if (util < 70) score += 0
  else if (util < 90) score -= 40
  else score -= 100

  const sales = customer.sales
  const paidOnTime = sales.filter((s: any) => {
    const paid = s.payments.reduce((sum: number, p: any) => sum + num(p.amount), 0)
    if (paid < num(s.total) * 0.9) return false
    const daysSince = Math.floor((new Date().getTime() - s.createdAt.getTime()) / 86400000)
    return daysSince <= profile.paymentTerms + 5
  }).length

  if (sales.length > 0) {
    const onTimePct = paidOnTime / sales.length
    if (onTimePct > 0.9) score += 70
    else if (onTimePct > 0.7) score += 30
    else if (onTimePct > 0.5) score -= 20
    else score -= 60
  }

  const tenureDays = Math.floor((new Date().getTime() - customer.createdAt.getTime()) / 86400000)
  if (tenureDays > 730) score += 30
  else if (tenureDays > 365) score += 15
  else if (tenureDays < 90) score -= 20

  return Math.min(850, Math.max(300, score))
}
