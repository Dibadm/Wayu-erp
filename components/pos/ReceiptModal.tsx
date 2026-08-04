'use client'

import { motion } from 'framer-motion'
import { Printer, X, ShoppingBag } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface SaleData {
  receiptNumber: string
  createdAt: string
  total: number
  subtotal: number
  discountAmount: number
  taxAmount: number
  taxable: boolean
  items: { quantity: number; unitPrice: number; discount: number; lineTotal: number; commissionAmount: number; product: { name: string; sku: string; unit: string } }[]
  payments: { method: string; amount: number; reference?: string | null }[]
  customer?: { name: string; phone?: string | null } | null
  cashier: { name?: string | null; email: string }
  salesperson?: { name?: string | null; email: string } | null
}

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash', CARD: 'Card', MOBILE_MONEY: 'Mobile Money', BANK_TRANSFER: 'Bank Transfer',
}

interface Props {
  sale:    SaleData
  onClose: () => void
  onNew:   () => void
}

export default function ReceiptModal({ sale, onClose, onNew }: Props) {
  function handlePrint() {
    const printContent = document.getElementById('receipt-content')!.innerHTML
    const w = window.open('', '_blank', 'width=400,height=700')!
    w.document.write(`<!DOCTYPE html><html><head>
<meta charset="UTF-8">
<title>Receipt ${sale.receiptNumber}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:monospace;font-size:12px;color:#000;width:300px;margin:0 auto;padding:16px}
  .center{text-align:center} .bold{font-weight:700} .sm{font-size:10px}
  .divider{border-top:1px dashed #999;margin:8px 0}
  .row{display:flex;justify-content:space-between;margin:3px 0}
  .total-row{font-weight:700;font-size:14px;margin-top:6px}
</style></head><body>
${printContent.replace(/class="[^"]*"/g, attr => {
  const cls = attr.match(/class="([^"]*)"/)?.[1] ?? ''
  if (cls.includes('center')) return 'class="center"'
  if (cls.includes('bold'))   return 'class="bold"'
  if (cls.includes('divider'))return 'class="divider"'
  if (cls.includes('row'))    return 'class="row"'
  return ''
})}
</body></html>`)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print(); w.close() }, 300)
  }

  const change = sale.payments.reduce((s, p) => s + Number(p.amount), 0) - Number(sale.total)

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="glass-card w-full max-w-sm shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2 text-emerald-400">
            <ShoppingBag className="w-4 h-4" />
            <span className="text-sm font-semibold">Sale Complete</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Receipt */}
        <div className="p-5 max-h-96 overflow-y-auto">
          <div id="receipt-content" className="font-mono text-xs space-y-2">
            <div className="text-center space-y-0.5">
              <p className="text-sm font-semibold text-zinc-100">WAYU PHARMACEUTICAL</p>
              <p className="text-zinc-500">Official Receipt</p>
              <p className="text-zinc-600 text-[10px]">{formatDate(sale.createdAt)}</p>
            </div>

            <div className="border-t border-dashed border-zinc-800 pt-2 space-y-1">
              <div className="flex justify-between text-zinc-400">
                <span>Receipt</span><span className="text-blue-400">{sale.receiptNumber}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Cashier</span><span>{sale.cashier.name ?? sale.cashier.email.split('@')[0]}</span>
              </div>
              {sale.customer && (
                <div className="flex justify-between text-zinc-400">
                  <span>Customer</span><span>{sale.customer.name}</span>
                </div>
              )}
              {sale.salesperson && (
                <div className="flex justify-between text-zinc-400">
                  <span>Salesperson</span><span>{sale.salesperson.name ?? sale.salesperson.email.split('@')[0]}</span>
                </div>
              )}
            </div>

            <div className="border-t border-dashed border-zinc-800 pt-2 space-y-2">
              {sale.items.map((item, i) => (
                <div key={i}>
                  <p className="text-zinc-200 truncate">{item.product.name}</p>
                  <div className="flex justify-between text-zinc-500 text-[10px]">
                    <span>{item.quantity} × ETB {Number(item.unitPrice).toFixed(2)}{item.discount > 0 ? ` (-ETB ${Number(item.discount).toFixed(2)})` : ''}</span>
                    <span className="text-zinc-300">ETB {Number(item.lineTotal).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>

            {(() => {
              const totalCommission = sale.items.reduce((s, i) => s + Number(i.commissionAmount || 0), 0)
              return totalCommission > 0 ? (
                <div className="border-t border-dashed border-zinc-800 pt-2 space-y-1">
                  <div className="flex justify-between text-emerald-400">
                    <span>Commission (2%)</span><span>ETB {totalCommission.toFixed(2)}</span>
                  </div>
                </div>
              ) : null
            })()}

            <div className="border-t border-dashed border-zinc-800 pt-2 space-y-1">
              <div className="flex justify-between text-zinc-500">
                <span>Subtotal</span><span>ETB {Number(sale.subtotal).toFixed(2)}</span>
              </div>
              {Number(sale.discountAmount) > 0 && (
                <div className="flex justify-between text-amber-400">
                  <span>Discount</span><span>-ETB {Number(sale.discountAmount).toFixed(2)}</span>
                </div>
              )}
              {!sale.taxable ? (
                <div className="flex justify-between text-zinc-500">
                  <span>Tax</span><span>VAT Exempt</span>
                </div>
              ) : Number(sale.taxAmount) > 0 ? (
                <div className="flex justify-between text-zinc-500">
                  <span>Tax</span><span>ETB {Number(sale.taxAmount).toFixed(2)}</span>
                </div>
              ) : null}
              <div className="flex justify-between font-semibold text-base text-zinc-100 pt-1 border-t border-zinc-800">
                <span>TOTAL</span><span>ETB {Number(sale.total).toFixed(2)}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-zinc-800 pt-2 space-y-1">
              {sale.payments.map((p, i) => (
                <div key={i} className="flex justify-between text-zinc-400">
                  <span>{METHOD_LABELS[p.method] ?? p.method}{p.reference ? ` (${p.reference})` : ''}</span>
                  <span>ETB {Number(p.amount).toFixed(2)}</span>
                </div>
              ))}
              {change > 0.01 && (
                <div className="flex justify-between text-emerald-400 font-semibold">
                  <span>Change</span><span>ETB {change.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="text-center text-zinc-600 text-[10px] border-t border-dashed border-zinc-800 pt-2">
              Thank you for your purchase!
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-5 py-4 border-t border-zinc-800">
          <button onClick={handlePrint} className="btn-ghost flex items-center gap-2 text-xs flex-1 justify-center">
            <Printer className="w-4 h-4" /> Print Receipt
          </button>
          <button onClick={onNew} className="btn-primary flex-1 text-xs">
            New Sale
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
