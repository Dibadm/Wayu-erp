// app/api/reports/commission/route.ts
// Aggregates commission per salesperson resolving admin-configured rates on the
// PRE-TAX line total (decisions #1 & #6).

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { CommissionScope } from '@prisma/client'
import { num } from '@/lib/finance'
import { CalendarMode } from '@/lib/ethiopian-calendar'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const mode = (searchParams.get('calendar') ?? 'gregorian') as CalendarMode
  const amharic = searchParams.get('amharic') === 'true'

  const [sales, ratesRaw, salespeople] = await Promise.all([
    prisma.sale.findMany({
      where: { status: 'COMPLETED' },
      include: {
        salesperson: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, sku: true, name: true } } } },
      },
    }),
    prisma.commissionRate.findMany(),
    prisma.user.findMany({ where: { isSalesperson: true }, select: { id: true, name: true } }),
  ])

  const rates = ratesRaw.map(r => ({
    id: r.id, scope: r.scope, salespersonId: r.salespersonId, productId: r.productId,
    tierFromQty: r.tierFromQty, tierToQty: r.tierToQty, rate: num(r.rate), active: r.active,
  }))

  const perPerson: Record<string, { id: string; name: string; preTaxBase: number; commission: number; qty: number }> = {}
  const perProduct: Record<string, { productId: string; productName: string; preTaxBase: number; commission: number; qty: number }> = {}

  for (const s of sales) {
    const spId = s.salespersonId ?? 'unassigned'
    const spName = s.salesperson?.name ?? 'Unassigned'
    if (!perPerson[spId]) perPerson[spId] = { id: spId, name: spName, preTaxBase: 0, commission: 0, qty: 0 }
    for (const it of s.items) {
      const preTax = num(it.lineTotal)
      const ctx = { salespersonId: s.salespersonId, productId: it.product.id, soldQty: it.quantity, preTaxBase: preTax }
      const rate = resolve(rates, ctx)
      const comm = rate ? (preTax * num(rate.rate)) / 100 : 0
      perPerson[spId].preTaxBase += preTax
      perPerson[spId].commission += comm
      perPerson[spId].qty += it.quantity

      const pKey = `${spId}::${it.product.id}`
      if (!perProduct[pKey]) perProduct[pKey] = { productId: it.product.id, productName: it.product.name, preTaxBase: 0, commission: 0, qty: 0 }
      perProduct[pKey].preTaxBase += preTax
      perProduct[pKey].commission += comm
      perProduct[pKey].qty += it.quantity
    }
  }

  const totalCommission = Object.values(perPerson).reduce((s, p) => s + p.commission, 0)
  return NextResponse.json({
    bySalesperson: Object.values(perPerson).sort((a, b) => b.commission - a.commission),
    detail: Object.values(perProduct),
    totalCommission,
    salespeople,
    rates,
  })
}

function resolve(rates: any[], ctx: { salespersonId: string | null; productId: string; soldQty: number }) {
  let best: any = null
  let bestScore = -1
  for (const r of rates) {
    if (!r.active) continue
    if (ctx.soldQty < r.tierFromQty) continue
    if (r.tierToQty != null && ctx.soldQty > r.tierToQty) continue
    const combo = r.scope === CommissionScope.COMBO && r.salespersonId === ctx.salespersonId && r.productId === ctx.productId
    const prod = r.scope === CommissionScope.PRODUCT && r.productId === ctx.productId
    const sp = r.scope === CommissionScope.SALESPERSON && r.salespersonId === ctx.salespersonId
    const glob = r.scope === CommissionScope.GLOBAL
    const s = combo ? 100 : prod ? 60 : sp ? 40 : glob ? 20 : -1
    if (s > bestScore) { bestScore = s; best = r }
  }
  return best
}
