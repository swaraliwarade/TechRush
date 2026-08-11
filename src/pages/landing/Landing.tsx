import {
  ArrowRight,
  Check,
  Fingerprint,
  KeyRound,
  Mail,
  Menu,
  ScanFace,
  ShieldCheck,
  Smartphone,
  Sparkles,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Wordmark } from '@/components/layout/Sidebar'
import { Reveal } from '@/components/motion/Reveal'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/cn'

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

/** CSS-only product glimpse — no image assets to ship. */
function PasskeyMockup() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <Card className="p-6 sm:p-7" glow>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold tracking-tight">TrustPass</span>
          <Badge tone="gain">
            <ShieldCheck size={12} />
            Secure
          </Badge>
        </div>

        <div className="mt-9 flex flex-col items-center text-center">
          <span className="grid size-16 place-items-center rounded-2xl bg-teal-100 text-accent-500">
            <Fingerprint size={30} strokeWidth={2} />
          </span>
          <p className="mt-5 text-lg font-semibold tracking-tight">Continue with passkey</p>
          <p className="mt-1 text-sm text-mist-400">Touch the sensor to sign in</p>
          <div className="mt-5 flex items-center gap-2">
            <span className="size-2 animate-pulse rounded-full bg-gain-400" />
            <span className="text-xs text-mist-500">Waiting for your device…</span>
          </div>
        </div>

        <div className="mt-8 space-y-2.5 border-t border-white/10 pt-5">
          <div className="flex items-center justify-between rounded-xl bg-mist-500/10 px-3 py-2.5 ring-1 ring-white/10">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-lg bg-blush-100 text-blush-500">
                <ScanFace size={15} />
              </span>
              <div className="space-y-1.5">
                <div className="h-2 w-28 rounded-full bg-mist-500/35" />
                <div className="h-2 w-20 rounded-full bg-mist-500/20" />
              </div>
            </div>
            <Check size={15} className="text-gain-400" />
          </div>
          <div className="flex items-center justify-between rounded-xl bg-mist-500/10 px-3 py-2.5 ring-1 ring-white/10">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-lg bg-teal-100 text-accent-500">
                <Smartphone size={15} />
              </span>
              <div className="space-y-1.5">
                <div className="h-2 w-24 rounded-full bg-mist-500/35" />
                <div className="h-2 w-16 rounded-full bg-mist-500/20" />
              </div>
            </div>
            <Check size={15} className="text-gain-400" />
          </div>
        </div>
      </Card>

      {/* Floating verified chip over the card's bottom edge. */}
      <div className="glass-card absolute -bottom-6 left-6 flex items-center gap-2 px-4 py-3">
        <ShieldCheck size={15} className="text-gain-400" />
        <span className="text-xs font-semibold">Passkey verified</span>
      </div>
    </div>
  )
}

/** True once the page has scrolled past the hero's top edge. */
function useScrolled(threshold = 12) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])
  return scrolled
}

const navLink =
  'focus-ring rounded-full px-3.5 py-2 text-sm text-mist-400 transition hover:bg-white/8 hover:text-mist-50'

function Navbar() {
  const navigate = useNavigate()
  const scrolled = useScrolled()
  const [open, setOpen] = useState(false)

  // Close the mobile menu the moment the page moves under it.
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('scroll', close, { passive: true })
    return () => window.removeEventListener('scroll', close)
  }, [open])

  return (
    <header
      className={cn(
        'sticky top-0 z-40 transition-[background-color,border-color,box-shadow] duration-300',
        scrolled || open
          ? 'border-b border-black/10 bg-black/30 shadow-[0_12px_32px_-20px_rgba(20,60,70,0.35)] backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Wordmark />

        <nav className="hidden items-center gap-1 md:flex">
          <a href="#how" className={navLink}>
            How it works
          </a>
          <a href="#why" className={navLink}>
            Why passkeys
          </a>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex"
            onClick={() => navigate('/login')}
          >
            Log in
          </Button>
          <Button size="sm" onClick={() => navigate('/signup')}>
            Get started
          </Button>
          <button
            type="button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="focus-ring grid size-9 place-items-center rounded-full text-mist-300 transition hover:bg-white/8 hover:text-mist-50 md:hidden"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="absolute inset-x-0 top-full md:hidden">
          <div className="mx-auto w-full max-w-6xl px-4 pb-3 sm:px-6 lg:px-8">
            <nav className="rounded-2xl border border-black/10 bg-black/90 p-2 shadow-[0_20px_48px_-20px_rgba(20,60,70,0.4)] backdrop-blur-xl">
              <a
                href="#how"
                onClick={() => setOpen(false)}
                className="focus-ring block rounded-xl px-3.5 py-2.5 text-sm font-medium text-mist-300 transition hover:bg-white/8 hover:text-mist-50"
              >
                How it works
              </a>
              <a
                href="#why"
                onClick={() => setOpen(false)}
                className="focus-ring block rounded-xl px-3.5 py-2.5 text-sm font-medium text-mist-300 transition hover:bg-white/8 hover:text-mist-50"
              >
                Why passkeys
              </a>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  navigate('/login')
                }}
                className="focus-ring block w-full rounded-xl px-3.5 py-2.5 text-left text-sm font-medium text-mist-300 transition hover:bg-white/8 hover:text-mist-50"
              >
                Log in
              </button>
            </nav>
          </div>
        </div>
      )}
    </header>
  )
}

