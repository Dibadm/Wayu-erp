// lib/finance.ts
// Pure calculation layer reproducing the client's Excel formulas.
// All functions are side-effect free and unit-testable against the workbook.
//
// Formulas mapped (see analayze excel/UPDATE_PLAN.md §4):
//   Total = QTY × unit price
//   COGS  = QTY × CPU (batch cost)
//   Profit = Total − COGS
//   margin% = Profit / Total
//   Stock status (SC18): SOH=0→Out, SOH<min→Low, SOH>max→Overstock, else Normal
//   Inventory value (SC18): SOH × unitCost and SOH × unitPrice
//   Commission (Com 18): salesperson × product × sold-tier, all admin-configured, on PRE-TAX lineTotal
//   FIFO/FEFO cost picker: chooses batch cost basis (decision #2)

import { type Decimal } from '@prisma/client/runtime/library'
import { CommissionScope } from '@prisma/client'
import { CalendarMode, monthGroupKey } from '@/lib/ethiopian-calendar'

export type CostMethod = 'FIFO' | 'FEFO'

export function num(v: Decimal | number | null | undefined): number {
  if (v === null || v === undefined) return 0
  return typeof v === 'number' ? v : Number(v)
}

// ─── Line-level sale economics ────────────────────────────────────────────────

export interface SaleLineInput {
  quantity: number
  unitPrice: number
  unitCost: number
  discount?: number
  taxRate?: number // % (WHT) — commission is computed pre-tax, decision #6
}

export function computeLineEconomics(line: SaleLineInput) {
  const qty        = line.quantity
  const unitPrice  = line.unitPrice
  const unitCost   = line.unitCost
  const discount   = line.discount ?? 0
  const taxRate    = line.taxRate ?? 0

  const lineTotal  = (unitPrice - discount) * qty
  const cogs       = unitCost * qty
  const profit     = lineTotal - cogs
  const marginPct  = lineTotal > 0 ? (profit / lineTotal) * 100 : 0
  // Pre-tax base used for commission (decision #1/#6): line total before WHT
  const preTaxBase = lineTotal
  const taxAmount  = (preTaxBase * taxRate) / 100
  return { lineTotal, cogs, profit, marginPct, preTaxBase, taxAmount }
}

// ─── Stock status (SC18) ──────────────────────────────────────────────────────

export type StockStatus = 'OUT' | 'LOW' | 'NORMAL' | 'OVERSTOCK'

export function getStockStatus(
  quantity: number,
  minStockLevel: number,
  maxStockLevel?: number | null,
): StockStatus {
  if (quantity <= 0) return 'OUT'
  if (minStockLevel > 0 && quantity < minStockLevel) return 'LOW'
  if (maxStockLevel && maxStockLevel > 0 && quantity > maxStockLevel) return 'OVERSTOCK'
  return 'NORMAL'
}

export const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  OUT:      'Out of Stock',
  LOW:      'Low Stock',
  NORMAL:   'Normal',
  OVERSTOCK:'Overstock',
}

// ─── Inventory valuation (SC18) ───────────────────────────────────────────────

export function inventoryValue(quantity: number, unitCost: number, unitPrice: number) {
  return {
    costValue:  quantity * unitCost,
    retailValue: quantity * unitPrice,
    estProfit:  quantity * (unitPrice - unitCost),
  }
}

// ─── FIFO / FEFO cost basis picker (decision #2) ─────────────────────────────

export interface CostBatch {
  id: string
  quantity: number
  unitCost: number
  expiryDate: Date
  receivedDate?: Date
}

// Given a set of batches and a quantity, return the weighted unit cost and the
// depletion plan [{batchId, qty}] using the selected method.
//   FEFO → soonest expiry first
//   FIFO → earliest received first
// Returns null if insufficient covered quantity.
export function pickCostBasis(
  batches: CostBatch[],
  needed: number,
  method: CostMethod = 'FEFO',
): { plan: { batchId: string; qty: number }[]; unitCost: number; covered: boolean } | null {
  const sorted = [...batches]
    .filter(b => b.quantity > 0)
    .sort((a, b) => {
      if (method === 'FEFO') {
        return a.expiryDate.getTime() - b.expiryDate.getTime()
      }
      const ar = a.receivedDate?.getTime() ?? a.expiryDate.getTime()
      const br = b.receivedDate?.getTime() ?? b.expiryDate.getTime()
      return ar - br
    })

  const plan: { batchId: string; qty: number }[] = []
  let remaining = needed
  let costSum = 0
  let qtyPriced = 0
  for (const b of sorted) {
    if (remaining <= 0) break
    const take = Math.min(b.quantity, remaining)
    plan.push({ batchId: b.id, qty: take })
    costSum += take * b.unitCost
    qtyPriced += take
    remaining -= take
  }

  const covered = remaining <= 0
  const unitCost = qtyPriced > 0 ? costSum / qtyPriced : 0
  return { plan, unitCost, covered }
}

