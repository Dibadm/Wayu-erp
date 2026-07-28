// lib/reports.ts
// Generates PDF and Excel dispensing/inventory reports.
// Uses: exceljs (Excel), @react-pdf/renderer (PDF via API route)

import ExcelJS from 'exceljs'
import { prisma } from '@/lib/db'
import { formatDate } from '@/lib/utils'

// ─── Excel Report ─────────────────────────────────────────────────────────────

export async function generateInventoryExcel(): Promise<Buffer> {
  const [products, movements, batches] = await Promise.all([
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
  ])

  const wb = new ExcelJS.Workbook()
  wb.creator = 'WAYU Inventory System'
  wb.created = new Date()

  // ── Style helpers ──
  const headerFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }
  const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFAFAFA' }, size: 10 }
  const borderStyle: Partial<ExcelJS.Borders> = {
    bottom: { style: 'thin', color: { argb: 'FF334155' } },
  }

  function styleHeader(row: ExcelJS.Row) {
    row.eachCell(cell => {
      cell.fill = headerFill
      cell.font = headerFont
      cell.border = borderStyle
      cell.alignment = { vertical: 'middle' }
    })
    row.height = 22
  }

  // ── Sheet 1: Inventory Summary ──
  const ws1 = wb.addWorksheet('Inventory')
  ws1.columns = [
    { header: 'SKU',          key: 'sku',      width: 18 },
    { header: 'Product Name', key: 'name',     width: 35 },
    { header: 'Category',     key: 'category', width: 18 },
    { header: 'Total Qty',    key: 'qty',      width: 12 },
    { header: 'Min Level',    key: 'min',      width: 12 },
    { header: 'Unit',         key: 'unit',     width: 10 },
    { header: 'Status',       key: 'status',   width: 16 },
    { header: 'Nearest Expiry', key: 'expiry', width: 20 },
  ]
  styleHeader(ws1.getRow(1))

  products.forEach(p => {
    const nearestExpiry = p.batches[0]?.expiryDate
    const status = p.quantity === 0 ? 'OUT OF STOCK' : p.quantity <= p.minStockLevel ? 'LOW STOCK' : 'OK'
    const row = ws1.addRow({
      sku: p.sku, name: p.name, category: p.category,
      qty: p.quantity, min: p.minStockLevel, unit: p.unit,
      status, expiry: nearestExpiry ? formatDate(nearestExpiry) : '—',
    })
    if (status === 'OUT OF STOCK') row.getCell('status').font = { color: { argb: 'FFEF4444' }, bold: true }
    else if (status === 'LOW STOCK') row.getCell('status').font = { color: { argb: 'FFF59E0B' }, bold: true }
    else row.getCell('status').font = { color: { argb: 'FF10B981' } }
  })
  ws1.autoFilter = { from: 'A1', to: 'H1' }

  // ── Sheet 2: Movements ──
  const ws2 = wb.addWorksheet('Movements')
  ws2.columns = [
    { header: 'Date/Time',   key: 'ts',       width: 22 },
    { header: 'Type',        key: 'type',     width: 12 },
    { header: 'SKU',         key: 'sku',      width: 18 },
    { header: 'Product',     key: 'product',  width: 30 },
    { header: 'Qty',         key: 'qty',      width: 10 },
    { header: 'Location',    key: 'location', width: 18 },
    { header: 'Batch No.',   key: 'batch',    width: 18 },
    { header: 'Performed By',key: 'user',     width: 22 },
    { header: 'Reference',   key: 'ref',      width: 18 },
    { header: 'Notes',       key: 'notes',    width: 40 },
  ]
  styleHeader(ws2.getRow(1))
  movements.forEach(m => {
    ws2.addRow({
      ts: formatDate(m.timestamp),
      type: m.type,
      sku: m.product.sku,
      product: m.product.name,
      qty: m.type === 'OUT' ? -m.quantity : m.quantity,
      location: m.location ? `${m.location.code} – ${m.location.name}` : '—',
      batch: m.batch?.batchNumber ?? '—',
      user: m.user.name ?? m.user.email,
      ref: (m as any).reference ?? '—',
      notes: m.notes ?? '—',
    })
  })
  ws2.autoFilter = { from: 'A1', to: 'J1' }

  // ── Sheet 3: Expiry Tracker ──
  const ws3 = wb.addWorksheet('Expiry Tracker')
  ws3.columns = [
    { header: 'SKU',          key: 'sku',     width: 18 },
    { header: 'Product',      key: 'product', width: 30 },
    { header: 'Batch No.',    key: 'batch',   width: 20 },
    { header: 'Qty Remaining',key: 'qty',     width: 16 },
    { header: 'Location',     key: 'location',width: 20 },
    { header: 'Received',     key: 'received',width: 20 },
    { header: 'Expiry Date',  key: 'expiry',  width: 20 },
    { header: 'Days Remaining',key: 'days',   width: 16 },
    { header: 'Alert',        key: 'alert',   width: 14 },
  ]
  styleHeader(ws3.getRow(1))

  const now = new Date()
  batches.forEach(b => {
    const daysLeft = Math.floor((b.expiryDate.getTime() - now.getTime()) / 86400000)
    const alert = daysLeft < 0 ? 'EXPIRED' : daysLeft <= 30 ? 'CRITICAL' : daysLeft <= 90 ? 'WARNING' : 'OK'
    const row = ws3.addRow({
      sku: b.product.sku, product: b.product.name,
      batch: b.batchNumber, qty: b.quantity,
      location: b.location.name,
      received: formatDate(b.receivedDate),
      expiry: formatDate(b.expiryDate),
      days: daysLeft, alert,
    })
    const alertCell = row.getCell('alert')
    if (alert === 'EXPIRED')  alertCell.font = { color: { argb: 'FFEF4444' }, bold: true }
    else if (alert === 'CRITICAL') alertCell.font = { color: { argb: 'FFF97316' }, bold: true }
    else if (alert === 'WARNING')  alertCell.font = { color: { argb: 'FFF59E0B' } }
    else alertCell.font = { color: { argb: 'FF10B981' } }
  })
  ws3.autoFilter = { from: 'A1', to: 'I1' }

  // ── Sheet 4: Low Stock ──
  const ws4 = wb.addWorksheet('Low Stock Alerts')
  ws4.columns = [
    { header: 'SKU',      key: 'sku',    width: 18 },
    { header: 'Product',  key: 'name',   width: 35 },
    { header: 'Current',  key: 'qty',    width: 12 },
    { header: 'Min Level',key: 'min',    width: 12 },
    { header: 'Deficit',  key: 'deficit',width: 12 },
    { header: 'Unit',     key: 'unit',   width: 10 },
  ]
  styleHeader(ws4.getRow(1))
  products.filter(p => p.quantity <= p.minStockLevel).forEach(p => {
    ws4.addRow({ sku: p.sku, name: p.name, qty: p.quantity, min: p.minStockLevel, deficit: p.minStockLevel - p.quantity, unit: p.unit })
  })

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

