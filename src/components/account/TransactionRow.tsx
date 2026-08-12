import { CreditCard } from 'lucide-react'
import { motion } from 'motion/react'
import { Badge } from '@/components/ui/Badge'
import { formatMoney } from '@/lib/money'
import { categoryIcons } from '@/lib/transactionIcons'
import type { LedgerEntry } from '@/lib/transactions'

export function TransactionRow({
  txn,
  currency,
  index,
}: {
  txn: LedgerEntry
  currency: string
  index: number
}) {
  const Icon = categoryIcons[txn.category] ?? CreditCard
  const incoming = txn.amount_cents > 0

  return (
    <motion.li
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.6), ease: 'easeOut' }}
      className="flex items-center gap-3 py-3"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/6 text-mist-300">
        <Icon size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {txn.merchant}
          {txn.status === 'pending' && (
            <Badge tone="warn" className="ml-2 align-middle">
              Pending
            </Badge>
          )}
        </p>
        <p className="mt-0.5 truncate text-xs text-mist-500">
          {txn.category} ·{' '}
          {new Date(txn.occurred_at).toLocaleDateString(undefined, {
            day: 'numeric',
            month: 'short',
          })}
        </p>
      </div>
      <span
        className={`shrink-0 text-sm font-semibold tabular-nums ${
          incoming ? 'text-gain-400' : 'text-mist-50'
        }`}
      >
        {formatMoney(txn.amount_cents, currency, true)}
      </span>
    </motion.li>
  )
}
