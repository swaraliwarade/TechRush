import { Lock, Unlock, X } from 'lucide-react'
import { useState } from 'react'
import { TransactionRow } from '@/components/account/TransactionRow'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { ShuffledKeypad } from '@/components/ui/ShuffledKeypad'
import { buildChallenge, type Challenge } from '@/lib/cardMapping'
import type { LedgerEntry } from '@/lib/transactions'

const MAX_ATTEMPTS = 5
const CHALLENGE_SIZE = 3

/**
 * Locked Transactions section. Unlocking runs the card-mapping step-up: the
 * modal asks for the digits printed next to three random letters (A–F) on the
 * account's TrustPass card, entered on a keypad whose keys are shuffled on
 * every open and after every wrong attempt. The mapping is client-side
 * placeholder data — a real deployment verifies server-side.
 */
export function TransactionsSection({
  transactions,
  currency,
}: {
  transactions: LedgerEntry[]
  currency: string
}) {
  const [locked, setLocked] = useState(true)
  const [open, setOpen] = useState(false)
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [entry, setEntry] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [lockedOut, setLockedOut] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shuffleKey, setShuffleKey] = useState(0)

  function openModal() {
    setChallenge(buildChallenge(CHALLENGE_SIZE))
    setEntry('')
    setAttempts(0)
    setLockedOut(false)
    setError(null)
    setShuffleKey((k) => k + 1)
    setOpen(true)
  }

  function closeModal() {
    setOpen(false)
    setChallenge(null)
  }

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
      setLocked(false)
      closeModal()
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
      setError(`That doesn't match the mapping on your card. ${MAX_ATTEMPTS - nextAttempts} attempts left.`)
    }
  }

  return (
    <>
      <Card className="p-5 sm:p-6">
        <CardHeader
          title="Transactions"
          action={
            locked ? (
              <Badge tone="warn">
                <Lock size={12} /> Locked
              </Badge>
            ) : (
              <Badge tone="gain">
                <Unlock size={12} /> Unlocked
              </Badge>
            )
          }
        />

        {locked ? (
          <div className="mt-6 flex flex-col items-center text-center">
            <span className="grid size-12 place-items-center rounded-2xl border border-warn-400/25 bg-warn-400/12 text-warn-400">
              <Lock size={22} />
            </span>
            <h3 className="mt-4 text-base font-semibold tracking-tight sm:text-lg">
              Transactions are locked
            </h3>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-mist-400">
              Your transaction history is hidden until you confirm it's you. Unlock with the
              letter mapping printed on your TrustPass card.
            </p>
            <Button className="mt-5" onClick={openModal}>
              <Unlock size={16} /> Unlock transactions
            </Button>
          </div>
        ) : (
          <div>
            {transactions.length === 0 ? (
              <p className="py-10 text-center text-sm text-mist-500">No transactions yet.</p>
            ) : (
              <ul className="mt-2 max-h-[440px] divide-y divide-white/6 overflow-y-auto pr-1">
                {transactions.map((txn, index) => (
                  <TransactionRow key={txn.id} txn={txn} currency={currency} index={index} />
                ))}
              </ul>
            )}
            <div className="mt-4 flex justify-end border-t border-white/6 pt-4">
              <Button variant="outline" size="sm" onClick={() => setLocked(true)}>
                <Lock size={14} /> Lock again
              </Button>
            </div>
          </div>
        )}
      </Card>

      {open && challenge && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div aria-hidden className="absolute inset-0 bg-scrim backdrop-blur-sm" />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="transactions-unlock-title"
            className="relative w-full max-w-sm"
          >
            <Card className="p-6 sm:p-7">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2
                    id="transactions-unlock-title"
                    className="text-lg font-semibold tracking-tight"
                  >
                    Unlock Transactions
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-mist-400">
                    Enter the number printed on your card next to each letter.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  aria-label="Close"
                  className="focus-ring -mr-1 grid size-9 shrink-0 place-items-center rounded-full text-mist-400 transition hover:bg-white/6 hover:text-mist-50"
                >
                  <X size={17} />
                </button>
              </div>

              {/* The three letter blocks */}
              <div className="mt-6 flex justify-center gap-3">
                {challenge.letters.map((letter, i) => (
                  <div key={letter} className="text-center">
                    <p className="text-sm font-semibold tracking-widest text-accent-400">
                      {letter}
                    </p>
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
        </div>
      )}
    </>
  )
}
