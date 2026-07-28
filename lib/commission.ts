import { prisma } from '@/lib/db'
import { CommissionScope } from '@prisma/client'

export interface CommissionRateContext {
  salespersonId?: string | null
  productId: string
  quantity: number
}

export interface ResolvedCommissionRate {
  rate: number
  scope: CommissionScope
  commissionRateId?: string
}

export async function resolveCommissionRate(ctx: CommissionRateContext): Promise<ResolvedCommissionRate> {
  const { salespersonId, productId, quantity } = ctx

  const whereTier = (qty: number) => ({
    active: true,
    tierFromQty: { lte: qty },
    OR: [
      { tierToQty: null },
      { tierToQty: { gte: qty } },
    ],
  })

  const scopes: { scope: CommissionScope; salespersonId?: string | null; productId?: string | null }[] = []

  if (salespersonId) {
    scopes.push(
      { scope: 'COMBO' as CommissionScope, salespersonId, productId },
      { scope: 'PRODUCT' as CommissionScope, productId },
      { scope: 'SALESPERSON' as CommissionScope, salespersonId },
    )
  }
  scopes.push({ scope: 'GLOBAL' as CommissionScope })

  for (const s of scopes) {
    const rate = await prisma.commissionRate.findFirst({
      where: {
        ...whereTier(quantity),
        scope: s.scope,
        ...(s.salespersonId ? { salespersonId: s.salespersonId } : { salespersonId: null }),
        ...(s.productId ? { productId: s.productId } : { productId: null }),
      },
      orderBy: [{ tierFromQty: 'desc' }],
    })
    if (rate) {
      return { rate: Number(rate.rate), scope: rate.scope, commissionRateId: rate.id }
    }
  }

  return { rate: 0, scope: 'GLOBAL' }
}
