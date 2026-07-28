// lib/excel.ts
// Two-way Excel I/O (decisions #3, #4, #5).
//
// IMPORT  — reads the client's Sells19 / Received sheets and upserts into the DB.
//           On re-import: ONLY adds new rows keyed by receiptNumber / poNumber.
//           If an Excel row conflicts with existing app data → records it in
//           ImportBatch.mismatches / SyncConflict and alerts the admin (NEVER overwrites).
//           Tolerant of #REF! / #VALUE! error cells.
// EXPORT  — emits the client's familiar sheets (Sells, Received, GP, Commission,
//           Stock, Dashboard) with a Gregorian / Ethiopian calendar toggle, computed
//           values (no live formulas) to avoid Excel recalc surprises.

import ExcelJS from 'exceljs'

try {
  const tableXform = require('exceljs/lib/xlsx/xform/table/table-xform')
  const originalParseClose = tableXform.prototype.parseClose
  tableXform.prototype.parseClose = function (...args: any[]) {
    try {
      return originalParseClose.apply(this, args)
    } catch (e: any) {
      if (e.message?.includes('filterButton') || e.message?.includes('Cannot set properties of undefined')) {
        return {}
      }
      throw e
    }
  }
} catch {}

import { prisma } from '@/lib/db'
import { formatDate } from '@/lib/utils'
import { CalendarMode, ethiopianMonthLabel, gregorianMonthLabel } from '@/lib/ethiopian-calendar'
import {
  rollupGrossProfit, rollupReceivedVsSold, getStockStatus, num,
} from '@/lib/finance'

// ─────────────────────────── Helpers ──────────────────────────────────────────

// Read a cell, returning null for error strings like "#REF!", "#VALUE!", "#N/A".
function cellVal(cell: ExcelJS.Cell | undefined): any {
  if (!cell) return null
  const v = cell.value
  if (v === null || v === undefined) return null
  if (typeof v === 'string') {
    const t = v.trim().toUpperCase()
    if (['#REF!', '#VALUE!', '#N/A', '#DIV/0!', '#NAME?', '#NULL!', '#NUM!'].includes(t)) return null
    return v.trim()
  }
  if (typeof v === 'object' && 'text' in (v as any)) return (v as any).text
  return v
}

