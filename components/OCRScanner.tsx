'use client'

import { useState, useRef } from 'react'
import { Upload, X, Loader2, CheckCircle, AlertTriangle, FileText, Edit3 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'

interface ExtractedItem {
  productName: string
  quantity: number
  unitPrice: number | null
  batchNumber: string | null
  expiryDate: string | null
  supplier: string | null
  unit: string
}

export default function OCRScanner() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [items, setItems] = useState<ExtractedItem[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  function handleFile(f: File) {
    setFile(f)
    setItems([])
    setError('')
    setSaved(false)
    if (f.type.startsWith('image/')) {
      const url = URL.createObjectURL(f)
      setPreview(url)
    } else {
      setPreview(null)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  async function scan() {
    if (!file) return
    setScanning(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/ai/ocr', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'OCR failed'); return }
      if (!data.items?.length) { setError('No items found in the invoice. Try a clearer image.'); return }
      setItems(data.items)
    } catch {
      setError('Network error during OCR.')
    } finally {
      setScanning(false)
    }
  }

  function updateItem(idx: number, field: keyof ExtractedItem, value: string | number | null) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  async function confirmAndSave() {
    if (!items.length) return
    setSaving(true)
    setError('')

    // For each extracted item, we look up the product and create an IN movement.
    // This is a best-effort match — user has already reviewed the items.
    let successCount = 0
    const errors: string[] = []

    for (const item of items) {
      try {
        // Search for matching product
        const searchRes = await fetch(`/api/products?search=${encodeURIComponent(item.productName)}`)
        const products = await searchRes.json()

        if (!products.length) {
          errors.push(`"${item.productName}" — product not found in inventory. Add it first.`)
          continue
        }

        const product = products[0]

        // Create IN movement
        const movRes = await fetch('/api/movements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: product.id,
            type: 'IN',
            quantity: item.quantity,
            notes: `OCR import from invoice${item.supplier ? ` — Supplier: ${item.supplier}` : ''}${item.batchNumber ? ` — Batch: ${item.batchNumber}` : ''}`,
            reference: item.batchNumber ?? undefined,
          }),
        })

        if (movRes.ok) successCount++
        else errors.push(`Failed to record movement for "${item.productName}"`)
      } catch {
        errors.push(`Error processing "${item.productName}"`)
      }
    }

    setSaving(false)
    if (successCount > 0) {
      setSaved(true)
      router.refresh()
    }
    if (errors.length) setError(errors.join('\n'))
  }

  function reset() {
    setFile(null)
    setPreview(null)
    setItems([])
    setError('')
    setSaved(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 bg-zinc-800/60 hover:bg-zinc-700/60 border border-zinc-700 hover:border-zinc-600 rounded-lg text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-all"
      >
        <FileText className="w-3.5 h-3.5" />
        Scan Invoice
      </button>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="OCR Invoice Scanner"
        size="xl"
        footer={!saved && (
          <>
            {!items.length ? (
              <button onClick={scan} disabled={!file || scanning} className="btn-primary flex items-center gap-2">
                {scanning ? <><Loader2 className="w-4 h-4 animate-spin" />Scanning…</> : <><Edit3 className="w-4 h-4" />Extract with AI</>}
              </button>
            ) : (
              <button onClick={confirmAndSave} disabled={saving || !items.length} className="btn-primary flex items-center gap-2">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><CheckCircle className="w-4 h-4" />Confirm & Update Stock</>}
              </button>
            )}
            {items.length > 0 && (
              <button onClick={reset} className="btn-ghost text-xs">Start over</button>
            )}
            <button onClick={() => setOpen(false)} className="btn-ghost ml-auto">Close</button>
          </>
        )}
      >
        <div className="space-y-4">
          {/* Upload zone */}
          {!items.length && !saved && (
            <div
              className="border-2 border-dashed border-zinc-700 hover:border-blue-500/50 rounded-xl p-8 text-center cursor-pointer transition-colors"
              onClick={() => fileRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
            >
              <input ref={fileRef} type="file" className="hidden" accept="image/*,.pdf"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
              {file ? (
                <div className="space-y-3">
                  {preview && <img src={preview} alt="Invoice preview" className="max-h-48 mx-auto rounded-lg object-contain" />}
                  <p className="text-sm font-mono text-zinc-300">{file.name}</p>
                  <p className="text-xs text-zinc-600">{(file.size / 1024).toFixed(0)} KB · {file.type}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload className="w-10 h-10 text-zinc-600 mx-auto" />
                  <p className="text-sm text-zinc-400">Drop invoice image or PDF here</p>
                  <p className="text-xs font-mono text-zinc-600">JPEG, PNG, WebP, PDF · max 10MB</p>
                </div>
              )}
            </div>
          )}

          {/* Preview of extracted items */}
          {items.length > 0 && !saved && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <p className="text-sm font-medium text-emerald-400">{items.length} item{items.length !== 1 ? 's' : ''} extracted — review and edit before saving</p>
              </div>
              {items.map((item, idx) => (
                <div key={idx} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Item {idx + 1}</span>
                    <button onClick={() => removeItem(idx)} className="text-zinc-600 hover:text-red-400 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-1">
                      <label className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Product Name</label>
                      <input className="input text-xs" value={item.productName}
                        onChange={e => updateItem(idx, 'productName', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Quantity</label>
                      <input className="input text-xs" type="number" min={1} value={item.quantity}
                        onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Unit</label>
                      <input className="input text-xs" value={item.unit}
                        onChange={e => updateItem(idx, 'unit', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Batch No.</label>
                      <input className="input text-xs" value={item.batchNumber ?? ''}
                        onChange={e => updateItem(idx, 'batchNumber', e.target.value || null)} placeholder="optional" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Expiry Date</label>
                      <input className="input text-xs" type="date" value={item.expiryDate ?? ''}
                        onChange={e => updateItem(idx, 'expiryDate', e.target.value || null)} />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Supplier</label>
                      <input className="input text-xs" value={item.supplier ?? ''}
                        onChange={e => updateItem(idx, 'supplier', e.target.value || null)} placeholder="optional" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {saved && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle className="w-12 h-12 text-emerald-400" />
              <p className="text-sm font-semibold text-emerald-400">Stock updated successfully</p>
              <p className="text-xs text-zinc-500 font-mono">Movements recorded and inventory updated.</p>
              <button onClick={reset} className="btn-ghost text-xs mt-2">Scan another invoice</button>
            </div>
          )}

          {error && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                <p className="text-xs font-semibold text-red-400">Issues</p>
              </div>
              <p className="text-xs font-mono text-red-400/80 whitespace-pre-wrap">{error}</p>
            </div>
          )}
        </div>
      </Modal>
    </>
  )
}
