import { Check, Fingerprint, Laptop, Smartphone, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { isMobileDevice } from '@/lib/device'
import { useSecurity } from '@/security/SecurityProvider'

const gradeCopy = {
  strong: { label: 'Strong', tone: 'text-gain-400' },
  fair: { label: 'Fair', tone: 'text-warn-400' },
  weak: { label: 'Needs work', tone: 'text-loss-400' },
} as const

function relativeTime(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

export function SecurityScoreCard({ lastSignIn }: { lastSignIn?: string | null }) {
  const { score, loading } = useSecurity()
  const grade = gradeCopy[score.grade]

  return (
    <div className="glass-tile p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-medium text-mist-400">Security score</p>
        <p className={cn('text-xs font-semibold', grade.tone)}>{grade.label}</p>
      </div>

      <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums">
        {loading ? '—' : score.value}
        <span className="ml-1 text-sm font-medium text-mist-500">/100</span>
      </p>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8">
        <div
          className="accent-gradient h-full rounded-full transition-[width] duration-700"
          style={{ width: `${score.value}%` }}
        />
      </div>

      <ul className="mt-3.5 space-y-2">
        {score.factors.map((factor) => (
          <li key={factor.id} className="flex items-start gap-2" title={factor.hint}>
            <span
              className={cn(
                'mt-0.5 grid size-4 shrink-0 place-items-center rounded-full',
                factor.earned ? 'bg-gain-400/20 text-gain-400' : 'bg-white/8 text-mist-500',
              )}
            >
              {factor.earned ? <Check size={10} strokeWidth={3.5} /> : <X size={10} strokeWidth={3} />}
            </span>
            <span
              className={cn(
                'text-[11px] leading-tight',
                factor.earned ? 'text-mist-300' : 'text-mist-500',
              )}
            >
              {factor.label}
            </span>
          </li>
        ))}
      </ul>

      {lastSignIn && (
        <p className="mt-3.5 border-t border-white/6 pt-3 text-[11px] text-mist-500">
          Last sign-in {relativeTime(lastSignIn)}
        </p>
      )}
    </div>
  )
}

export function DevicesMiniPanel({ onNavigate }: { onNavigate?: () => void }) {
  const { devices, passkeys, loading } = useSecurity()
  const shown = devices.slice(0, 3)

  return (
    <div className="glass-tile p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-mist-400">Trusted devices</p>
        <Link
          to="/devices"
          onClick={onNavigate}
          className="focus-ring rounded-full text-[11px] text-accent-400 hover:underline"
        >
          All {devices.length}
        </Link>
      </div>

      {loading ? (
        <p className="mt-3 text-[11px] text-mist-500">Loading…</p>
      ) : shown.length === 0 ? (
        <p className="mt-3 text-[11px] leading-relaxed text-mist-500">
          None yet — your next sign-in will ask for an email code.
        </p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {shown.map((device) => {
            const Icon = isMobileDevice(device.user_agent ?? '') ? Smartphone : Laptop
            return (
              <li key={device.id} className="flex items-center gap-2.5">
                <Icon size={14} className="shrink-0 text-mist-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-medium text-mist-300">{device.label}</p>
                  <p className="truncate text-[10px] text-mist-500">
                    {relativeTime(device.last_seen_at)}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <Link
        to="/passkeys"
        onClick={onNavigate}
        className="focus-ring mt-3.5 flex items-center gap-2 border-t border-white/6 pt-3 text-[11px] text-mist-400 transition hover:text-mist-50"
      >
        <Fingerprint size={13} className="text-accent-400" />
        {passkeys.length} passkey{passkeys.length === 1 ? '' : 's'} enrolled
      </Link>
    </div>
  )
}