function numCell(cell: ExcelJS.Cell | undefined): number {
  const v = cellVal(cell)
  if (v === null || v === undefined || v === '') return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function dateCell(cell: ExcelJS.Cell | undefined): Date | null {
  const v = cellVal(cell)
  if (v instanceof Date) return v
  if (typeof v === 'number') {
    const d = new Date(Math.round((v - 25569) * 86400) * 1000)
    return isNaN(d.getTime()) ? null : d
  }
  if (typeof v === 'string') {
    const d = new Date(v)
    return isNaN(d.getTime()) ? null : d
  }
  return null
}

function findRow(sheet: ExcelJS.Worksheet, headerRow: number, headerName: string): number {
  const row = sheet.getRow(headerRow)
  let idx = -1
  row.eachCell({ includeEmpty: true }, (cell, col) => {
    if (cellVal(cell)?.toString().toLowerCase() === headerName.toLowerCase()) idx = col
  })
  return idx
}

function pick(...indices: number[]) {
  return indices.find(i => i > 0) ?? -1
}

// ─────────────────────────── IMPORT ───────────────────────────────────────────

export interface ImportResult {
  importBatchId: string
  fileName: string
  rowCount: number
  newRows: number
  mismatches: number
  status: string
  mismatchDetails: {
    entity: string
    entityId: string
    entityName: string
    field: string
    excelValue: string
    appValue: string
  }[]
}

interface ImportOptions {
  fileName: string
  importedBy: string
  defaultLocationId?: string
  defaultSupplierId?: string
}

// Import the Sells19 sheet → Sale + SaleItem. Keyed by receiptNumber (col "Receipt No.").
export async function importSellsSheet(
  buffer: Buffer,
  opts: ImportOptions,
): Promise<ImportResult> {
  const wb = new ExcelJS.Workbook()
  if ((wb.xlsx as any).parsers) {
    ;(wb.xlsx as any).parsers = (wb.xlsx as any).parsers.filter((p: any) => p.name !== 'table')
  }
  await wb.xlsx.load(buffer as any)
  const sheet = wb.getWorksheet('Sells19') ?? wb.worksheets[0]
  if (!sheet) throw new Error('Sells19 sheet not found in workbook')

  // Locate header row (scan first 12 rows for a recognizable header)
  let headerRow = -1
  for (let r = 1; r <= 12; r++) {
    const vals = sheet.getRow(r).values as any[]
    if (vals.some(v => ['Receipt No.', 'Receipt', 'Items', 'Buyer Name', 'QTY'].includes(cellVal(sheet.getCell(r, (vals.indexOf(v) > -1 ? vals.indexOf(v) : 1)))?.toString()))) {
      headerRow = r
      break
    }
  }
  if (headerRow === -1) headerRow = 1

  // Build column index map by header label (flexible matching)
  const headers = sheet.getRow(headerRow).values as any[]
  const col = (name: string) => headers.findIndex((h, i) => i > 0 && cellVal(sheet.getCell(headerRow, i))?.toString().toLowerCase().includes(name.toLowerCase()))
  const colExact = (name: string) => headers.findIndex((h, i) => i > 0 && cellVal(sheet.getCell(headerRow, i))?.toString().toLowerCase() === name.toLowerCase())

  const cSn      = pick(col('sn'), col('s.n'), col('s/no'), col('s no'))
  const cReceipt = pick(col('receipt'), col('r.no'), col('doc no'), col('doc'), cSn)
  const cItems   = pick(col('items'), col('sku'), 1)
  const cBuyer   = pick(col('buyer'), col('name'))
  const cTin     = pick(col('tin'))
  const cQty     = pick(col('qty'))
  const cUnit    = pick(col('unit price'))
  const cTotal   = pick(col('total'))
  const cDate    = pick(col('date'))
  const cPct     = pick(col('%'))
  const cSeller  = pick(col('sells by'), col('salesperson'))
  const cLot     = pick(col('lot'))
  const cCPU     = pick(col('cpu'), col('up'), col('unit cost'))
  const cCOGS    = pick(col('cogs'))
  const cProfit  = pick(colExact('p'), col('profit'), col('p '))

  // Preload reference data
  const [products, customers] = await Promise.all([
    prisma.product.findMany({ select: { id: true, sku: true, name: true, sellingPrice: true, costPrice: true } }),
    prisma.customer.findMany({ select: { id: true, name: true, tinNo: true } }),
  ])
  const productBySku = new Map(products.map(p => [p.sku.toLowerCase(), p]))
  const customerByName = new Map(customers.map(c => [c.name.toLowerCase(), c]))

  const mismatches: ImportResult['mismatchDetails'] = []
  let rowCount = 0
  let newRows = 0
  const salesToCreate: any[] = []

  interface SaleGroup {
    receipt: string
    buyerName: string
    tin: string
    date: Date
    seller: string
    items: { productId: string; quantity: number; unitPrice: number; unitCost: number; lineTotal: number; profit: number; pct: number }[]
  }

  function getReceipt(r: number): string | null {
    const docNo = cellVal(sheet.getCell(r, cReceipt))?.toString()
    if (docNo) return docNo
    if (cSn > 0) {
      const sn = cellVal(sheet.getCell(r, cSn))?.toString()
      if (sn) return `RCP-${sn}`
    }
    return null
  }

  const groups = new Map<string, SaleGroup>()
  let currentKey = ''

  for (let r = headerRow + 1; r <= sheet.rowCount; r++) {
    const receipt = getReceipt(r)
    const productSku = cellVal(sheet.getCell(r, cItems))?.toString()
    if (!productSku) continue

    const buyerName = cellVal(sheet.getCell(r, cBuyer))?.toString() || ''
    const tin = cellVal(sheet.getCell(r, cTin))?.toString() || ''
    const date = dateCell(sheet.getCell(r, cDate)) ?? new Date()
    const seller = cellVal(sheet.getCell(r, cSeller))?.toString() || ''

    let groupKey: string
    if (receipt || buyerName.trim()) {
      groupKey = receipt || `${buyerName}|${date.toISOString()}|${seller}`
    } else if (currentKey) {
      groupKey = currentKey
    } else {
      groupKey = `${buyerName}|${date.toISOString()}|${seller}|${r}`
    }

    if (!groups.has(groupKey)) {
      const finalReceipt = receipt || `RCP-${date.toISOString().split('T')[0]}-${groups.size + 1}`
      groups.set(groupKey, {
        receipt: finalReceipt,
        buyerName,
        tin,
        date,
        seller,
        items: [],
      })
    }

    const group = groups.get(groupKey)!
    rowCount++

    const product = productBySku.get(productSku.toLowerCase())
    if (!product) {
      mismatches.push({ entity: 'Sale', entityId: group.receipt, entityName: `RCP ${group.receipt}`, field: 'product', excelValue: productSku, appValue: '(not found)' })
      currentKey = groupKey
      continue
    }

    const qty     = numCell(sheet.getCell(r, cQty))
    const unitP   = numCell(sheet.getCell(r, cUnit)) || Number(product.sellingPrice ?? 0)
    const pct     = numCell(sheet.getCell(r, cPct))
    const lineT   = numCell(sheet.getCell(r, cTotal)) || unitP * qty
    const cpu     = numCell(sheet.getCell(r, cCPU)) || Number(product.costPrice ?? 0)
    const cogs    = numCell(sheet.getCell(r, cCOGS)) || cpu * qty
    const profit  = numCell(sheet.getCell(r, cProfit)) || lineT - cogs

    group.items.push({ productId: product.id, quantity: qty, unitPrice: unitP, unitCost: cpu, lineTotal: lineT, profit, pct })
    currentKey = groupKey
  }

  for (const group of groups.values()) {
    const existing = await prisma.sale.findUnique({ where: { receiptNumber: group.receipt }, select: { id: true, total: true } })
    if (existing) {
      const excelTotal = group.items.reduce((s, it) => s + it.lineTotal, 0)
      if (Math.abs(Number(existing.total) - excelTotal) > 0.01) {
        mismatches.push({
          entity: 'Sale', entityId: existing.id, entityName: `RCP ${group.receipt}`,
          field: 'total', excelValue: excelTotal.toFixed(2), appValue: Number(existing.total).toFixed(2),
        })
      }
      continue
    }

    let customer = customerByName.get(group.buyerName.toLowerCase())
    if (!customer && group.buyerName && group.buyerName !== 'Walk-in') {
      const created = await prisma.customer.create({
        data: { name: group.buyerName, tinNo: group.tin || undefined },
        select: { id: true, name: true, tinNo: true },
      })
      customerByName.set(created.name.toLowerCase(), created)
      customer = created
    }

    const subtotal = group.items.reduce((s, it) => s + it.lineTotal, 0)
    const taxable = group.items.some(it => it.pct > 0)
    const taxAmount = taxable ? group.items.reduce((s, it) => s + (it.lineTotal * it.pct) / 100, 0) : 0
    const total = subtotal + taxAmount
    const totalCost = group.items.reduce((s, it) => s + it.unitCost * it.quantity, 0)
    const profit = group.items.reduce((s, it) => s + it.profit, 0)

    salesToCreate.push({
      receiptNumber: group.receipt,
      customerId: customer?.id,
      subtotal,
      discountAmount: 0,
      taxAmount,
      total,
      totalCost,
      profit,
      taxable,
      ethiopianMonth: ethiopianMonthLabel(group.date),
      source: 'EXCEL_IMPORT' as const,
      cashierId: opts.importedBy,
      status: 'COMPLETED' as const,
      createdAt: group.date,
      items: {
        create: group.items.map(it => ({
          productId: it.productId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          unitCost: it.unitCost,
          lineTotal: it.lineTotal,
          profit: it.profit,
          batchesUsed: null,
        })),
      },
    })
    newRows++
  }

  const importBatch = await prisma.importBatch.create({
    data: {
      fileName: opts.fileName,
      importedById: opts.importedBy,
      rowCount,
      newRows,
      status: mismatches.length > 0 ? 'PARTIAL' : 'COMPLETED',
      mismatches: mismatches.length ? (mismatches as any) : undefined,
    },
  })

  for (const sale of salesToCreate) {
    await prisma.sale.create({ data: sale })
  }

  for (const m of mismatches) {
    await prisma.syncConflict.create({
      data: {
        importBatchId: importBatch.id,
        entity: m.entity, entityId: m.entityId, entityName: m.entityName,
        field: m.field, excelValue: m.excelValue, appValue: m.appValue, resolved: false,
      },
    })
  }

  return {
    importBatchId: importBatch.id, fileName: opts.fileName, rowCount, newRows,
    mismatches: mismatches.length, status: importBatch.status,
    mismatchDetails: mismatches,
  }
}

// Import the Received sheet → PurchaseOrder + Batch. Keyed by poNumber.
export async function importReceivedSheet(
  buffer: Buffer,
  opts: ImportOptions,
): Promise<ImportResult> {
  const wb = new ExcelJS.Workbook()
  if ((wb.xlsx as any).parsers) {
    ;(wb.xlsx as any).parsers = (wb.xlsx as any).parsers.filter((p: any) => p.name !== 'table')
  }
  await wb.xlsx.load(buffer as any)
  const sheet = wb.getWorksheet('Received') ?? wb.worksheets[0]
  if (!sheet) throw new Error('Received sheet not found in workbook')

  const headers = sheet.getRow(1).values as any[]
  const col = (name: string) => headers.findIndex((h, i) => i > 0 && cellVal(sheet.getCell(1, i))?.toString().toLowerCase().includes(name.toLowerCase()))

  const cPO     = pick(col('po'), col('po number'))
  const cItems  = pick(col('items'), col('sku'), 1)
  const cQty    = pick(col('qty'))
  const cUnit   = pick(col('uc'), col('unit cost'))
  const cTotal  = pick(col('total cost'), col('total  cost'))
  const cLot    = pick(col('lot'), col('batch'))
  const cDate   = pick(col('month'), col('date'), col('received date'))
  const cSupp   = pick(col('supplier'))

  const [products, suppliers] = await Promise.all([
    prisma.product.findMany({ select: { id: true, sku: true } }),
    prisma.supplier.findMany({ select: { id: true, name: true } }),
  ])
  const productBySku = new Map(products.map(p => [p.sku.toLowerCase(), p]))
  const supplierByName = new Map(suppliers.map(s => [s.name.toLowerCase(), s]))
  const locationId = opts.defaultLocationId

  let defaultSupplierId = opts.defaultSupplierId
  if (!defaultSupplierId && suppliers.length > 0) {
    defaultSupplierId = suppliers[0].id
  }
  if (!defaultSupplierId) {
    const fallback = await prisma.supplier.create({ data: { name: 'Default Supplier', status: 'ACTIVE' }, select: { id: true } })
    defaultSupplierId = fallback.id
  }

  const mismatches: ImportResult['mismatchDetails'] = []
  let rowCount = 0
  let newRows = 0
  const posToCreate: any[] = []

  for (let r = 2; r <= sheet.rowCount; r++) {
    const productSku = cellVal(sheet.getCell(r, cItems))?.toString()
    if (!productSku) continue
    rowCount++

    const product = productBySku.get(productSku.toLowerCase())
    if (!product) {
      const poNumber = cPO > 0 ? cellVal(sheet.getCell(r, cPO))?.toString() || `PO-${r}` : `PO-${r}`
      mismatches.push({ entity: 'PurchaseOrder', entityId: poNumber, entityName: `PO ${poNumber}`, field: 'product', excelValue: productSku, appValue: '(not found)' })
      continue
    }

    const date = dateCell(sheet.getCell(r, cDate)) ?? new Date()
    const poNumber = cPO > 0 ? cellVal(sheet.getCell(r, cPO))?.toString() || `PO-${date.toISOString().split('T')[0]}-${r}` : `PO-${date.toISOString().split('T')[0]}-${r}`

    const existing = await prisma.purchaseOrder.findUnique({ where: { poNumber }, select: { id: true, totalCost: true } })
    if (existing) {
      const excelTotal = numCell(sheet.getCell(r, cTotal))
      if (Math.abs(Number(existing.totalCost) - excelTotal) > 0.01) {
        mismatches.push({
          entity: 'PurchaseOrder', entityId: existing.id, entityName: `PO ${poNumber}`,
          field: 'totalCost', excelValue: excelTotal.toFixed(2), appValue: Number(existing.totalCost).toFixed(2),
        })
      }
      continue
    }

    const suppName = cSupp > 0 ? cellVal(sheet.getCell(r, cSupp))?.toString() : null
    const supplier = suppName ? supplierByName.get(suppName.toLowerCase()) : undefined
    const qty     = numCell(sheet.getCell(r, cQty))
    const unitCost= numCell(sheet.getCell(r, cUnit))
    const total   = numCell(sheet.getCell(r, cTotal)) || unitCost * qty
    const lot     = cLot > 0 ? (cellVal(sheet.getCell(r, cLot))?.toString() ?? `LOT-${poNumber}-${r}`) : `LOT-${poNumber}-${r}`

    posToCreate.push({
      poNumber,
      status: 'COMPLETED' as const,
      orderDate: date,
      expectedDelivery: date,
      totalCost: total,
      supplierId: supplier?.id ?? defaultSupplierId,
      createdById: opts.importedBy,
      items: {
        create: [{
          productId: product.id,
          quantityOrdered: qty,
          quantityReceived: qty,
          unitCost,
          totalCost: total,
          batchNumber: lot,
          expiryDate: new Date(date.getTime() + 365 * 86400000),
        }],
      },
    })
    newRows++
  }

  const importBatch = await prisma.importBatch.create({
    data: {
      fileName: opts.fileName,
      importedById: opts.importedBy,
      rowCount, newRows,
      status: mismatches.length > 0 ? 'PARTIAL' : 'COMPLETED',
      mismatches: mismatches.length ? (mismatches as any) : undefined,
    },
  })

  for (const po of posToCreate) {
    const created = await prisma.purchaseOrder.create({ data: po })
    // Also create a Batch so FEFO/COGS works
    const item = po.items.create[0]
    if (locationId) {
      await prisma.batch.create({
        data: {
          productId: item.productId,
          locationId,
          batchNumber: item.batchNumber,
          quantity: item.quantityReceived,
          expiryDate: item.expiryDate,
          receivedDate: po.orderDate,
          status: 'ACTIVE',
        },
      })
      await prisma.product.update({
        where: { id: item.productId },
        data: { quantity: { increment: item.quantityReceived } },
      })
    }
  }

  for (const m of mismatches) {
    await prisma.syncConflict.create({
      data: {
        importBatchId: importBatch.id, entity: m.entity, entityId: m.entityId,
        entityName: m.entityName, field: m.field, excelValue: m.excelValue, appValue: m.appValue, resolved: false,
      },
    })
  }

  return {
    importBatchId: importBatch.id, fileName: opts.fileName, rowCount, newRows,
    mismatches: mismatches.length, status: importBatch.status, mismatchDetails: mismatches,
  }
}

// ─────────────────────────── EXPORT ───────────────────────────────────────────

const HEADER_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }
const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFAFAFA' }, size: 10 }

