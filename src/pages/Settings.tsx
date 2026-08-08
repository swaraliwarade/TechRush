import { Briefcase, Check, Fingerprint, IdCard, Mail, Smartphone, User, X } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import type { Profile } from '@/lib/profile'
import { formatUserId } from '@/lib/userId'
import { useSecurity } from '@/security/SecurityProvider'

const gradeTone = {
  strong: 'gain',
  fair: 'warn',
  weak: 'loss',
} as const

export function Settings({ profile, email }: { profile: Profile; email: string }) {
  const { score, passkeys, devices, pin, loading } = useSecurity()
  const business = profile.account_type === 'business'

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
          {loading ? '—' : score.value}
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
  )
}
