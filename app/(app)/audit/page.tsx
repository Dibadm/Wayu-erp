import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { Shield, User, Edit, Trash, Plus, Download, HardDrive } from 'lucide-react'

const ACTION_ICONS: Record<string, any> = {
  CREATE: Plus, UPDATE: Edit, DELETE: Trash,
  LOGIN: User, LOGOUT: User, EXPORT: Download, BACKUP: HardDrive,
}
const ACTION_COLORS: Record<string, string> = {
  CREATE: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  UPDATE: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  DELETE: 'text-red-400 bg-red-500/10 border-red-500/20',
  LOGIN:  'text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
  LOGOUT: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
  EXPORT: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  BACKUP: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
}

export default async function AuditPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if ((session.user as any)?.role !== 'ADMIN') redirect('/dashboard')

  const logs = await prisma.auditLog.findMany({
    orderBy: { timestamp: 'desc' },
    take: 200,
    include: { user: { select: { name: true, email: true } } },
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Audit Log</h1>
          <p className="text-sm text-zinc-500 font-mono mt-0.5">Complete regulatory change history — {logs.length} entries</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full">
          <Shield className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs font-mono text-purple-400">ADMIN ONLY</span>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                {['Timestamp', 'Action', 'Entity', 'Record', 'Changed By', 'IP', 'Reason / Changes'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {logs.map(log => {
                const Icon = ACTION_ICONS[log.action] ?? Edit
                const colorClass = ACTION_COLORS[log.action] ?? ACTION_COLORS.UPDATE
                const changes = log.changes as Record<string, { before: unknown; after: unknown }> | null

                return (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-xs font-mono text-zinc-500 whitespace-nowrap">
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${colorClass}`}>
                        <Icon className="w-3 h-3" />
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-zinc-400">{log.entity}</td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-zinc-300">{log.entityName ?? '—'}</p>
                      <p className="text-[10px] font-mono text-zinc-600 mt-0.5">{log.entityId.slice(0, 8)}…</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-zinc-300">{log.user.name ?? '—'}</p>
                      <p className="text-[10px] font-mono text-zinc-600">{log.user.email}</p>
                    </td>
                    <td className="px-4 py-3 text-[10px] font-mono text-zinc-600">{log.ipAddress ?? '—'}</td>
                    <td className="px-4 py-3 max-w-xs">
                      {log.reason && <p className="text-xs text-zinc-400 mb-1">{log.reason}</p>}
                      {changes && Object.keys(changes).length > 0 && (
                        <div className="space-y-0.5">
                          {Object.entries(changes).slice(0, 3).map(([field, { before, after }]) => (
                            <p key={field} className="text-[10px] font-mono text-zinc-600">
                              <span className="text-zinc-500">{field}:</span>{' '}
                              <span className="text-red-400/70">{String(before ?? '∅')}</span>
                              {' → '}
                              <span className="text-emerald-400/70">{String(after ?? '∅')}</span>
                            </p>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {logs.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-sm font-mono text-zinc-600">No audit entries yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}
