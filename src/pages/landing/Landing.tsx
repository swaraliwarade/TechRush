import {
  ArrowRight,
  Check,
  Fingerprint,
  KeyRound,
  Mail,
  ScanFace,
  ShieldCheck,
  Smartphone,
  type LucideIcon,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Wordmark } from '@/components/layout/Sidebar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

const steps: { icon: LucideIcon; label: string }[] = [
  { icon: Mail, label: 'Enter your email' },
  { icon: ScanFace, label: 'Verify with Face ID, Touch ID, or Windows Hello' },
  { icon: Check, label: "You're in." },
]

const reasons: { icon: LucideIcon; title: string; line: string }[] = [
  {
    icon: ShieldCheck,
    title: 'No password to steal or leak',
    line: 'Nothing to write down, reuse, or sit in a database.',
  },
  {
    icon: Fingerprint,
    title: 'Every sign-in is tied to a device you hold',
    line: 'Access travels with you, not with a secret someone can guess.',
  },
  {
    icon: Smartphone,
    title: 'Works across your devices',
    line: 'Start on your laptop, approve with your phone.',
  },
  {
    icon: KeyRound,
    title: 'Backed by the same standard used for hardware security keys',
    line: 'The approach trusted for high-security access, on by default.',
  },
]

function GetStarted({ size = 'lg' }: { size?: 'md' | 'lg' }) {
  const navigate = useNavigate()
  return (
    <Button size={size} onClick={() => navigate('/signup')}>
      Get started
      <ArrowRight size={17} />
    </Button>
  )
}

export function Landing() {
  const navigate = useNavigate()

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
      {/* 1. Header */}
      <header className="flex items-center justify-between gap-3 py-5 sm:py-6">
        <Wordmark />
        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
            Log in
          </Button>
          <Button size="sm" onClick={() => navigate('/signup')}>
            Sign up
          </Button>
        </div>
      </header>

      {/* 2. Hero */}
      <section className="py-14 text-center sm:py-20 lg:py-24">
        <Badge tone="accent" className="mx-auto">
          <Fingerprint size={13} />
          Passwordless sign-in
        </Badge>

        <h1 className="mx-auto mt-6 max-w-3xl text-4xl leading-[1.05] font-bold tracking-tight sm:text-6xl lg:text-7xl">
          No passwords.{' '}
          <span className="bg-gradient-to-r from-accent-600 via-accent-500 to-accent-400 bg-clip-text text-transparent">
            Just you.
          </span>
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-mist-400 sm:text-lg">
          Sign in with your face, your fingerprint, or your device — nothing to type, nothing to
          steal.
        </p>

        <div className="mt-9 flex justify-center">
          <GetStarted />
        </div>

        {/* CSS-only product glimpse — no image assets to ship. */}
        <Card className="mx-auto mt-14 max-w-sm p-6 sm:mt-20 sm:p-8" glow>
          <span className="accent-gradient mx-auto grid size-14 place-items-center rounded-2xl text-ink-950">
            <Fingerprint size={28} strokeWidth={2.2} />
          </span>
          <p className="mt-5 text-lg font-semibold tracking-tight">Continue with passkey</p>
          <p className="mt-1.5 text-sm text-mist-400">Touch the sensor to sign in</p>
          <div className="mt-6 flex items-center justify-center gap-2">
            <span className="size-2 animate-pulse rounded-full bg-gain-400" />
            <span className="text-xs text-mist-500">Waiting for your device…</span>
          </div>
        </Card>
      </section>

      {/* 3. How it works */}
      <section className="py-14 sm:py-20">
        <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-4xl">
          How it works
        </h2>

        <ol className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-3 sm:gap-5">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <li key={step.label}>
                <Card className="flex h-full flex-col items-center p-6 text-center">
                  <span className="text-xs font-semibold tracking-widest text-accent-400">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="mt-4 grid size-12 place-items-center rounded-2xl border border-white/8 bg-black/30 text-accent-400">
                    <Icon size={22} />
                  </span>
                  <p className="mt-4 text-sm font-medium text-balance">{step.label}</p>
                </Card>
              </li>
            )
          })}
        </ol>
      </section>

      {/* 4. Why it's safer */}
      <section className="py-14 sm:py-20">
        <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-4xl">
          Why it's safer
        </h2>

        <div className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
          {reasons.map((reason) => {
            const Icon = reason.icon
            return (
              <Card key={reason.title} className="flex h-full flex-col p-5 sm:p-6">
                <span className="grid size-10 place-items-center rounded-xl bg-white/6 text-accent-400">
                  <Icon size={18} />
                </span>
                <p className="mt-4 text-sm font-semibold text-balance">{reason.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-mist-400">{reason.line}</p>
              </Card>
            )
          })}
        </div>
      </section>

      {/* 5. Closing CTA */}
      <section className="py-14 sm:py-20">
        <Card className="p-8 text-center sm:p-14" glow>
          <h2 className="mx-auto max-w-lg text-2xl font-semibold tracking-tight text-balance sm:text-4xl">
            Ready to stop typing passwords?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm text-mist-400 sm:text-base">
            Setting up takes less than a minute.
          </p>
          <div className="mt-8 flex justify-center">
            <GetStarted />
          </div>
        </Card>
      </section>

      {/* 6. Footer */}
      <footer className="flex flex-col items-center justify-between gap-5 border-t border-white/6 py-8 sm:flex-row sm:py-10">
        <Wordmark />
        <nav className="flex items-center gap-6 text-sm text-mist-400">
          <Link to="/login" className="focus-ring rounded-full transition hover:text-mist-50">
            Log in
          </Link>
          <Link to="/signup" className="focus-ring rounded-full transition hover:text-mist-50">
            Sign up
          </Link>
        </nav>
        <p className="text-xs text-mist-500">© {new Date().getFullYear()} TrustPass</p>
      </footer>
    </div>
  )
}
