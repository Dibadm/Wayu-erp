'use client'

import { useEffect, useState } from 'react'
import { HardDrive, RefreshCw, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface BackupRecord {
  id: string; filename: string; sizeBytes: number | null
  status: string; triggeredBy: string; storagePath: string | null
  errorMsg: string | null; startedAt: string; completedAt: string | null
}

function formatBytes(bytes: number | null) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

const STATUS_ICON: Record<string, any> = {
  SUCCESS: CheckCircle, FAILED: XCircle, RUNNING: RefreshCw, PENDING: Clock,
}
const STATUS_COLOR: Record<string, string> = {
  SUCCESS: 'text-emerald-400', FAILED: 'text-red-400',
  RUNNING: 'text-blue-400 animate-spin', PENDING: 'text-zinc-500',
}

export default function BackupPage() {
  const [backups, setBackups] = useState<BackupRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [message, setMessage] = useState('')

  async function load() {
    setLoading(true)
    const res = await fetch('/api/backup')
    if (res.ok) setBackups(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function triggerBackup() {
    setRunning(true); setMessage('')
    const res = await fetch('/api/backup', { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      setMessage(`✓ Backup complete: ${data.filename} (${formatBytes(data.sizeBytes)})`)
    } else {
      setMessage(`✗ Backup failed: ${data.error}`)
    }
    setRunning(false)
    await load()
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Backups</h1>
          <p className="text-sm text-zinc-500 font-mono mt-0.5">Database backup history and manual triggers</p>
        </div>
        <button onClick={triggerBackup} disabled={running} className="btn-primary flex items-center gap-2">
          {running ? <><Loader2 className="w-4 h-4 animate-spin" />Running…</> : <><HardDrive className="w-4 h-4" />Run Backup Now</>}
        </button>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-lg border text-xs font-mono ${
          message.startsWith('✓')
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {message}
        </div>
      )}

      {/* Schedule info */}
      <div className="glass-card p-5">
        <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-3">Automatic Schedule</p>
        <div className="grid grid-cols-3 gap-4 text-sm">
          {[
            { label: 'Frequency', value: 'Daily at 01:00' },
            { label: 'Retention', value: '30 backups' },
            { label: 'Storage', value: process.env.NEXT_PUBLIC_S3_BUCKET ? 'S3 + Local' : 'Local /tmp' },
          ].map(s => (
            <div key={s.label}>
              <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-1">{s.label}</p>
              <p className="font-mono text-zinc-300">{s.value}</p>
            </div>
          ))}
        </div>
        <p className="text-xs font-mono text-zinc-600 mt-3">
          Configured via Vercel Cron or external scheduler hitting <code className="text-zinc-500">/api/cron</code> with <code className="text-zinc-500">Authorization: Bearer $CRON_SECRET</code>
        </p>
      </div>

      {/* Backup history */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-100">Backup History</h2>
        </div>
        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-zinc-600" /></div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {backups.map(b => {
              const Icon = STATUS_ICON[b.status] ?? Clock
              const colorCls = STATUS_COLOR[b.status] ?? 'text-zinc-500'
              return (
                <div key={b.id} className="flex items-center gap-4 px-5 py-3">
                  <Icon className={`w-4 h-4 flex-shrink-0 ${colorCls}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-zinc-300 truncate">{b.filename}</p>
                    <p className="text-[10px] font-mono text-zinc-600 mt-0.5">
                      {b.storagePath ?? '—'} · by {b.triggeredBy.length > 20 ? 'user' : b.triggeredBy}
                    </p>
                    {b.errorMsg && <p className="text-[10px] font-mono text-red-400 mt-0.5">{b.errorMsg}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-mono text-zinc-400">{formatBytes(b.sizeBytes)}</p>
                    <p className="text-[10px] font-mono text-zinc-600 mt-0.5">{formatDate(b.startedAt)}</p>
                  </div>
                </div>
              )
            })}
            {backups.length === 0 && (
              <div className="py-12 text-center text-sm font-mono text-zinc-600">No backups yet.</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