function styleHeader(row: ExcelJS.Row) {
  row.eachCell(c => { c.fill = HEADER_FILL; c.font = HEADER_FONT; c.alignment = { vertical: 'middle' } })
  row.height = 22
}

function monthLabel(date: Date, mode: CalendarMode, useAmharic: boolean): string {
  return mode === 'ethiopian' ? ethiopianMonthLabel(date, useAmharic) : gregorianMonthLabel(date)
}

// Sells sheet — mirrors Sells19 column order.
export async function generateSellsExcel(mode: CalendarMode, useAmharic = false): Promise<Buffer> {
  const sales = await prisma.sale.findMany({
    orderBy: { createdAt: 'desc' },
    take: 1000,
    include: {
      customer: { select: { name: true, tinNo: true } },
      salesperson: { select: { name: true } },
      items: { include: { product: { select: { sku: true, name: true } } } },
    },
  })
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Sells19')
  ws.columns = [
    { header: 'Receipt No.', key: 'receipt', width: 18 },
    { header: 'Date', key: 'date', width: 20 },
    { header: 'EthC', key: 'etc', width: 16 },
    { header: 'Items', key: 'items', width: 18 },
    { header: 'Buyer Name', key: 'buyer', width: 24 },
    { header: 'Tin No', key: 'tin', width: 16 },
    { header: 'QTY', key: 'qty', width: 10 },
    { header: 'Unit Price', key: 'unitPrice', width: 12 },
    { header: 'Total', key: 'total', width: 14 },
    { header: '%', key: 'pct', width: 8 },
    { header: 'Sells By', key: 'seller', width: 16 },
    { header: 'CPU', key: 'cpu', width: 10 },
    { header: 'COGS', key: 'cogs', width: 14 },
    { header: 'Profit', key: 'profit', width: 14 },
    { header: 'Source', key: 'source', width: 14 },
  ]
  styleHeader(ws.getRow(1))
  for (const s of sales) {
    for (const it of s.items) {
      ws.addRow({
        receipt: s.receiptNumber,
        date: formatDate(s.createdAt),
        etc: monthLabel(s.createdAt, mode, useAmharic),
        items: it.product.sku,
        buyer: s.customer?.name ?? 'Walk-in',
        tin: s.customer?.tinNo ?? '—',
        qty: it.quantity,
        unitPrice: num(it.unitPrice).toFixed(2),
        total: num(it.lineTotal).toFixed(2),
        pct: s.taxable ? 'X' : '',
        seller: s.salesperson?.name ?? '—',
        cpu: num(it.unitCost).toFixed(2),
        cogs: (num(it.unitCost) * it.quantity).toFixed(2),
        profit: num(it.profit).toFixed(2),
        source: s.source,
      })
    }
  }
  ws.autoFilter = { from: 'A1', to: 'N1' }
  return Buffer.from(await wb.xlsx.writeBuffer())
}

