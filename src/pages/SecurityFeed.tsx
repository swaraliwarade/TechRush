import {
  Activity,
  KeyRound,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Siren,
  type LucideIcon,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader } from '@/components/ui/Card'
import { readableAuthError } from '@/auth/passkeys'
import { cn } from '@/lib/cn'
import { describeDevice } from '@/lib/device'
import { supabase } from '@/lib/supabase'
import {
  fetchSecurityEvents,
  subscribeToSecurityEvents,
  type FeedStatus,
  type SecurityEvent,
  type Severity,
} from '@/lib/securityEvents'

// Labels are deliberately non-explanatory. This feed sits behind the same login
// as the account itself, so anyone coercing the account holder could read it —
// naming the mechanism here would undo the protection it exists to report on.
// Severity still carries the signal for a briefed responder.
const eventMeta: Record<string, { label: string; detail: string; icon: LucideIcon }> = {
  duress_pin_used: {
    label: 'Priority alert',
    detail: 'Escalated to the security team for immediate review',
    icon: Siren,
  },
  pin_failed: {
    label: 'Incorrect PIN',
    detail: 'A vault unlock attempt was rejected',
    icon: KeyRound,
  },
  pin_lockout: {
    label: 'Vault locked out',
    detail: 'Too many failed PIN attempts',
    icon: Lock,
  },
  vault_unlocked: {
    label: 'Vault unlocked',
    detail: 'Access PIN accepted',
    icon: KeyRound,
  },
}

const severityTone: Record<Severity, 'loss' | 'warn' | 'neutral'> = {
  critical: 'loss',
  warning: 'warn',
  info: 'neutral',
}

function relativeTime(iso: string) {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 10) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

function StatusPill({ status }: { status: FeedStatus }) {
  const config = {
    live: { label: 'Live', dot: 'bg-gain-400', text: 'text-gain-400' },
    connecting: { label: 'Connecting', dot: 'bg-warn-400', text: 'text-warn-400' },
    error: { label: 'Disconnected', dot: 'bg-loss-400', text: 'text-loss-400' },
  }[status]

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium">
      <span className="relative flex size-2">
        {status === 'live' && (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-gain-400 opacity-70" />
        )}
        <span className={cn('relative inline-flex size-2 rounded-full', config.dot)} />
      </span>
      <span className={config.text}>{config.label}</span>
    </span>
  )
}

function EventRow({ event, isNew }: { event: SecurityEvent; isNew: boolean }) {
  const meta = eventMeta[event.event_type] ?? {
    label: event.event_type.replace(/_/g, ' '),
    detail: 'Security event',
    icon: Activity,
  }
  const Icon = meta.icon
  const critical = event.severity === 'critical'

  return (
    <li
      className={cn(
        'flex items-start gap-3 rounded-2xl px-2 py-3.5 transition-colors duration-1000',
        isNew && (critical ? 'bg-loss-400/10' : 'bg-accent-500/10'),
      )}
    >
      <span
        className={cn(
          'grid size-10 shrink-0 place-items-center rounded-xl',
          critical
            ? 'border border-loss-400/25 bg-loss-400/12 text-loss-400'
            : event.severity === 'warning'
              ? 'border border-warn-400/25 bg-warn-400/12 text-warn-400'
              : 'bg-white/6 text-mist-300',
        )}
      >
        <Icon size={18} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">{meta.label}</p>
          <Badge tone={severityTone[event.severity]}>{event.severity}</Badge>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-mist-400">{meta.detail}</p>
        <p className="mt-1.5 truncate text-xs text-mist-500">
          {event.user_agent ? describeDevice(event.user_agent).label : 'Unknown device'}
          {event.ip_prefix && event.ip_prefix !== 'unknown' && ` · ${event.ip_prefix}.x`}
        </p>
      </div>

      <span className="shrink-0 text-xs whitespace-nowrap text-mist-500">
        {relativeTime(event.created_at)}
      </span>
    </li>
  )
}

