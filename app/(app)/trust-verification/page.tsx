'use client'

import { useState } from 'react'
import { ShieldCheck, Upload, CheckCircle2, XCircle } from 'lucide-react'

export default function TrustVerificationPage() {
  const [window, setWindow] = useState<'month' | 'quarter'>('month')
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<any>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function verify(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setBusy(true); setError(''); setResult(null)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('window', window)
    const res = await fetch('/api/trust-verification', { method: 'POST', body: fd })
    const d = await res.json()
    setBusy(false)
    if (res.ok) setResult(d)
    else setError(d.error ?? 'Verification failed')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Trust Verification</h1>
        <p className="text-sm text-zinc-500 font-mono mt-0.5">Side-by-side app-vs-Excel check (decision #8) before retiring Excel</p>
      </div>

      <div className="glass-card p-5">
        <form onSubmit={verify} className="space-y-4">
          <div>
            <label className="text-xs font-mono uppercase tracking-widest text-zinc-500">Window</label>
            <div className="flex gap-2 mt-1">
              {(['month', 'quarter'] as const).map(w => (
                <button type="button" key={w} onClick={() => setWindow(w)}
                  className="btn-secondary" style={{ background: window === w ? 'var(--accent-blue-bg)' : undefined }}>
                  One {w}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-mono uppercase tracking-widest text-zinc-500">Excel snapshot</label>
            <input type="file" accept=".xlsx,.xls" className="input w-full mt-1" onChange={e => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <button className="btn-primary flex items-center gap-2" disabled={!file || busy}>
            <Upload className="w-4 h-4" /> {busy ? 'Comparing…' : 'Run Side-by-Side'}
          </button>
        </form>
      </div>

      {error && <div className="glass-card p-3 text-sm font-mono text-red-400">{error}</div>}

      {result && (
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            {result.allMatch
              ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              : <XCircle className="w-5 h-5 text-red-400" />}
            <h2 className="text-sm font-semibold text-zinc-100">
              {result.allMatch ? 'MATCH — app mirrors Excel' : 'Differences found — review before retiring Excel'}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  {['Metric', 'App', 'Excel', 'Delta'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {result.comparison.map((c: any) => (
                  <tr key={c.metric}>
                    <td className="px-4 py-2.5 text-sm text-zinc-300">{c.metric}</td>
                    <td className="px-4 py-2.5 stat-num text-sm text-zinc-400">{c.app.toLocaleString()}</td>
                    <td className="px-4 py-2.5 stat-num text-sm text-zinc-400">{c.excel.toLocaleString()}</td>
                    <td className="px-4 py-2.5 stat-num text-sm" style={{ color: Math.abs(c.delta) < 0.01 ? 'var(--accent-emerald)' : 'var(--accent-red)' }}>{c.delta.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] font-mono text-zinc-600 mt-3">
            Period: {new Date(result.period.from).toLocaleDateString()} → {new Date(result.period.to).toLocaleDateString()}
          </p>
        </div>
      )}

      <div className="glass-card p-4 text-xs font-mono text-zinc-500 flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
        Run BOTH a one-month and a one-quarter check and confirm a full match before the client stops using Excel. The app is authoritative; Excel re-imports only add new rows.
      </div>
    </div>
  )
}
