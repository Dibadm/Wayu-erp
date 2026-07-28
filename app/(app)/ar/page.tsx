'use client'

import { useState, useEffect } from 'react'
import { FileText, AlertTriangle } from 'lucide-react'

export default function ARPage() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    fetch('/api/reports/ar').then(r => r.json()).then(setData)
  }, [])

  const fmt = (n: number) => `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Accounts Receivable</h1>
        <p className="text-sm text-zinc-500 font-mono mt-0.5">Credit sales ledger (CF19 Cr sells18 / CreditS)</p>
      </div>

      <div className="glass-card p-5 max-w-xs">
        <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Total Outstanding</p>
        <p className="stat-num text-2xl text-amber-400">{fmt(data?.totalOutstanding ?? 0)}</p>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-zinc-100">Customers with Balance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                {['Customer', 'TIN', 'Outstanding', 'Credit Lines'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {(data?.ledger ?? []).map((c: any) => (
                <tr key={c.customerId} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5 text-sm text-zinc-300">{c.name}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-zinc-500">{c.tinNo ?? '—'}</td>
                  <td className="px-4 py-2.5 stat-num text-sm text-amber-400">{fmt(c.outstanding)}</td>
                  <td className="px-4 py-2.5 text-xs text-zinc-500">
                    {c.creditLines.map((l: any) => (
                      <span key={l.saleId} className="block font-mono">{l.receipt}: {fmt(l.outstanding)}</span>
                    ))}
                  </td>
                </tr>
              ))}
              {(data?.ledger ?? []).length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-xs font-mono text-zinc-600">No outstanding balances.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
