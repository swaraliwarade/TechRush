import { Activity, Bell, Check, KeyRound, ShieldAlert, Siren, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { readableAuthError } from '@/auth/passkeys'
import { cn } from '@/lib/cn'
import { describeDevice } from '@/lib/device'
import {
  fetchSecurityEvents,
  securityEventLabels,
  type SecurityEvent,
  type Severity,
} from '@/lib/securityEvents'

const LAST_SEEN_KEY = 'trustpass:notifications:lastSeen'

const severityIcon: Record<Severity, LucideIcon> = {
  critical: Siren,
  warning: ShieldAlert,
  info: Activity,
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

/**
 * The bell in the top bar. Shows recent security events with an unread badge;
 * reading the feed or clicking “Mark all read” persists a last-seen marker so
 * the badge resets across sessions.
 */
export function NotificationsMenu() {
  const [open, setOpen] = useState(false)
  const [events, setEvents] = useState<SecurityEvent[]>([])
  const [unread, setUnread] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  async function load() {
    try {
      const rows = await fetchSecurityEvents(10)
      setEvents(rows)
      const lastSeen = Number(localStorage.getItem(LAST_SEEN_KEY) ?? 0)
      setUnread(rows.filter((e) => new Date(e.created_at).getTime() > lastSeen).length)
      setError(null)
    } catch (err) {
      setError(readableAuthError(err))
    }
  }

  useEffect(() => {
    void load()
  }, [])

  // Close when clicking anywhere outside the menu.
  useEffect(() => {
    if (!open) return
    function onOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [open])

  function markAllRead() {
    localStorage.setItem(LAST_SEEN_KEY, String(Date.now()))
    setUnread(0)
  }

  function viewAll() {
    markAllRead()
    setOpen(false)
    navigate('/security-feed')
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-label="Notifications"
        title="Notifications"
        aria-expanded={open}
        onClick={() => {
          if (!open) void load()
          setOpen((o) => !o)
        }}
        className="focus-ring relative grid size-10 place-items-center rounded-full border border-white/8 bg-white/5 text-mist-300 transition hover:text-mist-50"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-loss-400 px-1 text-[10px] font-bold text-ink-950">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="glass-card absolute top-12 right-0 z-50 w-80 overflow-hidden sm:w-88">
          <div className="flex items-center justify-between gap-3 border-b border-white/6 px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="focus-ring flex items-center gap-1 rounded-full px-2 py-1 text-xs text-mist-400 transition hover:text-mist-50"
              >
                <Check size={13} /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {error ? (
              <p className="px-4 py-6 text-center text-sm text-mist-500">{error}</p>
            ) : events.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-mist-500">
                No security activity yet.
              </p>
            ) : (
              <ul className="divide-y divide-white/6">
                {events.map((event) => {
                  const Icon = severityIcon[event.severity] ?? Activity
                  const label = securityEventLabels[event.event_type] ?? event.event_type
                  return (
                    <li key={event.id} className="flex items-start gap-3 px-4 py-3">
                      <span
                        className={cn(
                          'grid size-8 shrink-0 place-items-center rounded-lg',
                          event.severity === 'critical'
                            ? 'bg-loss-400/12 text-loss-400'
                            : event.severity === 'warning'
                              ? 'bg-warn-400/12 text-warn-400'
                              : 'bg-white/6 text-mist-300',
                        )}
                      >
                        <Icon size={15} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{label}</p>
                        <p className="mt-0.5 truncate text-xs text-mist-500">
                          {event.user_agent ? describeDevice(event.user_agent).label : 'Unknown device'}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs whitespace-nowrap text-mist-500">
                        {relativeTime(event.created_at)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-white/6 p-2">
            <button
              type="button"
              onClick={viewAll}
              className="focus-ring flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-accent-400 transition hover:bg-white/6"
            >
              <KeyRound size={15} /> View security feed
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
