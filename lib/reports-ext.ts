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
