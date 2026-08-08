import { supabase } from './supabase'

export type Dataset = 'real' | 'duress'

export type Account = {
  id: string
  user_id: string
  dataset: Dataset
  name: string
  balance_cents: number
  currency: string
  created_at: string
}

/**
 * The minimum a ledger view needs. The vault receives exactly these fields from
 * pin_verify() — deliberately no `dataset`, so the payload cannot betray which
 * of the two ledgers was unlocked.
 */
export type LedgerEntry = {
  id: string
  merchant: string
  category: string
  amount_cents: number
  occurred_at: string
  status: 'settled' | 'pending'
}

export type LedgerAccount = {
  id: string
  name: string
  balance_cents: number
  currency: string
}

export type Transaction = LedgerEntry & {
  user_id: string
  dataset: Dataset
  created_at: string
}

/** Idempotent server-side seed; safe to call on every dashboard mount. */
export async function seedDemoData() {
  const { error } = await supabase.rpc('seed_demo_data')
  if (error) throw error
}

export async function fetchAccount(dataset: Dataset = 'real'): Promise<Account | null> {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('dataset', dataset)
    .maybeSingle()

  if (error) throw error
  return data as Account | null
}

export async function fetchTransactions(dataset: Dataset = 'real'): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('dataset', dataset)
    .order('occurred_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as Transaction[]
}

export type BalancePoint = { t: number; v: number }

/**
 * Reconstructs balance over time by walking backwards from the current balance.
 * Anchoring to the real closing balance means the line always ends on the
 * number shown in the stat card, however the history is filtered.
 */
export function buildBalanceSeries(
  transactions: LedgerEntry[],
  closingCents: number,
): BalancePoint[] {
  const newestFirst = [...transactions].sort(
    (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
  )

  const points: BalancePoint[] = []
  let running = closingCents

  for (const txn of newestFirst) {
    points.push({ t: new Date(txn.occurred_at).getTime(), v: running })
    running -= txn.amount_cents
  }

  // The balance immediately before the oldest transaction closes the line.
  const oldest = newestFirst.at(-1)
  if (oldest) {
    points.push({ t: new Date(oldest.occurred_at).getTime() - 86_400_000, v: running })
  }

  return points.reverse()
}

export const RANGES = {
  '1W': 7,
  '1M': 30,
  '3M': 90,
} as const

export type RangeKey = keyof typeof RANGES

export function filterByRange<T extends { occurred_at: string }>(rows: T[], range: RangeKey): T[] {
  const cutoff = Date.now() - RANGES[range] * 86_400_000
  return rows.filter((row) => new Date(row.occurred_at).getTime() >= cutoff)
}

export function filterPointsByRange(points: BalancePoint[], range: RangeKey): BalancePoint[] {
  const cutoff = Date.now() - RANGES[range] * 86_400_000
  const inRange = points.filter((point) => point.t >= cutoff)
  // Keep one point before the cutoff so short ranges still draw a line.
  const previous = points.filter((point) => point.t < cutoff).at(-1)
  return previous ? [previous, ...inRange] : inRange
}
