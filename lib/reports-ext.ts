// lib/reports-ext.ts
// Additional Excel report generators for the main Reports page.

import ExcelJS from 'exceljs'
import { prisma } from '@/lib/db'
import { formatDate } from '@/lib/utils'
import { getARAgingReport } from '@/lib/credit'

const headerFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }
const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFAFAFA' }, size: 10 }

function styleHeader(row: ExcelJS.Row) {
  row.eachCell(c => { c.fill = headerFill; c.font = headerFont; c.alignment = { vertical: 'middle' } })
  row.height = 22
}

// ─── Inventory Reports ────────────────────────────────────────────────────

export async function generateDeadStockExcel(): Promise<Buffer> {
  const products = await prisma.product.findMany({
    orderBy: { name: 'asc' },
    include: {
      movements: { orderBy: { timestamp: 'desc' }, take: 1, select: { timestamp: true } },
      batches: { where: { status: 'ACTIVE' }, select: { quantity: true } },
    },
  })

  const now = new Date()
  const deadStock = products
    .map(p => {
      const lastMovement = p.movements[0]?.timestamp
      const daysSinceMovement = lastMovement
        ? Math.floor((now.getTime() - new Date(lastMovement).getTime()) / 86400000)
        : Math.floor((now.getTime() - new Date(p.createdAt).getTime()) / 86400000)
      const totalQty = p.batches.reduce((s, b) => s + b.quantity, 0)
      return { ...p, daysSinceMovement, totalQty }
    })
    .filter(p => p.daysSinceMovement >= 90 && p.totalQty > 0)

  const wb = new ExcelJS.Workbook()
  wb.creator = 'WAYU Inventory System'
  wb.created = new Date()

  const ws = wb.addWorksheet('Dead Stock')
  ws.columns = [
    { header: 'SKU',           key: 'sku',      width: 18 },
    { header: 'Product Name',  key: 'name',     width: 35 },
    { header: 'Category',      key: 'category', width: 18 },
    { header: 'Current Qty',   key: 'qty',      width: 14 },
    { header: 'Unit',          key: 'unit',     width: 10 },
    { header: 'Last Movement', key: 'lastMove', width: 22 },
    { header: 'Days Stagnant', key: 'days',     width: 16 },
    { header: 'Est. Value',    key: 'value',    width: 16 },
  ]
  styleHeader(ws.getRow(1))

  deadStock.forEach(p => {
    const value = p.totalQty * Number(p.costPrice ?? 0)
    const row = ws.addRow({
      sku: p.sku, name: p.name, category: p.category,
      qty: p.totalQty, unit: p.unit,
      lastMove: p.movements[0]?.timestamp ? formatDate(new Date(p.movements[0].timestamp)) : formatDate(new Date(p.createdAt)),
      days: p.daysSinceMovement,
      value: value.toFixed(2),
    })
    if (p.daysSinceMovement > 180) row.getCell('days').font = { color: { argb: 'FFEF4444' }, bold: true }
    else row.getCell('days').font = { color: { argb: 'FFF97316' } }
  })

  ws.autoFilter = { from: 'A1', to: 'H1' }
  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

export async function generateMonthlyReceivedExcel(dateFrom: Date, dateTo: Date): Promise<Buffer> {
  const movements = await prisma.movement.findMany({
    where: { type: 'IN', timestamp: { gte: dateFrom, lte: dateTo } },
    orderBy: { timestamp: 'desc' },
    include: {
      product: { select: { name: true, sku: true, category: true } },
      location: { select: { code: true } },
    },
  })

  const grouped: Record<string, { month: string; sku: string; name: string; category: string; totalQty: number; locations: string[] }> = {}
  movements.forEach(m => {
    const month = new Date(m.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    const key = `${month}-${m.product.sku}`
    if (!grouped[key]) {
      grouped[key] = { month, sku: m.product.sku, name: m.product.name, category: m.product.category, totalQty: 0, locations: [] }
    }
    grouped[key].totalQty += m.quantity
    const loc = m.location?.code ?? '—'
    if (!grouped[key].locations.includes(loc)) grouped[key].locations.push(loc)
  })

  const wb = new ExcelJS.Workbook()
  wb.creator = 'WAYU Inventory System'
  wb.created = new Date()

  const ws = wb.addWorksheet('Monthly Received')
  ws.columns = [
    { header: 'Month',        key: 'month',     width: 18 },
    { header: 'SKU',          key: 'sku',       width: 18 },
    { header: 'Product Name', key: 'name',      width: 35 },
    { header: 'Category',     key: 'category',  width: 18 },
    { header: 'Total Qty',    key: 'qty',       width: 14 },
    { header: 'Locations',    key: 'locations', width: 30 },
  ]
  styleHeader(ws.getRow(1))
  Object.values(grouped).forEach(r => ws.addRow(r))
  ws.autoFilter = { from: 'A1', to: 'F1' }

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

export async function generateMonthlySoldExcel(dateFrom: Date, dateTo: Date): Promise<Buffer> {
  const sales = await prisma.sale.findMany({
    where: { status: { in: ['COMPLETED', 'PARTIAL_REFUND'] }, createdAt: { gte: dateFrom, lte: dateTo } },
    include: {
      items: { include: { product: { select: { name: true, sku: true, category: true } } } },
    },
  })

  const grouped: Record<string, { month: string; sku: string; name: string; category: string; totalQty: number; totalRevenue: number }> = {}
  sales.forEach(s => {
    const month = new Date(s.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    s.items.forEach(item => {
      const key = `${month}-${item.product.sku}`
      if (!grouped[key]) {
        grouped[key] = { month, sku: item.product.sku, name: item.product.name, category: item.product.category, totalQty: 0, totalRevenue: 0 }
      }
      grouped[key].totalQty += item.quantity
      grouped[key].totalRevenue += Number(item.lineTotal)
    })
  })

  const wb = new ExcelJS.Workbook()
  wb.creator = 'WAYU Inventory System'
  wb.created = new Date()

  const ws = wb.addWorksheet('Monthly Sold')
  ws.columns = [
    { header: 'Month',        key: 'month',     width: 18 },
    { header: 'SKU',          key: 'sku',       width: 18 },
    { header: 'Product Name', key: 'name',      width: 35 },
    { header: 'Category',     key: 'category',  width: 18 },
    { header: 'Total Qty',    key: 'qty',       width: 14 },
    { header: 'Total Revenue',key: 'revenue',   width: 16 },
  ]
  styleHeader(ws.getRow(1))
  Object.values(grouped).forEach(r => ws.addRow(r))
  ws.autoFilter = { from: 'A1', to: 'F1' }

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

export async function generateAdjustmentHistoryExcel(): Promise<Buffer> {
  const movements = await prisma.movement.findMany({
    where: { type: 'ADJUSTMENT' },
    orderBy: { timestamp: 'desc' },
    include: {
      product: { select: { name: true, sku: true } },
      user: { select: { name: true, email: true } },
      location: { select: { name: true, code: true } },
    },
  })

  const wb = new ExcelJS.Workbook()
  wb.creator = 'WAYU Inventory System'
  wb.created = new Date()

  const ws = wb.addWorksheet('Adjustment History')
  ws.columns = [
    { header: 'Date/Time',    key: 'ts',       width: 22 },
    { header: 'SKU',          key: 'sku',      width: 18 },
    { header: 'Product',      key: 'product',  width: 30 },
    { header: 'Qty',          key: 'qty',      width: 10 },
    { header: 'Location',     key: 'location', width: 18 },
    { header: 'Performed By', key: 'user',     width: 22 },
    { header: 'Notes',        key: 'notes',    width: 40 },
  ]
  styleHeader(ws.getRow(1))
  movements.forEach(m => {
    ws.addRow({
      ts: formatDate(m.timestamp),
      sku: m.product.sku,
      product: m.product.name,
      qty: m.quantity,
      location: m.location ? `${m.location.code} – ${m.location.name}` : '—',
      user: m.user.name ?? m.user.email,
      notes: m.notes ?? '—',
    })
  })
  ws.autoFilter = { from: 'A1', to: 'G1' }

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

export async function generateFastSlowMovingExcel(): Promise<Buffer> {
  const products = await prisma.product.findMany({
    orderBy: { name: 'asc' },
    include: {
      saleItems: {
        where: { sale: { status: { in: ['COMPLETED', 'PARTIAL_REFUND'] } } },
        include: { sale: { select: { createdAt: true } } },
      },
    },
  })

  const now = new Date()
  const data = products.map(p => {
    const totalSold = p.saleItems.reduce((s, i) => s + i.quantity, 0)
    const lastSale = p.saleItems.length > 0
      ? new Date(Math.max(...p.saleItems.map(i => new Date(i.sale.createdAt).getTime())))
      : null
    const daysSinceLastSale = lastSale
      ? Math.floor((now.getTime() - lastSale.getTime()) / 86400000)
      : Math.floor((now.getTime() - new Date(p.createdAt).getTime()) / 86400000)
    return {
      sku: p.sku, name: p.name, category: p.category,
      currentStock: p.quantity, totalSold,
      salesCount: p.saleItems.length, daysSinceLastSale,
      velocity: daysSinceLastSale > 0 ? (totalSold / daysSinceLastSale).toFixed(2) : '—',
    }
  })

  const fastMoving = data.filter(d => d.daysSinceLastSale <= 30 && d.totalSold > 0).sort((a, b) => Number(b.velocity) - Number(a.velocity))
  const slowMoving = data.filter(d => d.daysSinceLastSale > 60 || d.totalSold === 0).sort((a, b) => a.daysSinceLastSale - b.daysSinceLastSale)

  const wb = new ExcelJS.Workbook()
  wb.creator = 'WAYU Inventory System'
  wb.created = new Date()

  const ws1 = wb.addWorksheet('Fast Moving')
  ws1.columns = [
    { header: 'SKU',           key: 'sku',     width: 18 },
    { header: 'Product Name',  key: 'name',    width: 35 },
    { header: 'Category',      key: 'category',width: 18 },
    { header: 'Current Stock', key: 'stock',   width: 14 },
    { header: 'Total Sold',    key: 'sold',    width: 14 },
    { header: 'Sales Count',   key: 'count',   width: 14 },
    { header: 'Days Since Last Sale', key: 'days', width: 20 },
    { header: 'Velocity (units/day)', key: 'velocity', width: 20 },
  ]
  styleHeader(ws1.getRow(1))
  fastMoving.forEach(d => ws1.addRow(d))
  ws1.autoFilter = { from: 'A1', to: 'H1' }

  const ws2 = wb.addWorksheet('Slow Moving')
  ws2.columns = [
    { header: 'SKU',           key: 'sku',     width: 18 },
    { header: 'Product Name',  key: 'name',    width: 35 },
    { header: 'Category',      key: 'category',width: 18 },
    { header: 'Current Stock', key: 'stock',   width: 14 },
    { header: 'Total Sold',    key: 'sold',    width: 14 },
    { header: 'Sales Count',   key: 'count',   width: 14 },
    { header: 'Days Since Last Sale', key: 'days', width: 20 },
    { header: 'Velocity (units/day)', key: 'velocity', width: 20 },
  ]
  styleHeader(ws2.getRow(1))
  slowMoving.forEach(d => ws2.addRow(d))
  ws2.autoFilter = { from: 'A1', to: 'H1' }

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

// ─── Credit Reports ──────────────────────────────────────────────────────

export async function generateCollectionPerformanceExcel(): Promise<Buffer> {
  const cases = await prisma.collectionCase.findMany({
    orderBy: { id: 'desc' },
    include: {
      customer: { select: { name: true } },
      arStatement: { select: { amount: true, paid: true } },
    },
  })

  const wb = new ExcelJS.Workbook()
  wb.creator = 'WAYU Inventory System'
  wb.created = new Date()

  const ws = wb.addWorksheet('Collection Performance')
  ws.columns = [
    { header: 'Case No',     key: 'caseNo',   width: 16 },
    { header: 'Customer',    key: 'customer', width: 24 },
    { header: 'Amount',      key: 'amount',   width: 14 },
    { header: 'Paid',        key: 'paid',     width: 14 },
    { header: 'Outstanding', key: 'outstanding', width: 16 },
    { header: 'Priority',    key: 'priority', width: 12 },
    { header: 'Status',      key: 'status',   width: 14 },
    { header: 'Assigned To', key: 'assigned', width: 18 },
    { header: 'Opened',      key: 'opened',   width: 18 },
    { header: 'Resolved',    key: 'resolved', width: 18 },
  ]
  styleHeader(ws.getRow(1))

  let resolved = 0
  cases.forEach(c => {
    const outstanding = Number(c.arStatement?.amount ?? 0) - Number(c.arStatement?.paid ?? 0)
    const row = ws.addRow({
      caseNo: c.caseNo,
      customer: c.customer?.name ?? '—',
      amount: Number(c.amount).toFixed(2),
      paid: Number(c.arStatement?.paid ?? 0).toFixed(2),
      outstanding: outstanding.toFixed(2),
      priority: c.priority,
      status: c.status,
      assigned: c.assignedTo ?? '—',
      opened: formatDate(c.createdAt),
      resolved: c.resolvedAt ? formatDate(c.resolvedAt) : '—',
    })
    if (c.status === 'RESOLVED') {
      row.getCell('status').font = { color: { argb: 'FF10B981' } }
      resolved++
    }
  })

  ws.autoFilter = { from: 'A1', to: 'J1' }

  const summary = wb.addWorksheet('Summary')
  summary.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 20 },
  ]
  styleHeader(summary.getRow(1))
  summary.addRow({ metric: 'Total Cases', value: cases.length })
  summary.addRow({ metric: 'Resolved Cases', value: resolved })
  summary.addRow({ metric: 'Open Cases', value: cases.length - resolved })
  summary.addRow({ metric: 'Resolution Rate', value: cases.length > 0 ? `${((resolved / cases.length) * 100).toFixed(1)}%` : '0%' })

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

export async function generateCreditExposureExcel(): Promise<Buffer> {
  const [statements, profiles] = await Promise.all([
    prisma.aRStatement.findMany({
      where: { status: { not: 'PAID' } },
      include: {
        customer: { select: { name: true, email: true, phone: true } },
      },
      orderBy: { dueDate: 'asc' },
    }),
    prisma.creditProfile.findMany({
      include: { customer: { select: { name: true, email: true, phone: true } } },
    }),
  ])

  const profileMap = new Map(profiles.map(p => [p.customerId, p]))

  const grouped: Record<string, { customer: any; totalExposure: number; openInvoices: number; creditLimit: number; utilized: number; available: number; riskLevel: string }> = {}
  statements.forEach(s => {
    const key = s.customerId
    if (!grouped[key]) {
      const profile = profileMap.get(key)
      grouped[key] = {
        customer: s.customer,
        totalExposure: 0,
        openInvoices: 0,
        creditLimit: Number(profile?.creditLimit ?? 0),
        utilized: Number(profile?.utilizedCredit ?? 0),
        available: Number(profile?.availableCredit ?? 0),
        riskLevel: profile?.riskLevel ?? 'LOW',
      }
    }
    grouped[key].totalExposure += Number(s.amount) - Number(s.paid)
    grouped[key].openInvoices += 1
  })

  const wb = new ExcelJS.Workbook()
  wb.creator = 'WAYU Inventory System'
  wb.created = new Date()

  const ws = wb.addWorksheet('Credit Exposure')
  ws.columns = [
    { header: 'Customer',      key: 'customer',  width: 24 },
    { header: 'Email',         key: 'email',     width: 28 },
    { header: 'Phone',         key: 'phone',     width: 16 },
    { header: 'Total Exposure',key: 'exposure',  width: 16 },
    { header: 'Open Invoices', key: 'invoices',  width: 14 },
    { header: 'Credit Limit',  key: 'limit',     width: 14 },
    { header: 'Utilized',      key: 'utilized',  width: 14 },
    { header: 'Available',     key: 'available', width: 14 },
    { header: 'Risk Level',    key: 'risk',      width: 12 },
  ]
  styleHeader(ws.getRow(1))
  Object.values(grouped).forEach(r => {
    const row = ws.addRow({
      customer: r.customer?.name ?? '—',
      email: r.customer?.email ?? '—',
      phone: r.customer?.phone ?? '—',
      exposure: r.totalExposure.toFixed(2),
      invoices: r.openInvoices,
      limit: r.creditLimit.toFixed(2),
      utilized: r.utilized.toFixed(2),
      available: r.available.toFixed(2),
      risk: r.riskLevel,
    })
    if (r.riskLevel === 'CRITICAL') row.getCell('risk').font = { color: { argb: 'FFEF4444' }, bold: true }
    else if (r.riskLevel === 'HIGH') row.getCell('risk').font = { color: { argb: 'FFF97316' } }
  })
  ws.autoFilter = { from: 'A1', to: 'I1' }

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

export async function generatePaymentHistoryExcel(): Promise<Buffer> {
  const payments = await prisma.salePayment.findMany({
    orderBy: { id: 'desc' },
    include: {
      sale: { select: { createdAt: true, total: true, receiptNumber: true, customer: { select: { name: true } } } },
    },
  })

  const wb = new ExcelJS.Workbook()
  wb.creator = 'WAYU Inventory System'
  wb.created = new Date()

  const ws = wb.addWorksheet('Payment History')
  ws.columns = [
    { header: 'Date',       key: 'date',     width: 18 },
    { header: 'Receipt No', key: 'receipt',  width: 18 },
    { header: 'Customer',   key: 'customer', width: 24 },
    { header: 'Method',     key: 'method',   width: 14 },
    { header: 'Amount',     key: 'amount',   width: 14 },
    { header: 'Reference',  key: 'reference',width: 18 },
    { header: 'Sale Total', key: 'total',    width: 14 },
  ]
  styleHeader(ws.getRow(1))
  payments.forEach(p => {
    const row = ws.addRow({
      date: formatDate(p.sale.createdAt),
      receipt: p.sale.receiptNumber,
      customer: p.sale.customer?.name ?? '—',
      method: p.method,
      amount: Number(p.amount).toFixed(2),
      reference: p.reference ?? '—',
      total: Number(p.sale.total).toFixed(2),
    })
    if (p.method === 'CREDIT') row.getCell('method').font = { color: { argb: 'FF3B82F6' } }
    else if (p.method === 'CASH') row.getCell('method').font = { color: { argb: 'FF10B981' } }
    else if (p.method === 'BANK_TRANSFER') row.getCell('method').font = { color: { argb: 'FFF59E0B' } }
  })
  ws.autoFilter = { from: 'A1', to: 'G1' }

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

export async function generateDailyCollectionExcel(dateFrom: Date, dateTo: Date): Promise<Buffer> {
  const inflows = await prisma.cashInflow.findMany({
    where: { receivedAt: { gte: dateFrom, lte: dateTo } },
    orderBy: { receivedAt: 'desc' },
    include: {
      bankAccount: { select: { bankName: true, accountNumber: true } },
      createdBy: { select: { name: true } },
    },
  })

  const grouped: Record<string, { date: string; totalCash: number; totalBank: number; totalSales: number; totalOther: number; transactions: number }> = {}

  inflows.forEach(inflow => {
    const date = new Date(inflow.receivedAt).toISOString().split('T')[0]
    if (!grouped[date]) {
      grouped[date] = { date, totalCash: 0, totalBank: 0, totalSales: 0, totalOther: 0, transactions: 0 }
    }
    grouped[date].transactions += 1
    const amount = Number(inflow.amount)
    if (inflow.category === 'SALES') {
      if (inflow.bankAccountId) grouped[date].totalBank += amount
      else grouped[date].totalCash += amount
      grouped[date].totalSales += amount
    } else {
      grouped[date].totalOther += amount
    }
  })

  const rows = Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date))

  const wb = new ExcelJS.Workbook()
  wb.creator = 'WAYU Inventory System'
  wb.created = new Date()

  const ws = wb.addWorksheet('Daily Collection')
  ws.columns = [
    { header: 'Date',          key: 'date',    width: 14 },
    { header: 'Transactions',  key: 'txns',    width: 14 },
    { header: 'Cash',          key: 'cash',    width: 14 },
    { header: 'Bank Transfer', key: 'bank',    width: 16 },
    { header: 'Total Sales',   key: 'sales',   width: 16 },
    { header: 'Other',         key: 'other',   width: 14 },
    { header: 'Grand Total',   key: 'total',   width: 16 },
  ]
  styleHeader(ws.getRow(1))
  rows.forEach(r => {
    const row = ws.addRow({
      date: r.date,
      txns: r.transactions,
      cash: r.totalCash.toFixed(2),
      bank: r.totalBank.toFixed(2),
      sales: r.totalSales.toFixed(2),
      other: r.totalOther.toFixed(2),
      total: (r.totalCash + r.totalBank + r.totalOther).toFixed(2),
    })
    row.getCell('total').font = { bold: true }
  })
  ws.autoFilter = { from: 'A1', to: 'G1' }

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

export async function generateOutstandingReceivableExcel(): Promise<Buffer> {
  const statements = await prisma.aRStatement.findMany({
    where: { status: { not: 'PAID' } },
    include: { customer: { select: { name: true, email: true, phone: true } }, sale: { select: { receiptNumber: true } } },
    orderBy: { dueDate: 'asc' },
  })

  const wb = new ExcelJS.Workbook()
  wb.creator = 'WAYU Inventory System'
  wb.created = new Date()

  const ws = wb.addWorksheet('Outstanding Receivables')
  ws.columns = [
    { header: 'Customer',   key: 'customer', width: 24 },
    { header: 'Invoice No', key: 'invoice',  width: 18 },
    { header: 'Receipt No', key: 'receipt',  width: 18 },
    { header: 'Issued',     key: 'issued',   width: 18 },
    { header: 'Due Date',   key: 'due',      width: 18 },
    { header: 'Amount',     key: 'amount',   width: 14 },
    { header: 'Paid',       key: 'paid',     width: 14 },
    { header: 'Balance',    key: 'balance',  width: 14 },
    { header: 'Status',     key: 'status',   width: 14 },
  ]
  styleHeader(ws.getRow(1))
  statements.forEach(s => {
    const balance = Number(s.amount) - Number(s.paid)
    const row = ws.addRow({
      customer: s.customer?.name ?? '—',
      invoice: s.invoiceNo,
      receipt: s.sale?.receiptNumber ?? '—',
      issued: formatDate(s.issuedAt),
      due: s.dueDate ? formatDate(new Date(s.dueDate)) : '—',
      amount: Number(s.amount).toFixed(2),
      paid: Number(s.paid).toFixed(2),
      balance: balance.toFixed(2),
      status: s.status,
    })
    if (s.status === 'OVERDUE') row.getCell('status').font = { color: { argb: 'FFEF4444' }, bold: true }
    else if (s.status === 'OPEN') row.getCell('status').font = { color: { argb: 'FFF59E0B' } }
  })
  ws.autoFilter = { from: 'A1', to: 'I1' }

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

export async function generateAgingAnalysisExcel(): Promise<Buffer> {
  const { report, totals } = await getARAgingReport()

  const wb = new ExcelJS.Workbook()
  wb.creator = 'WAYU Inventory System'
  wb.created = new Date()

  const ws = wb.addWorksheet('Aging Analysis')
  ws.columns = [
    { header: 'Customer',   key: 'name',   width: 24 },
    { header: 'Current',    key: 'current',width: 14 },
    { header: '31-60 Days', key: 'b31',    width: 14 },
    { header: '61-90 Days', key: 'b61',    width: 14 },
    { header: '90+ Days',   key: 'b90',    width: 14 },
    { header: 'Total',      key: 'total',  width: 14 },
    { header: 'Terms',      key: 'terms',  width: 12 },
    { header: 'Risk Level', key: 'risk',   width: 12 },
  ]
  styleHeader(ws.getRow(1))
  report.forEach(r => {
    const row = ws.addRow({
      name: r.name,
      current: Number(r.current).toFixed(2),
      b31: Number(r.bucket31to60).toFixed(2),
      b61: Number(r.bucket61to90).toFixed(2),
      b90: Number(r.bucket90plus).toFixed(2),
      total: Number(r.total).toFixed(2),
      terms: `${r.terms} days`,
      risk: r.riskLevel,
    })
    if (r.riskLevel === 'CRITICAL') row.getCell('risk').font = { color: { argb: 'FFEF4444' }, bold: true }
    else if (r.riskLevel === 'HIGH') row.getCell('risk').font = { color: { argb: 'FFF97316' } }
  })

  const totalsRow = ws.addRow({
    name: 'TOTALS',
    current: Number(totals.current).toFixed(2),
    b31: Number(totals.bucket31to60).toFixed(2),
    b61: Number(totals.bucket61to90).toFixed(2),
    b90: Number(totals.bucket90plus).toFixed(2),
    total: Number(totals.total).toFixed(2),
    terms: '—', risk: '—',
  })
  totalsRow.font = { bold: true }
  totalsRow.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } } })
  ws.autoFilter = { from: 'A1', to: 'H1' }

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

export async function generateCustomerCreditSummaryExcel(): Promise<Buffer> {
  const profiles = await prisma.creditProfile.findMany({
    include: { customer: { select: { name: true, email: true, phone: true } } },
    orderBy: { id: 'desc' },
  })

  const wb = new ExcelJS.Workbook()
  wb.creator = 'WAYU Inventory System'
  wb.created = new Date()

  const ws = wb.addWorksheet('Customer Credit Summary')
  ws.columns = [
    { header: 'Customer',      key: 'name',     width: 24 },
    { header: 'Email',         key: 'email',    width: 28 },
    { header: 'Phone',         key: 'phone',    width: 16 },
    { header: 'Credit Limit',  key: 'limit',    width: 14 },
    { header: 'Utilized',      key: 'utilized', width: 14 },
    { header: 'Available',     key: 'available',width: 14 },
    { header: 'Utilization %', key: 'utilPct',  width: 14 },
    { header: 'Risk Level',    key: 'risk',     width: 12 },
    { header: 'Payment Terms', key: 'terms',    width: 14 },
    { header: 'Status',        key: 'status',   width: 12 },
  ]
  styleHeader(ws.getRow(1))
  profiles.forEach(p => {
    const utilPct = Number(p.creditLimit) > 0 ? Math.round((Number(p.utilizedCredit) / Number(p.creditLimit)) * 100) : 0
    const row = ws.addRow({
      name: p.customer.name,
      email: p.customer.email ?? '—',
      phone: p.customer.phone ?? '—',
      limit: Number(p.creditLimit).toFixed(2),
      utilized: Number(p.utilizedCredit).toFixed(2),
      available: Number(p.availableCredit).toFixed(2),
      utilPct: `${utilPct}%`,
      risk: p.riskLevel,
      terms: `${p.paymentTerms} days`,
      status: p.isActive ? 'Active' : 'Blocked',
    })
    if (p.riskLevel === 'CRITICAL') row.getCell('risk').font = { color: { argb: 'FFEF4444' }, bold: true }
    else if (p.riskLevel === 'HIGH') row.getCell('risk').font = { color: { argb: 'FFF97316' } }
  })
  ws.autoFilter = { from: 'A1', to: 'J1' }

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

export async function generateOverdueCustomersExcel(): Promise<Buffer> {
  const { report } = await getARAgingReport()
  const overdue = report.filter(r => (Number(r.bucket31to60) + Number(r.bucket61to90) + Number(r.bucket90plus)) > 0)

  const wb = new ExcelJS.Workbook()
  wb.creator = 'WAYU Inventory System'
  wb.created = new Date()

  const ws = wb.addWorksheet('Overdue Customers')
  ws.columns = [
    { header: 'Customer',      key: 'name',  width: 24 },
    { header: '31-60 Days',    key: 'b31',   width: 14 },
    { header: '61-90 Days',    key: 'b61',   width: 14 },
    { header: '90+ Days',      key: 'b90',   width: 14 },
    { header: 'Total Overdue', key: 'total', width: 14 },
    { header: 'Risk Level',    key: 'risk',  width: 12 },
  ]
  styleHeader(ws.getRow(1))
  overdue.forEach(r => {
    const totalOverdue = Number(r.bucket31to60) + Number(r.bucket61to90) + Number(r.bucket90plus)
    const row = ws.addRow({
      name: r.name,
      b31: Number(r.bucket31to60).toFixed(2),
      b61: Number(r.bucket61to90).toFixed(2),
      b90: Number(r.bucket90plus).toFixed(2),
      total: totalOverdue.toFixed(2),
      risk: r.riskLevel,
    })
    if (r.riskLevel === 'CRITICAL') row.getCell('risk').font = { color: { argb: 'FFEF4444' }, bold: true }
    else if (r.riskLevel === 'HIGH') row.getCell('risk').font = { color: { argb: 'FFF97316' } }
  })
  ws.autoFilter = { from: 'A1', to: 'F1' }

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

// ─── Sales Report Generators ──────────────────────────────────────────────

function groupSalesByPeriod(sales: any[], period: 'day' | 'week' | 'month') {
  const grouped: Record<string, { label: string; totalSales: number; totalItems: number; totalProfit: number; transactions: number }> = {}

  sales.forEach(s => {
    const d = new Date(s.createdAt)
    let label: string
    if (period === 'day') label = d.toISOString().split('T')[0]
    else if (period === 'week') {
      const start = new Date(d)
      start.setDate(d.getDate() - d.getDay())
      label = `Week of ${start.toISOString().split('T')[0]}`
    } else label = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })

    if (!grouped[label]) grouped[label] = { label, totalSales: 0, totalItems: 0, totalProfit: 0, transactions: 0 }
    grouped[label].totalSales += Number(s.total)
    grouped[label].totalItems += s.items?.length ?? 0
    grouped[label].totalProfit += Number(s.profit ?? 0)
    grouped[label].transactions += 1
  })

  return Object.values(grouped).sort((a, b) => b.label.localeCompare(a.label))
}

export async function generateSalesPeriodExcel(dateFrom: Date, dateTo: Date, period: 'day' | 'week' | 'month'): Promise<Buffer> {
  const sales = await prisma.sale.findMany({
    where: { status: { in: ['COMPLETED', 'PARTIAL_REFUND'] }, createdAt: { gte: dateFrom, lte: dateTo } },
    include: { items: true },
  })

  const rows = groupSalesByPeriod(sales, period)

  const wb = new ExcelJS.Workbook()
  wb.creator = 'WAYU Inventory System'
  wb.created = new Date()

  const title = period === 'day' ? 'Daily Sales' : period === 'week' ? 'Weekly Sales' : 'Monthly Sales'
  const ws = wb.addWorksheet(title)
  ws.columns = [
    { header: 'Period',        key: 'period',   width: 22 },
    { header: 'Transactions',  key: 'txns',     width: 14 },
    { header: 'Items Sold',    key: 'items',    width: 14 },
    { header: 'Total Revenue', key: 'revenue',  width: 16 },
    { header: 'Gross Profit',  key: 'profit',   width: 16 },
  ]
  styleHeader(ws.getRow(1))
  rows.forEach(r => ws.addRow(r))
  ws.autoFilter = { from: 'A1', to: 'E1' }

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

export async function generateProductSalesAnalysisExcel(dateFrom: Date, dateTo: Date): Promise<Buffer> {
  const saleItems = await prisma.saleItem.findMany({
    where: { sale: { status: { in: ['COMPLETED', 'PARTIAL_REFUND'] }, createdAt: { gte: dateFrom, lte: dateTo } } },
    include: {
      product: { select: { name: true, sku: true, category: true, costPrice: true, sellingPrice: true } },
      sale: { select: { createdAt: true } },
    },
  })

  const grouped: Record<string, any> = {}
  saleItems.forEach(item => {
    const key = item.productId
    if (!grouped[key]) {
      grouped[key] = {
        sku: item.product.sku,
        name: item.product.name,
        category: item.product.category,
        totalQty: 0,
        totalRevenue: 0,
        totalCost: 0,
        transactions: 0,
      }
    }
    grouped[key].totalQty += item.quantity
    grouped[key].totalRevenue += Number(item.lineTotal)
    grouped[key].totalCost += Number(item.unitCost) * item.quantity
    grouped[key].transactions += 1
  })

  const rows = Object.values(grouped).map(g => ({
    ...g,
    profit: (g.totalRevenue - g.totalCost).toFixed(2),
    margin: g.totalRevenue > 0 ? `${((g.totalRevenue - g.totalCost) / g.totalRevenue * 100).toFixed(1)}%` : '0%',
  }))

  const wb = new ExcelJS.Workbook()
  wb.creator = 'WAYU Inventory System'
  wb.created = new Date()

  const ws = wb.addWorksheet('Product Sales Analysis')
  ws.columns = [
    { header: 'SKU',          key: 'sku',       width: 18 },
    { header: 'Product Name', key: 'name',      width: 35 },
    { header: 'Category',     key: 'category',  width: 18 },
    { header: 'Qty Sold',     key: 'qty',       width: 12 },
    { header: 'Transactions', key: 'txns',      width: 14 },
    { header: 'Revenue',      key: 'revenue',   width: 16 },
    { header: 'Cost',         key: 'cost',      width: 14 },
    { header: 'Profit',       key: 'profit',    width: 14 },
    { header: 'Margin %',     key: 'margin',    width: 12 },
  ]
  styleHeader(ws.getRow(1))
  rows.forEach(r => ws.addRow(r))
  ws.autoFilter = { from: 'A1', to: 'I1' }

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

export async function generateCustomerSalesAnalysisExcel(dateFrom: Date, dateTo: Date): Promise<Buffer> {
  const sales = await prisma.sale.findMany({
    where: { status: { in: ['COMPLETED', 'PARTIAL_REFUND'] }, createdAt: { gte: dateFrom, lte: dateTo }, customerId: { not: null } },
    include: {
      customer: { select: { name: true, email: true, phone: true } },
      items: true,
      payments: true,
    },
  })

  const grouped: Record<string, any> = {}
  sales.forEach(s => {
    const key = s.customerId!
    if (!grouped[key]) {
      grouped[key] = {
        customerName: s.customer?.name ?? '—',
        email: s.customer?.email ?? '—',
        phone: s.customer?.phone ?? '—',
        totalSales: 0,
        totalPaid: 0,
        totalProfit: 0,
        transactions: 0,
      }
    }
    grouped[key].totalSales += Number(s.total)
    grouped[key].totalPaid += s.payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0)
    grouped[key].totalProfit += Number(s.profit ?? 0)
    grouped[key].transactions += 1
  })

  const rows = Object.values(grouped).map(g => ({
    ...g,
    avgOrderValue: g.transactions > 0 ? (g.totalSales / g.transactions) : 0,
  }))

  const wb = new ExcelJS.Workbook()
  wb.creator = 'WAYU Inventory System'
  wb.created = new Date()

  const ws = wb.addWorksheet('Customer Sales Analysis')
  ws.columns = [
    { header: 'Customer',      key: 'name',      width: 24 },
    { header: 'Email',         key: 'email',     width: 28 },
    { header: 'Phone',         key: 'phone',     width: 16 },
    { header: 'Transactions',  key: 'txns',      width: 14 },
    { header: 'Total Sales',   key: 'sales',     width: 16 },
    { header: 'Total Paid',    key: 'paid',      width: 16 },
    { header: 'Avg Order',     key: 'avg',       width: 14 },
    { header: 'Gross Profit',  key: 'profit',    width: 16 },
  ]
  styleHeader(ws.getRow(1))
  rows.forEach(r => ws.addRow({
    name: r.customerName,
    email: r.email,
    phone: r.phone,
    txns: r.transactions,
    sales: r.totalSales.toFixed(2),
    paid: r.totalPaid.toFixed(2),
    avg: r.avgOrderValue.toFixed(2),
    profit: r.totalProfit.toFixed(2),
  }))
  ws.autoFilter = { from: 'A1', to: 'H1' }

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

export async function generateSalesTrendExcel(dateFrom: Date, dateTo: Date): Promise<Buffer> {
  const sales = await prisma.sale.findMany({
    where: { status: { in: ['COMPLETED', 'PARTIAL_REFUND'] }, createdAt: { gte: dateFrom, lte: dateTo } },
    include: { items: true },
  })

  const daily: Record<string, { revenue: number; profit: number; transactions: number }> = {}
  sales.forEach(s => {
    const day = new Date(s.createdAt).toISOString().split('T')[0]
    if (!daily[day]) daily[day] = { revenue: 0, profit: 0, transactions: 0 }
    daily[day].revenue += Number(s.total)
    daily[day].profit += Number(s.profit ?? 0)
    daily[day].transactions += 1
  })

  const rows = Object.entries(daily).map(([day, d]) => ({ day, ...d })).sort((a, b) => a.day.localeCompare(b.day))

  const wb = new ExcelJS.Workbook()
  wb.creator = 'WAYU Inventory System'
  wb.created = new Date()

  const ws = wb.addWorksheet('Sales Trend')
  ws.columns = [
    { header: 'Date',          key: 'date',       width: 14 },
    { header: 'Transactions',  key: 'txns',       width: 14 },
    { header: 'Revenue',       key: 'revenue',    width: 16 },
    { header: 'Gross Profit',  key: 'profit',     width: 16 },
  ]
  styleHeader(ws.getRow(1))
  rows.forEach(r => ws.addRow(r))
  ws.autoFilter = { from: 'A1', to: 'D1' }

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

export async function generateTopSellingProductsExcel(dateFrom: Date, dateTo: Date): Promise<Buffer> {
  const saleItems = await prisma.saleItem.findMany({
    where: { sale: { status: { in: ['COMPLETED', 'PARTIAL_REFUND'] }, createdAt: { gte: dateFrom, lte: dateTo } } },
    include: {
      product: { select: { name: true, sku: true, category: true } },
    },
  })

  const grouped: Record<string, { sku: string; name: string; category: string; totalQty: number; totalRevenue: number }> = {}
  saleItems.forEach(item => {
    const key = item.productId
    if (!grouped[key]) {
      grouped[key] = { sku: item.product.sku, name: item.product.name, category: item.product.category, totalQty: 0, totalRevenue: 0 }
    }
    grouped[key].totalQty += item.quantity
    grouped[key].totalRevenue += Number(item.lineTotal)
  })

  const rows = Object.values(grouped).sort((a, b) => b.totalRevenue - a.totalRevenue)

  const wb = new ExcelJS.Workbook()
  wb.creator = 'WAYU Inventory System'
  wb.created = new Date()

  const ws = wb.addWorksheet('Top Selling Products')
  ws.columns = [
    { header: 'SKU',          key: 'sku',       width: 18 },
    { header: 'Product Name', key: 'name',      width: 35 },
    { header: 'Category',     key: 'category',  width: 18 },
    { header: 'Qty Sold',     key: 'qty',       width: 12 },
    { header: 'Revenue',      key: 'revenue',   width: 16 },
  ]
  styleHeader(ws.getRow(1))
  rows.forEach(r => ws.addRow(r))
  ws.autoFilter = { from: 'A1', to: 'E1' }

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

export async function generateSalespersonPerformanceExcel(dateFrom: Date, dateTo: Date): Promise<Buffer> {
  const sales = await prisma.sale.findMany({
    where: { status: { in: ['COMPLETED', 'PARTIAL_REFUND'] }, createdAt: { gte: dateFrom, lte: dateTo }, salespersonId: { not: null } },
    include: {
      salesperson: { select: { name: true, email: true } },
      items: true,
      payments: true,
    },
  })

  const grouped: Record<string, { name: string; email: string; totalSales: number; totalProfit: number; transactions: number; totalCommission: number }> = {}
  sales.forEach(s => {
    const key = s.salespersonId!
    if (!grouped[key]) {
      grouped[key] = { name: s.salesperson?.name ?? '—', email: s.salesperson?.email ?? '—', totalSales: 0, totalProfit: 0, transactions: 0, totalCommission: 0 }
    }
    grouped[key].totalSales += Number(s.total)
    grouped[key].totalProfit += Number(s.profit ?? 0)
    grouped[key].transactions += 1
    const commission = s.items.reduce((sum: number, item: any) => sum + Number(item.commissionAmount ?? 0), 0)
    grouped[key].totalCommission += commission
  })

  const rows = Object.values(grouped).map(g => ({
    ...g,
    avgSaleValue: g.transactions > 0 ? (g.totalSales / g.transactions) : 0,
  })).sort((a, b) => b.totalSales - a.totalSales)

  const wb = new ExcelJS.Workbook()
  wb.creator = 'WAYU Inventory System'
  wb.created = new Date()

  const ws = wb.addWorksheet('Salesperson Performance')
  ws.columns = [
    { header: 'Salesperson',   key: 'name',       width: 24 },
    { header: 'Email',         key: 'email',      width: 28 },
    { header: 'Transactions',  key: 'txns',       width: 14 },
    { header: 'Total Sales',   key: 'sales',      width: 16 },
    { header: 'Avg Sale',      key: 'avg',        width: 14 },
    { header: 'Gross Profit',  key: 'profit',     width: 16 },
    { header: 'Commission',    key: 'commission', width: 16 },
  ]
  styleHeader(ws.getRow(1))
  rows.forEach(r => ws.addRow({
    name: r.name,
    email: r.email,
    txns: r.transactions,
    sales: r.totalSales.toFixed(2),
    avg: r.avgSaleValue.toFixed(2),
    profit: r.totalProfit.toFixed(2),
    commission: r.totalCommission.toFixed(2),
  }))
  ws.autoFilter = { from: 'A1', to: 'G1' }

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

// ─── Bundled Report Generators ────────────────────────────────────────────

export async function generateInventoryReportsExcel(dateFrom: Date, dateTo: Date): Promise<Buffer> {
  const [products, movements, batches, valuations] = await Promise.all([
    prisma.product.findMany({
      orderBy: { name: 'asc' },
      include: {
        locationInventory: { include: { location: true } },
        batches: { where: { status: 'ACTIVE' }, orderBy: { expiryDate: 'asc' } },
      },
    }),
    prisma.movement.findMany({
      orderBy: { timestamp: 'desc' },
      take: 500,
      include: {
        product: { select: { name: true, sku: true } },
        user: { select: { name: true, email: true } },
        location: { select: { name: true, code: true } },
        batch: { select: { batchNumber: true, expiryDate: true } },
      },
    }),
    prisma.batch.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { expiryDate: 'asc' },
      include: {
        product: { select: { name: true, sku: true } },
        location: { select: { name: true } },
      },
    }),
    prisma.product.findMany({
      orderBy: { name: 'asc' },
      select: {
        sku: true, name: true, category: true, quantity: true, unit: true,
        costPrice: true, sellingPrice: true,
      },
    }),
  ])

  const wb = new ExcelJS.Workbook()
  wb.creator = 'WAYU Inventory System'
  wb.created = new Date()

  const headerFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }
  const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFAFAFA' }, size: 10 }
  function styleHeader(row: ExcelJS.Row) {
    row.eachCell(cell => { cell.fill = headerFill; cell.font = headerFont; cell.alignment = { vertical: 'middle' } })
    row.height = 22
  }

  // Sheet 1: Current Stock
  const ws1 = wb.addWorksheet('Current Stock')
  ws1.columns = [
    { header: 'SKU', key: 'sku', width: 18 }, { header: 'Product Name', key: 'name', width: 35 },
    { header: 'Category', key: 'category', width: 18 }, { header: 'Total Qty', key: 'qty', width: 12 },
    { header: 'Min Level', key: 'min', width: 12 }, { header: 'Unit', key: 'unit', width: 10 },
    { header: 'Status', key: 'status', width: 16 }, { header: 'Nearest Expiry', key: 'expiry', width: 20 },
  ]
  styleHeader(ws1.getRow(1))
  products.forEach(p => {
    const nearestExpiry = p.batches[0]?.expiryDate
    const status = p.quantity === 0 ? 'OUT OF STOCK' : p.quantity <= p.minStockLevel ? 'LOW STOCK' : 'OK'
    const row = ws1.addRow({
      sku: p.sku, name: p.name, category: p.category, qty: p.quantity, min: p.minStockLevel, unit: p.unit,
      status, expiry: nearestExpiry ? formatDate(nearestExpiry) : '—',
    })
    if (status === 'OUT OF STOCK') row.getCell('status').font = { color: { argb: 'FFEF4444' }, bold: true }
    else if (status === 'LOW STOCK') row.getCell('status').font = { color: { argb: 'FFF59E0B' }, bold: true }
    else row.getCell('status').font = { color: { argb: 'FF10B981' } }
  })
  ws1.autoFilter = { from: 'A1', to: 'H1' }

  // Sheet 2: Stock Valuation
  const ws2 = wb.addWorksheet('Stock Valuation')
  ws2.columns = [
    { header: 'SKU', key: 'sku', width: 18 }, { header: 'Product Name', key: 'name', width: 30 },
    { header: 'Category', key: 'category', width: 18 }, { header: 'Qty', key: 'qty', width: 10 },
    { header: 'Unit', key: 'unit', width: 10 }, { header: 'Cost Price', key: 'costPrice', width: 14 },
    { header: 'Selling Price', key: 'sellingPrice', width: 14 }, { header: 'Profit / Unit', key: 'profitUnit', width: 14 },
    { header: 'Margin %', key: 'margin', width: 12 }, { header: 'Inventory Cost', key: 'invCost', width: 16 },
    { header: 'Inventory Value', key: 'invValue', width: 16 }, { header: 'Est. Profit', key: 'estProfit', width: 16 },
  ]
  styleHeader(ws2.getRow(1))
  let totalCost = 0, totalValue = 0, totalProfit = 0
  valuations.forEach(p => {
    const cost = Number(p.costPrice ?? 0); const sell = Number(p.sellingPrice ?? 0)
    const profit = sell - cost; const margin = cost > 0 ? ((profit / cost) * 100) : 0
    const invCost = p.quantity * cost; const invVal = p.quantity * sell; const estProfit = invVal - invCost
    totalCost += invCost; totalValue += invVal; totalProfit += estProfit
    const row = ws2.addRow({
      sku: p.sku, name: p.name, category: p.category, qty: p.quantity, unit: p.unit,
      costPrice: cost > 0 ? cost.toFixed(2) : '—', sellingPrice: sell > 0 ? sell.toFixed(2) : '—',
      profitUnit: (cost > 0 && sell > 0) ? profit.toFixed(2) : '—',
      margin: (cost > 0 && sell > 0) ? `${margin.toFixed(1)}%` : '—',
      invCost: cost > 0 ? invCost.toFixed(2) : '—', invValue: sell > 0 ? invVal.toFixed(2) : '—',
      estProfit: (cost > 0 && sell > 0) ? estProfit.toFixed(2) : '—',
    })
    if (cost > 0 && sell > 0) {
      const marginCell = row.getCell('margin')
      if (margin >= 20) marginCell.font = { color: { argb: 'FF10B981' } }
      else if (margin >= 10) marginCell.font = { color: { argb: 'FFF59E0B' } }
      else marginCell.font = { color: { argb: 'FFEF4444' } }
    }
  })
  const totalsRow = ws2.addRow({
    name: 'TOTALS', qty: valuations.reduce((s, p) => s + p.quantity, 0),
    invCost: totalCost.toFixed(2), invValue: totalValue.toFixed(2), estProfit: totalProfit.toFixed(2),
  })
  totalsRow.font = { bold: true }
  totalsRow.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } } })
  ws2.autoFilter = { from: 'A1', to: 'L1' }

  // Sheet 3: Expiry Tracker
  const ws3 = wb.addWorksheet('Expiry Tracker')
  ws3.columns = [
    { header: 'SKU', key: 'sku', width: 18 }, { header: 'Product', key: 'product', width: 30 },
    { header: 'Batch No.', key: 'batch', width: 20 }, { header: 'Qty Remaining', key: 'qty', width: 16 },
    { header: 'Location', key: 'location', width: 20 }, { header: 'Received', key: 'received', width: 20 },
    { header: 'Expiry Date', key: 'expiry', width: 20 }, { header: 'Days Remaining', key: 'days', width: 16 },
    { header: 'Alert', key: 'alert', width: 14 },
  ]
  styleHeader(ws3.getRow(1))
  const now = new Date()
  batches.forEach(b => {
    const daysLeft = Math.floor((b.expiryDate.getTime() - now.getTime()) / 86400000)
    const alert = daysLeft < 0 ? 'EXPIRED' : daysLeft <= 30 ? 'CRITICAL' : daysLeft <= 90 ? 'WARNING' : 'OK'
    const row = ws3.addRow({
      sku: b.product.sku, product: b.product.name, batch: b.batchNumber, qty: b.quantity,
      location: b.location.name, received: formatDate(b.receivedDate), expiry: formatDate(b.expiryDate), days: daysLeft, alert,
    })
    const alertCell = row.getCell('alert')
    if (alert === 'EXPIRED') alertCell.font = { color: { argb: 'FFEF4444' }, bold: true }
    else if (alert === 'CRITICAL') alertCell.font = { color: { argb: 'FFF97316' }, bold: true }
    else if (alert === 'WARNING') alertCell.font = { color: { argb: 'FFF59E0B' } }
    else alertCell.font = { color: { argb: 'FF10B981' } }
  })
  ws3.autoFilter = { from: 'A1', to: 'I1' }

  // Sheet 4: Low Stock Alerts
  const ws4 = wb.addWorksheet('Low Stock Alerts')
  ws4.columns = [
    { header: 'SKU', key: 'sku', width: 18 }, { header: 'Product', key: 'name', width: 35 },
    { header: 'Current', key: 'qty', width: 12 }, { header: 'Min Level', key: 'min', width: 12 },
    { header: 'Deficit', key: 'deficit', width: 12 }, { header: 'Unit', key: 'unit', width: 10 },
  ]
  styleHeader(ws4.getRow(1))
  products.filter(p => p.quantity <= p.minStockLevel).forEach(p => {
    ws4.addRow({ sku: p.sku, name: p.name, qty: p.quantity, min: p.minStockLevel, deficit: p.minStockLevel - p.quantity, unit: p.unit })
  })

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

export async function generateCreditReportsExcel(dateFrom: Date, dateTo: Date): Promise<Buffer> {
  const [statements, profiles, cases] = await Promise.all([
    prisma.aRStatement.findMany({
      where: { status: { not: 'PAID' } },
      include: { customer: { select: { name: true, email: true, phone: true } }, sale: { select: { receiptNumber: true } } },
      orderBy: { dueDate: 'asc' },
    }),
    prisma.creditProfile.findMany({
      include: { customer: { select: { name: true, email: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.collectionCase.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true } },
        arStatement: { select: { amount: true, paid: true } },
      },
    }),
  ])

  const { report: agingReport, totals: agingTotals } = await getARAgingReport()
  const overdueCustomers = agingReport.filter(r => (Number(r.bucket31to60) + Number(r.bucket61to90) + Number(r.bucket90plus)) > 0)

  const payments = await prisma.salePayment.findMany({
    where: { sale: { status: { in: ['COMPLETED', 'PARTIAL_REFUND'] }, createdAt: { gte: dateFrom, lte: dateTo } } },
    orderBy: { id: 'desc' },
    include: { sale: { select: { createdAt: true, total: true, receiptNumber: true, customer: { select: { name: true } } } } },
  })

  const wb = new ExcelJS.Workbook()
  wb.creator = 'WAYU Inventory System'
  wb.created = new Date()

  const headerFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }
  const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFAFAFA' }, size: 10 }
  function styleHeader(row: ExcelJS.Row) {
    row.eachCell(c => { c.fill = headerFill; c.font = headerFont; c.alignment = { vertical: 'middle' } })
    row.height = 22
  }

  // Sheet 1: Outstanding Receivables
  const ws1 = wb.addWorksheet('Outstanding Receivables')
  ws1.columns = [
    { header: 'Customer', key: 'customer', width: 24 }, { header: 'Invoice No', key: 'invoice', width: 18 },
    { header: 'Receipt No', key: 'receipt', width: 18 }, { header: 'Issued', key: 'issued', width: 18 },
    { header: 'Due Date', key: 'due', width: 18 }, { header: 'Amount', key: 'amount', width: 14 },
    { header: 'Paid', key: 'paid', width: 14 }, { header: 'Balance', key: 'balance', width: 14 },
    { header: 'Status', key: 'status', width: 14 },
  ]
  styleHeader(ws1.getRow(1))
  statements.forEach(s => {
    const balance = Number(s.amount) - Number(s.paid)
    const row = ws1.addRow({
      customer: s.customer?.name ?? '—', invoice: s.invoiceNo, receipt: s.sale?.receiptNumber ?? '—',
      issued: formatDate(s.issuedAt), due: s.dueDate ? formatDate(new Date(s.dueDate)) : '—',
      amount: Number(s.amount).toFixed(2), paid: Number(s.paid).toFixed(2), balance: balance.toFixed(2), status: s.status,
    })
    if (s.status === 'OVERDUE') row.getCell('status').font = { color: { argb: 'FFEF4444' }, bold: true }
    else if (s.status === 'OPEN') row.getCell('status').font = { color: { argb: 'FFF59E0B' } }
  })
  ws1.autoFilter = { from: 'A1', to: 'I1' }

  // Sheet 2: Aging Analysis
  const ws2 = wb.addWorksheet('Aging Analysis')
  ws2.columns = [
    { header: 'Customer', key: 'name', width: 24 }, { header: 'Current', key: 'current', width: 14 },
    { header: '31-60 Days', key: 'b31', width: 14 }, { header: '61-90 Days', key: 'b61', width: 14 },
    { header: '90+ Days', key: 'b90', width: 14 }, { header: 'Total', key: 'total', width: 14 },
    { header: 'Terms', key: 'terms', width: 12 }, { header: 'Risk Level', key: 'risk', width: 12 },
  ]
  styleHeader(ws2.getRow(1))
  agingReport.forEach(r => {
    const row = ws2.addRow({
      name: r.name, current: Number(r.current).toFixed(2), b31: Number(r.bucket31to60).toFixed(2),
      b61: Number(r.bucket61to90).toFixed(2), b90: Number(r.bucket90plus).toFixed(2),
      total: Number(r.total).toFixed(2), terms: `${r.terms} days`, risk: r.riskLevel,
    })
    if (r.riskLevel === 'CRITICAL') row.getCell('risk').font = { color: { argb: 'FFEF4444' }, bold: true }
    else if (r.riskLevel === 'HIGH') row.getCell('risk').font = { color: { argb: 'FFF97316' } }
  })
  const totalsRow = ws2.addRow({
    name: 'TOTALS', current: Number(agingTotals.current).toFixed(2), b31: Number(agingTotals.bucket31to60).toFixed(2),
    b61: Number(agingTotals.bucket61to90).toFixed(2), b90: Number(agingTotals.bucket90plus).toFixed(2),
    total: Number(agingTotals.total).toFixed(2), terms: '—', risk: '—',
  })
  totalsRow.font = { bold: true }
  totalsRow.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } } })
  ws2.autoFilter = { from: 'A1', to: 'H1' }

  // Sheet 3: Customer Credit Summary
  const ws3 = wb.addWorksheet('Customer Credit Summary')
  ws3.columns = [
    { header: 'Customer', key: 'name', width: 24 }, { header: 'Email', key: 'email', width: 28 },
    { header: 'Phone', key: 'phone', width: 16 }, { header: 'Credit Limit', key: 'limit', width: 14 },
    { header: 'Utilized', key: 'utilized', width: 14 }, { header: 'Available', key: 'available', width: 14 },
    { header: 'Utilization %', key: 'utilPct', width: 14 }, { header: 'Risk Level', key: 'risk', width: 12 },
    { header: 'Payment Terms', key: 'terms', width: 14 }, { header: 'Status', key: 'status', width: 12 },
  ]
  styleHeader(ws3.getRow(1))
  profiles.forEach(p => {
    const utilPct = Number(p.creditLimit) > 0 ? Math.round((Number(p.utilizedCredit) / Number(p.creditLimit)) * 100) : 0
    const row = ws3.addRow({
      name: p.customer.name, email: p.customer.email ?? '—', phone: p.customer.phone ?? '—',
      limit: Number(p.creditLimit).toFixed(2), utilized: Number(p.utilizedCredit).toFixed(2),
      available: Number(p.availableCredit).toFixed(2), utilPct: `${utilPct}%`, risk: p.riskLevel,
      terms: `${p.paymentTerms} days`, status: p.isActive ? 'Active' : 'Blocked',
    })
    if (p.riskLevel === 'CRITICAL') row.getCell('risk').font = { color: { argb: 'FFEF4444' }, bold: true }
    else if (p.riskLevel === 'HIGH') row.getCell('risk').font = { color: { argb: 'FFF97316' } }
  })
  ws3.autoFilter = { from: 'A1', to: 'J1' }

  // Sheet 4: Overdue Customers
  const ws4 = wb.addWorksheet('Overdue Customers')
  ws4.columns = [
    { header: 'Customer', key: 'name', width: 24 }, { header: '31-60 Days', key: 'b31', width: 14 },
    { header: '61-90 Days', key: 'b61', width: 14 }, { header: '90+ Days', key: 'b90', width: 14 },
    { header: 'Total Overdue', key: 'total', width: 14 }, { header: 'Risk Level', key: 'risk', width: 12 },
  ]
  styleHeader(ws4.getRow(1))
  overdueCustomers.forEach(r => {
    const totalOverdue = Number(r.bucket31to60) + Number(r.bucket61to90) + Number(r.bucket90plus)
    const row = ws4.addRow({
      name: r.name, b31: Number(r.bucket31to60).toFixed(2), b61: Number(r.bucket61to90).toFixed(2),
      b90: Number(r.bucket90plus).toFixed(2), total: totalOverdue.toFixed(2), risk: r.riskLevel,
    })
    if (r.riskLevel === 'CRITICAL') row.getCell('risk').font = { color: { argb: 'FFEF4444' }, bold: true }
    else if (r.riskLevel === 'HIGH') row.getCell('risk').font = { color: { argb: 'FFF97316' } }
  })
  ws4.autoFilter = { from: 'A1', to: 'F1' }

  // Sheet 5: Collection Performance
  const ws5 = wb.addWorksheet('Collection Performance')
  ws5.columns = [
    { header: 'Case No', key: 'caseNo', width: 16 }, { header: 'Customer', key: 'customer', width: 24 },
    { header: 'Amount', key: 'amount', width: 14 }, { header: 'Paid', key: 'paid', width: 14 },
    { header: 'Outstanding', key: 'outstanding', width: 16 }, { header: 'Priority', key: 'priority', width: 12 },
    { header: 'Status', key: 'status', width: 14 }, { header: 'Assigned To', key: 'assigned', width: 18 },
    { header: 'Opened', key: 'opened', width: 18 }, { header: 'Resolved', key: 'resolved', width: 18 },
  ]
  styleHeader(ws5.getRow(1))
  let resolved = 0
  cases.forEach(c => {
    const outstanding = Number(c.arStatement?.amount ?? 0) - Number(c.arStatement?.paid ?? 0)
    const row = ws5.addRow({
      caseNo: c.caseNo, customer: c.customer?.name ?? '—', amount: Number(c.amount).toFixed(2),
      paid: Number(c.arStatement?.paid ?? 0).toFixed(2), outstanding: outstanding.toFixed(2),
      priority: c.priority, status: c.status, assigned: c.assignedTo ?? '—',
      opened: formatDate(c.createdAt), resolved: c.resolvedAt ? formatDate(c.resolvedAt) : '—',
    })
    if (c.status === 'RESOLVED') { row.getCell('status').font = { color: { argb: 'FF10B981' } }; resolved++ }
  })
  ws5.autoFilter = { from: 'A1', to: 'J1' }

  // Sheet 6: Payment History
  const ws6 = wb.addWorksheet('Payment History')
  ws6.columns = [
    { header: 'Date', key: 'date', width: 18 }, { header: 'Receipt No', key: 'receipt', width: 18 },
    { header: 'Customer', key: 'customer', width: 24 }, { header: 'Method', key: 'method', width: 14 },
    { header: 'Amount', key: 'amount', width: 14 }, { header: 'Reference', key: 'reference', width: 18 },
    { header: 'Sale Total', key: 'total', width: 14 },
  ]
  styleHeader(ws6.getRow(1))
  payments.forEach(p => {
    const row = ws6.addRow({
      date: formatDate(p.sale.createdAt), receipt: p.sale.receiptNumber,
      customer: p.sale.customer?.name ?? '—', method: p.method, amount: Number(p.amount).toFixed(2),
      reference: p.reference ?? '—', total: Number(p.sale.total).toFixed(2),
    })
    if (p.method === 'CREDIT') row.getCell('method').font = { color: { argb: 'FF3B82F6' } }
    else if (p.method === 'CASH') row.getCell('method').font = { color: { argb: 'FF10B981' } }
    else if (p.method === 'BANK_TRANSFER') row.getCell('method').font = { color: { argb: 'FFF59E0B' } }
  })
  ws6.autoFilter = { from: 'A1', to: 'G1' }

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

