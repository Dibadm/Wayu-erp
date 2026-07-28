// lib/providers/types.ts
// Every AI provider must implement this interface.
// Adding a new provider = implement AIProvider + register in ai-provider.ts.
// No other file needs to change.

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ImageContent {
  type: 'image'
  base64: string
  mimeType: string  // image/jpeg | image/png | image/webp
}

export interface DocumentContent {
  type: 'document'
  base64: string
  mimeType: 'application/pdf'
}

export type MediaContent = ImageContent | DocumentContent

// Single text completion (report generation, reorder analysis)
export interface CompletionRequest {
  system?: string
  prompt: string
  maxTokens?: number
}

// Multi-turn chat
export interface ChatRequest {
  system?: string
  messages: ChatMessage[]
  maxTokens?: number
}

// Vision / OCR: one user message with file + text
export interface VisionRequest {
  media: MediaContent
  prompt: string
  maxTokens?: number
}

export interface AIProvider {
  readonly name: string

  /** Single-turn text generation */
  complete(req: CompletionRequest): Promise<string>

  /** Multi-turn chat */
  chat(req: ChatRequest): Promise<string>

  /** Vision — image or PDF understanding */
  vision(req: VisionRequest): Promise<string>
}
