'use client'

import { useState, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import { ShoppingCart as CartIcon, User, Settings2, Receipt } from 'lucide-react'
import ProductSearch from '@/components/pos/ProductSearch'
import Cart, { type CartItem } from '@/components/pos/Cart'
import PaymentModal, { type Payment } from '@/components/pos/PaymentModal'
import ReceiptModal from '@/components/pos/ReceiptModal'
import CustomerModal from '@/components/CustomerModal'
import Breadcrumb from '@/components/Breadcrumb'

interface Customer { id: string; name: string; phone?: string | null; email?: string | null }

// Local product type from /api/pos/search
interface SearchProduct {
  id: string; sku: string; name: string; category: string
  quantity: number; unit: string
  sellingPrice: string | null; costPrice: string | null
  batches: { id: string; batchNumber: string; expiryDate: string; quantity: number }[]
}

export default function POSPage() {
  const [cartItems,     setCartItems]     = useState<CartItem[]>([])
  const [customer,      setCustomer]      = useState<Customer | null>(null)
  const [taxRate,       setTaxRate]       = useState(12)   // 12% VAT default
  const [orderDiscount, setOrderDiscount] = useState(0)
  const [notes,         setNotes]         = useState('')
  const [showPayment,   setShowPayment]   = useState(false)
  const [payLoading,    setPayLoading]    = useState(false)
  const [payError,      setPayError]      = useState('')
  const [completedSale, setCompletedSale] = useState<any | null>(null)
  const [showReceipt,   setShowReceipt]   = useState(false)
  const [showSettings,  setShowSettings]  = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState<Customer[]>([])
  const [customerLoading, setCustomerLoading] = useState(false)

  // Add product to cart (or increment qty if already there)
  const handleAddProduct = useCallback((product: SearchProduct) => {
    setCartItems(prev => {
      const existing = prev.findIndex(i => i.productId === product.id)
      if (existing >= 0) {
        return prev.map((item, i) =>
          i === existing ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...prev, {
        productId: product.id,
        name:      product.name,
        sku:       product.sku,
        unit:      product.unit,
        quantity:  1,
        unitPrice: Number(product.sellingPrice ?? 0),
        discount:  0,
        costPrice: Number(product.costPrice ?? 0),
      }]
    })
  }, [])

  // Totals
  const subtotal      = cartItems.reduce((s, i) => s + (i.unitPrice - i.discount) * i.quantity, 0)
  const afterDiscount = Math.max(0, subtotal - orderDiscount)
  const taxAmount     = (afterDiscount * taxRate) / 100
  const total         = afterDiscount + taxAmount

  // Customer search
  async function searchCustomers(q: string) {
    setCustomerSearch(q)
    if (!q.trim()) { setCustomerResults([]); return }
    setCustomerLoading(true)
    const res = await fetch(`/api/customers?search=${encodeURIComponent(q)}&take=5`)
    if (res.ok) setCustomerResults(await res.json())
    setCustomerLoading(false)
  }

  // Complete sale
  async function handleCheckout(payments: Payment[]) {
    setPayLoading(true)
    setPayError('')
    try {
      const res = await fetch('/api/pos/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems.map(i => ({
            productId: i.productId,
            quantity:  i.quantity,
            unitPrice: i.unitPrice,
            discount:  i.discount,
          })),
          customerId:     customer?.id,
          discountAmount: orderDiscount,
          taxRate,
          notes,
          payments,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setPayError(data.error ?? 'Checkout failed.'); return }

      setCompletedSale(data.sale)
      setShowPayment(false)
      setShowReceipt(true)
      // Reset cart
      setCartItems([])
      setCustomer(null)
      setOrderDiscount(0)
      setNotes('')
    } catch {
      setPayError('Network error. Please try again.')
    } finally {
      setPayLoading(false)
    }
  }

  function newSale() {
    setCompletedSale(null)
    setShowReceipt(false)
    setCartItems([])
    setCustomer(null)
    setOrderDiscount(0)
    setNotes('')
  }

  function closeReceipt() {
    setCompletedSale(null)
    setShowReceipt(false)
  }

  const itemCount = cartItems.reduce((s, i) => s + i.quantity, 0)

  return (
    <div className="flex h-[calc(100vh-112px)] gap-4 animate-fade-in">
      <Breadcrumb />

      {/* ── Left: Product search + settings ── */}
      <div className="flex-1 flex flex-col min-w-0 space-y-4">

        {/* POS header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Point of Sale</h1>
            <p className="text-xs font-mono text-zinc-500 mt-0.5">Scan or search products to add to cart</p>
          </div>
          <button
            onClick={() => setShowSettings(v => !v)}
            className="p-2 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-zinc-300 border border-zinc-800 transition-colors"
            title="Tax & settings"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="glass-card p-4">
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-3">Sale Settings</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Tax Rate %</label>
                <input className="input text-sm w-24" type="number" min={0} max={100} step={0.5}
                  value={taxRate} onChange={e => setTaxRate(parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Order Discount ₱</label>
                <input className="input text-sm w-28" type="number" min={0} step={0.01}
                  value={orderDiscount || ''} placeholder="0.00"
                  onChange={e => setOrderDiscount(parseFloat(e.target.value) || 0)} />
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              <label className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Sale Notes</label>
              <input className="input text-sm" placeholder="Optional note for this sale…"
                value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>
        )}

        {/* Product search */}
        <ProductSearch onAdd={handleAddProduct} />

        {/* Customer picker */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Customer</p>
            <CustomerModal
              onSuccess={c => { setCustomer(c); setCustomerSearch(''); setCustomerResults([]) }}
              trigger={
                <button className="text-[10px] font-mono text-blue-400 hover:text-blue-300 transition-colors">
                  + New customer
                </button>
              }
            />
          </div>
          {customer ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-200">{customer.name}</p>
                  <p className="text-[10px] font-mono text-zinc-500">{customer.phone ?? customer.email ?? '—'}</p>
                </div>
              </div>
              <button onClick={() => setCustomer(null)} className="text-xs font-mono text-zinc-600 hover:text-zinc-400 transition-colors">
                Remove
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                className="input text-sm"
                placeholder="Search customer by name or phone…"
                value={customerSearch}
                onChange={e => searchCustomers(e.target.value)}
              />
              {customerResults.length > 0 && (
                <div className="absolute top-full mt-1 left-0 right-0 z-20 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl overflow-hidden">
                  {customerResults.map(c => (
                    <button key={c.id} onClick={() => { setCustomer(c); setCustomerSearch(''); setCustomerResults([]) }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left border-b border-zinc-800/50 last:border-0">
                      <User className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-zinc-200">{c.name}</p>
                        <p className="text-[10px] font-mono text-zinc-600">{c.phone ?? c.email ?? '—'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recent sales shortcut */}
        <div className="mt-auto">
          <a href="/sales" className="flex items-center gap-2 text-xs font-mono text-zinc-600 hover:text-zinc-400 transition-colors">
            <Receipt className="w-3.5 h-3.5" /> View sales history →
          </a>
        </div>
      </div>

      {/* ── Right: Cart panel ── */}
      <div className="w-80 flex-shrink-0 flex flex-col glass-card overflow-hidden">
        {/* Cart header */}
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CartIcon className="w-4 h-4 text-zinc-400" />
            <span className="text-sm font-semibold text-zinc-100">Cart</span>
            {itemCount > 0 && (
              <span className="px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-[10px] font-mono text-blue-400">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </span>
            )}
          </div>
          {cartItems.length > 0 && (
            <button onClick={() => setCartItems([])} className="text-[10px] font-mono text-zinc-600 hover:text-red-400 transition-colors">
              Clear
            </button>
          )}
        </div>

        <div className="flex-1 overflow-hidden p-4 flex flex-col">
          <Cart
            items={cartItems}
            onChange={setCartItems}
            taxRate={taxRate}
            discount={orderDiscount}
          />
        </div>

        {/* Checkout button */}
        <div className="p-4 border-t border-zinc-800">
          {payError && (
            <p className="text-xs font-mono text-red-400 mb-2 text-center">{payError}</p>
          )}
          <button
            onClick={() => setShowPayment(true)}
            disabled={cartItems.length === 0}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base font-semibold"
          >
            <CartIcon className="w-5 h-5" />
            Checkout · ₱{total.toFixed(2)}
          </button>
        </div>
      </div>

      {/* Payment modal */}
      <AnimatePresence>
        {showPayment && (
          <PaymentModal
            total={total}
            onConfirm={handleCheckout}
            onClose={() => setShowPayment(false)}
            loading={payLoading}
          />
        )}
      </AnimatePresence>

      {/* Receipt modal */}
      <AnimatePresence>
        {showReceipt && completedSale && (
          <ReceiptModal
            sale={completedSale}
            onClose={closeReceipt}
            onNew={newSale}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
