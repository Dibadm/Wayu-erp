'use client'

export default function AgingChart({ data, maxTotal }: { data: any[]; maxTotal: number }) {
  if (!data || data.length === 0) return null

  return (
    <div className="space-y-3">
      {data.slice(0, 10).map((a: any) => {
        const total = Number(a.total || 0)
        if (total <= 0) return null
        const w0 = (Number(a.bucket0to30 || 0) / maxTotal) * 100
        const w1 = (Number(a.bucket31to60 || 0) / maxTotal) * 100
        const w2 = (Number(a.bucket61to90 || 0) / maxTotal) * 100
        const w3 = (Number(a.bucket90plus || 0) / maxTotal) * 100
        return (
          <div key={a.id} className="flex items-center gap-3">
            <span className="text-xs text-zinc-400 w-40 truncate">{a.customer?.name || '—'}</span>
            <div className="flex-1 h-4 rounded-full overflow-hidden flex">
              <div className="bg-emerald-500 h-full" style={{ width: `${w0}%` }} title={`0-30`} />
              <div className="bg-blue-500 h-full" style={{ width: `${w1}%` }} title={`31-60`} />
              <div className="bg-amber-500 h-full" style={{ width: `${w2}%` }} title={`61-90`} />
              <div className="bg-red-500 h-full" style={{ width: `${w3}%` }} title={`90+`} />
            </div>
            <span className="stat-num text-xs text-zinc-500 w-24 text-right">ETB {Number(total).toLocaleString()}</span>
          </div>
        )
      })}
      <div className="flex items-center gap-4 mt-4 text-[10px] font-mono text-zinc-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500" /> 0-30</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500" /> 31-60</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500" /> 61-90</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500" /> 90+</span>
      </div>
    </div>
  )
}
