'use client'

export default function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="h-8 w-32 rounded bg-zinc-800/60" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card p-5">
            <div className="w-9 h-9 rounded-lg bg-zinc-800/60 mb-4 animate-pulse-slow" />
            <div className="h-6 w-24 rounded bg-zinc-800/60 mb-2 animate-pulse-slow" />
            <div className="h-3 w-32 rounded bg-zinc-800/40 animate-pulse-slow" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card p-5">
            <div className="w-9 h-9 rounded-lg bg-zinc-800/60 mb-4 animate-pulse-slow" />
            <div className="h-6 w-28 rounded bg-zinc-800/60 mb-2 animate-pulse-slow" />
            <div className="h-3 w-24 rounded bg-zinc-800/40 animate-pulse-slow" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="glass-card p-5">
            <div className="h-4 w-48 rounded bg-zinc-800/60 mb-4 animate-pulse-slow" />
            <div className="h-64 w-full rounded bg-zinc-800/40 animate-pulse-slow" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="glass-card p-5">
            <div className="h-4 w-36 rounded bg-zinc-800/60 mb-3 animate-pulse-slow" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="h-8 w-full rounded bg-zinc-800/40 animate-pulse-slow" style={{ animationDelay: `${j * 100}ms` }} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="glass-card p-5">
            <div className="h-4 w-40 rounded bg-zinc-800/60 mb-4 animate-pulse-slow" />
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="h-6 w-full rounded bg-zinc-800/40 animate-pulse-slow" style={{ animationDelay: `${j * 80}ms` }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
