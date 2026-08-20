import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  generateInventoryExcel,
  generateDispensingSummaryHTML,
  generateSupplierExcel,
  generatePurchaseOrderExcel,
  generateValuationExcel,
} from '@/lib/reports'
import {
  generateDeadStockExcel,
  generateMonthlyReceivedExcel,
  generateMonthlySoldExcel,
  generateAdjustmentHistoryExcel,
  generateFastSlowMovingExcel,
  generateCollectionPerformanceExcel,
  generateCreditExposureExcel,
  generatePaymentHistoryExcel,
  generateDailyCollectionExcel,
  generateOutstandingReceivableExcel,
  generateAgingAnalysisExcel,
  generateCustomerCreditSummaryExcel,
  generateOverdueCustomersExcel,
  generateSalesPeriodExcel,
  generateProductSalesAnalysisExcel,
  generateCustomerSalesAnalysisExcel,
  generateSalesTrendExcel,
  generateTopSellingProductsExcel,
  generateSalespersonPerformanceExcel,
} from '@/lib/reports-ext'
import { writeAuditLog } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const type     = searchParams.get('type') ?? 'inventory'
  const format   = searchParams.get('format') ?? 'excel'
  const dateFrom = searchParams.get('from') ? new Date(searchParams.get('from')!) : new Date(Date.now() - 30 * 86400000)
  const dateTo   = searchParams.get('to')   ? new Date(searchParams.get('to')!)   : new Date()
  const period   = searchParams.get('period') ?? 'month'

  const userId = (session.user as any).id

  await writeAuditLog({
    userId,
    action:     'EXPORT',
    entity:     'Report',
    entityId:   'report',
    entityName: `${type}-${format}`,
    reason:     `Report export: ${type} (${format})`,
  })

  // Excel reports
  if (format === 'excel') {
    let buffer: Buffer
    let filename: string

    switch (type) {
      case 'suppliers':
        buffer   = await generateSupplierExcel()
        filename = `wayu-suppliers-${new Date().toISOString().split('T')[0]}.xlsx`
        break
      case 'purchase-orders':
        buffer   = await generatePurchaseOrderExcel()
        filename = `wayu-purchase-orders-${new Date().toISOString().split('T')[0]}.xlsx`
        break
      case 'valuation':
        buffer   = await generateValuationExcel()
        filename = `wayu-valuation-${new Date().toISOString().split('T')[0]}.xlsx`
        break
      case 'dead-stock':
        buffer   = await generateDeadStockExcel()
        filename = `wayu-dead-stock-${new Date().toISOString().split('T')[0]}.xlsx`
        break
      case 'monthly-received':
        buffer   = await generateMonthlyReceivedExcel(dateFrom, dateTo)
        filename = `wayu-monthly-received-${dateFrom.toISOString().split('T')[0]}.xlsx`
        break
      case 'monthly-sold':
        buffer   = await generateMonthlySoldExcel(dateFrom, dateTo)
        filename = `wayu-monthly-sold-${dateFrom.toISOString().split('T')[0]}.xlsx`
        break
      case 'adjustment-history':
        buffer   = await generateAdjustmentHistoryExcel()
        filename = `wayu-adjustment-history-${new Date().toISOString().split('T')[0]}.xlsx`
        break
      case 'fast-slow-moving':
        buffer   = await generateFastSlowMovingExcel()
        filename = `wayu-fast-slow-moving-${new Date().toISOString().split('T')[0]}.xlsx`
        break
      case 'collection-performance':
        buffer   = await generateCollectionPerformanceExcel()
        filename = `wayu-collection-performance-${new Date().toISOString().split('T')[0]}.xlsx`
        break
      case 'credit-exposure':
        buffer   = await generateCreditExposureExcel()
        filename = `wayu-credit-exposure-${new Date().toISOString().split('T')[0]}.xlsx`
        break
      case 'payment-history':
        buffer   = await generatePaymentHistoryExcel()
        filename = `wayu-payment-history-${new Date().toISOString().split('T')[0]}.xlsx`
        break
      case 'daily-collection':
        buffer   = await generateDailyCollectionExcel(dateFrom, dateTo)
        filename = `wayu-daily-collection-${dateFrom.toISOString().split('T')[0]}.xlsx`
        break
      case 'outstanding-receivable':
        buffer   = await generateOutstandingReceivableExcel()
        filename = `wayu-outstanding-receivable-${new Date().toISOString().split('T')[0]}.xlsx`
        break
      case 'aging-analysis':
        buffer   = await generateAgingAnalysisExcel()
        filename = `wayu-aging-analysis-${new Date().toISOString().split('T')[0]}.xlsx`
        break
      case 'customer-credit-summary':
        buffer   = await generateCustomerCreditSummaryExcel()
        filename = `wayu-customer-credit-summary-${new Date().toISOString().split('T')[0]}.xlsx`
        break
      case 'overdue-customers':
        buffer   = await generateOverdueCustomersExcel()
        filename = `wayu-overdue-customers-${new Date().toISOString().split('T')[0]}.xlsx`
        break
      case 'sales-period':
        buffer   = await generateSalesPeriodExcel(dateFrom, dateTo, period as 'day' | 'week' | 'month')
        filename = `wayu-${period}-sales-${dateFrom.toISOString().split('T')[0]}.xlsx`
        break
      case 'product-sales-analysis':
        buffer   = await generateProductSalesAnalysisExcel(dateFrom, dateTo)
        filename = `wayu-product-sales-${dateFrom.toISOString().split('T')[0]}.xlsx`
        break
      case 'customer-sales-analysis':
        buffer   = await generateCustomerSalesAnalysisExcel(dateFrom, dateTo)
        filename = `wayu-customer-sales-${dateFrom.toISOString().split('T')[0]}.xlsx`
        break
      case 'sales-trend':
        buffer   = await generateSalesTrendExcel(dateFrom, dateTo)
        filename = `wayu-sales-trend-${dateFrom.toISOString().split('T')[0]}.xlsx`
        break
      case 'top-selling-products':
        buffer   = await generateTopSellingProductsExcel(dateFrom, dateTo)
        filename = `wayu-top-selling-${dateFrom.toISOString().split('T')[0]}.xlsx`
        break
      case 'salesperson-performance':
        buffer   = await generateSalespersonPerformanceExcel(dateFrom, dateTo)
        filename = `wayu-salesperson-performance-${dateFrom.toISOString().split('T')[0]}.xlsx`
        break
      case 'inventory':
      default:
        buffer   = await generateInventoryExcel()
        filename = `wayu-inventory-${new Date().toISOString().split('T')[0]}.xlsx`
        break
    }

    return new NextResponse(Buffer.from(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  }

  // PDF / HTML reports
  if (format === 'pdf') {
    const html = await generateDispensingSummaryHTML(dateFrom, dateTo)
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  return NextResponse.json({ error: 'Invalid format.' }, { status: 400 })
}