export async function generateCashFlowReportsExcel(dateFrom: Date, dateTo: Date): Promise<Buffer> {
  const [inflows, outflows, bankAccounts, expenses, budgets, loans, investments] = await Promise.all([
    prisma.cashInflow.findMany({ where: { receivedAt: { gte: dateFrom, lte: dateTo } }, include: { bankAccount: { select: { bankName: true, accountNumber: true } }, createdBy: { select: { name: true } } } }),
    prisma.cashOutflow.findMany({ where: { paidAt: { gte: dateFrom, lte: dateTo } }, include: { bankAccount: { select: { bankName: true, accountNumber: true } }, createdBy: { select: { name: true } } } }),
    prisma.bankAccount.findMany({ where: { isActive: true }, orderBy: { bankName: 'asc' } }),
    prisma.expense.findMany({ where: { incurredAt: { gte: dateFrom, lte: dateTo } }, orderBy: { incurredAt: 'desc' }, include: { createdBy: { select: { name: true } } } }),
    prisma.budget.findMany({ orderBy: { periodStart: 'asc' } }),
    prisma.loan.findMany({ orderBy: { startDate: 'desc' }, include: { repayments: { orderBy: { paidAt: 'desc' } }, createdBy: { select: { name: true } } } }),
    prisma.investment.findMany({ orderBy: { startDate: 'desc' }, include: { createdBy: { select: { name: true } } } }),
  ])

  const wb = new ExcelJS.Workbook()
  wb.creator = 'WAYU Inventory System'
  wb.created = new Date()

  const headerFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }
  const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFAFAFA' }, size: 10 }
  function styleHeader(row: ExcelJS.Row) {
    row.eachCell(c => { c.fill = headerFill; c.font = headerFont; c.alignment = { vertical: 'middle' } })
    row.height = 22
  }

  // Sheet 1: Daily Cash Flow
  const daily: Record<string, { inflows: number; outflows: number }> = {}
  inflows.forEach(i => { const d = new Date(i.receivedAt).toISOString().split('T')[0]; if (!daily[d]) daily[d] = { inflows: 0, outflows: 0 }; daily[d].inflows += Number(i.amount) })
  outflows.forEach(o => { const d = new Date(o.paidAt).toISOString().split('T')[0]; if (!daily[d]) daily[d] = { inflows: 0, outflows: 0 }; daily[d].outflows += Number(o.amount) })
  const ws1 = wb.addWorksheet('Daily Cash Flow')
  ws1.columns = [
    { header: 'Date', key: 'date', width: 14 }, { header: 'Inflows', key: 'inflows', width: 14 },
    { header: 'Outflows', key: 'outflows', width: 14 }, { header: 'Net', key: 'net', width: 14 },
  ]
  styleHeader(ws1.getRow(1))
  Object.entries(daily).sort((a, b) => b[0].localeCompare(a[0])).forEach(([date, d]) => {
    ws1.addRow({ date, inflows: d.inflows.toFixed(2), outflows: d.outflows.toFixed(2), net: (d.inflows - d.outflows).toFixed(2) })
  })
  ws1.autoFilter = { from: 'A1', to: 'D1' }

  // Sheet 2: Weekly Cash Flow
  const weekly: Record<string, { inflows: number; outflows: number; start: string }> = {}
  inflows.forEach(i => {
    const d = new Date(i.receivedAt); const start = new Date(d); start.setDate(d.getDate() - d.getDay()); const key = start.toISOString().split('T')[0]
    if (!weekly[key]) weekly[key] = { inflows: 0, outflows: 0, start: start.toISOString().split('T')[0] }
    weekly[key].inflows += Number(i.amount)
  })
  outflows.forEach(o => {
    const d = new Date(o.paidAt); const start = new Date(d); start.setDate(d.getDate() - d.getDay()); const key = start.toISOString().split('T')[0]
    if (!weekly[key]) weekly[key] = { inflows: 0, outflows: 0, start: start.toISOString().split('T')[0] }
    weekly[key].outflows += Number(o.amount)
  })
  const ws2 = wb.addWorksheet('Weekly Cash Flow')
  ws2.columns = [
    { header: 'Week Starting', key: 'start', width: 16 }, { header: 'Inflows', key: 'inflows', width: 14 },
    { header: 'Outflows', key: 'outflows', width: 14 }, { header: 'Net', key: 'net', width: 14 },
  ]
  styleHeader(ws2.getRow(1))
  Object.entries(weekly).sort((a, b) => b[0].localeCompare(a[0])).forEach(([key, d]) => {
    ws2.addRow({ start: d.start, inflows: d.inflows.toFixed(2), outflows: d.outflows.toFixed(2), net: (d.inflows - d.outflows).toFixed(2) })
  })
  ws2.autoFilter = { from: 'A1', to: 'D1' }

  // Sheet 3: Monthly Cash Flow
  const monthly: Record<string, { label: string; inflows: number; outflows: number }> = {}
  inflows.forEach(i => {
    const label = new Date(i.receivedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    if (!monthly[label]) monthly[label] = { label, inflows: 0, outflows: 0 }
    monthly[label].inflows += Number(i.amount)
  })
  outflows.forEach(o => {
    const label = new Date(o.paidAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    if (!monthly[label]) monthly[label] = { label, inflows: 0, outflows: 0 }
    monthly[label].outflows += Number(o.amount)
  })
  const ws3 = wb.addWorksheet('Monthly Cash Flow')
  ws3.columns = [
    { header: 'Month', key: 'month', width: 18 }, { header: 'Inflows', key: 'inflows', width: 14 },
    { header: 'Outflows', key: 'outflows', width: 14 }, { header: 'Net', key: 'net', width: 14 },
  ]
  styleHeader(ws3.getRow(1))
  Object.values(monthly).sort((a, b) => b.label.localeCompare(a.label)).forEach(m => {
    ws3.addRow({ month: m.label, inflows: m.inflows.toFixed(2), outflows: m.outflows.toFixed(2), net: (m.inflows - m.outflows).toFixed(2) })
  })
  ws3.autoFilter = { from: 'A1', to: 'D1' }

  // Sheet 4: Bank Balance
  const ws4 = wb.addWorksheet('Bank Balance')
  ws4.columns = [
    { header: 'Account Name', key: 'name', width: 24 }, { header: 'Account Number', key: 'number', width: 18 },
    { header: 'Bank Name', key: 'bank', width: 24 }, { header: 'Type', key: 'type', width: 14 },
    { header: 'Opening Balance', key: 'opening', width: 16 }, { header: 'Current Balance', key: 'current', width: 16 },
  ]
  styleHeader(ws4.getRow(1))
  bankAccounts.forEach(a => {
    ws4.addRow({
      name: a.accountName, number: a.accountNumber, bank: a.bankName, type: a.accountType,
      opening: Number(a.openingBalance).toFixed(2), current: Number(a.currentBalance).toFixed(2),
    })
  })
  ws4.autoFilter = { from: 'A1', to: 'F1' }

  // Sheet 5: Expense Analysis
  const expenseByCategory: Record<string, number> = {}
  expenses.filter(e => e.type === 'DEBIT').forEach(e => { expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + Number(e.amount) })
  const totalExpenses = Object.values(expenseByCategory).reduce((s, v) => s + v, 0)
  const ws5 = wb.addWorksheet('Expense Analysis')
  ws5.columns = [
    { header: 'Category', key: 'category', width: 24 }, { header: 'Total', key: 'total', width: 14 },
    { header: 'Percentage', key: 'pct', width: 14 },
  ]
  styleHeader(ws5.getRow(1))
  Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]).forEach(([cat, total]) => {
    ws5.addRow({ category: cat, total: total.toFixed(2), pct: totalExpenses > 0 ? `${((total / totalExpenses) * 100).toFixed(1)}%` : '0%' })
  })
  ws5.autoFilter = { from: 'A1', to: 'C1' }

  // Sheet 6: Budget vs Actual
  const ws6 = wb.addWorksheet('Budget vs Actual')
  ws6.columns = [
    { header: 'Period', key: 'period', width: 18 }, { header: 'Category', key: 'category', width: 20 },
    { header: 'Planned', key: 'planned', width: 14 }, { header: 'Actual Inflows', key: 'actualIn', width: 14 },
    { header: 'Actual Outflows', key: 'actualOut', width: 14 }, { header: 'Variance', key: 'variance', width: 14 },
  ]
  styleHeader(ws6.getRow(1))
  budgets.forEach(b => {
    const actualIn = inflows.filter(i => i.category === b.category && new Date(i.receivedAt) >= b.periodStart && new Date(i.receivedAt) <= b.periodEnd).reduce((s, i) => s + Number(i.amount), 0)
    const actualOut = outflows.filter(o => o.category === b.category && new Date(o.paidAt) >= b.periodStart && new Date(o.paidAt) <= b.periodEnd).reduce((s, o) => s + Number(o.amount), 0)
    const variance = actualIn - actualOut - Number(b.plannedAmount)
    ws6.addRow({
      period: b.periodLabel, category: b.category, planned: Number(b.plannedAmount).toFixed(2),
      actualIn: actualIn.toFixed(2), actualOut: actualOut.toFixed(2), variance: variance.toFixed(2),
    })
  })
  ws6.autoFilter = { from: 'A1', to: 'F1' }

  // Sheet 7: Expense Category Summary
  const ws7 = wb.addWorksheet('Expense Category Summary')
  ws7.columns = [
    { header: 'Category', key: 'category', width: 24 }, { header: 'Total', key: 'total', width: 14 },
  ]
  styleHeader(ws7.getRow(1))
  Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]).forEach(([cat, total]) => {
    ws7.addRow({ category: cat, total: total.toFixed(2) })
  })
  ws7.autoFilter = { from: 'A1', to: 'B1' }

  // Sheet 8: Cash Position
  const ws8 = wb.addWorksheet('Cash Position')
  ws8.columns = [
    { header: 'Account', key: 'account', width: 28 }, { header: 'Bank', key: 'bank', width: 24 },
    { header: 'Opening', key: 'opening', width: 16 }, { header: 'Current', key: 'current', width: 16 },
  ]
  styleHeader(ws8.getRow(1))
  const totalOpening = bankAccounts.reduce((s, a) => s + Number(a.openingBalance), 0)
  const totalCurrent = bankAccounts.reduce((s, a) => s + Number(a.currentBalance), 0)
  bankAccounts.forEach(a => {
    ws8.addRow({
      account: `${a.accountName} (${a.accountNumber})`, bank: a.bankName,
      opening: Number(a.openingBalance).toFixed(2), current: Number(a.currentBalance).toFixed(2),
    })
  })
  const posTotals = ws8.addRow({ account: 'TOTAL', bank: '—', opening: totalOpening.toFixed(2), current: totalCurrent.toFixed(2) })
  posTotals.font = { bold: true }
  posTotals.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } } })
  ws8.autoFilter = { from: 'A1', to: 'D1' }

  // Sheet 9: Loan Repayment
  const ws9 = wb.addWorksheet('Loan Repayment')
  ws9.columns = [
    { header: 'Loan', key: 'loan', width: 24 }, { header: 'Lender', key: 'lender', width: 20 },
    { header: 'Principal', key: 'principal', width: 14 }, { header: 'Interest Rate', key: 'rate', width: 14 },
    { header: 'Start Date', key: 'start', width: 14 }, { header: 'End Date', key: 'end', width: 14 },
    { header: 'Status', key: 'status', width: 12 },
  ]
  styleHeader(ws9.getRow(1))
  loans.forEach(l => {
    ws9.addRow({
      loan: l.lender, lender: l.lender, principal: Number(l.principal).toFixed(2),
      rate: `${l.interestRate}%`, start: formatDate(l.startDate), end: l.endDate ? formatDate(l.endDate) : '—', status: l.status,
    })
  })
  ws9.autoFilter = { from: 'A1', to: 'G1' }

  // Sheet 10: Investment Report
  const ws10 = wb.addWorksheet('Investment Report')
  ws10.columns = [
    { header: 'Name', key: 'name', width: 24 }, { header: 'Type', key: 'type', width: 14 },
    { header: 'Amount', key: 'amount', width: 14 }, { header: 'Expected Return', key: 'expected', width: 14 },
    { header: 'Start Date', key: 'start', width: 14 }, { header: 'Maturity', key: 'maturity', width: 14 },
    { header: 'Status', key: 'status', width: 12 },
  ]
  styleHeader(ws10.getRow(1))
  investments.forEach(i => {
    ws10.addRow({
      name: i.name, type: i.type, amount: Number(i.amount).toFixed(2), expected: Number(i.expectedReturn).toFixed(2),
      start: formatDate(i.startDate), maturity: i.maturityDate ? formatDate(i.maturityDate) : '—', status: i.status,
    })
  })
  ws10.autoFilter = { from: 'A1', to: 'G1' }

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

