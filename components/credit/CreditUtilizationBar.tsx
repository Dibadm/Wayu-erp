'use client'

export default function CreditUtilizationBar({ utilized, limit }: { utilized: number; limit: number }) {
  const pct = limit > 0 ? Math.round((utilized / limit) * 100) : 0
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : pct >= 50 ? 'bg-blue-500' : 'bg-emerald-500'
  return (
    <div className="w-full">
      <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <p className="text-[10px] font-mono text-zinc-500 mt-0.5">{pct}% utilized</p>
    </div>
  )
}
