import { Lock, Timer, Unlock } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { AccountOverview } from '@/components/account/AccountOverview'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Splash } from '@/components/ui/Splash'
import { readableAuthError } from '@/auth/passkeys'
import { formatCountdown, useIdleTimer } from '@/hooks/useIdleTimer'
import { pinStatus, type PinVerifyResult } from '@/lib/pin'
import { seedDemoData } from '@/lib/transactions'
import { PinGate } from './PinGate'
import { PinSetup } from './PinSetup'

const AUTO_LOCK_MS = 3 * 60 * 1000

function VaultHeader({ remainingMs, onLock }: { remainingMs: number; onLock: () => void }) {
  const expiringSoon = remainingMs <= 30_000

  return (
    <div className="glass-card flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="accent-gradient grid size-10 shrink-0 place-items-center rounded-xl text-ink-950">
          <Unlock size={18} />
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold tracking-tight sm:text-lg">Vault</h2>
          <p className="truncate text-xs text-mist-400">Unlocked · balance visible</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <Badge tone={expiringSoon ? 'loss' : 'neutral'}>
          <Timer size={12} />
          Locks in {formatCountdown(remainingMs)}
        </Badge>
        <Button variant="outline" size="sm" onClick={onLock}>
          <Lock size={15} />
          Lock
        </Button>
      </div>
    </div>
  )
}

export function Vault() {
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [unlocked, setUnlocked] = useState<PinVerifyResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const lock = useCallback(() => setUnlocked(null), [])

  // Auto-lock on inactivity. Only armed while actually unlocked, so the timer
  // isn't running behind the PIN gate.
  const remainingMs = useIdleTimer({
    timeoutMs: AUTO_LOCK_MS,
    onIdle: lock,
    enabled: unlocked !== null,
  })

  // Locks on navigating away: unmounting drops the decrypted payload from
  // memory rather than parking it in a provider that outlives the route.
  useEffect(() => lock, [lock])

  useEffect(() => {
    let active = true

    async function load() {
      try {
        // Business accounts never render the personal Dashboard, which is what
        // seeds the real ledger. Without this the duress dataset exists (pin_set
        // seeds it) while the real one does not, so unlocking with the correct
        // PIN returns an empty account. Idempotent server-side.
        await seedDemoData()
        const status = await pinStatus()
        if (active) setConfigured(status.configured)
      } catch (err) {
        if (active) setError(readableAuthError(err))
      }
    }

    load()
    return () => {
      active = false
    }
  }, [])

  if (error) {
    return (
      <Card className="p-6">
        <Alert tone="error">{error}</Alert>
        <p className="mt-4 text-sm text-mist-400">
          If this mentions a missing function, the phase 4 migration hasn't been run yet.
        </p>
      </Card>
    )
  }

  if (configured === null) return <Splash message="Checking vault…" />

  if (!configured) return <PinSetup embedded onDone={() => setConfigured(true)} />

  if (!unlocked) return <PinGate onUnlocked={setUnlocked} />

  // pin_verify builds the account object field by field, so a missing row comes
  // back as an object of nulls rather than as null. Checking the object alone
  // let that through and blanked the screen further down.
  if (!unlocked.account?.id) {
    return (
      <div className="space-y-5">
        <VaultHeader remainingMs={remainingMs} onLock={lock} />
        <Card className="p-6">
          <Alert tone="info">
            This account has no ledger data yet. Reload the page to seed it, then unlock again.
          </Alert>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <VaultHeader remainingMs={remainingMs} onLock={lock} />
      <AccountOverview account={unlocked.account} transactions={unlocked.transactions ?? []} />
    </div>
  )
}
