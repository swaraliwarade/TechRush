import { ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PinDots, PinPad } from '@/components/ui/PinPad'
import { readableAuthError } from '@/auth/passkeys'
import { pinSet } from '@/lib/pin'
import { PIN_LENGTH, validatePin, validatePinPair } from '@/lib/pinValidation'

type Screen = 1 | 2

/**
 * Two-screen PIN enrolment.
 *
 * Screen 2's copy is deliberately flat. What the second PIN actually does is
 * explained only in the email sent at the end — if the app ever spelled it out,
 * anyone coercing the account holder could read it off the screen and the
 * protection would be worthless.
 */
const screens: Record<Screen, { title: string; subtext: string; step: string }> = {
  1: {
    title: 'Set your PIN',
    subtext: "You'll use this to view your account balance and activity.",
    step: 'Step 1 of 2',
  },
  2: {
    title: 'Set a second PIN',
    subtext: "You can use this PIN as well. We'll email you more about how it works.",
    step: 'Step 2 of 2',
  },
}

type Phase = 'enter' | 'confirm'

export function PinSetup({
  onDone,
  embedded = false,
}: {
  onDone: () => void
  /** `true` when rendered inside the app shell rather than as an onboarding step. */
  embedded?: boolean
}) {
  const [screen, setScreen] = useState<Screen>(1)
  const [phase, setPhase] = useState<Phase>('enter')
  const [firstPin, setFirstPin] = useState('')
  const [pendingPin, setPendingPin] = useState('')
  const [entry, setEntry] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** Shown once, immediately after both PINs are stored, then never again. */
  const [showBriefing, setShowBriefing] = useState(false)

  function resetEntry(nextPhase: Phase) {
    setEntry('')
    setPhase(nextPhase)
  }

  async function save(secondPin: string) {
    setBusy(true)

    try {
      await pinSet(firstPin, secondPin)
      setShowBriefing(true)
    } catch (err) {
      setError(readableAuthError(err))
      resetEntry('enter')
    } finally {
      setBusy(false)
    }
  }

  function handleComplete(value: string) {
    setError(null)

    if (phase === 'enter') {
      const problem = validatePin(value)
      if (problem) {
        setError(problem)
        setEntry('')
        return
      }
      setPendingPin(value)
      resetEntry('confirm')
      return
    }

    // confirm
    if (value !== pendingPin) {
      setError("Those didn't match. Enter your PIN again.")
      setPendingPin('')
      resetEntry('enter')
      return
    }

    if (screen === 1) {
      setFirstPin(value)
      setPendingPin('')
      setScreen(2)
      resetEntry('enter')
      return
    }

    const problem = validatePinPair(firstPin, value)
    if (problem) {
      setError(problem)
      setPendingPin('')
      resetEntry('enter')
      return
    }

    save(value)
  }

  const copy = screens[screen]

  // Shown exactly once. This explanation is reachable from nowhere else in the
  // app — not Settings, not Support, not the security feed — so that someone
  // pressuring the account holder later cannot find it on any screen.
  if (showBriefing) {
    return (
      <div
        className={
          embedded ? 'grid place-items-center' : 'grid min-h-dvh place-items-center p-4 sm:p-8'
        }
      >
        <div className="w-full max-w-md">
          <Card className="p-6 sm:p-8" glow>
            <span className="accent-gradient grid size-12 place-items-center rounded-2xl text-ink-950">
              <ShieldCheck size={23} strokeWidth={2.2} />
            </span>

            <h1 className="mt-5 text-2xl font-semibold tracking-tight">
              Before you go — about your two PINs
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-mist-400">
              They behave differently, and the difference matters.
            </p>

            <div className="mt-6 space-y-3">
              <div className="glass-tile p-4">
                <p className="text-sm font-semibold">Your first PIN</p>
                <p className="mt-1.5 text-sm leading-relaxed text-mist-400">
                  Opens your vault normally, showing your real balance and full transaction
                  history. Use this one day to day.
                </p>
              </div>

              <div className="rounded-[var(--radius-tile)] border border-accent-500/30 bg-accent-500/8 p-4">
                <p className="text-sm font-semibold">Your second PIN</p>
                <p className="mt-1.5 text-sm leading-relaxed text-mist-400">
                  Opens the vault to a safe view instead — a low balance and an ordinary-looking
                  history that isn't your real account. Use it if you're ever pressured or forced
                  to open your account in front of someone.
                </p>
              </div>
            </div>

            <p className="mt-5 text-sm leading-relaxed text-mist-400">
              The app looks and behaves identically either way, so nobody watching your screen can
              tell which one you entered.
            </p>

            <Alert tone="info" className="mt-5">
              This is the only time you'll see this. It appears nowhere else in the app, on purpose.
            </Alert>

            <Button size="lg" className="mt-6 w-full" onClick={onDone}>
              I understand — continue
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div
      className={
        embedded ? 'grid place-items-center' : 'grid min-h-dvh place-items-center p-4 sm:p-8'
      }
    >
      <div className="w-full max-w-md">
        <Card className="p-6 sm:p-8" glow>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium tracking-wide text-mist-400 uppercase">
              {copy.step}
            </span>
            <div className="flex gap-1.5">
              {[1, 2].map((n) => (
                <span
                  key={n}
                  className={
                    n <= screen
                      ? 'accent-gradient h-1 w-8 rounded-full'
                      : 'h-1 w-8 rounded-full bg-white/12'
                  }
                />
              ))}
            </div>
          </div>

          <div className="mt-6 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-mist-400">
              {copy.subtext}
            </p>
          </div>

          <p className="mt-6 text-center text-sm font-medium text-mist-300">
            {phase === 'enter' ? 'Enter 6 digits' : 'Confirm your PIN'}
          </p>

          <div className="mt-4">
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
              onComplete={handleComplete}
            />
          </div>

          {busy && <p className="mt-5 text-center text-sm text-mist-400">Saving…</p>}

          {!busy && phase === 'confirm' && (
            <Button variant="ghost" className="mt-5 w-full" onClick={() => resetEntry('enter')}>
              Re-enter PIN
            </Button>
          )}
        </Card>
      </div>
    </div>
  )
}
