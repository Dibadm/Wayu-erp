'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, X, Send, Loader2, FlaskConical } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  'Which products are running low?',
  'What sold today?',
  "What is today's profit?",
  'Who are the best customers?',
  'Which products generate the highest profit?',
  'What expires within 30 days?',
]

export default function AIChat() {
  const [open,    setOpen]    = useState(false)
  const [messages, setMessages] = useState<Message[]>([{
    role:    'assistant',
    content: "Hi! I'm WAYU AI, your pharmaceutical inventory assistant. I have live access to your inventory and sales data. Ask me anything about stock levels, expiry dates, sales, or reorder needs.",
  }])
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 150) }, [open])

  async function send(text?: string) {
    const content = (text ?? input).trim()
    if (!content || loading) return
    const newMessages: Message[] = [...messages, { role: 'user', content }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    try {
      const res  = await fetch('/api/ai/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messages: newMessages }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, {
        role:    'assistant',
        content: data.reply ?? data.error ?? 'Sorry, something went wrong.',
      }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Network error. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full btn-primary shadow-lg"
            title="Open AI Assistant"
          >
            <Bot className="w-5 h-5" />
            <span className="text-sm font-medium">AI</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 w-96 flex flex-col glass-card overflow-hidden"
            style={{ height: 560, maxHeight: 'calc(100vh - 96px)', boxShadow: 'var(--shadow-lg)' }}
          >
            {/* Header */}
            <div
              className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
              style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-muted)' }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--accent-blue-bg)', border: '1px solid var(--accent-blue-border)' }}
              >
                <FlaskConical className="w-4 h-4" style={{ color: 'var(--accent-blue)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">WAYU AI Assistant</p>
                <p className="text-[10px] font-mono flex items-center gap-1" style={{ color: 'var(--accent-emerald)' }}>
                  <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: 'var(--accent-emerald)' }} />
                  Live inventory access
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center mr-2 mt-0.5 flex-shrink-0"
                      style={{ background: 'var(--accent-blue-bg)', border: '1px solid var(--accent-blue-border)' }}
                    >
                      <Bot className="w-3 h-3" style={{ color: 'var(--accent-blue)' }} />
                    </div>
                  )}
                  <div
                    className="max-w-[82%] px-3 py-2 rounded-xl text-xs leading-relaxed whitespace-pre-wrap"
                    style={msg.role === 'user'
                      ? { background: 'var(--accent-blue)', color: 'white', borderRadius: '12px 12px 2px 12px' }
                      : { background: 'var(--bg-muted)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '12px 12px 12px 2px' }
                    }
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center mr-2 mt-0.5"
                    style={{ background: 'var(--accent-blue-bg)', border: '1px solid var(--accent-blue-border)' }}
                  >
                    <Bot className="w-3 h-3" style={{ color: 'var(--accent-blue)' }} />
                  </div>
                  <div
                    className="px-3 py-2 rounded-xl flex items-center gap-1.5"
                    style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)' }}
                  >
                    <Loader2 className="w-3 h-3 animate-spin" style={{ color: 'var(--text-muted)' }} />
                    <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Querying inventory…</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Suggestion chips */}
            {messages.length <= 1 && (
              <div className="px-3 pb-2 flex flex-wrap gap-1.5 flex-shrink-0">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-[10px] font-mono px-2 py-1 rounded-full transition-colors"
                    style={{
                      background: 'var(--bg-muted)',
                      border:     '1px solid var(--border)',
                      color:      'var(--text-secondary)',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div
              className="flex items-center gap-2 px-3 py-3 flex-shrink-0"
              style={{ borderTop: '1px solid var(--border)' }}
            >
              <input
                ref={inputRef}
                className="flex-1 px-3 py-2 rounded-lg text-xs font-mono outline-none transition-colors"
                style={{
                  background: 'var(--bg-input)',
                  border:     '1px solid var(--border)',
                  color:      'var(--text-primary)',
                }}
                placeholder="Ask about stock, expiry, sales…"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                disabled={loading}
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || loading}
                className="w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0 transition-colors disabled:opacity-40"
                style={{ background: 'var(--accent-blue)', color: 'white' }}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