export function SecurityFeed() {
  const [events, setEvents] = useState<SecurityEvent[]>([])
  const [status, setStatus] = useState<FeedStatus>('connecting')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newIds, setNewIds] = useState<Set<string>>(new Set())
  // Re-render on a timer so "just now" ages into "2m ago" without a refresh.
  const [, setTick] = useState(0)
  const timers = useRef<number[]>([])

  const markNew = useCallback((id: string) => {
    setNewIds((prev) => new Set(prev).add(id))
    const timer = window.setTimeout(() => {
      setNewIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, 6000)
    timers.current.push(timer)
  }, [])

  useEffect(() => {
    let active = true

    fetchSecurityEvents()
      .then((rows) => {
        if (active) setEvents(rows)
      })
      .catch((err) => {
        if (active) setError(readableAuthError(err))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    const channel = subscribeToSecurityEvents(
      (event) => {
        setEvents((prev) => (prev.some((e) => e.id === event.id) ? prev : [event, ...prev]))
        markNew(event.id)
      },
      (next) => setStatus(next),
    )

    const interval = window.setInterval(() => setTick((n) => n + 1), 15_000)
    const pending = timers.current

    return () => {
      active = false
      // removeChannel, not unsubscribe: the latter leaves the channel in the
      // client's registry, so navigating away and back would stack duplicates
      // and every event would render twice.
      supabase.removeChannel(channel)
      window.clearInterval(interval)
      pending.forEach(window.clearTimeout)
    }
  }, [markNew])

  const criticalCount = events.filter((e) => e.severity === 'critical').length
  const latest = events[0]

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <Card className="p-5 sm:p-6">
        <CardHeader
          title="Security operations feed"
          action={<StatusPill status={status} />}
          className="flex-col items-start gap-3 sm:flex-row sm:items-center"
        />

        {error && (
          <Alert tone="error" className="mt-4">
            {error}
          </Alert>
        )}

        {loading ? (
          <p className="py-12 text-center text-sm text-mist-500">Loading events…</p>
        ) : events.length === 0 ? (
          <div className="glass-tile mt-4 px-5 py-12 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-white/6 text-mist-400">
              <ShieldCheck size={22} />
            </span>
            <p className="mt-4 text-sm font-medium">No events yet</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-mist-500">
              Vault activity and security alerts appear here the moment they happen.
            </p>
          </div>
        ) : (
          <ul className="mt-2 divide-y divide-white/6">
            {events.map((event) => (
              <EventRow key={event.id} event={event} isNew={newIds.has(event.id)} />
            ))}
          </ul>
        )}
      </Card>

      <div className="space-y-5">
        <Card className="p-5 sm:p-6" glow>
          <CardHeader title="Alert summary" />
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="glass-tile p-4">
              <p className="text-3xl font-bold tracking-tight tabular-nums">{events.length}</p>
              <p className="mt-1.5 text-xs text-mist-400">Total events</p>
            </div>
            <div className="glass-tile p-4">
              <p
                className={cn(
                  'text-3xl font-bold tracking-tight tabular-nums',
                  criticalCount > 0 && 'text-loss-400',
                )}
              >
                {criticalCount}
              </p>
              <p className="mt-1.5 text-xs text-mist-400">Critical</p>
            </div>
          </div>

          <div className="glass-tile mt-3 flex items-center gap-3 p-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/6 text-accent-400">
              <Activity size={16} />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-mist-400">Most recent</p>
              <p className="truncate text-sm font-semibold">
                {latest ? relativeTime(latest.created_at) : 'No activity'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <CardHeader title="What triggers an alert" />
          <ul className="mt-4 space-y-3.5 text-sm leading-relaxed text-mist-400">
            <li className="flex gap-3">
              <ShieldAlert size={15} className="mt-0.5 shrink-0 text-loss-400" />
              <span>
                <span className="text-mist-50">Priority alerts</span> — routed to your security
                team the moment they are raised. Follow your response protocol.
              </span>
            </li>
            <li className="flex gap-3">
              <Lock size={15} className="mt-0.5 shrink-0 text-warn-400" />
              <span>
                <span className="text-mist-50">Lockout</span> — four failed PIN attempts suspends
                vault access for 15 minutes.
              </span>
            </li>
            <li className="flex gap-3">
              <KeyRound size={15} className="mt-0.5 shrink-0 text-mist-400" />
              <span>
                <span className="text-mist-50">Vault unlock</span> — every successful entry is
                logged, so routine and escalated activity sit in the same stream.
              </span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  )
}
