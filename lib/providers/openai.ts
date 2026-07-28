// lib/providers/openai.ts
// OpenAI provider stub — ready to activate.
// Set AI_PROVIDER=openai and OPENAI_API_KEY in .env.local.
// Then fill in the implementation below.

import type { AIProvider, ChatRequest, CompletionRequest, VisionRequest } from './types'

const API_URL = 'https://api.openai.com/v1/chat/completions'
const DEFAULT_MODEL = 'gpt-4o-mini'  // cost-effective default

function headers() {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY is not set in environment variables.')
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
  }
}

async function callOpenAI(messages: unknown[], maxTokens = 1000): Promise<string> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ model: DEFAULT_MODEL, messages, max_tokens: maxTokens }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI API error ${res.status}: ${err}`)
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

export const openaiProvider: AIProvider = {
  name: 'openai',

  async complete({ system, prompt, maxTokens = 1000 }) {
    const messages = [
      ...(system ? [{ role: 'system', content: system }] : []),
      { role: 'user', content: prompt },
    ]
    return callOpenAI(messages, maxTokens)
  },

  async chat({ system, messages, maxTokens = 1000 }) {
    const openAIMessages = [
      ...(system ? [{ role: 'system', content: system }] : []),
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ]
    return callOpenAI(openAIMessages, maxTokens)
  },

  async vision({ media, prompt, maxTokens = 1000 }) {
    // GPT-4o supports base64 image content
    const messages = [{
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: { url: `data:${media.mimeType};base64,${media.base64}` },
        },
        { type: 'text', text: prompt },
      ],
    }]
    return callOpenAI(messages, maxTokens)
  },
}
