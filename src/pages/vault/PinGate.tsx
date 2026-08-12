import { Lock, ShieldX } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Alert } from '@/components/ui/Alert'
import { Card } from '@/components/ui/Card'
import { PinDots, PinPad } from '@/components/ui/PinPad'
import { readableAuthError } from '@/auth/passkeys'
import { MAX_PIN_ATTEMPTS, PIN_LENGTH, pinVerify, type PinVerifyResult } from '@/lib/pin'

function useCountdown(until?: string | null) {
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    if (!until) return
    function tick() {
      setRemaining(Math.max(0, new Date(until!).getTime() - Date.now()))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [until])

  const totalSeconds = Math.ceil(remaining / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return { remaining, label: `${minutes}:${String(seconds).padStart(2, '0')}` }
}

function LockedOut({ until, onExpire }: { until?: string | null; onExpire: () => void }) {
  const { remaining, label } = useCountdown(until)

  useEffect(() => {
    if (until && remaining === 0) onExpire()
  }, [remaining, until, onExpire])

  return (
    <div className="mx-auto max-w-md">
      <Card className="p-6 text-center sm:p-8">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-loss-400/20 bg-loss-400/10 text-loss-400">
          <ShieldX size={23} />
        </span>
        <h2 className="mt-5 text-xl font-semibold tracking-tight">Vault locked</h2>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-mist-400">
          Too many incorrect attempts. Access is suspended for security.
        </p>
        <p className="mt-6 text-4xl font-bold tabular-nums">{label}</p>
        <p className="mt-1 text-xs text-mist-500">until you can try again</p>
      </Card>
    </div>
  )
}

/**
 * Renders exactly the same for a real PIN and a duress PIN. There is no branch
 * anywhere in this component on which ledger came back, because the server
 * never tells it — see pin_verify() in migration 0003.
 */
export function PinGate({ onUnlocked }: { onUnlocked: (result: PinVerifyResult) => void }) {
  const [entry, setEntry] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_PIN_ATTEMPTS)
  const [lockedUntil, setLockedUntil] = useState<string | null>(null)

  async function submit(value: string) {
    setBusy(true)
    setError(null)
    try {
      const result = await pinVerify(value)

      if (result.ok) {
        onUnlocked(result)
        return
      }

      if (result.locked) {
        setLockedUntil(result.locked_until ?? null)
        setEntry('')
        setBusy(false)
        return
      }

      setAttemptsLeft(result.attempts_remaining)
      setError(
        result.attempts_remaining === 1
          ? 'Incorrect PIN. One attempt left before lockout.'
          : `Incorrect PIN. ${result.attempts_remaining} attempts left.`,
      )
      setEntry('')
      setBusy(false)
    } catch (err) {
      setError(readableAuthError(err))
      setEntry('')
      setBusy(false)
    }
  }

  if (lockedUntil) {
    return (
      <LockedOut
        until={lockedUntil}
        onExpire={() => {
          setLockedUntil(null)
          setAttemptsLeft(MAX_PIN_ATTEMPTS)
          setError(null)
        }}
      />
    )
  }

  return (
    <div className="mx-auto max-w-md">
      <Card className="p-6 sm:p-8" glow>
        <div className="text-center">
          <span className="accent-gradient mx-auto grid size-12 place-items-center rounded-2xl text-on-accent">
            <Lock size={22} />
          </span>
          <h2 className="mt-5 text-xl font-semibold tracking-tight">Enter your vault PIN</h2>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-mist-400">
            Your balance stays hidden until you unlock it.
          </p>
        </div>

        <div className="mt-7">
          <PinDots filled={entry.length} length={PIN_LENGTH} error={!!error} />
        </div>

        {error && (
          <Alert tone="error" className="mt-5">
            {error}
          </Alert>
        )}

        <div className="mt-6">
          <PinPad
            value={entry}
            onChange={setEntry}
            length={PIN_LENGTH}
            disabled={busy}
            onComplete={submit}
          />
        </div>

        <p className="mt-6 text-center text-xs text-mist-500">
          {busy ? 'Checking…' : `${attemptsLeft} of ${MAX_PIN_ATTEMPTS} attempts remaining`}
        </p>
      </Card>
    </div>
  )
}
