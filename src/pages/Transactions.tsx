import { useEffect, useMemo, useState } from 'react'
import { CardChallengeModal } from '@/components/account/CardChallengeModal'
import { PaymentActions, type PaymentDraft } from '@/components/account/PaymentActions'
import { TransactionsSection } from '@/components/account/TransactionsSection'
import { Alert } from '@/components/ui/Alert'
import { Card, CardHeader } from '@/components/ui/Card'
import { Splash } from '@/components/ui/Splash'
import { AnimatedNumber } from '@/components/motion/AnimatedNumber'
import { readableAuthError } from '@/auth/passkeys'
import {
  fetchAccount,
  fetchTransactions,
  seedDemoData,
  type Account,
  type LedgerEntry,
  type Transaction,
} from '@/lib/transactions'
import { formatMoney } from '@/lib/money'

/**
 * The personal transactions page. Ledger history is fetched as usual; payments
 * made in this session are layered on top as `pending` entries. The demo has no
 * client INSERT policy (seed_demo_data() is the only writer), so session
 * payments are local state and reset on refresh — the info card below says so.
 */
export function TransactionsPage() {
  const [account, setAccount] = useState<Account | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [sessionPayments, setSessionPayments] = useState<LedgerEntry[]>([])
  // History is open; sending money is the part that needs the card-mapping step-up.
  const [paymentsLocked, setPaymentsLocked] = useState(true)
  const [challengeOpen, setChallengeOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        // No-op once the user already has rows.
        await seedDemoData()
        const [acct, txns] = await Promise.all([fetchAccount('real'), fetchTransactions('real')])
        if (!active) return
        setAccount(acct)
        setTransactions(txns)
        setError(null)
      } catch (err) {
        if (active) setError(readableAuthError(err))
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [])

  function handlePayment(draft: PaymentDraft) {
    const entry: LedgerEntry = {
      id: crypto.randomUUID(),
      merchant: draft.merchant,
      category: 'Transfer',
      amount_cents: -draft.amountCents,
      occurred_at: new Date().toISOString(),
      status: 'pending',
    }
    setSessionPayments((prev) => [entry, ...prev])
  }

  const all = useMemo(
    () =>
      [...sessionPayments, ...transactions].sort(
        (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
      ),
    [sessionPayments, transactions],
  )

  if (loading) return <Splash message="Loading your transactions…" />

  if (error) {
    return (
      <Card className="p-6">
        <Alert tone="error">{error}</Alert>
        <p className="mt-4 text-sm text-mist-400">
          If this mentions a missing table or function, a migration hasn't been run yet.
        </p>
      </Card>
    )
  }

  if (!account) {
    return (
      <Card className="p-6">
        <Alert tone="info">No account found for this user.</Alert>
      </Card>
    )
  }

  const paidCents = sessionPayments.reduce((sum, txn) => sum + Math.abs(txn.amount_cents), 0)
  const displayBalance = account.balance_cents - paidCents

  return (
    <div className="space-y-5">
      {/* Balance header + payment actions — the "banking page" top. */}
      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="kicker text-mist-400">Available balance</p>
            <p className="text-display mt-1.5 text-3xl leading-none tabular-nums whitespace-nowrap sm:text-4xl">
              <AnimatedNumber
                value={displayBalance}
                format={(v) => formatMoney(Math.round(v), account.currency)}
                duration={0.9}
              />
            </p>
            <p className="mt-2 text-sm text-mist-400">
              {account.name}
              {sessionPayments.length > 0 && (
                <>
                  {' · '}
                  {sessionPayments.length} payment{sessionPayments.length === 1 ? '' : 's'} this
                  session
                </>
              )}
            </p>
          </div>
          <PaymentActions
            currency={account.currency}
            accountName={account.name}
            locked={paymentsLocked}
            onUnlock={() => setChallengeOpen(true)}
            onPayment={handlePayment}
          />
        </div>
      </Card>

      <TransactionsSection transactions={all} currency={account.currency} />

      <CardChallengeModal
        open={challengeOpen}
        title="Unlock payments"
        onClose={() => setChallengeOpen(false)}
        onSuccess={() => setPaymentsLocked(false)}
      />

      <Card className="p-5 sm:p-6" glow>
        <CardHeader title="How payments work here" />
        <ul className="mt-4 space-y-3.5 text-sm leading-relaxed text-mist-400">
          <li className="flex gap-3">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent-400" />
            Sending money is card-protected — unlock with the letter mapping on your TrustPass
            card, once per session.
          </li>
          <li className="flex gap-3">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent-400" />
            Payments you make appear instantly as pending — a live view of money leaving the
            account.
          </li>
          <li className="flex gap-3">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent-400" />
            This demo keeps the ledger read-only, so new payments live for the session and reset on
            refresh.
          </li>
          <li className="flex gap-3">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent-400" />
            Payment QRs carry a time-limited trustpass://pay request naming the payee — any
            account can scan one and pay it before it expires.
          </li>
        </ul>
      </Card>
    </div>
  )
}