// Received sheet — mirrors Received column order.
export async function generateReceivedExcel(mode: CalendarMode, useAmharic = false): Promise<Buffer> {
  const orders = await prisma.purchaseOrder.findMany({
    orderBy: { orderDate: 'desc' },
    include: {
      supplier: { select: { name: true } },
      items: { include: { product: { select: { sku: true, name: true } } } },
    },
  })
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Received')
  ws.columns = [
    { header: 'PO Number', key: 'po', width: 18 },
    { header: 'Received Date', key: 'date', width: 20 },
    { header: 'EtC', key: 'etc', width: 16 },
    { header: 'Items', key: 'items', width: 18 },
    { header: 'Supplier', key: 'supplier', width: 24 },
    { header: 'QTY', key: 'qty', width: 10 },
    { header: 'Unit Cost', key: 'unitCost', width: 12 },
    { header: 'Total Cost', key: 'total', width: 14 },
    { header: 'Lot', key: 'lot', width: 18 },
    { header: 'Expiry', key: 'expiry', width: 16 },
  ]
  styleHeader(ws.getRow(1))
  for (const o of orders) {
    for (const it of o.items) {
      ws.addRow({
        po: o.poNumber,
        date: formatDate(o.orderDate),
        etc: monthLabel(o.orderDate, mode, useAmharic),
        items: it.product.sku,
        supplier: o.supplier.name,
        qty: it.quantityReceived,
        unitCost: num(it.unitCost).toFixed(2),
        total: num(it.totalCost).toFixed(2),
        lot: it.batchNumber ?? '—',
        expiry: it.expiryDate ? formatDate(it.expiryDate) : '—',
      })
    }
  }
  ws.autoFilter = { from: 'A1', to: 'J1' }
  return Buffer.from(await wb.xlsx.writeBuffer())
}

