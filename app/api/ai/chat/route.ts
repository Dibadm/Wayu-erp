// app/api/ai/chat/route.ts
// AI chat — queries live DB first, then sends real data to whichever
// AI provider is configured via AI_PROVIDER env var.
// v2.2: extended with POS data (today's sales, profit, best customers, top profit products)

import { NextRequest, NextResponse } from 'next/server'
import { getInventorySnapshot, searchProducts, getPOSSnapshot } from '@/lib/ai-inventory'
import { getAIProvider } from '@/lib/ai-provider'
import { withAuth } from '@/lib/ai-route'

const SYSTEM_PROMPT = `You are WAYU AI, a pharmaceutical inventory and POS assistant for WAYU Pharmaceutical Company.

You have access to REAL-TIME inventory and sales data pulled directly from the database.

CRITICAL RULES:
- ONLY use the data provided. Never invent quantities, sales figures, or customer names.
- Be concise and direct. Answer in 2-4 sentences unless a list is needed.
- Use a professional but friendly tone suitable for a pharmaceutical company.
- When listing items, use bullet points.
- When quantities are concerning (low stock, expired), flag it clearly.
- Never modify data or promise to take actions — you are read-only.
- Always mention data is live/real-time when giving stock or sales figures.
- For currency use ETB (Ethiopian Birr).`

function isPOSQuestion(msg: string) {
  return /sold today|today.*sal|profit.*today|today.*profit|best customer|top customer|who.*buy|revenue today|today.*revenue|average sale|daily sale|today.*transaction|what sold|highest profit product/i.test(msg)
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (req, session) => {
    const { messages } = await req.json()
    if (!messages?.length) return NextResponse.json({ error: 'No messages' }, { status: 400 })

    const lastMessage = messages[messages.length - 1]?.content ?? ''

    const productMatch = lastMessage.match(
      /(?:how many|stock of|units of|quantity of|search for|find|about|tell me about)\s+(.+?)(?:\?|$)/i
    )
    const specificProduct = productMatch?.[1]?.trim()

    const [snapshot, posSnapshot] = await Promise.all([
      getInventorySnapshot(),
      isPOSQuestion(lastMessage) ? getPOSSnapshot() : Promise.resolve(null),
    ])

    let productDetail = ''
    if (specificProduct && specificProduct.length > 2) {
      const found = await searchProducts(specificProduct)
      if (found.length > 0) {
        productDetail = `\n\nSPECIFIC PRODUCT SEARCH for "${specificProduct}":\n` +
          found.map(p =>
            `- ${p.name} (${p.sku}): ${p.quantity} ${p.unit}, min: ${p.minStockLevel}` +
            `${p.batches[0] ? `, nearest expiry: ${p.batches[0].expiryDate.toISOString().split('T')[0]}` : ''}`
          ).join('\n')
      }
    }

    const inventoryContext = buildInventoryContext(snapshot, productDetail)
    const posContext       = posSnapshot ? buildPOSContext(posSnapshot) : ''
    const system           = `${SYSTEM_PROMPT}\n\n${inventoryContext}${posContext}`

    const ai    = getAIProvider()
    const reply = await ai.chat({ system, messages, maxTokens: 1000 })

    return NextResponse.json({ reply, provider: ai.name })
  }, '[AI Chat]')
}

function buildInventoryContext(snapshot: Awaited<ReturnType<typeof getInventorySnapshot>>, productDetail: string) {
  return `
LIVE INVENTORY DATA (${new Date().toISOString()}):

SUMMARY: ${snapshot.totalProducts} products · ${snapshot.totalStockUnits.toLocaleString()} total units · ${snapshot.lowStockCount} low stock · ${snapshot.outOfStockCount} out of stock

STOCK MOVEMENTS (units): Today ${snapshot.todaySales.units} units out (${snapshot.todaySales.transactions} tx) · Week ${snapshot.weeklySales.units} units · Month ${snapshot.monthlySales.units} units

LOW STOCK:
${snapshot.lowStockItems.map(p => `- ${p.name} (${p.sku}): ${p.quantity}/${p.min}`).join('\n') || '- None'}

OUT OF STOCK:
${snapshot.outOfStockItems.map(p => `- ${p.name} (${p.sku})`).join('\n') || '- None'}

EXPIRY — Within 7 days:
${snapshot.expiringIn7Days.map(b => `- ${b.product} (${b.sku}): ${b.qty} units, expires ${b.expiry} @ ${b.location}`).join('\n') || '- None'}

EXPIRY — Within 30 days:
${snapshot.expiringIn30Days.map(b => `- ${b.product}: ${b.qty} units, expires ${b.expiry}`).join('\n') || '- None'}

ALREADY EXPIRED:
${snapshot.expiredItems.map(b => `- ${b.product} (${b.sku}): ${b.qty} units, expired ${b.expiry}`).join('\n') || '- None'}

BEST SELLERS (30d): ${snapshot.bestSellers.map((p, i) => `${i + 1}. ${p.name} (${p.unitsSold} units)`).join(' · ') || 'No data'}

ALL PRODUCTS:
${snapshot.allProducts.map(p => `- ${p.name} (${p.sku}): ${p.quantity} ${p.unit}${p.nearestExpiry ? `, exp: ${p.nearestExpiry}` : ''}`).join('\n')}
${productDetail}`
}

function buildPOSContext(pos: Awaited<ReturnType<typeof getPOSSnapshot>>) {
  const f = (n: number) => `ETB ${n.toLocaleString('en-ET', { minimumFractionDigits: 2 })}`
  return `

LIVE POS / SALES DATA (${new Date().toISOString()}):

TODAY'S SALES:
- Revenue: ${f(pos.today.revenue)}
- Profit:  ${f(pos.today.profit)}
- Discounts given: ${f(pos.today.discounts)}
- Transactions: ${pos.today.transactions}
- Average sale: ${f(pos.today.avgSale)}

THIS WEEK: ${f(pos.week.revenue)} revenue · ${f(pos.week.profit)} profit · ${pos.week.transactions} transactions
THIS MONTH: ${f(pos.month.revenue)} revenue · ${f(pos.month.profit)} profit · ${pos.month.transactions} transactions

BEST CUSTOMERS (by lifetime value):
${pos.bestCustomers.map((c, i) => `${i + 1}. ${c.name}: ETB ${c.totalSpent.toFixed(2)} spent · ${c.purchases} purchases · ETB ${c.totalProfit.toFixed(2)} profit`).join('\n') || '- No customer data'}

TOP PROFIT PRODUCTS (last 30 days):
${pos.topProfitProducts.map((p, i) => `${i + 1}. ${p.name} (${p.sku}): ETB ${p.profit.toFixed(2)} profit · ${p.unitsSold} units sold`).join('\n') || '- No data'}

TODAY'S TRANSACTIONS:
${pos.todayTransactions.slice(0, 10).map(s => `- ${s.receipt}: ${s.customer} · ${f(s.total)} · ${s.payments} · [${s.items.slice(0,3).join(', ')}${s.items.length > 3 ? '…' : ''}]`).join('\n') || '- No sales today yet'}`
}