// ─── Tiered commission resolver (Com 18, decision #1) ─────────────────────────
// Resolution order (most specific wins):
//   salesperson+product+tier → product+tier → salesperson+tier → global+tier
// ALL rates are admin-configured — nothing hardcoded. Commission is on the
// pre-tax line total (decision #6).

export interface CommissionRateRow {
  id: string
  scope: CommissionScope
  salespersonId?: string | null
  productId?: string | null
  tierFromQty: number
  tierToQty?: number | null
  rate: number // % of pre-tax line total
  active: boolean
}

export interface CommissionContext {
  salespersonId?: string | null
  productId?: string
  soldQty: number
  preTaxBase: number // sum of pre-tax line totals for this product by this salesperson
}

function tierMatches(row: CommissionRateRow, qty: number): boolean {
  if (qty < row.tierFromQty) return false
  if (row.tierToQty !== null && row.tierToQty !== undefined && qty > row.tierToQty) return false
  return true
}

function score(row: CommissionRateRow, ctx: CommissionContext): number {
  // Higher = more specific. Used to pick the winning rate.
  let s = 0
  if (row.scope === CommissionScope.COMBO && row.salespersonId === ctx.salespersonId && row.productId === ctx.productId) s = 100
  else if (row.scope === CommissionScope.PRODUCT && row.productId === ctx.productId) s = 60
  else if (row.scope === CommissionScope.SALESPERSON && row.salespersonId === ctx.salespersonId) s = 40
  else if (row.scope === CommissionScope.GLOBAL) s = 20
  return s
}

// Resolve the best matching commission rate for a single (salesperson, product, tier) context.
export function resolveCommissionRate(
  rates: CommissionRateRow[],
  ctx: CommissionContext,
): CommissionRateRow | null {
  let best: CommissionRateRow | null = null
  let bestScore = -1
  for (const row of rates) {
    if (!row.active) continue
    if (!tierMatches(row, ctx.soldQty)) continue
    if (row.scope === CommissionScope.COMBO && !(row.salespersonId === ctx.salespersonId && row.productId === ctx.productId)) continue
    if (row.scope === CommissionScope.PRODUCT && row.productId !== ctx.productId) continue
    if (row.scope === CommissionScope.SALESPERSON && row.salespersonId !== ctx.salespersonId) continue
    const s = score(row, ctx)
    if (s > bestScore) { bestScore = s; best = row }
  }
  return best
}

// Compute commission amount for one ctx (pre-tax × rate).
export function commissionFor(rate: CommissionRateRow | null, preTaxBase: number): number {
  if (!rate) return 0
  return (preTaxBase * num(rate.rate)) / 100
}

// Aggregate sale items into per-(salesperson, product) commission contexts.
export interface SaleLineForCommission {
  salespersonId?: string | null
  productId: string
  quantity: number
  preTaxBase: number
}

export function aggregateCommissionContexts(lines: SaleLineForCommission[]): CommissionContext[] {
  const map = new Map<string, CommissionContext>()
  for (const line of lines) {
    const key = `${line.salespersonId ?? 'none'}::${line.productId}`
    const existing = map.get(key)
    if (existing) {
      existing.soldQty += line.quantity
      existing.preTaxBase += line.preTaxBase
    } else {
      map.set(key, {
        salespersonId: line.salespersonId ?? null,
        productId: line.productId,
        soldQty: line.quantity,
        preTaxBase: line.preTaxBase,
      })
    }
  }
  return [...map.values()]
}

// ─── Gross Profit rollup (GP 2,18) ────────────────────────────────────────────
// Group sales lines by product × month. Returns sum of S (Sell value), R (COGS), G (Profit).

