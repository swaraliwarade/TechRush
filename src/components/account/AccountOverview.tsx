import {
  ArrowDownLeft,
  ArrowUpRight,
  Car,
  CreditCard,
  Heart,
  Home,
  Repeat,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Tv,
  UtensilsCrossed,
  Wallet,
  WashingMachine,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { BalanceChart } from '@/components/charts/BalanceChart'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader } from '@/components/ui/Card'
import { PillTabs } from '@/components/ui/PillTabs'
import { formatMoney } from '@/lib/money'
import {
  buildBalanceSeries,
  filterByRange,
  filterPointsByRange,
  type LedgerAccount,
  type LedgerEntry,
  type RangeKey,
} from '@/lib/transactions'

const RANGE_KEYS = ['1W', '1M', '3M'] as const

const categoryIcons: Record<string, LucideIcon> = {
  Income: Wallet,
  Housing: Home,
  Groceries: ShoppingCart,
  Dining: UtensilsCrossed,
  Transport: Car,
  Subscriptions: Tv,
  Health: Heart,
  Utilities: Zap,
  Transfer: Repeat,
  Shopping: ShoppingBag,
  Services: WashingMachine,
  Refund: ArrowDownLeft,
}

function TransactionRow({ txn, currency }: { txn: LedgerEntry; currency: string }) {
  const Icon = categoryIcons[txn.category] ?? CreditCard
  const incoming = txn.amount_cents > 0

  return (
    <li className="flex items-center gap-3 py-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/6 text-mist-300">
        <Icon size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{txn.merchant}</p>
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
    </li>
  )
}

/**
 * Pure presentation over a ledger. Renders identically whichever dataset it is
 * handed — that indistinguishability is the entire point of the duress feature,
 * so this component must never receive or branch on a dataset flag.
 */
export function AccountOverview({
  account,
  transactions,
  sideCard,
}: {
  account: LedgerAccount
  transactions: LedgerEntry[]
  sideCard?: ReactNode
}) {
  const [range, setRange] = useState<RangeKey>('1M')

  const balanceCents = account.balance_cents
  const currency = account.currency

  const series = useMemo(
    () => filterPointsByRange(buildBalanceSeries(transactions, balanceCents), range),
    [transactions, balanceCents, range],
  )

  const inRange = useMemo(() => filterByRange(transactions, range), [transactions, range])

  const { moneyIn, moneyOut, changePct } = useMemo(() => {
    const inbound = inRange.filter((t) => t.amount_cents > 0).reduce((s, t) => s + t.amount_cents, 0)
    const outbound = inRange
      .filter((t) => t.amount_cents < 0)
      .reduce((s, t) => s + t.amount_cents, 0)

    const opening = series[0]?.v ?? balanceCents
    const pct = opening !== 0 ? ((balanceCents - opening) / Math.abs(opening)) * 100 : 0

    return { moneyIn: inbound, moneyOut: outbound, changePct: pct }
  }, [inRange, series, balanceCents])

  const topCategories = useMemo(() => {
    const totals = new Map<string, number>()
    for (const txn of inRange) {
      if (txn.amount_cents >= 0) continue
      totals.set(txn.category, (totals.get(txn.category) ?? 0) + Math.abs(txn.amount_cents))
    }
    return [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([category, cents]) => ({ category, cents }))
  }, [inRange])

  const rising = changePct >= 0

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Card className="p-5 sm:p-6">
            <CardHeader
              title="Total Balance"
              action={
                <Badge tone={rising ? 'gain' : 'loss'}>
                  {rising ? '+' : ''}
                  {changePct.toFixed(2)}%
                </Badge>
              }
            />
            <p className="mt-5 text-4xl font-bold tracking-tight tabular-nums sm:text-5xl">
              {formatMoney(balanceCents, currency)}
            </p>
            <p className="mt-2 text-sm text-mist-400">
              {account.name} · last {range}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="glass-tile p-3.5">
                <div className="flex items-center gap-1.5 text-xs text-mist-400">
                  <ArrowDownLeft size={13} className="text-gain-400" /> In
                </div>
                <p className="mt-1.5 text-base font-semibold tabular-nums">
                  {formatMoney(moneyIn, currency)}
                </p>
              </div>
              <div className="glass-tile p-3.5">
                <div className="flex items-center gap-1.5 text-xs text-mist-400">
                  <ArrowUpRight size={13} className="text-loss-400" /> Out
                </div>
                <p className="mt-1.5 text-base font-semibold tabular-nums">
                  {formatMoney(Math.abs(moneyOut), currency)}
                </p>
              </div>
            </div>
          </Card>

          {sideCard ?? (
            <Card className="p-5 sm:p-6" glow>
              <h2 className="text-base font-semibold tracking-tight sm:text-lg">
                Protected by passkeys
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-mist-400">
                This account has no password to steal. Every sign-in is bound to a device you hold.
              </p>
            </Card>
          )}
        </div>

        <Card className="p-5 sm:p-6">
          <CardHeader
            title="Recent activity"
            action={
              <Badge tone="neutral">
                {inRange.length} in {range}
              </Badge>
            }
          />
          {inRange.length === 0 ? (
            <p className="py-10 text-center text-sm text-mist-500">Nothing in the last {range}.</p>
          ) : (
            <ul className="mt-2 max-h-[420px] divide-y divide-white/6 overflow-y-auto pr-1">
              {inRange.map((txn) => (
                <TransactionRow key={txn.id} txn={txn} currency={currency} />
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5 sm:p-6">
          <CardHeader title="Where it went" />
          {topCategories.length === 0 ? (
            <p className="py-10 text-center text-sm text-mist-500">No spending in this range.</p>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {topCategories.map(({ category, cents }) => {
                const Icon = categoryIcons[category] ?? CreditCard
                return (
                  <div key={category} className="glass-tile p-4">
                    <p className="text-lg font-bold tracking-tight tabular-nums">
                      {formatMoney(cents, currency)}
                    </p>
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-mist-400">
                      <Icon size={13} />
                      <span className="truncate">{category}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <div className="glass-tile mt-3 flex items-center gap-3 p-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/6 text-accent-400">
              <Sparkles size={16} />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-mist-400">Net movement</p>
              <p className="truncate text-sm font-semibold tabular-nums">
                {formatMoney(moneyIn + moneyOut, currency, true)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-5 sm:p-6">
        <CardHeader
          title="Balance history"
          action={
            <PillTabs
              options={RANGE_KEYS}
              value={range}
              onChange={setRange}
              variant="boxed"
              label="Chart range"
            />
          }
          className="flex-col items-start gap-3 sm:flex-row sm:items-center"
        />
        <div className="mt-5">
          <BalanceChart points={series} currency={currency} />
        </div>
      </Card>
    </div>
  )
}
