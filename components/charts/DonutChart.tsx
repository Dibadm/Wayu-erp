'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

interface Segment { name: string; value: number; color: string }

interface Props {
  data: Segment[]
  height?: number
  innerRadius?: number
  outerRadius?: number
  formatValue?: (v: number) => string
}

const CustomTooltip = ({ active, payload, formatValue }: any) => {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-xl text-xs font-mono">
      <p style={{ color: p.payload.color }} className="font-semibold">{p.name}</p>
      <p className="text-zinc-300 mt-1">{formatValue ? formatValue(p.value) : p.value}</p>
    </div>
  )
}

export default function DonutChart({ data, height = 200, innerRadius = 55, outerRadius = 80, formatValue }: Props) {
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data} cx="50%" cy="50%"
            innerRadius={innerRadius} outerRadius={outerRadius}
            dataKey="value" strokeWidth={2} stroke="rgba(9,9,11,0.8)"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip formatValue={formatValue} />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Centre label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <p className="stat-num text-lg text-zinc-100">{data.length}</p>
        <p className="text-[10px] font-mono text-zinc-600">categories</p>
      </div>
    </div>
  )
}
