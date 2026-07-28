'use client'

import { Trash2, Plus, Minus } from 'lucide-react'

export interface CartItem {
  productId:   string
  name:        string
  sku:         string
  unit:        string
  quantity:    number
  unitPrice:   number
  discount:    number   // per-unit discount
  costPrice:   number
}

interface Props {
  items:      CartItem[]
  onChange:   (items: CartItem[]) => void
  taxRate:    number
  discount:   number   // order-level discount
}

export default function Cart({ items, onChange, taxRate, discount }: Props) {
  function update(idx: number, patch: Partial<CartItem>) {
    onChange(items.map((item, i) => i === idx ? { ...item, ...patch } : item))
  }

  function remove(idx: number) {
    onChange(items.filter((_, i) => i !== idx))
  }

  function setQty(idx: number, qty: number) {
    if (qty <= 0) { remove(idx); return }
    update(idx, { quantity: qty })
  }

  const subtotal     = items.reduce((s, i) => s + (i.unitPrice - i.discount) * i.quantity, 0)
  const afterDiscount = Math.max(0, subtotal - discount)
  const taxAmount    = (afterDiscount * taxRate) / 100
  const total        = afterDiscount + taxAmount
  const totalCost    = items.reduce((s, i) => s + i.costPrice * i.quantity, 0)
  const profit       = total - totalCost - discount

  return (
    <div className="flex flex-col h-full">
      {/* Items */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-zinc-700">
            <p className="text-xs font-mono">Cart is empty</p>
            <p className="text-[10px] font-mono mt-1">Search for a product above</p>
          </div>
        )}
        {items.map((item, idx) => {
          const lineTotal = (item.unitPrice - item.discount) * item.quantity
          return (
            <div key={`${item.productId}-${idx}`} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-zinc-200 truncate">{item.name}</p>
                  <p className="sku">{item.sku}</p>
                </div>
                <button onClick={() => remove(idx)} className="text-zinc-700 hover:text-red-400 transition-colors flex-shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center justify-between gap-3">
                {/* Quantity controls */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setQty(idx, item.quantity - 1)}
                    className="w-6 h-6 flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <input
                    type="number" min={1}
                    className="w-12 text-center bg-zinc-800 border border-zinc-700 rounded text-xs font-mono text-zinc-200 py-0.5 outline-none focus:border-blue-500/50"
                    value={item.quantity}
                    onChange={e => setQty(idx, parseInt(e.target.value) || 1)}
                  />
                  <button
                    onClick={() => setQty(idx, item.quantity + 1)}
                    className="w-6 h-6 flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Price + per-unit discount */}
                <div className="flex items-center gap-2">
                  <div className="space-y-0.5 text-right">
                    <input
                      type="number" min={0} step={0.01}
                      className="w-20 text-right bg-transparent text-xs font-mono text-zinc-300 outline-none border-b border-zinc-700 focus:border-blue-500/50 pb-0.5"
                      value={item.unitPrice}
                      onChange={e => update(idx, { unitPrice: parseFloat(e.target.value) || 0 })}
                      title="Unit price"
                    />
                    {item.discount > 0 && (
                      <p className="text-[10px] font-mono text-amber-400">-₱{item.discount.toFixed(2)} disc</p>
                    )}
                  </div>
                  <p className="text-sm font-mono font-semibold text-emerald-400 w-20 text-right">
                    ₱{lineTotal.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Per-item discount */}
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-zinc-800/50">
                <span className="text-[10px] font-mono text-zinc-600 flex-shrink-0">Item discount ₱</span>
                <input
                  type="number" min={0} step={0.01}
                  className="w-16 bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-xs font-mono text-zinc-300 outline-none focus:border-amber-500/50"
                  value={item.discount || ''}
                  placeholder="0"
                  onChange={e => update(idx, { discount: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Totals */}
      {items.length > 0 && (
        <div className="pt-3 mt-3 border-t border-zinc-800 space-y-1.5 text-xs font-mono">
          <div className="flex justify-between text-zinc-500">
            <span>Subtotal</span><span>₱{subtotal.toFixed(2)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-amber-400">
              <span>Order discount</span><span>-₱{discount.toFixed(2)}</span>
            </div>
          )}
          {taxRate > 0 && (
            <div className="flex justify-between text-zinc-500">
              <span>Tax ({taxRate}%)</span><span>₱{taxAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-semibold text-zinc-100 pt-1 border-t border-zinc-800">
            <span>TOTAL</span><span>₱{total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-zinc-600 text-[10px] pt-1">
            <span>Est. profit</span>
            <span className={profit >= 0 ? 'text-emerald-600' : 'text-red-600'}>₱{profit.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
