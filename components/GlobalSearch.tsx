'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'
import Link from 'next/link'

type SearchResult = {
  id: string
  name: string
  sku?: string
  category?: string
  email?: string
  phone?: string
  type: 'product' | 'customer' | 'supplier'
}

export default function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ products: SearchResult[]; customers: SearchResult[]; suppliers: SearchResult[] }>({
    products: [],
    customers: [],
    suppliers: [],
  })
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!query.trim()) {
      setResults({ products: [], customers: [], suppliers: [] })
      setOpen(false)
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const [productsRes, customersRes, suppliersRes] = await Promise.all([
          fetch(`/api/products?search=${encodeURIComponent(query)}`).then(r => r.json()),
          fetch(`/api/customers?search=${encodeURIComponent(query)}`).then(r => r.json()),
          fetch(`/api/suppliers?search=${encodeURIComponent(query)}`).then(r => r.json()),
        ])

        const products: SearchResult[] = (Array.isArray(productsRes) ? productsRes : []).slice(0, 5).map((p: any) => ({
          id: p.id, name: p.name, sku: p.sku, category: p.category, type: 'product',
        }))
        const customers: SearchResult[] = (Array.isArray(customersRes) ? customersRes : []).slice(0, 5).map((c: any) => ({
          id: c.id, name: c.name, phone: c.phone, email: c.email, type: 'customer',
        }))
        const suppliers: SearchResult[] = (Array.isArray(suppliersRes) ? suppliersRes : []).slice(0, 5).map((s: any) => ({
          id: s.id, name: s.name, phone: s.phone, email: s.email, type: 'supplier',
        }))

        setResults({ products, customers, suppliers })
        setOpen(true)
      } catch {
        setResults({ products: [], customers: [], suppliers: [] })
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const totalResults = results.products.length + results.customers.length + results.suppliers.length

  function getHref(item: SearchResult): string {
    switch (item.type) {
      case 'product': return `/inventory/${item.id}`
      case 'customer': return `/customers/${item.id}`
      case 'supplier': return `/suppliers/${item.id}`
    }
  }

  function getSubtitle(item: SearchResult): string {
    switch (item.type) {
      case 'product': return item.sku ? `SKU: ${item.sku}` : item.category ?? ''
      case 'customer': return [item.phone, item.email].filter(Boolean).join(' · ') ?? ''
      case 'supplier': return [item.phone, item.email].filter(Boolean).join(' · ') ?? ''
    }
  }

  return (
    <div ref={ref} className="flex-1 relative max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
      <input
        type="text"
        placeholder="Search products, customers, suppliers…"
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="w-full pl-9 pr-12 py-1.5 text-sm rounded-lg font-mono transition-all duration-150"
        style={{
          background:    'var(--bg-muted)',
          border:        '1px solid var(--border)',
          color:         'var(--text-primary)',
        }}
      />
      <kbd
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono px-1.5 py-0.5 rounded"
        style={{ color: 'var(--text-muted)', background: 'var(--border)', border: '1px solid var(--border-strong)' }}
      >
        ⌘K
      </kbd>

      {open && query && (
        <div
          className="absolute top-full mt-2 z-50 rounded-xl overflow-hidden"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-lg)',
            minWidth: '320px',
            maxWidth: '420px',
            maxHeight: '400px',
            overflowY: 'auto',
          }}
        >
          {loading ? (
            <div className="px-4 py-6 text-center">
              <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Searching…</p>
            </div>
          ) : totalResults === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>No results found</p>
            </div>
          ) : (
            <div className="py-1">
              {results.products.length > 0 && (
                <>
                  <p className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    Products ({results.products.length})
                  </p>
                  {results.products.map(item => (
                    <Link
                      key={`product-${item.id}`}
                      href={getHref(item)}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 transition-colors"
                      style={{ color: 'var(--text-primary)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-muted)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{item.name}</p>
                        <p className="text-[10px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>{getSubtitle(item)}</p>
                      </div>
                      {item.category && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)' }}>
                          {item.category}
                        </span>
                      )}
                    </Link>
                  ))}
                </>
              )}

              {results.customers.length > 0 && (
                <>
                  <p className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    Customers ({results.customers.length})
                  </p>
                  {results.customers.map(item => (
                    <Link
                      key={`customer-${item.id}`}
                      href={getHref(item)}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 transition-colors"
                      style={{ color: 'var(--text-primary)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-muted)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{item.name}</p>
                        <p className="text-[10px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>{getSubtitle(item)}</p>
                      </div>
                    </Link>
                  ))}
                </>
              )}

              {results.suppliers.length > 0 && (
                <>
                  <p className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    Suppliers ({results.suppliers.length})
                  </p>
                  {results.suppliers.map(item => (
                    <Link
                      key={`supplier-${item.id}`}
                      href={getHref(item)}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 transition-colors"
                      style={{ color: 'var(--text-primary)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-muted)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{item.name}</p>
                        <p className="text-[10px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>{getSubtitle(item)}</p>
                      </div>
                    </Link>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