// Gross Profit sheet (GP 2,18) — by product × month.
export async function generateGPExcel(mode: CalendarMode, useAmharic = false): Promise<Buffer> {
  const sales = await prisma.sale.findMany({
    where: { status: 'COMPLETED' },
    include: { items: { include: { product: { select: { id: true, sku: true, name: true } } } } },
  })
  const lines = sales.flatMap(s => s.items.map(it => ({
    productId: it.product.id, productName: it.product.name, sku: it.product.sku,
    date: s.createdAt, sellValue: num(it.lineTotal), cogs: num(it.unitCost) * it.quantity,
    profit: num(it.profit), quantity: it.quantity,
  })))
  const rows = rollupGrossProfit(lines, mode, useAmharic)
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('GP 2,18')
  ws.columns = [
    { header: 'SKU', key: 'sku', width: 18 },
    { header: 'Product', key: 'name', width: 30 },
    { header: 'Month', key: 'month', width: 18 },
    { header: 'Qty Sold', key: 'qty', width: 12 },
    { header: 'Sell (G)', key: 'sell', width: 14 },
    { header: 'COGS (R)', key: 'cogs', width: 14 },
    { header: 'Profit (S)', key: 'profit', width: 14 },
    { header: 'Margin %', key: 'margin', width: 12 },
  ]
  styleHeader(ws.getRow(1))
  for (const r of rows) {
    const margin = r.sellValue > 0 ? (r.profit / r.sellValue) * 100 : 0
    ws.addRow({
      sku: r.sku, name: r.productName, month: r.monthKey, qty: r.quantity,
      sell: r.sellValue.toFixed(2), cogs: r.cogs.toFixed(2), profit: r.profit.toFixed(2),
      margin: `${margin.toFixed(1)}%`,
    })
  }
  ws.autoFilter = { from: 'A1', to: 'H1' }
  return Buffer.from(await wb.xlsx.writeBuffer())
}

