import { ArrowLeft, Briefcase, Check, User } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Wordmark } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import type { AccountType } from '@/lib/profile'
import { rememberSignupIntent } from '@/lib/signupIntent'

/**
 * Public-facing account picker. The copy stays deliberately generic — this page
 * is reachable without a session, so it must not describe any account-specific
 * security mechanics.
 */
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
    blurb: 'For your own everyday account.',
    icon: User,
    perks: ['Passwordless sign-in', 'Activity history', 'Device management'],
  },
  {
    value: 'business',
    title: 'Business',
    blurb: 'For company accounts and shared oversight.',
    icon: Briefcase,
    perks: ['Everything in Personal', 'Additional access controls', 'Live security alerts'],
  },
]

export function SignupChoice() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<AccountType>('personal')

  function proceed() {
    // Held until a session exists, then applied automatically so the question
    // isn't repeated after sign-up.
    rememberSignupIntent(selected)
    navigate('/signup/email')
  }

  return (
    <div className="grid min-h-dvh place-items-center p-4 sm:p-8">
      <div className="w-full max-w-lg space-y-5">
        <Wordmark />

        <Card className="p-6 sm:p-8" glow>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="focus-ring mb-5 inline-flex items-center gap-1.5 rounded-full text-sm text-mist-400 transition hover:text-mist-50"
          >
            <ArrowLeft size={15} /> Back
          </button>

          <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
          <p className="mt-2 text-sm leading-relaxed text-mist-400">
            Pick the type that fits how you'll use TrustPass. You'll confirm your email next.
          </p>

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
                        active ? 'accent-gradient text-on-accent' : 'bg-white/6 text-mist-300',
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

          <Button size="lg" className="mt-6 w-full" onClick={proceed}>
            Continue as {selected === 'personal' ? 'Personal' : 'Business'}
          </Button>

          <p className="mt-5 text-center text-sm text-mist-400">
            Already have an account?{' '}
            <Link
              to="/login"
              className="focus-ring rounded-full font-medium text-accent-400 transition hover:text-accent-500"
            >
              Sign in instead
            </Link>
          </p>
        </Card>
      </div>
    </div>
  )
}
