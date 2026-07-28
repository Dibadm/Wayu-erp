import { getStockLabel } from '@/lib/utils'

type StockStatus = 'ok' | 'warning' | 'low' | 'out'

const statusClass: Record<StockStatus, string> = {
  ok: 'badge-ok',
  warning: 'badge-warning',
  low: 'badge-low',
  out: 'badge-out',
}

export default function StockStatusBadge({ status }: { status: StockStatus }) {
  return (
    <span className={`badge ${statusClass[status]}`}>
      {getStockLabel(status)}
    </span>
  )
}