// Stock sheet (SC18) — SOH, COGS, Profit, margin %, value, status.
export async function generateStockExcel(mode: CalendarMode): Promise<Buffer> {
  const products = await prisma.product.findMany({
    select: { id: true, sku: true, name: true, quantity: true, minStockLevel: true, maxStockLevel: true, costPrice: true, sellingPrice: true },
  })
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('SC18')
  ws.columns = [
    { header: 'SKU', key: 'sku', width: 18 },
    { header: 'Product', key: 'name', width: 30 },
    { header: 'SOH', key: 'soh', width: 10 },
    { header: 'Min', key: 'min', width: 8 },
    { header: 'Max', key: 'max', width: 8 },
    { header: 'CPU', key: 'cpu', width: 10 },
    { header: 'Unit Price', key: 'price', width: 12 },
    { header: 'COGS', key: 'cogs', width: 14 },
    { header: 'Margin %', key: 'margin', width: 12 },
    { header: 'Value', key: 'value', width: 14 },
    { header: 'Status', key: 'status', width: 16 },
  ]
  styleHeader(ws.getRow(1))
  for (const p of products) {
    const status = getStockStatus(p.quantity, p.minStockLevel, p.maxStockLevel)
    const cost = num(p.costPrice), sell = num(p.sellingPrice)
    const cogs = p.quantity * cost
    const value = p.quantity * sell
    const margin = sell > 0 ? ((sell - cost) / sell) * 100 : 0
    ws.addRow({
      sku: p.sku, name: p.name, soh: p.quantity, min: p.minStockLevel, max: p.maxStockLevel ?? '—',
      cpu: cost.toFixed(2), price: sell.toFixed(2), cogs: cogs.toFixed(2),
      margin: cost > 0 ? `${margin.toFixed(1)}%` : '—', value: value.toFixed(2),
      status,
    })
  }
  ws.autoFilter = { from: 'A1', to: 'K1' }
  return Buffer.from(await wb.xlsx.writeBuffer())
}