export function Landing() {
  return (
    <div className="landing-pastel relative min-h-dvh text-mist-50">
      <Navbar />

      {/* Hero — headline left, product glimpse right, on the full-page teal canvas. */}
      <section>
        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-14 px-4 pb-24 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-8 lg:pb-28">
          <div className="text-center lg:text-left">
            <Reveal>
              <Badge tone="accent" className="mx-auto lg:mx-0">
                <Fingerprint size={13} />
                Passwordless sign-in
              </Badge>
            </Reveal>

            <Reveal delay={0.08}>
              <h1 className="text-display mt-6 text-4xl leading-[1.05] sm:text-5xl lg:text-6xl">
                No passwords.{' '}
                {/* Light accent on the pastel canvas — white melting into the
                    lightest teal, with a soft deepwater shadow so the glyphs
                    stay separated from the busy gradient behind them. Uses a
                    literal hex: `white` compiles to the flipped glass token
                    (#1a3b45) inside the light landing scope. */}
                <span className="bg-gradient-to-r from-[#ffffff] to-teal-200 bg-clip-text text-transparent drop-shadow-[0_1px_1px_rgba(6,38,46,0.35)] drop-shadow-[0_2px_8px_rgba(6,38,46,0.3)]">
                  Just you.
                </span>
              </h1>
            </Reveal>

            <Reveal delay={0.16}>
              <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-mist-300 sm:text-lg lg:mx-0">
                TrustPass replaces passwords with passkeys you hold — sign in with your face or
                fingerprint, on any device, in seconds. Nothing to type, nothing to steal.
              </p>
            </Reveal>

            <Reveal delay={0.22}>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                <GetStarted />
                <a
                  href="#how"
                  className="focus-ring inline-flex h-12 items-center gap-2 rounded-full px-6 text-base font-medium text-mist-300 transition hover:bg-white/8 hover:text-mist-50"
                >
                  See how it works
                </a>
              </div>
            </Reveal>

            <Reveal delay={0.3}>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium tracking-wide text-mist-300 lg:justify-start">
                <span className="flex items-center gap-2">
                  <Check size={13} className="text-gain-400" /> Free forever
                </span>
                <span className="flex items-center gap-2">
                  <Check size={13} className="text-gain-400" /> No credit card
                </span>
                <span className="flex items-center gap-2">
                  <Check size={13} className="text-gain-400" /> Set up in under a minute
                </span>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.24}>
            <PasskeyMockup />
          </Reveal>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-28 py-16 sm:py-24">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="kicker text-mist-300">The flow</p>
            <h2 className="text-display mt-3 text-3xl leading-none sm:text-4xl">How it works</h2>
          </div>

          <ol className="mt-12 grid gap-5 sm:grid-cols-3">
            {steps.map((step, index) => {
              const Icon = step.icon
              return (
                <li key={step.label}>
                  <Reveal delay={index * 0.1} className="h-full">
                    <Card className="flex h-full flex-col items-center p-7 text-center">
                      <span className="text-xs font-semibold tracking-widest text-accent-400">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="mx-auto mt-4 grid size-12 place-items-center rounded-2xl bg-teal-100 text-accent-500">
                        <Icon size={22} />
                      </span>
                      <p className="mt-4 text-sm font-medium text-balance">{step.label}</p>
                    </Card>
                  </Reveal>
                </li>
              )
            })}
          </ol>
        </div>
      </section>

      {/* Why it's safer */}
      <section id="why" className="scroll-mt-28 py-16 sm:py-24">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="kicker text-mist-300">Why passkeys</p>
            <h2 className="text-display mt-3 text-3xl leading-none sm:text-4xl">Why it's safer</h2>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {reasons.map((reason, index) => {
              const Icon = reason.icon
              return (
                <Reveal key={reason.title} delay={index * 0.08} className="h-full">
                  <Card className="flex h-full flex-col p-6">
                    <span
                      className={`grid size-10 place-items-center rounded-xl ${
                        index % 2 === 1 ? 'bg-blush-100 text-blush-500' : 'bg-teal-100 text-accent-500'
                      }`}
                    >
                      <Icon size={18} />
                    </span>
                    <p className="mt-4 text-sm font-semibold text-balance">{reason.title}</p>
                    <p className="mt-2 text-sm leading-relaxed text-mist-400">{reason.line}</p>
                  </Card>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* Closing CTA — charcoal card, echoing the footer. */}
      <section className="pb-16 sm:pb-24">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <Card className="landing-night p-8 text-center sm:p-14" glow>
              <h2 className="text-display mx-auto max-w-lg text-2xl leading-tight text-balance text-mist-50 sm:text-4xl">
                Ready to stop typing passwords?
              </h2>
              <p className="mx-auto mt-4 max-w-md text-sm text-mist-400 sm:text-base">
                Setting up takes less than a minute.
              </p>
              <div className="mt-8 flex justify-center">
                <GetStarted />
              </div>
            </Card>
          </Reveal>
        </div>
      </section>

      {/* Footer — charcoal, with soft pastel glows at the edges. */}
      <footer className="landing-night relative overflow-hidden text-mist-50">
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-96 rounded-full bg-blush-400/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-20 h-80 w-96 rounded-full bg-teal-400/15 blur-3xl"
        />

        <div className="relative mx-auto w-full max-w-6xl px-4 pb-10 pt-16 sm:px-6 lg:px-8">
          <div className="grid gap-12 md:grid-cols-[1.2fr_2fr] md:items-start">
            <div>
              <Wordmark />
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-mist-400">
                Passwordless sign-in for personal and business accounts. No passwords, ever.
              </p>
            </div>

            <nav className="grid grid-cols-2 gap-8 sm:grid-cols-3">
              <div>
                <p className="text-sm font-semibold text-mist-50">Product</p>
                <ul className="mt-3 space-y-2.5 text-sm text-mist-400">
                  <li>
                    <a href="#how" className="focus-ring rounded-full transition hover:text-mist-50">
                      How it works
                    </a>
                  </li>
                  <li>
                    <a href="#why" className="focus-ring rounded-full transition hover:text-mist-50">
                      Why passkeys
                    </a>
                  </li>
                  <li>
                    <Link to="/signup" className="focus-ring rounded-full transition hover:text-mist-50">
                      Get started
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <p className="text-sm font-semibold text-mist-50">Account</p>
                <ul className="mt-3 space-y-2.5 text-sm text-mist-400">
                  <li>
                    <Link to="/login" className="focus-ring rounded-full transition hover:text-mist-50">
                      Log in
                    </Link>
                  </li>
                  <li>
                    <Link to="/signup" className="focus-ring rounded-full transition hover:text-mist-50">
                      Sign up
                    </Link>
                  </li>
                  <li>
                    <Link to="/support" className="focus-ring rounded-full transition hover:text-mist-50">
                      Support
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <p className="text-sm font-semibold text-mist-50">Trust</p>
                <ul className="mt-3 space-y-2.5 text-sm text-mist-400">
                  <li>WebAuthn passkeys</li>
                  <li>No passwords stored</li>
                  <li>Open standard</li>
                </ul>
              </div>
            </nav>
          </div>

          <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
            <p className="text-xs text-mist-500">© {new Date().getFullYear()} TrustPass</p>
            <p className="flex items-center gap-2 text-xs text-mist-500">
              <Sparkles size={13} className="text-blush-400" />
              No passwords. Ever.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
