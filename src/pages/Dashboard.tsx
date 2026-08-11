import { useEffect, useState } from 'react'
import { AccountOverview } from '@/components/account/AccountOverview'
import { TransactionsSection } from '@/components/account/TransactionsSection'
import { Alert } from '@/components/ui/Alert'
import { Card } from '@/components/ui/Card'
import { Splash } from '@/components/ui/Splash'
import { readableAuthError } from '@/auth/passkeys'
import {
  fetchAccount,
  fetchTransactions,
  seedDemoData,
  type Account,
  type Transaction,
} from '@/lib/transactions'

export function Dashboard() {
  const [account, setAccount] = useState<Account | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
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

  if (loading) return <Splash message="Loading your account…" />

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

  return (
    <div className="space-y-5">
      <AccountOverview account={account} transactions={transactions} />
      <TransactionsSection transactions={transactions} currency={account.currency} />
    </div>
  )
}
