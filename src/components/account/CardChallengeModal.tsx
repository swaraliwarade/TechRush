import { X } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { Alert } from '@/components/ui/Alert'
import { Card } from '@/components/ui/Card'
import { ShuffledKeypad } from '@/components/ui/ShuffledKeypad'
import { buildChallenge, type Challenge } from '@/lib/cardMapping'

const MAX_ATTEMPTS = 5
const CHALLENGE_SIZE = 3

/**
 * Card-mapping step-up used to gate sensitive actions (payments, vault).
 * Asks for the digits printed next to three random letters (A–F) on the
 * account's TrustPass card, entered on a keypad whose keys are shuffled on
 * every open and after every wrong attempt. The mapping is client-side
 * placeholder data — a real deployment verifies server-side.
 */
export function CardChallengeModal({
  open,
  title = 'Unlock',
  onClose,
  onSuccess,
}: {
  open: boolean
  title?: string
  onClose: () => void
  onSuccess: () => void
}) {
  const titleId = useId()
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [entry, setEntry] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [lockedOut, setLockedOut] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shuffleKey, setShuffleKey] = useState(0)

  // A fresh challenge and clean slate every time the modal opens.
  useEffect(() => {
    if (!open) return
    setChallenge(buildChallenge(CHALLENGE_SIZE))
    setEntry('')
    setAttempts(0)
    setLockedOut(false)
    setError(null)
    setShuffleKey((k) => k + 1)
  }, [open])

  function onDigit(digit: string) {
    if (entry.length >= CHALLENGE_SIZE) return
    const next = entry + digit
    setEntry(next)
    if (next.length === CHALLENGE_SIZE) verify(next)
  }

  function verify(entered: string) {
    if (!challenge) return
    const correct = entered.split('').every((d, i) => d === challenge.expected[i])

    if (correct) {
      onSuccess()
      onClose()
      return
    }

    const nextAttempts = attempts + 1
    setAttempts(nextAttempts)
    setEntry('')
    // A fresh layout after every failure, so a shoulder-surfer can't line up
    // the digit they saw with a remembered position.
    setShuffleKey((k) => k + 1)
    if (nextAttempts >= MAX_ATTEMPTS) {
      setLockedOut(true)
      setError(`Too many wrong attempts. Close and try again.`)
    } else {
      setError(
        `That doesn't match the mapping on your card. ${MAX_ATTEMPTS - nextAttempts} attempts left.`,
      )
    }
  }

  if (!open) return null

  // Portaled to <body> so the page shell's transform/backdrop-blur can't trap
  // or clip the fixed overlay (see PaymentActions/Modal for the same fix).
  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div aria-hidden className="absolute inset-0 bg-scrim backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-sm"
      >
        <Card className="p-6 sm:p-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id={titleId} className="text-lg font-semibold tracking-tight">
                {title}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-mist-400">
                Enter the number printed on your card next to each letter.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="focus-ring -mr-1 grid size-9 shrink-0 place-items-center rounded-full text-mist-400 transition hover:bg-white/6 hover:text-mist-50"
            >
              <X size={17} />
            </button>
          </div>

          {/* The three letter blocks */}
          <div className="mt-6 flex justify-center gap-3">
            {challenge?.letters.map((letter, i) => (
              <div key={letter} className="text-center">
                <p className="text-sm font-semibold tracking-widest text-accent-400">{letter}</p>
                <div className="mt-1.5 grid size-14 place-items-center rounded-2xl border border-white/8 bg-black/30 text-2xl font-semibold tabular-nums">
                  {entry[i] ?? <span className="text-mist-500">·</span>}
                </div>
              </div>
            ))}
          </div>

          {error && (
            <Alert tone={lockedOut ? 'error' : 'warn'} className="mt-4">
              {error}
            </Alert>
          )}

          <div className="mt-5">
            <ShuffledKeypad
              onDigit={onDigit}
              onBackspace={() => {
                setEntry((e) => e.slice(0, -1))
                setError(null)
              }}
              disabled={lockedOut}
              shuffleKey={shuffleKey}
            />
          </div>

          <p className="mt-5 text-center text-xs leading-relaxed text-mist-500">
            Keys are rearranged every time, so no one can read the digits from your screen.
          </p>
        </Card>
      </div>
    </div>,
    document.body,
  )
}
