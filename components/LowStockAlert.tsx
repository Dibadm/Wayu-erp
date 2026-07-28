import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'

interface Product { id: string; sku: string; name: string; quantity: number; minStockLevel: number }

export default function LowStockAlert({ products }: { products: Product[] }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background:   'var(--accent-red-bg)',
        border:       '1px solid var(--accent-red-border)',
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent-red)' }} />
        <h3 className="text-sm font-semibold" style={{ color: 'var(--accent-red)' }}>Low Stock Alerts</h3>
        <span className="ml-auto text-xs font-mono" style={{ color: 'var(--accent-red)' }}>
          {products.length} item{products.length !== 1 ? 's' : ''} need restocking
        </span>
      </div>
      <div className="space-y-2">
        {products.map(p => (
          <div
            key={p.id}
            className="flex items-center justify-between py-1.5 px-3 rounded-lg"
            style={{
              background: 'var(--accent-red-bg)',
              border:     '1px solid var(--accent-red-border)',
            }}
          >
            <div>
              <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{p.name}</span>
              <span className="sku ml-2">{p.sku}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono" style={{ color: 'var(--accent-red)' }}>
                {p.quantity} / {p.minStockLevel} min
              </span>
              <Link
                href={`/inventory/${p.id}`}
                className="text-[10px] font-mono transition-colors"
                style={{ color: 'var(--accent-blue)' }}
              >
                RESTOCK →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