// Dashboard sheet — Beg/Rec/End Qty & Value per product per month.
export async function generateDashboardExcel(mode: CalendarMode, useAmharic = false): Promise<Buffer> {
  const [movements, products] = await Promise.all([
    prisma.movement.findMany({
      orderBy: { timestamp: 'asc' },
      include: { product: { select: { id: true, sku: true, name: true, costPrice: true, sellingPrice: true } } },
    }),
    prisma.product.findMany({ select: { id: true, quantity: true, costPrice: true, sellingPrice: true } }),
  ])
  const opening = products.map(p => ({ productId: p.id, qty: 0, unitCost: num(p.costPrice), unitPrice: num(p.sellingPrice) }))
  const rows = rollupReceivedVsSold(movements.map(m => ({
    productId: m.product.id, productName: m.product.name, sku: m.product.sku,
    date: m.timestamp, type: m.type as 'IN' | 'OUT', quantity: m.quantity,
    unitCost: num(m.product.costPrice), unitPrice: num(m.product.sellingPrice),
  })), opening, mode, useAmharic)
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Dashboard')
  ws.columns = [
    { header: 'SKU', key: 'sku', width: 18 },
    { header: 'Product', key: 'name', width: 30 },
    { header: 'Month', key: 'month', width: 18 },
    { header: 'Beg Qty', key: 'bq', width: 12 },
    { header: 'Rec Qty', key: 'rq', width: 12 },
    { header: 'Sold Qty', key: 'sq', width: 12 },
    { header: 'End Qty', key: 'eq', width: 12 },
    { header: 'Beg Value', key: 'bv', width: 14 },
    { header: 'Rec Value', key: 'rv', width: 14 },
    { header: 'Sold Value', key: 'sv', width: 14 },
    { header: 'End Value', key: 'ev', width: 14 },
  ]
  styleHeader(ws.getRow(1))
  for (const r of rows) {
    ws.addRow({
      sku: r.sku, name: r.productName, month: r.monthKey,
      bq: r.beginningQty, rq: r.receivedQty, sq: r.soldQty, eq: r.endingQty,
      bv: r.beginningValue.toFixed(2), rv: r.receivedValue.toFixed(2),
      sv: r.soldValue.toFixed(2), ev: r.endingValue.toFixed(2),
    })
  }
  ws.autoFilter = { from: 'A1', to: 'K1' }
  return Buffer.from(await wb.xlsx.writeBuffer())
}

