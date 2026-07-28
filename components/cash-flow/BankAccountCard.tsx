interface BankAccount {
  id: string
  accountName: string
  accountNumber: string
  bankName: string
  accountType: string
  currency: string
  openingBalance: number
  currentBalance: number
  isActive: boolean
}

interface Props {
  account: BankAccount
  formatCurrency: (n: number) => string
}

export default function BankAccountCard({ account, formatCurrency }: Props) {
  return (
    <div className="glass-card p-4 hover:border-white/10 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">{account.accountName}</h3>
          <p className="text-[10px] font-mono text-zinc-600">{account.bankName} · {account.accountType.replace('_', ' ')}</p>
        </div>
        <span className={`badge ${account.isActive ? 'badge-in' : 'badge-low'}`}>{account.isActive ? 'Active' : 'Inactive'}</span>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-mono text-zinc-600">Account</p>
          <p className="text-xs font-mono text-zinc-500">{account.accountNumber}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-mono text-zinc-600">Balance</p>
          <p className="stat-num text-sm" style={{ color: Number(account.currentBalance) >= 0 ? 'var(--accent-emerald)' : 'var(--accent-red)' }}>
            {formatCurrency(Number(account.currentBalance))}
          </p>
        </div>
      </div>
    </div>
  )
}
