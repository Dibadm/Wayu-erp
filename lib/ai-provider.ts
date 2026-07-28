// lib/ai-provider.ts
// ─────────────────────────────────────────────────────────────────────────────
// SINGLE ENTRY POINT for all AI features.
// Every AI call in the app goes through getAIProvider() — nothing else.
//
// To switch providers: change AI_PROVIDER in .env.local
//   AI_PROVIDER=gemini   → Google Gemini (DEFAULT — most cost-effective)
//   AI_PROVIDER=claude   → Anthropic Claude
//   AI_PROVIDER=openai   → OpenAI GPT
//
// To add a new provider:
//   1. Create lib/providers/myprovider.ts implementing AIProvider
//   2. Import it below and add a case in the switch
//   3. Set AI_PROVIDER=myprovider in env — done
// ─────────────────────────────────────────────────────────────────────────────

import type { AIProvider } from './providers/types'

// Lazy-loaded provider singletons (avoids importing unused SDKs)
let _provider: AIProvider | null = null

export function getAIProvider(): AIProvider {
  if (_provider) return _provider

  const name = (process.env.AI_PROVIDER ?? 'gemini').toLowerCase().trim()

  switch (name) {
    case 'gemini': {
      const { geminiProvider } = require('./providers/gemini')
      _provider = geminiProvider
      break
    }
    case 'claude': {
      const { claudeProvider } = require('./providers/claude')
      _provider = claudeProvider
      break
    }
    case 'openai': {
      const { openaiProvider } = require('./providers/openai')
      _provider = openaiProvider
      break
    }
    default:
      throw new Error(
        `Unknown AI_PROVIDER: "${name}". Valid options: gemini, claude, openai. ` +
        `Check your .env.local file.`
      )
  }

  console.log(`[AI] Using provider: ${_provider!.name}`)
  return _provider!
}

// Re-export types so callers don't need to import from providers/types
export type { AIProvider, ChatMessage, CompletionRequest, ChatRequest, VisionRequest, MediaContent, ImageContent, DocumentContent } from './providers/types'
