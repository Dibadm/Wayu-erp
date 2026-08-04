'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, Plus, Package, Loader2 } from 'lucide-react'
import { useDebounce } from '@/lib/hooks'

interface Product {
  id: string; sku: string; name: string; category: string
  quantity: number; unit: string
  sellingPrice: string | null; costPrice: string | null
  batches: { id: string; batchNumber: string; expiryDate: string; quantity: number }[]
}

interface Props {
  onAdd: (product: Product) => void
}

export default function ProductSearch({ onAdd }: Props) {
  const [query,    setQuery]    = useState('')
  const [results,  setResults]  = useState<Product[]>([])
  const [loading,  setLoading]  = useState(false)
  const [focused,  setFocused]  = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debouncedQuery = useDebounce(query, 200)

  // Auto-focus on mount (barcode scanner sends to focused input)
  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (!debouncedQuery.trim()) { setResults([]); return }
    setLoading(true)
    fetch(`/api/pos/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then(r => r.json())
      .then(setResults)
      .finally(() => setLoading(false))
  }, [debouncedQuery])

  function handleSelect(product: Product) {
    onAdd(product)
    setQuery('')
    setResults([])
    inputRef.current?.focus()
  }

  // Barcode: if query ends with Enter and exactly matches a SKU, auto-add
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && results.length === 1) {
      handleSelect(results[0])
    }
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 px-3 py-2.5 bg-zinc-900 border border-zinc-700 focus-within:border-blue-500/50 rounded-xl transition-colors">
        {loading
          ? <Loader2 className="w-4 h-4 text-zinc-500 animate-spin flex-shrink-0" />
          : <Search className="w-4 h-4 text-zinc-500 flex-shrink-0" />
        }
        <input
          ref={inputRef}
          className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 font-mono outline-none"
          placeholder="Search product or scan barcode…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        <kbd className="text-[10px] font-mono text-zinc-700 bg-zinc-800 px-1.5 py-0.5 rounded">↵</kbd>
      </div>

      {/* Results dropdown */}
      {focused && results.length > 0 && (
        <div className="absolute top-full mt-1.5 left-0 right-0 z-30 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto">
          {results.map(product => (
            <button
              key={product.id}
              onMouseDown={() => handleSelect(product)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left border-b border-zinc-800/50 last:border-0"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Package className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-200 font-medium truncate">{product.name}</p>
                <p className="text-[10px] font-mono text-zinc-500">{product.sku} · {product.quantity} {product.unit} in stock</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-mono font-semibold text-emerald-400">
                  ₱{Number(product.sellingPrice ?? 0).toFixed(2)}
                </p>
                <p className="text-[10px] font-mono text-zinc-600">{product.category}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {focused && query && !loading && results.length === 0 && (
        <div className="absolute top-full mt-1.5 left-0 right-0 z-30 bg-zinc-900 border border-zinc-700 rounded-xl p-4 text-center text-xs font-mono text-zinc-600">
          No products found for &quot;{query}&quot;
        </div>
      )}
    </div>
  )
}