export interface GPInputLine {
  productId: string
  productName: string
  sku: string
  date: Date
  sellValue: number // Sells19!$G
  cogs: number      // Sells19!$R
  profit: number    // Sells19!$S
  quantity: number  // Sells19!$E
}

export interface GPByProductMonth {
  productId: string
  productName: string
  sku: string
  monthKey: string
  sellValue: number
  cogs: number
  profit: number
  quantity: number
}

export function rollupGrossProfit(lines: GPInputLine[], mode: CalendarMode = 'gregorian', useAmharic = false): GPByProductMonth[] {
  const map = new Map<string, GPByProductMonth>()
  for (const l of lines) {
    const monthKey = monthGroupKey(l.date, mode, useAmharic)
    const key = `${l.productId}::${monthKey}`
    const cur = map.get(key)
    if (cur) {
      cur.sellValue += l.sellValue
      cur.cogs += l.cogs
      cur.profit += l.profit
      cur.quantity += l.quantity
    } else {
      map.set(key, {
        productId: l.productId, productName: l.productName, sku: l.sku,
        monthKey, sellValue: l.sellValue, cogs: l.cogs, profit: l.profit, quantity: l.quantity,
      })
    }
  }
  return [...map.values()].sort((a, b) =>
    a.productName.localeCompare(b.productName) || a.monthKey.localeCompare(b.monthKey))
}

// ─── Monthly received-vs-sold (InOut 19 / Dashboard) ──────────────────────────
// Beg/Rec/End Qty & Value running balance per product.

export interface MovementInOut {
  productId: string
  productName: string
  sku: string
  date: Date
  type: 'IN' | 'OUT'
  quantity: number
  unitCost: number
  unitPrice: number
}

export interface InOutRow {
  productId: string
  productName: string
  sku: string
  monthKey: string
  beginningQty: number
  receivedQty: number
  soldQty: number
  endingQty: number
  beginningValue: number
  receivedValue: number
  soldValue: number
  endingValue: number
}

export function rollupReceivedVsSold(
  movements: MovementInOut[],
  openingBalances: { productId: string; qty: number; unitCost: number; unitPrice: number }[],
  mode: CalendarMode = 'gregorian',
  useAmharic = false,
): InOutRow[] {
  // Build month buckets per product, sorted chronologically
  const byProduct: Record<string, { name: string; sku: string; monthKey: string; in: number; out: number; inValue: number; outValue: number }[]> = {}
  for (const m of movements) {
    const monthKey = monthGroupKey(m.date, mode, useAmharic)
    const p = byProduct[m.productId] ?? (byProduct[m.productId] = [])
    const row = p.find(r => r.monthKey === monthKey)
    const value = m.quantity * (m.type === 'IN' ? m.unitCost : m.unitPrice)
    if (row) {
      if (m.type === 'IN') { row.in += m.quantity; row.inValue += value }
      else { row.out += m.quantity; row.outValue += value }
    } else {
      p.push({
        name: m.productName, sku: m.sku, monthKey,
        in: m.type === 'IN' ? m.quantity : 0,
        out: m.type === 'OUT' ? m.quantity : 0,
        inValue: m.type === 'IN' ? value : 0,
        outValue: m.type === 'OUT' ? value : 0,
      })
    }
  }

  // Sort months chronologically by approximate date: use monthKey endsWith year
  const result: InOutRow[] = []
  for (const [productId, buckets] of Object.entries(byProduct)) {
    buckets.sort((a, b) => a.monthKey.localeCompare(b.monthKey))
    const open = openingBalances.find(o => o.productId === productId)
    let begQty = open?.qty ?? 0
    let begVal = (open?.qty ?? 0) * (open?.unitCost ?? 0)
    for (const b of buckets) {
      const endQty = begQty + b.in - b.out
      const endVal = begVal + b.inValue - b.outValue
      result.push({
        productId, productName: b.name, sku: b.sku, monthKey: b.monthKey,
        beginningQty: begQty, receivedQty: b.in, soldQty: b.out, endingQty: endQty,
        beginningValue: begVal, receivedValue: b.inValue, soldValue: b.outValue, endingValue: endVal,
      })
      begQty = endQty
      begVal = endVal
    }
  }
  return result
}