// ─── PDF Report (plain HTML → returned as string for browser printing) ────────
// We generate a styled HTML string. The API route serves it with text/html.
// The user presses Ctrl+P / Print → Save as PDF. No heavy PDF lib needed.

export async function generateDispensingSummaryHTML(dateFrom: Date, dateTo: Date): Promise<string> {
  const movements = await prisma.movement.findMany({
    where: { timestamp: { gte: dateFrom, lte: dateTo }, type: 'OUT' },
    orderBy: { timestamp: 'desc' },
    include: {
      product: { select: { name: true, sku: true } },
      user: { select: { name: true, email: true } },
      location: { select: { name: true } },
      batch: { select: { batchNumber: true, expiryDate: true } },
    },
  })

  const totalQty = movements.reduce((s, m) => s + m.quantity, 0)

  const rows = movements.map(m => `
    <tr>
      <td>${formatDate(m.timestamp)}</td>
      <td class="mono">${m.product.sku}</td>
      <td>${m.product.name}</td>
      <td class="num">${m.quantity}</td>
      <td>${m.location?.name ?? '—'}</td>
      <td class="mono">${m.batch?.batchNumber ?? '—'}</td>
      <td>${m.user.name ?? m.user.email}</td>
      <td>${m.notes ?? '—'}</td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<title>WAYU Dispensing Report</title>
<style>
  @page { margin: 20mm; size: A4 landscape; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 10px; color: #1e293b; }
  header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #0ea5e9; }
  h1 { font-size: 18px; font-weight: 700; color: #0f172a; }
  .subtitle { font-size: 10px; color: #64748b; margin-top: 2px; }
  .meta { text-align: right; font-size: 9px; color: #64748b; }
  .summary { display: flex; gap: 16px; margin-bottom: 16px; }
  .stat { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 16px; }
  .stat-num { font-size: 20px; font-weight: 700; color: #0f172a; font-family: monospace; }
  .stat-label { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #1e293b; color: #f8fafc; padding: 6px 8px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; }
  td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  tr:nth-child(even) td { background: #f8fafc; }
  .mono { font-family: monospace; }
  .num { font-family: monospace; font-weight: 600; text-align: right; }
  footer { margin-top: 16px; padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 8px; color: #94a3b8; display: flex; justify-content: space-between; }
</style>
</head><body>
<header>
  <div>
    <h1>WAYU Pharmaceutical — Dispensing Report</h1>
    <div class="subtitle">Period: ${formatDate(dateFrom)} → ${formatDate(dateTo)}</div>
  </div>
  <div class="meta">
    Generated: ${formatDate(new Date())}<br>
    WAYU Inventory System v2.0
  </div>
</header>
<div class="summary">
  <div class="stat"><div class="stat-num">${movements.length}</div><div class="stat-label">Transactions</div></div>
  <div class="stat"><div class="stat-num">${totalQty.toLocaleString()}</div><div class="stat-label">Units Dispensed</div></div>
  <div class="stat"><div class="stat-num">${new Set(movements.map(m => m.product.sku)).size}</div><div class="stat-label">Products</div></div>
</div>
<table>
  <thead><tr>
    <th>Date/Time</th><th>SKU</th><th>Product</th><th>Qty</th>
    <th>Location</th><th>Batch</th><th>Dispensed By</th><th>Notes</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
<footer>
  <span>WAYU Pharmaceutical Inventory System — Confidential</span>
  <span>Page <span class="pageNum"></span></span>
</footer>
</body></html>`
}

// ─── Supplier Report (Excel) ──────────────────────────────────────────────────

export async function generateSupplierExcel(): Promise<Buffer> {
  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: 'asc' },
    include: {
      purchaseOrders: {
        select: { id: true, status: true, totalCost: true },
      },
    },
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

  // Sheet 1: Supplier list
  const ws1 = wb.addWorksheet('Suppliers')
  ws1.columns = [
    { header: 'Company Name',   key: 'name',          width: 30 },
    { header: 'Contact Person', key: 'contactPerson',  width: 22 },
    { header: 'Email',          key: 'email',          width: 28 },
    { header: 'Phone',          key: 'phone',          width: 16 },
    { header: 'Address',        key: 'address',        width: 35 },
    { header: 'Tax Number',     key: 'taxNumber',      width: 18 },
    { header: 'Status',         key: 'status',         width: 12 },
    { header: 'Total Orders',   key: 'totalOrders',    width: 14 },
    { header: 'Total Value',    key: 'totalValue',     width: 16 },
  ]
  styleHeader(ws1.getRow(1))
  suppliers.forEach(s => {
    const totalValue = s.purchaseOrders.reduce((sum, o) => sum + Number(o.totalCost), 0)
    ws1.addRow({
      name: s.name, contactPerson: s.contactPerson ?? '—', email: s.email ?? '—',
      phone: s.phone ?? '—', address: s.address ?? '—', taxNumber: s.taxNumber ?? '—',
      status: s.status, totalOrders: s.purchaseOrders.length,
      totalValue: totalValue.toFixed(2),
    })
  })
  ws1.autoFilter = { from: 'A1', to: 'I1' }

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

// ─── Purchase Order Report (Excel) ───────────────────────────────────────────

export async function generatePurchaseOrderExcel(): Promise<Buffer> {
  const orders = await prisma.purchaseOrder.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      supplier:  { select: { name: true } },
      createdBy: { select: { name: true, email: true } },
      items: {
        include: { product: { select: { name: true, sku: true } } },
      },
    },
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

  // Sheet 1: PO summary
  const ws1 = wb.addWorksheet('Purchase Orders')
  ws1.columns = [
    { header: 'PO Number',        key: 'poNumber',   width: 18 },
    { header: 'Supplier',         key: 'supplier',   width: 28 },
    { header: 'Status',           key: 'status',     width: 20 },
    { header: 'Order Date',       key: 'orderDate',  width: 20 },
    { header: 'Expected Delivery',key: 'expected',   width: 20 },
    { header: 'Items',            key: 'items',      width: 8 },
    { header: 'Total Cost',       key: 'totalCost',  width: 16 },
    { header: 'Created By',       key: 'createdBy',  width: 22 },
  ]
  styleHeader(ws1.getRow(1))
  orders.forEach(o => {
    ws1.addRow({
      poNumber:  o.poNumber,
      supplier:  o.supplier.name,
      status:    o.status.replace('_', ' '),
      orderDate: formatDate(o.orderDate),
      expected:  o.expectedDelivery ? formatDate(o.expectedDelivery) : '—',
      items:     o.items.length,
      totalCost: Number(o.totalCost).toFixed(2),
      createdBy: o.createdBy.name ?? o.createdBy.email,
    })
  })
  ws1.autoFilter = { from: 'A1', to: 'H1' }

  // Sheet 2: PO line items detail
  const ws2 = wb.addWorksheet('PO Line Items')
  ws2.columns = [
    { header: 'PO Number',      key: 'poNumber',  width: 18 },
    { header: 'Supplier',       key: 'supplier',  width: 24 },
    { header: 'SKU',            key: 'sku',       width: 18 },
    { header: 'Product',        key: 'product',   width: 30 },
    { header: 'Qty Ordered',    key: 'ordered',   width: 14 },
    { header: 'Qty Received',   key: 'received',  width: 14 },
    { header: 'Remaining',      key: 'remaining', width: 12 },
    { header: 'Unit Cost',      key: 'unitCost',  width: 12 },
    { header: 'Total Cost',     key: 'totalCost', width: 14 },
    { header: 'Batch No.',      key: 'batch',     width: 16 },
    { header: 'Expiry Date',    key: 'expiry',    width: 16 },
  ]
  styleHeader(ws2.getRow(1))
  orders.forEach(o => {
    o.items.forEach(item => {
      const row = ws2.addRow({
        poNumber: o.poNumber, supplier: o.supplier.name,
        sku: item.product.sku, product: item.product.name,
        ordered: item.quantityOrdered, received: item.quantityReceived,
        remaining: item.quantityOrdered - item.quantityReceived,
        unitCost: Number(item.unitCost).toFixed(2),
        totalCost: Number(item.totalCost).toFixed(2),
        batch: item.batchNumber ?? '—',
        expiry: item.expiryDate ? item.expiryDate.toISOString().split('T')[0] : '—',
      })
      if (item.quantityReceived >= item.quantityOrdered) {
        row.getCell('remaining').font = { color: { argb: 'FF10B981' } }
      } else if (item.quantityReceived > 0) {
        row.getCell('remaining').font = { color: { argb: 'FFF59E0B' } }
      }
    })
  })
  ws2.autoFilter = { from: 'A1', to: 'K1' }

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

// ─── Inventory Valuation Report (Excel) ──────────────────────────────────────

export async function generateValuationExcel(): Promise<Buffer> {
  const products = await prisma.product.findMany({
    orderBy: { name: 'asc' },
    select: {
      sku: true, name: true, category: true, quantity: true, unit: true,
      costPrice: true, sellingPrice: true,
    },
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

  const ws = wb.addWorksheet('Inventory Valuation')
  ws.columns = [
    { header: 'SKU',              key: 'sku',            width: 18 },
    { header: 'Product Name',     key: 'name',           width: 30 },
    { header: 'Category',         key: 'category',       width: 18 },
    { header: 'Qty',              key: 'qty',            width: 10 },
    { header: 'Unit',             key: 'unit',           width: 10 },
    { header: 'Cost Price',       key: 'costPrice',      width: 14 },
    { header: 'Selling Price',    key: 'sellingPrice',   width: 14 },
    { header: 'Profit / Unit',    key: 'profitUnit',     width: 14 },
    { header: 'Margin %',         key: 'margin',         width: 12 },
    { header: 'Inventory Cost',   key: 'invCost',        width: 16 },
    { header: 'Inventory Value',  key: 'invValue',       width: 16 },
    { header: 'Est. Profit',      key: 'estProfit',      width: 16 },
  ]
  styleHeader(ws.getRow(1))

  let totalCost = 0, totalValue = 0, totalProfit = 0

  products.forEach(p => {
    const cost    = Number(p.costPrice    ?? 0)
    const sell    = Number(p.sellingPrice ?? 0)
    const profit  = sell - cost
    const margin  = cost > 0 ? ((profit / cost) * 100) : 0
    const invCost = p.quantity * cost
    const invVal  = p.quantity * sell
    const estProfit = invVal - invCost

    totalCost   += invCost
    totalValue  += invVal
    totalProfit += estProfit

    const row = ws.addRow({
      sku: p.sku, name: p.name, category: p.category, qty: p.quantity, unit: p.unit,
      costPrice:   cost   > 0 ? cost.toFixed(2)    : '—',
      sellingPrice: sell  > 0 ? sell.toFixed(2)    : '—',
      profitUnit:  (cost > 0 && sell > 0) ? profit.toFixed(2) : '—',
      margin:      (cost > 0 && sell > 0) ? `${margin.toFixed(1)}%` : '—',
      invCost:     cost > 0 ? invCost.toFixed(2) : '—',
      invValue:    sell > 0 ? invVal.toFixed(2)  : '—',
      estProfit:   (cost > 0 && sell > 0) ? estProfit.toFixed(2) : '—',
    })

    // Color profit margin
    if (cost > 0 && sell > 0) {
      const marginCell = row.getCell('margin')
      if (margin >= 20) marginCell.font = { color: { argb: 'FF10B981' } }
      else if (margin >= 10) marginCell.font = { color: { argb: 'FFF59E0B' } }
      else marginCell.font = { color: { argb: 'FFEF4444' } }
    }
  })

  // Totals row
  const totalsRow = ws.addRow({
    name: 'TOTALS', qty: products.reduce((s, p) => s + p.quantity, 0),
    invCost: totalCost.toFixed(2), invValue: totalValue.toFixed(2),
    estProfit: totalProfit.toFixed(2),
  })
  totalsRow.font = { bold: true }
  totalsRow.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } } })

  ws.autoFilter = { from: 'A1', to: 'L1' }

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
