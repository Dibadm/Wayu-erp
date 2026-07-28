// app/api/ai/expiry-advice/route.ts
// Fetches real expiring batch data → AI generates specific action recommendations.
// Never guesses — all product names and dates come from the database.

import { NextRequest, NextResponse } from 'next/server'
import { getExpiryBatchDetails } from '@/lib/expiry'
import { getAIProvider } from '@/lib/ai-provider'
import { withAuth } from '@/lib/ai-route'

export async function GET(req: NextRequest) {
  return withAuth(req, async (req, session) => {
    const batches = await getExpiryBatchDetails()
    if (!batches.length) {
      return NextResponse.json({ advice: 'No expiring or expired batches found. Your inventory is in good shape.', provider: 'none' })
    }

    const expired  = batches.filter(b => b.tier === 'expired')
    const critical = batches.filter(b => b.tier === 'critical')
    const warning  = batches.filter(b => b.tier === 'warning')
    const soon     = batches.filter(b => b.tier === 'soon')

    const context = `
REAL EXPIRY DATA (from database, ${new Date().toLocaleDateString()}):

ALREADY EXPIRED — IMMEDIATE ACTION REQUIRED (${expired.length} batches):
${expired.map(b => `- ${b.product.name} (${b.product.sku}), Batch ${b.batchNumber}: ${b.quantity} units, expired ${b.expiryDate} @ ${b.location.name}`).join('\n') || 'None'}

EXPIRING WITHIN 7 DAYS — CRITICAL (${critical.length} batches):
${critical.map(b => `- ${b.product.name} (${b.product.sku}), Batch ${b.batchNumber}: ${b.quantity} units, expires ${b.expiryDate} (${b.daysLeft}d) @ ${b.location.name}`).join('\n') || 'None'}

EXPIRING WITHIN 14 DAYS — WARNING (${warning.length} batches):
${warning.map(b => `- ${b.product.name}: ${b.quantity} units, expires ${b.expiryDate} (${b.daysLeft}d)`).join('\n') || 'None'}

EXPIRING WITHIN 30 DAYS — MONITOR (${soon.length} batches):
${soon.map(b => `- ${b.product.name}: ${b.quantity} units, expires ${b.expiryDate} (${b.daysLeft}d)`).join('\n') || 'None'}`

    const prompt = `You are a pharmaceutical inventory compliance advisor. Based ONLY on this real expiry data, provide specific actionable recommendations. Do not invent product names or dates.

${context}

Write a concise advisory with these sections:
1. **Immediate Actions** (expired products — removal, quarantine, documentation)
2. **Priority Sales / Dispensing** (products expiring within 7 days)
3. **Supplier Returns** (if applicable — products expiring soon that could be returned)
4. **Discounting Recommendations** (products expiring within 14-30 days)
5. **Regulatory Compliance Notes** (documentation requirements for expired pharma)

Be specific — name actual products from the data. Keep each section to 2-3 bullet points. Total under 350 words.`

    const ai     = getAIProvider()
    const advice = await ai.complete({ prompt, maxTokens: 800 })
    return NextResponse.json({ advice, provider: ai.name, counts: { expired: expired.length, critical: critical.length, warning: warning.length, soon: soon.length } })
  })
}