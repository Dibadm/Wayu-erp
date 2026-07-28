// lib/providers/gemini.ts
// Google Gemini provider — implements AIProvider.
// DEFAULT provider. Set AI_PROVIDER=gemini and GEMINI_API_KEY in .env.local.
// Uses gemini-1.5-flash for cost-efficiency (vision + text).

import type { AIProvider, ChatMessage, ChatRequest, CompletionRequest, VisionRequest } from './types'

const DEFAULT_MODEL = 'gemini-1.5-flash'
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

function apiUrl(stream = false) {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY is not set in environment variables.')
  const action = stream ? 'streamGenerateContent' : 'generateContent'
  return `${API_BASE}/${DEFAULT_MODEL}:${action}?key=${key}`
}

// Map our ChatMessage[] to Gemini's "contents" format
function toGeminiContents(messages: ChatMessage[]) {
  return messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))
}

// Prepend system instruction as a user turn if provided (Gemini Flash supports systemInstruction)
function buildBody(contents: unknown[], system?: string, maxTokens = 1000) {
  return {
    contents,
    ...(system && {
      systemInstruction: { parts: [{ text: system }] },
    }),
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: 0.3,
    },
  }
}

async function callGemini(body: Record<string, unknown>): Promise<string> {
  const res = await fetch(apiUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini API error ${res.status}: ${err}`)
  }
  const data = await res.json()
  // Extract text from first candidate
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

export const geminiProvider: AIProvider = {
  name: 'gemini',

  async complete({ system, prompt, maxTokens = 1000 }) {
    const contents = [{ role: 'user', parts: [{ text: prompt }] }]
    return callGemini(buildBody(contents, system, maxTokens))
  },

  async chat({ system, messages, maxTokens = 1000 }) {
    const contents = toGeminiContents(messages)
    return callGemini(buildBody(contents, system, maxTokens))
  },

  async vision({ media, prompt, maxTokens = 1000 }) {
    // Gemini handles both images and PDFs as inline_data parts
    const contents = [{
      role: 'user',
      parts: [
        {
          inline_data: {
            mime_type: media.mimeType,
            data: media.base64,
          },
        },
        { text: prompt },
      ],
    }]
    return callGemini(buildBody(contents, undefined, maxTokens))
  },
}