export async function generateSalesReportsExcel(dateFrom: Date, dateTo: Date): Promise<Buffer> {
  const [sales, saleItems, salesByPerson] = await Promise.all([
    prisma.sale.findMany({
      where: { status: { in: ['COMPLETED', 'PARTIAL_REFUND'] }, createdAt: { gte: dateFrom, lte: dateTo } },
      include: { items: true, customer: { select: { name: true, email: true, phone: true } }, payments: true, salesperson: { select: { name: true, email: true } } },
    }),
    prisma.saleItem.findMany({
      where: { sale: { status: { in: ['COMPLETED', 'PARTIAL_REFUND'] }, createdAt: { gte: dateFrom, lte: dateTo } } },
      include: { product: { select: { name: true, sku: true, category: true, costPrice: true, sellingPrice: true } }, sale: { select: { createdAt: true } } },
    }),
    prisma.sale.findMany({
      where: { status: { in: ['COMPLETED', 'PARTIAL_REFUND'] }, createdAt: { gte: dateFrom, lte: dateTo }, salespersonId: { not: null } },
      include: { salesperson: { select: { name: true, email: true } }, items: true },
    }),
  ])

  const wb = new ExcelJS.Workbook()
  wb.creator = 'WAYU Inventory System'
  wb.created = new Date()

  const headerFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }
  const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFAFAFA' }, size: 10 }
  function styleHeader(row: ExcelJS.Row) {
    row.eachCell(c => { c.fill = headerFill; c.font = headerFont; c.alignment = { vertical: 'middle' } })
    row.height = 22
  }

  // Sheet 1: Daily Sales
  const daily: Record<string, { totalSales: number; totalItems: number; totalProfit: number; transactions: number }> = {}
  sales.forEach(s => {
    const day = new Date(s.createdAt).toISOString().split('T')[0]
    if (!daily[day]) daily[day] = { totalSales: 0, totalItems: 0, totalProfit: 0, transactions: 0 }
    daily[day].totalSales += Number(s.total); daily[day].totalItems += s.items.length; daily[day].totalProfit += Number(s.profit ?? 0); daily[day].transactions += 1
  })
  const ws1 = wb.addWorksheet('Daily Sales')
  ws1.columns = [
    { header: 'Period', key: 'period', width: 22 }, { header: 'Transactions', key: 'txns', width: 14 },
    { header: 'Items Sold', key: 'items', width: 14 }, { header: 'Total Revenue', key: 'revenue', width: 16 },
    { header: 'Gross Profit', key: 'profit', width: 16 },
  ]
  styleHeader(ws1.getRow(1))
  Object.entries(daily).sort((a, b) => b[0].localeCompare(a[0])).forEach(([period, d]) => {
    ws1.addRow({ period, txns: d.transactions, items: d.totalItems, revenue: d.totalSales.toFixed(2), profit: d.totalProfit.toFixed(2) })
  })
  ws1.autoFilter = { from: 'A1', to: 'E1' }

  // Sheet 2: Weekly Sales
  const weekly: Record<string, { label: string; totalSales: number; totalItems: number; totalProfit: number; transactions: number }> = {}
  sales.forEach(s => {
    const d = new Date(s.createdAt); const start = new Date(d); start.setDate(d.getDate() - d.getDay()); const label = `Week of ${start.toISOString().split('T')[0]}`
    if (!weekly[label]) weekly[label] = { label, totalSales: 0, totalItems: 0, totalProfit: 0, transactions: 0 }
    weekly[label].totalSales += Number(s.total); weekly[label].totalItems += s.items.length; weekly[label].totalProfit += Number(s.profit ?? 0); weekly[label].transactions += 1
  })
  const ws2 = wb.addWorksheet('Weekly Sales')
  ws2.columns = [
    { header: 'Period', key: 'period', width: 22 }, { header: 'Transactions', key: 'txns', width: 14 },
    { header: 'Items Sold', key: 'items', width: 14 }, { header: 'Total Revenue', key: 'revenue', width: 16 },
    { header: 'Gross Profit', key: 'profit', width: 16 },
  ]
  styleHeader(ws2.getRow(1))
  Object.values(weekly).sort((a, b) => b.label.localeCompare(a.label)).forEach(d => {
    ws2.addRow({ period: d.label, txns: d.transactions, items: d.totalItems, revenue: d.totalSales.toFixed(2), profit: d.totalProfit.toFixed(2) })
  })
  ws2.autoFilter = { from: 'A1', to: 'E1' }

  // Sheet 3: Monthly Sales
  const monthly: Record<string, { label: string; totalSales: number; totalItems: number; totalProfit: number; transactions: number }> = {}
  sales.forEach(s => {
    const label = new Date(s.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    if (!monthly[label]) monthly[label] = { label, totalSales: 0, totalItems: 0, totalProfit: 0, transactions: 0 }
    monthly[label].totalSales += Number(s.total); monthly[label].totalItems += s.items.length; monthly[label].totalProfit += Number(s.profit ?? 0); monthly[label].transactions += 1
  })
  const ws3 = wb.addWorksheet('Monthly Sales')
  ws3.columns = [
    { header: 'Period', key: 'period', width: 22 }, { header: 'Transactions', key: 'txns', width: 14 },
    { header: 'Items Sold', key: 'items', width: 14 }, { header: 'Total Revenue', key: 'revenue', width: 16 },
    { header: 'Gross Profit', key: 'profit', width: 16 },
  ]
  styleHeader(ws3.getRow(1))
  Object.values(monthly).sort((a, b) => b.label.localeCompare(a.label)).forEach(d => {
    ws3.addRow({ period: d.label, txns: d.transactions, items: d.totalItems, revenue: d.totalSales.toFixed(2), profit: d.totalProfit.toFixed(2) })
  })
  ws3.autoFilter = { from: 'A1', to: 'E1' }

  // Sheet 4: Product Sales Analysis
  const productGroups: Record<string, { sku: string; name: string; category: string; totalQty: number; totalRevenue: number; totalCost: number; transactions: number }> = {}
  saleItems.forEach(item => {
    const key = item.productId
    if (!productGroups[key]) productGroups[key] = { sku: item.product.sku, name: item.product.name, category: item.product.category, totalQty: 0, totalRevenue: 0, totalCost: 0, transactions: 0 }
    productGroups[key].totalQty += item.quantity; productGroups[key].totalRevenue += Number(item.lineTotal); productGroups[key].totalCost += Number(item.unitCost) * item.quantity; productGroups[key].transactions += 1
  })
  const ws4 = wb.addWorksheet('Product Sales Analysis')
  ws4.columns = [
    { header: 'SKU', key: 'sku', width: 18 }, { header: 'Product Name', key: 'name', width: 35 },
    { header: 'Category', key: 'category', width: 18 }, { header: 'Qty Sold', key: 'qty', width: 12 },
    { header: 'Transactions', key: 'txns', width: 14 }, { header: 'Revenue', key: 'revenue', width: 16 },
    { header: 'Cost', key: 'cost', width: 14 }, { header: 'Profit', key: 'profit', width: 14 },
    { header: 'Margin %', key: 'margin', width: 12 },
  ]
  styleHeader(ws4.getRow(1))
  Object.values(productGroups).forEach(g => {
    const profit = g.totalRevenue - g.totalCost; const margin = g.totalRevenue > 0 ? ((profit / g.totalRevenue) * 100).toFixed(1) : '0'
    ws4.addRow({
      sku: g.sku, name: g.name, category: g.category, qty: g.totalQty, txns: g.transactions,
      revenue: g.totalRevenue.toFixed(2), cost: g.totalCost.toFixed(2), profit: profit.toFixed(2), margin: `${margin}%`,
    })
  })
  ws4.autoFilter = { from: 'A1', to: 'I1' }

  // Sheet 5: Customer Sales Analysis
  const customerGroups: Record<string, { name: string; email: string; phone: string; totalSales: number; totalPaid: number; totalProfit: number; transactions: number }> = {}
  sales.forEach(s => {
    if (!s.customerId) return
    const key = s.customerId
    if (!customerGroups[key]) customerGroups[key] = { name: s.customer?.name ?? '—', email: s.customer?.email ?? '—', phone: s.customer?.phone ?? '—', totalSales: 0, totalPaid: 0, totalProfit: 0, transactions: 0 }
    customerGroups[key].totalSales += Number(s.total); customerGroups[key].totalPaid += s.payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0); customerGroups[key].totalProfit += Number(s.profit ?? 0); customerGroups[key].transactions += 1
  })
  const ws5 = wb.addWorksheet('Customer Sales Analysis')
  ws5.columns = [
    { header: 'Customer', key: 'name', width: 24 }, { header: 'Email', key: 'email', width: 28 },
    { header: 'Phone', key: 'phone', width: 16 }, { header: 'Transactions', key: 'txns', width: 14 },
    { header: 'Total Sales', key: 'sales', width: 16 }, { header: 'Total Paid', key: 'paid', width: 16 },
    { header: 'Avg Order', key: 'avg', width: 14 }, { header: 'Gross Profit', key: 'profit', width: 16 },
  ]
  styleHeader(ws5.getRow(1))
  Object.values(customerGroups).map(g => ({ ...g, avg: g.transactions > 0 ? (g.totalSales / g.transactions) : 0 })).sort((a, b) => b.totalSales - a.totalSales).forEach(g => {
    ws5.addRow({ name: g.name, email: g.email, phone: g.phone, txns: g.transactions, sales: g.totalSales.toFixed(2), paid: g.totalPaid.toFixed(2), avg: g.avg.toFixed(2), profit: g.totalProfit.toFixed(2) })
  })
  ws5.autoFilter = { from: 'A1', to: 'H1' }

  // Sheet 6: Sales Trend
  const trend: Record<string, { revenue: number; profit: number; transactions: number }> = {}
  sales.forEach(s => {
    const day = new Date(s.createdAt).toISOString().split('T')[0]
    if (!trend[day]) trend[day] = { revenue: 0, profit: 0, transactions: 0 }
    trend[day].revenue += Number(s.total); trend[day].profit += Number(s.profit ?? 0); trend[day].transactions += 1
  })
  const ws6 = wb.addWorksheet('Sales Trend')
  ws6.columns = [
    { header: 'Date', key: 'date', width: 14 }, { header: 'Transactions', key: 'txns', width: 14 },
    { header: 'Revenue', key: 'revenue', width: 16 }, { header: 'Gross Profit', key: 'profit', width: 16 },
  ]
  styleHeader(ws6.getRow(1))
  Object.entries(trend).sort((a, b) => a[0].localeCompare(b[0])).forEach(([date, d]) => {
    ws6.addRow({ date, txns: d.transactions, revenue: d.revenue.toFixed(2), profit: d.profit.toFixed(2) })
  })
  ws6.autoFilter = { from: 'A1', to: 'D1' }

  // Sheet 7: Top Selling Products
  const topProducts: Record<string, { sku: string; name: string; category: string; totalQty: number; totalRevenue: number }> = {}
  saleItems.forEach(item => {
    const key = item.productId
    if (!topProducts[key]) topProducts[key] = { sku: item.product.sku, name: item.product.name, category: item.product.category, totalQty: 0, totalRevenue: 0 }
    topProducts[key].totalQty += item.quantity; topProducts[key].totalRevenue += Number(item.lineTotal)
  })
  const ws7 = wb.addWorksheet('Top Selling Products')
  ws7.columns = [
    { header: 'SKU', key: 'sku', width: 18 }, { header: 'Product Name', key: 'name', width: 35 },
    { header: 'Category', key: 'category', width: 18 }, { header: 'Qty Sold', key: 'qty', width: 12 },
    { header: 'Revenue', key: 'revenue', width: 16 },
  ]
  styleHeader(ws7.getRow(1))
  Object.values(topProducts).sort((a, b) => b.totalRevenue - a.totalRevenue).forEach(g => {
    ws7.addRow({ sku: g.sku, name: g.name, category: g.category, qty: g.totalQty, revenue: g.totalRevenue.toFixed(2) })
  })
  ws7.autoFilter = { from: 'A1', to: 'E1' }

  // Sheet 8: Salesperson Performance
  const spGroups: Record<string, { name: string; email: string; totalSales: number; totalProfit: number; transactions: number; totalCommission: number }> = {}
  salesByPerson.forEach(s => {
    const key = s.salespersonId!
    if (!spGroups[key]) spGroups[key] = { name: s.salesperson?.name ?? '—', email: s.salesperson?.email ?? '—', totalSales: 0, totalProfit: 0, transactions: 0, totalCommission: 0 }
    spGroups[key].totalSales += Number(s.total); spGroups[key].totalProfit += Number(s.profit ?? 0); spGroups[key].transactions += 1
    const commission = s.items.reduce((sum: number, item: any) => sum + Number(item.commissionAmount ?? 0), 0)
    spGroups[key].totalCommission += commission
  })
  const ws8 = wb.addWorksheet('Salesperson Performance')
  ws8.columns = [
    { header: 'Salesperson', key: 'name', width: 24 }, { header: 'Email', key: 'email', width: 28 },
    { header: 'Transactions', key: 'txns', width: 14 }, { header: 'Total Sales', key: 'sales', width: 16 },
    { header: 'Avg Sale', key: 'avg', width: 14 }, { header: 'Gross Profit', key: 'profit', width: 16 },
    { header: 'Commission', key: 'commission', width: 16 },
  ]
  styleHeader(ws8.getRow(1))
  Object.values(spGroups).map(g => ({ ...g, avg: g.transactions > 0 ? (g.totalSales / g.transactions) : 0 })).sort((a, b) => b.totalSales - a.totalSales).forEach(g => {
    ws8.addRow({ name: g.name, email: g.email, txns: g.transactions, sales: g.totalSales.toFixed(2), avg: g.avg.toFixed(2), profit: g.totalProfit.toFixed(2), commission: g.totalCommission.toFixed(2) })
  })
  ws8.autoFilter = { from: 'A1', to: 'G1' }

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
