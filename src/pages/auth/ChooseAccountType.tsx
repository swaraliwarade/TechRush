import { Briefcase, Check, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Wordmark } from '@/components/layout/Sidebar'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { readableAuthError } from '@/auth/passkeys'
import { setAccountType, type AccountType } from '@/lib/profile'
import { clearSignupIntent } from '@/lib/signupIntent'

const options: {
  value: AccountType
  title: string
  blurb: string
  icon: typeof User
  perks: string[]
}[] = [
  {
    value: 'personal',
    title: 'Personal',
    blurb: 'Everyday spending and transfers.',
    icon: User,
    perks: ['Transaction history', 'Passkey sign-in', 'Trusted device tracking'],
  },
  {
    value: 'business',
    title: 'Business',
    blurb: 'Higher balances, stronger controls.',
    icon: Briefcase,
    perks: ['Everything in Personal', 'PIN-gated balances', 'Live security alert feed'],
  },
]

export function ChooseAccountType({
  userId,
  preset,
  onChosen,
}: {
  userId: string
  /** Chosen on the public sign-up page before a session existed. */
  preset?: AccountType | null
  onChosen: () => void
}) {
  const [selected, setSelected] = useState<AccountType>(preset ?? 'personal')
  const [busy, setBusy] = useState(!!preset)
  const [error, setError] = useState<string | null>(null)

  // Apply the pre-sign-up choice rather than asking the same question twice.
  useEffect(() => {
    if (!preset) return
    let active = true

    setAccountType(userId, preset)
      .then(() => {
        clearSignupIntent()
        onChosen()
      })
      .catch((err) => {
        if (!active) return
        // Fall back to the manual picker so the user is never stuck.
        clearSignupIntent()
        setError(readableAuthError(err))
        setBusy(false)
      })

    return () => {
      active = false
    }
  }, [preset, userId, onChosen])

  async function confirm() {
    setError(null)
    setBusy(true)
    try {
      await setAccountType(userId, selected)
      onChosen()
    } catch (err) {
      setError(readableAuthError(err))
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center p-4 sm:p-8">
      <div className="w-full max-w-lg space-y-5">
        <Wordmark />

        <Card className="p-6 sm:p-8" glow>
          <h1 className="text-2xl font-semibold tracking-tight">Choose your account type</h1>
          <p className="mt-2 text-sm leading-relaxed text-mist-400">
            This shapes which security controls you get. You can't change it later, so pick the one
            that matches how you'll use TrustPass.
          </p>

          {error && (
            <Alert tone="error" className="mt-5">
              {error}
            </Alert>
          )}

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {options.map((option) => {
              const Icon = option.icon
              const active = selected === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelected(option.value)}
                  aria-pressed={active}
                  className={cn(
                    'focus-ring rounded-[var(--radius-tile)] border p-5 text-left transition',
                    active
                      ? 'border-accent-500/50 bg-accent-500/10'
                      : 'border-white/8 bg-black/25 hover:border-white/16',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={cn(
                        'grid size-10 place-items-center rounded-xl',
                        active
                          ? 'accent-gradient text-on-accent'
                          : 'bg-white/6 text-mist-300',
                      )}
                    >
                      <Icon size={19} />
                    </span>
                    {active && (
                      <span className="accent-gradient grid size-5 place-items-center rounded-full text-on-accent">
                        <Check size={12} strokeWidth={3.5} />
                      </span>
                    )}
                  </div>

                  <p className="mt-4 font-semibold">{option.title}</p>
                  <p className="mt-1 text-sm text-mist-400">{option.blurb}</p>

                  <ul className="mt-3 space-y-1.5">
                    {option.perks.map((perk) => (
                      <li key={perk} className="flex items-start gap-2 text-xs text-mist-500">
                        <span className="mt-1.5 size-1 shrink-0 rounded-full bg-accent-400" />
                        {perk}
                      </li>
                    ))}
                  </ul>
                </button>
              )
            })}
          </div>

          <Button size="lg" className="mt-6 w-full" onClick={confirm} disabled={busy}>
            {busy ? 'Saving…' : `Continue as ${selected === 'personal' ? 'Personal' : 'Business'}`}
          </Button>
        </Card>
      </div>
    </div>
  )
}
