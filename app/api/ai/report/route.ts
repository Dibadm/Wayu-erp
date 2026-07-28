// app/api/ai/report/route.ts
// Calculates real DB stats → passes only numbers to AI → returns narrative.
// Provider-agnostic: uses getAIProvider() from lib/ai-provider.ts.

import { NextRequest, NextResponse } from 'next/server'
import { getInventorySnapshot, getReorderRecommendations } from '@/lib/ai-inventory'
import { getAIProvider } from '@/lib/ai-provider'
import { withAuth } from '@/lib/ai-route'

export async function GET(req: NextRequest) {
  return withAuth(req, async (req, session) => {
    const [stats, reorder] = await Promise.all([
      getInventorySnapshot(),
      getReorderRecommendations(),
    ])

    const urgent  = reorder.filter(r => r.status === 'OUT_OF_STOCK' || r.status === 'REORDER_NOW')
    const watching = reorder.filter(r => r.status === 'REORDER_SOON' || r.status === 'WATCH')

    const statsContext = `
WAYU PHARMACEUTICAL — INVENTORY STATISTICS (${new Date().toLocaleDateString('en-PH', { dateStyle: 'full' })})

INVENTORY: ${stats.totalProducts} products · ${stats.totalStockUnits.toLocaleString()} units total · ${stats.lowStockCount} low stock · ${stats.outOfStockCount} out of stock

SALES:
- Today: ${stats.todaySales.units} units (${stats.todaySales.transactions} transactions)
- This week: ${stats.weeklySales.units} units (${stats.weeklySales.transactions} transactions)
- This month: ${stats.monthlySales.units} units (${stats.monthlySales.transactions} transactions)

EXPIRY STATUS:
- Already expired (active batches): ${stats.expiredItems.length}
- Expiring within 7 days: ${stats.expiringIn7Days.length} batches
- Expiring within 14 days: ${stats.expiringIn14Days.length} batches
- Expiring within 30 days: ${stats.expiringIn30Days.length} batches

EXPIRY DETAIL (30d):
${stats.expiringIn30Days.map(b => `- ${b.product} (${b.sku}): ${b.qty} units, expires ${b.expiry}`).join('\n') || 'None'}

EXPIRED REQUIRING ACTION:
${stats.expiredItems.slice(0, 10).map(b => `- ${b.product} (${b.sku}): ${b.qty} units, expired ${b.expiry} @ ${b.location}`).join('\n') || 'None'}

BEST SELLERS (30d):
${stats.bestSellers.map((p, i) => `${i + 1}. ${p.name}: ${p.unitsSold} units`).join('\n') || 'No data'}

SLOW MOVERS (30d):
${stats.slowMovers.map(p => `- ${p.name}: ${p.unitsSold} units`).join('\n') || 'No data'}

REORDER ALERTS — Urgent (${urgent.length}):
${urgent.map(r => `- ${r.name}: ${r.currentStock}/${r.minStockLevel} units`).join('\n') || 'None'}

REORDER ALERTS — Watch (${watching.length}):
${watching.map(r => `- ${r.name}: ~${r.daysOfStockRemaining ?? '?'} days remaining`).join('\n') || 'None'}`

    const prompt = `You are a pharmaceutical inventory analyst. Generate a professional management summary report based ONLY on these real statistics. Do not invent any numbers.

${statsContext}

Write a professional narrative report with these exact sections:
1. Executive Summary (2-3 sentences)
2. Stock Health
3. Sales Analysis
4. Expiry & Compliance Risks (include specific products expiring, value at risk, recommended actions)
5. Reorder Recommendations (prioritized)
6. Action Items (bullet list, most urgent first)

Be specific with numbers. Formal but clear tone. Under 500 words.`

    const ai = getAIProvider()
    const report = await ai.complete({ prompt, maxTokens: 1000 })

    return NextResponse.json({
      report,
      provider: ai.name,
      stats: {
        totalProducts:    stats.totalProducts,
        totalStockUnits:  stats.totalStockUnits,
        lowStockCount:    stats.lowStockCount,
        outOfStockCount:  stats.outOfStockCount,
        todaySales:       stats.todaySales,
        weeklySales:      stats.weeklySales,
        monthlySales:     stats.monthlySales,
        expiredCount:     stats.expiredItems.length,
        expiringIn7Days:  stats.expiringIn7Days.length,
        expiringIn14Days: stats.expiringIn14Days.length,
        expiringIn30Days: stats.expiringIn30Days.length,
        urgentReorders:   urgent.length,
      },
      generatedAt: new Date().toISOString(),
    })
  })
}
