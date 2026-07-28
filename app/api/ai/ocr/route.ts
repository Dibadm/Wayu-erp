// app/api/ai/ocr/route.ts
// Invoice OCR — uses AI vision (provider-agnostic) to extract line items.
// Returns structured JSON for user review BEFORE any DB write.

import { NextRequest, NextResponse } from 'next/server'
import { getAIProvider } from '@/lib/ai-provider'
import type { MediaContent } from '@/lib/ai-provider'
import { withAuth } from '@/lib/ai-route'

const OCR_PROMPT = `Extract all pharmaceutical/inventory line items from this invoice or delivery receipt.

Return ONLY a valid JSON array (no markdown, no explanation) in this exact format:
[
  {
    "productName": "exact product name as written",
    "quantity": 100,
    "unitPrice": 25.50,
    "batchNumber": "batch or lot number or null",
    "expiryDate": "YYYY-MM-DD or null",
    "supplier": "supplier/manufacturer name or null",
    "unit": "tablets/capsules/vials/units/etc"
  }
]

Rules:
- Extract every line item visible
- If a field is not visible or unclear, use null
- quantity must be a number
- unitPrice must be a number or null
- expiryDate must be YYYY-MM-DD format or null
- If no items found, return []`

export async function POST(req: NextRequest) {
  return withAuth(req, async (req, session) => {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

    if (file.size > 10 * 1024 * 1024)
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
    if (!allowed.includes(file.type))
      return NextResponse.json({ error: 'Unsupported file type. Use JPEG, PNG, WebP, or PDF.' }, { status: 400 })

    const bytes  = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    const media: MediaContent = file.type === 'application/pdf'
      ? { type: 'document', base64, mimeType: 'application/pdf' }
      : { type: 'image',    base64, mimeType: file.type as any }

    const ai   = getAIProvider()
    const text = await ai.vision({ media, prompt: OCR_PROMPT, maxTokens: 1000 })

    // Safely parse — strip markdown fences if any
    let items = []
    try {
      const clean = text.replace(/```json|```/g, '').trim()
      items = JSON.parse(clean)
      if (!Array.isArray(items)) items = []
    } catch {
      items = []
    }

    return NextResponse.json({ items, provider: ai.name })
  })
}
