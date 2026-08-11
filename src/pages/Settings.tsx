import { Briefcase, Check, Fingerprint, IdCard, Mail, Smartphone, User, X } from 'lucide-react'
import { useState } from 'react'
import { AnimatedNumber } from '@/components/motion/AnimatedNumber'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { setProfileTheme, type Profile } from '@/lib/profile'
import { applyTheme, getStoredTheme, markThemeChosen, type Theme } from '@/lib/theme'
import { formatUserId } from '@/lib/userId'
import { useSecurity } from '@/security/SecurityProvider'

const gradeTone = {
  strong: 'gain',
  fair: 'warn',
  weak: 'loss',
} as const

function ThemeOption({
  theme,
  label,
  active,
  onSelect,
}: {
  theme: Theme
  label: string
  active: boolean
  onSelect: () => void
}) {
  const light = theme === 'light'
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        'focus-ring rounded-2xl border p-3 text-left transition',
        active
          ? 'border-accent-500/60 bg-accent-500/10'
          : 'border-white/10 bg-white/4 hover:border-white/20',
      )}
    >
      {/* Mini preview of the scheme — literal swatches so each option always
          shows its own palette regardless of the active theme. */}
      <span
        className={cn(
          'block h-20 overflow-hidden rounded-xl border p-2.5',
          light ? 'border-slate-300 bg-[#e9f4f4]' : 'border-white/10 bg-[#071a23]',
        )}
      >
        <span
          className={cn(
            'block h-2.5 w-12 rounded-full',
            light ? 'bg-[#14333c]' : 'bg-[#eaf7fa]',
          )}
        />
        <span
          className={cn('mt-2 block h-8 rounded-lg p-1.5', light ? 'bg-white shadow-sm' : 'bg-white/6')}
        >
          <span
            className={cn(
              'block h-1.5 w-16 rounded-full',
              light ? 'bg-[#0e7490]' : 'bg-[#67e8f9]',
            )}
          />
        </span>
        <span className="accent-gradient mt-2 block h-2 w-14 rounded-full" />
      </span>
      <span className="mt-2.5 flex items-center justify-between text-sm font-medium">
        {label}
        {active && <Check size={14} className="text-accent-400" />}
      </span>
    </button>
  )
}

export function Settings({ profile, email }: { profile: Profile; email: string }) {
  const { score, passkeys, devices, pin, loading } = useSecurity()
  const business = profile.account_type === 'business'

  const [theme, setTheme] = useState<Theme>(() => getStoredTheme())
  const [themeStatus, setThemeStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  async function selectTheme(next: Theme) {
    if (next === theme) return
    setTheme(next)
    setThemeStatus('saving')
    applyTheme(next)
    markThemeChosen()
    try {
      await setProfileTheme(profile.id, next)
      setThemeStatus('saved')
    } catch {
      // The switch still applies on this device; the account copy can be
      // written again on the next visit.
      setThemeStatus('idle')
    }
  }

  const rows = [
    {
      icon: IdCard,
      label: 'User ID',
      value: profile.user_id ? formatUserId(profile.user_id) : '—',
    },
    { icon: Mail, label: 'Email', value: email },
    {
      icon: business ? Briefcase : User,
      label: 'Account type',
      value: business ? 'Business' : 'Personal',
    },
    { icon: Fingerprint, label: 'Passkeys', value: `${passkeys.length} enrolled` },
    { icon: Smartphone, label: 'Trusted devices', value: `${devices.length} registered` },
  ]

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card className="p-5 sm:p-6">
          <CardHeader title="Account" />
          <ul className="mt-4 divide-y divide-white/6">
            {rows.map((row) => {
              const Icon = row.icon
              return (
                <li key={row.label} className="flex items-center gap-3 py-3.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/6 text-mist-300">
                    <Icon size={16} />
                  </span>
                  <span className="flex-1 text-sm text-mist-400">{row.label}</span>
                  <span className="min-w-0 truncate text-sm font-medium">{row.value}</span>
                </li>
              )
            })}
            {business && (
              <li className="flex items-center gap-3 py-3.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/6 text-mist-300">
                  <Fingerprint size={16} />
                </span>
                <span className="flex-1 text-sm text-mist-400">Vault PIN</span>
                <Badge tone={pin?.configured ? 'gain' : 'warn'}>
                  {pin?.configured ? 'configured' : 'not set'}
                </Badge>
              </li>
            )}
          </ul>
        </Card>

        <Card className="p-5 sm:p-6" glow>
          <CardHeader
            title="Security score"
            action={<Badge tone={gradeTone[score.grade]}>{score.grade}</Badge>}
          />

        <p className="mt-5 text-5xl font-bold tracking-tight tabular-nums">
          {loading ? (
            '—'
          ) : (
            <AnimatedNumber value={score.value} format={(v) => String(Math.round(v))} duration={1} />
          )}
          <span className="ml-1.5 text-lg font-medium text-mist-500">/100</span>
        </p>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/8">
            <div
              className="accent-gradient h-full rounded-full transition-[width] duration-700"
              style={{ width: `${score.value}%` }}
            />
          </div>

          <ul className="mt-6 space-y-3">
            {score.factors.map((factor) => (
              <li key={factor.id} className="flex items-start gap-3">
                <span
                  className={cn(
                    'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full',
                    factor.earned ? 'bg-gain-400/20 text-gain-400' : 'bg-white/8 text-mist-500',
                  )}
                >
                  {factor.earned ? (
                    <Check size={12} strokeWidth={3.5} />
                  ) : (
                    <X size={12} strokeWidth={3} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'text-sm font-medium',
                      factor.earned ? 'text-mist-50' : 'text-mist-400',
                    )}
                  >
                    {factor.label}
                  </p>
                  <p className="mt-0.5 text-xs text-mist-500">{factor.hint}</p>
                </div>
                <span className="shrink-0 text-xs tabular-nums text-mist-500">
                  {factor.earned ? '+' : ''}
                  {factor.points}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="p-5 sm:p-6">
        <CardHeader
          title="Appearance"
          action={
            themeStatus === 'saved' ? (
              <Badge tone="gain">Saved to your account</Badge>
            ) : themeStatus === 'saving' ? (
              <Badge tone="neutral">Saving…</Badge>
            ) : undefined
          }
        />
        <p className="mt-1 text-sm text-mist-400">
          Pick how TrustPass looks. The choice is saved to your account, so you stay in the same
          theme every time you sign in — on any device.
        </p>
        <div className="mt-5 grid max-w-xl grid-cols-2 gap-4">
          <ThemeOption
            theme="light"
            label="Light"
            active={theme === 'light'}
            onSelect={() => selectTheme('light')}
          />
          <ThemeOption
            theme="dark"
            label="Dark"
            active={theme === 'dark'}
            onSelect={() => selectTheme('dark')}
          />
        </div>
      </Card>
    </div>
  )
}
