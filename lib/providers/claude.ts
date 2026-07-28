// lib/providers/claude.ts
// Anthropic Claude provider — implements AIProvider.
// Set AI_PROVIDER=claude and ANTHROPIC_API_KEY in .env.local to use.

import type { AIProvider, ChatRequest, CompletionRequest, VisionRequest } from './types'

const API_URL = 'https://api.anthropic.com/v1/messages'
const DEFAULT_MODEL = 'claude-sonnet-4-6'

function headers() {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set in environment variables.')
  return {
    'Content-Type': 'application/json',
    'x-api-key': key,
    'anthropic-version': '2023-06-01',
  }
}

async function callClaude(body: Record<string, unknown>): Promise<string> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ model: DEFAULT_MODEL, ...body }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Claude API error ${res.status}: ${err}`)
  }
  const data = await res.json()
  return data.content?.[0]?.text ?? ''
}

export const claudeProvider: AIProvider = {
  name: 'claude',

  async complete({ system, prompt, maxTokens = 1000 }) {
    return callClaude({
      max_tokens: maxTokens,
      ...(system && { system }),
      messages: [{ role: 'user', content: prompt }],
    })
  },

  async chat({ system, messages, maxTokens = 1000 }) {
    return callClaude({
      max_tokens: maxTokens,
      ...(system && { system }),
      messages,
    })
  },

  async vision({ media, prompt, maxTokens = 1000 }) {
    // Claude uses 'document' type for PDFs, 'image' for images
    const contentBlock =
      media.type === 'document'
        ? { type: 'document', source: { type: 'base64', media_type: media.mimeType, data: media.base64 } }
        : { type: 'image',    source: { type: 'base64', media_type: media.mimeType, data: media.base64 } }

    return callClaude({
      max_tokens: maxTokens,
      messages: [{
        role: 'user',
        content: [contentBlock, { type: 'text', text: prompt }],
      }],
    })
  },
}
