'use client'

import { useState, useEffect } from 'react'
import { Upload, Download, AlertTriangle, CheckCircle2, Calendar } from 'lucide-react'

export default function ImportExportPage() {
  const [tab, setTab] = useState<'import' | 'export' | 'history'>('import')
  const [sheet, setSheet] = useState<'sells' | 'received'>('sells')
  const [calendar, setCalendar] = useState<'gregorian' | 'ethiopian'>('gregorian')
  const [amharic, setAmharic] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [batches, setBatches] = useState<any[]>([])
  const [conflicts, setConflicts] = useState<any[]>([])

  async function loadHistory() {
    const d = await fetch('/api/import').then(r => r.json())
    setBatches(d.batches ?? [])
    setConflicts(d.conflicts ?? [])
  }
  useEffect(() => { if (tab === 'history') loadHistory() }, [tab])

  async function doImport(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setBusy(true); setMsg('')
    const fd = new FormData()
    fd.append('file', file)
    fd.append('sheet', sheet)
    const res = await fetch('/api/import', { method: 'POST', body: fd })
    const d = await res.json()
    setBusy(false)
    if (res.ok) {
      setMsg(`Imported ${sheet}: ${d.newRows} new rows (of ${d.rowCount}). ${d.mismatches} mismatch(es) — see History.`)
      loadHistory()
    } else setMsg(d.error ?? 'Import failed')
  }

  const EXPORTS = [
    { sheet: 'sells', title: 'Sells (Sells19)', desc: 'One row per sale line' },
    { sheet: 'received', title: 'Received', desc: 'Purchases / PO + batch' },
    { sheet: 'gp', title: 'Gross Profit (GP 2,18)', desc: 'By product & month' },
    { sheet: 'commission', title: 'Commission (Com 18)', desc: 'Per salesperson' },
    { sheet: 'stock', title: 'Stock (SC18)', desc: 'SOH, COGS, status' },
    { sheet: 'dashboard', title: 'Dashboard', desc: 'Beg/Rec/End qty & value' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Import / Export Center</h1>
        <p className="text-sm text-zinc-500 font-mono mt-0.5">App is authoritative — re-import adds only new rows, never overwrites</p>
      </div>

      <div className="flex gap-2 border-b border-zinc-800">
        {(['import', 'export', 'history'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className="px-4 py-2 text-sm font-medium capitalize transition-colors"
            style={{ color: tab === t ? 'var(--accent-blue)' : 'var(--text-muted)', borderBottom: tab === t ? '2px solid var(--accent-blue)' : '2px solid transparent' }}>
            {t}
          </button>
        ))}
      </div>

      {msg && <div className="glass-card p-3 text-sm font-mono text-emerald-400 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> {msg}</div>}

      {tab === 'import' && (
        <div className="glass-card p-5">
          <form onSubmit={doImport} className="space-y-4">
            <div>
              <label className="text-xs font-mono uppercase tracking-widest text-zinc-500">Sheet</label>
              <select className="input w-auto mt-1" value={sheet} onChange={e => setSheet(e.target.value as any)}>
                <option value="sells">Sells19 (sales)</option>
                <option value="received">Received (purchases)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-mono uppercase tracking-widest text-zinc-500">Excel file</label>
              <input type="file" accept=".xlsx,.xls" className="input w-full mt-1" onChange={e => setFile(e.target.files?.[0] ?? null)} />
            </div>
            <button className="btn-primary flex items-center gap-2" disabled={!file || busy}>
              <Upload className="w-4 h-4" /> {busy ? 'Importing…' : 'Import'}
            </button>
          </form>
          <p className="text-[11px] font-mono text-zinc-600 mt-3 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-400" /> Keys: receiptNumber (sales) / poNumber (purchases). Mismatches are recorded, never overwritten.
          </p>
        </div>
      )}

      {tab === 'export' && (
        <div className="space-y-4">
          <div className="glass-card p-5 flex items-center gap-3 flex-wrap">
            <Calendar className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-mono text-zinc-400">Calendar:</span>
            <button onClick={() => setCalendar(c => c === 'gregorian' ? 'ethiopian' : 'gregorian')} className="btn-secondary">{calendar === 'gregorian' ? 'Gregorian' : 'Ethiopian'}</button>
            {calendar === 'ethiopian' && <label className="text-xs"><input type="checkbox" checked={amharic} onChange={e => setAmharic(e.target.checked)} /> Amharic labels</label>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {EXPORTS.map(x => (
              <div key={x.sheet} className="glass-card p-5 flex flex-col gap-3">
                <div><h3 className="text-sm font-semibold text-zinc-100">{x.title}</h3><p className="text-xs text-zinc-500 mt-0.5">{x.desc}</p></div>
                <button onClick={() => window.open(`/api/export?sheet=${x.sheet}&calendar=${calendar}&amharic=${amharic}`)} className="btn-primary flex items-center gap-2 w-fit mt-auto">
                  <Download className="w-4 h-4" /> Download
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-6">
          <div className="glass-card overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800"><h2 className="text-sm font-semibold text-zinc-100">Import History</h2></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    {['File', 'Imported By', 'Rows', 'New', 'Mismatches', 'Status', 'When'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {batches.map(b => (
                    <tr key={b.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-2.5 text-sm text-zinc-300">{b.fileName}</td>
                      <td className="px-4 py-2.5 text-xs text-zinc-500">{b.importedBy.name}</td>
                      <td className="px-4 py-2.5 stat-num text-sm text-zinc-400">{b.rowCount}</td>
                      <td className="px-4 py-2.5 stat-num text-sm text-emerald-400">{b.newRows}</td>
                      <td className="px-4 py-2.5 stat-num text-sm" style={{ color: (b._count?.conflicts ?? 0) > 0 ? 'var(--accent-amber)' : 'var(--text-muted)' }}>{b._count?.conflicts ?? 0}</td>
                      <td className="px-4 py-2.5"><span className={`badge ${b.status === 'COMPLETED' ? 'badge-in' : 'badge-warning'}`}>{b.status}</span></td>
                      <td className="px-4 py-2.5 text-xs font-mono text-zinc-500">{new Date(b.importedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                  {batches.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-xs font-mono text-zinc-600">No imports yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" /><h2 className="text-sm font-semibold text-zinc-100">Unresolved Sync Conflicts</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    {['Entity', 'Field', 'Excel Value', 'App Value', 'Import'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {conflicts.map(c => (
                    <tr key={c.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-2.5 text-sm text-zinc-300">{c.entityName}</td>
                      <td className="px-4 py-2.5 text-xs font-mono text-zinc-500">{c.field}</td>
                      <td className="px-4 py-2.5 stat-num text-sm text-amber-400">{c.excelValue}</td>
                      <td className="px-4 py-2.5 stat-num text-sm text-zinc-400">{c.appValue}</td>
                      <td className="px-4 py-2.5 text-xs font-mono text-zinc-500">{c.importBatch.fileName}</td>
                    </tr>
                  ))}
                  {conflicts.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-xs font-mono text-emerald-400 flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4" /> No conflicts — app matches Excel.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
