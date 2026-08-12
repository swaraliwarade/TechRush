import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TransactionRow } from '@/components/account/TransactionRow'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader } from '@/components/ui/Card'
import type { LedgerEntry } from '@/lib/transactions'

/**
 * Transaction history for the personal ledger. History is always visible —
 * the card-mapping step-up now gates the payment actions instead (see
 * CardChallengeModal), so browsing is free while sending money stays
 * card-protected.
 */
export function TransactionsSection({
  transactions,
  currency,
}: {
  transactions: LedgerEntry[]
  currency: string
}) {
  // Account search deep-links here as /transactions?q=…, which becomes the
  // initial filter.
  const [searchParams] = useSearchParams()
  const urlQuery = searchParams.get('q') ?? ''
  const [query, setQuery] = useState(urlQuery)

  useEffect(() => {
    setQuery(urlQuery)
  }, [urlQuery])

  const normalized = query.trim().toLowerCase()
  const filtered =
    normalized.length === 0
      ? transactions
      : transactions.filter((txn) =>
          `${txn.merchant} ${txn.category}`.toLowerCase().includes(normalized),
        )

  return (
    <Card className="p-5 sm:p-6">
      <CardHeader
        title="Transactions"
        action={<Badge tone="neutral">{transactions.length} total</Badge>}
      />

      {transactions.length === 0 ? (
        <p className="py-10 text-center text-sm text-mist-500">No transactions yet.</p>
      ) : (
        <>
          <div className="relative mt-4">
            <Search
              size={15}
              className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-mist-500"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search transactions"
              aria-label="Search transactions"
              className="focus-ring h-10 w-full rounded-full border border-white/8 bg-black/30 pr-4 pl-9 text-sm text-mist-50 transition placeholder:text-mist-500 focus:border-accent-500/40"
            />
          </div>
          <ul className="mt-2 max-h-[440px] divide-y divide-white/6 overflow-y-auto pr-1">
            {filtered.map((txn, index) => (
              <TransactionRow key={txn.id} txn={txn} currency={currency} index={index} />
            ))}
          </ul>
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-mist-500">Nothing matches “{query}”.</p>
          )}
        </>
      )}
    </Card>
  )
}
