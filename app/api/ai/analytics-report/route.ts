// app/api/ai/analytics-report/route.ts
// Reuses the exact same pattern as /api/ai/report:
//   1. Query DB via lib/analytics.ts
//   2. Summarise to numbers only — no raw rows sent to AI
//   3. Call getAIProvider().complete() — provider-agnostic
//   4. Return narrative + stats

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAnalyticsData, type Period } from '@/lib/analytics'
import { getAIProvider } from '@/lib/ai-provider'

function fmt(n: number) { return n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function fmtN(n: number) { return n.toLocaleString() }

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const period = (searchParams.get('period') ?? 'month') as Period
  const from   = searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined
  const to     = searchParams.get('to')   ? new Date(searchParams.get('to')!)   : undefined

  try {
    const data = await getAnalyticsData(period, from, to)
    const { kpis, charts, period: p } = data

    // Build a compact statistical summary — only numbers, no raw rows
    const statsContext = `
WAYU PHARMACEUTICAL — ANALYTICS REPORT
Period: ${p.label} (${new Date(p.start).toLocaleDateString()} – ${new Date(p.end).toLocaleDateString()}, ${p.days} days)
Generated: ${new Date().toLocaleDateString('en-PH', { dateStyle: 'full' })}

─── FINANCIAL PERFORMANCE ───
Revenue:           ₱${fmt(kpis.revenue)}  (${kpis.revenueTrend > 0 ? '+' : ''}${kpis.revenueTrend}% vs prior period)
COGS:              ₱${fmt(kpis.expenses)}
Gross Profit:      ₱${fmt(kpis.profit)}   (${kpis.profitTrend > 0 ? '+' : ''}${kpis.profitTrend}% vs prior period)
Gross Margin:      ${kpis.marginPct}%
Purchase Expenses: ₱${fmt(kpis.expenses)} (${kpis.expensesTrend > 0 ? '+' : ''}${kpis.expensesTrend}% vs prior period)

─── SALES PERFORMANCE ───
Units Sold:        ${fmtN(kpis.unitsSold)} (${kpis.unitsSoldTrend > 0 ? '+' : ''}${kpis.unitsSoldTrend}% vs prior period)
Avg Daily Sales:   ${kpis.avgDailySales} units/day
Top 5 Products:
${charts.topProducts.slice(0, 5).map((p, i) => `  ${i + 1}. ${p.name}: ${p.unitsSold} units · ₱${fmt(p.revenue)}`).join('\n') || '  No sales data'}
Slow/Zero-Sales Products:
${charts.slowProducts.slice(0, 5).map(p => `  - ${p.name}: ${p.unitsSold} units`).join('\n') || '  None'}

─── INVENTORY HEALTH ───
Total Products:       ${fmtN(kpis.totalProducts)}
Total Units on Hand:  ${fmtN(kpis.totalUnits)}
Inventory Cost Value: ₱${fmt(kpis.inventoryCost)}
Inventory Retail Value: ₱${fmt(kpis.inventoryValue)}
Low Stock Items:      ${kpis.lowStockCount}
Out of Stock:         ${kpis.outOfStock}
Stock Health Score:   ${kpis.stockHealth}/100
Inventory Turnover:   ${kpis.inventoryTurnover}x/year

─── EXPIRY RISK ───
Products expiring within 30 days: ${charts.expiringData.length} batches
Inventory at risk value: ₱${fmt(kpis.expiryRisk)}
${charts.expiringData.slice(0, 5).map(b => `  - ${b.name}: ${b.quantity} units, ${b.daysLeft < 0 ? 'EXPIRED' : b.daysLeft + 'd left'}, ₱${fmt(b.value)} at risk`).join('\n') || '  None'}

─── CATEGORY PERFORMANCE ───
${charts.categoryBreakdown.slice(0, 5).map(c => `  ${c.name}: ${c.units} units · ₱${fmt(c.revenue)} revenue · ₱${fmt(c.profit)} profit`).join('\n') || '  No category data'}

─── COMPOSITE SCORES ───
Business Health Score: ${kpis.businessHealth}/100
Gross Margin:          ${kpis.marginPct}%
Inventory Turnover:    ${kpis.inventoryTurnover}x/year`

    const prompt = `You are a pharmaceutical business analyst for WAYU Pharmaceutical Company. Generate a professional analytics report based ONLY on these real statistics. Do not invent any numbers.

${statsContext}

Write a structured management report with these exact sections:

**Executive Summary** (3-4 sentences: overall performance assessment)

**Business Insights** (3-4 bullets: key trends and notable findings)

**Sales Insights** (3-4 bullets: sales performance, top products, velocity)

**Inventory Insights** (2-3 bullets: stock health, turnover, valuation)

**Profit & Margin Analysis** (2-3 bullets: margin quality, cost structure)

**Cost Reduction Suggestions** (2-3 bullets: specific, actionable)

**Growth Opportunities** (2-3 bullets: data-driven opportunities)

**Priority Action Items** (bullet list, most urgent first, max 5)

Be specific with numbers. Use ₱ for currency. Professional tone. Total under 600 words.`

    const ai      = getAIProvider()
    const report  = await ai.complete({ prompt, maxTokens: 1200 })

    return NextResponse.json({
      report,
      provider: ai.name,
      kpis,
      generatedAt: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('[AI Analytics Report]', err)
    return NextResponse.json({ error: err.message ?? 'Report generation failed.' }, { status: 500 })
  }
}