// Commission sheet (Com 18) — per salesperson, resolved rates.
export async function generateCommissionExcel(mode: CalendarMode, useAmharic = false): Promise<Buffer> {
  const sales = await prisma.sale.findMany({
    where: { status: 'COMPLETED' },
    include: {
      salesperson: { select: { id: true, name: true } },
      items: { include: { product: { select: { id: true, sku: true, name: true } } } },
    },
  })
  const rates = await prisma.commissionRate.findMany()
  const rateRows = rates.map(r => ({
    id: r.id, scope: r.scope, salespersonId: r.salespersonId, productId: r.productId,
    tierFromQty: r.tierFromQty, tierToQty: r.tierToQty, rate: num(r.rate), active: r.active,
  }))

  const agg = new Map<string, { salespersonId: string | null; salespersonName: string; productId: string; productName: string; soldQty: number; preTaxBase: number }>()
  for (const s of sales) {
    for (const it of s.items) {
      const key = `${s.salespersonId ?? 'none'}::${it.product.id}`
      const e = agg.get(key)
      if (e) { e.soldQty += it.quantity; e.preTaxBase += num(it.lineTotal) }
      else agg.set(key, {
        salespersonId: s.salespersonId ?? null,
        salespersonName: s.salesperson?.name ?? 'Unassigned',
        productId: it.product.id, productName: it.product.name,
        soldQty: it.quantity, preTaxBase: num(it.lineTotal),
      })
    }
  }

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Com 18')
  ws.columns = [
    { header: 'Salesperson', key: 'sp', width: 20 },
    { header: 'Product', key: 'prod', width: 30 },
    { header: 'Qty Sold', key: 'qty', width: 12 },
    { header: 'Pre-Tax Base', key: 'base', width: 16 },
    { header: 'Rate %', key: 'rate', width: 10 },
    { header: 'Commission', key: 'comm', width: 16 },
  ]
  styleHeader(ws.getRow(1))
  for (const ctx of [...agg.values()]) {
    const rate = resolveRateForExport(rateRows, ctx)
    const amount = rate ? (ctx.preTaxBase * num(rate.rate)) / 100 : 0
    ws.addRow({
      sp: ctx.salespersonName, prod: ctx.productName, qty: ctx.soldQty,
      base: ctx.preTaxBase.toFixed(2), rate: rate ? num(rate.rate).toFixed(2) : '—',
      comm: amount.toFixed(2),
    })
  }
  ws.autoFilter = { from: 'A1', to: 'F1' }
  return Buffer.from(await wb.xlsx.writeBuffer())
}

function resolveRateForExport(rates: any[], ctx: { salespersonId: string | null; productId: string; soldQty: number }) {
  let best: any = null
  let bestScore = -1
  for (const r of rates) {
    if (!r.active) continue
    if (ctx.soldQty < r.tierFromQty) continue
    if (r.tierToQty != null && ctx.soldQty > r.tierToQty) continue
    const combo = r.scope === 'COMBO' && r.salespersonId === ctx.salespersonId && r.productId === ctx.productId
    const prod = r.scope === 'PRODUCT' && r.productId === ctx.productId
    const sp = r.scope === 'SALESPERSON' && r.salespersonId === ctx.salespersonId
    const glob = r.scope === 'GLOBAL'
    const s = combo ? 100 : prod ? 60 : sp ? 40 : glob ? 20 : -1
    if (s > bestScore) { bestScore = s; best = r }
  }
  return best
}
