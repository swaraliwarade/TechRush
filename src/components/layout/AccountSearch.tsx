import { ArrowRight, CreditCard, Fingerprint, Radio, Search, Smartphone, type LucideIcon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { readableAuthError } from '@/auth/passkeys'
import { cn } from '@/lib/cn'
import { describeDevice } from '@/lib/device'
import { formatDay } from '@/lib/money'
import { fetchSecurityEvents, securityEventLabels, type SecurityEvent } from '@/lib/securityEvents'
import { fetchTransactions, type Transaction } from '@/lib/transactions'
import { useSecurity } from '@/security/SecurityProvider'

type SearchResult = {
  kind: 'transaction' | 'event' | 'passkey' | 'device'
  icon: LucideIcon
  title: string
  subtitle: string
  to: string
}

/**
 * “Search account activity” in the top bar. Lazily loads transactions and
 * security events on first focus, then filters them alongside passkeys and
 * devices (already in the security context) as you type. Clicking a result
 * deep-links to the matching page — transactions carry the query through to
 * the history filter.
 */
export function AccountSearch() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<{ txns: Transaction[]; events: SecurityEvent[] } | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const { passkeys, devices } = useSecurity()
  const navigate = useNavigate()

  async function ensureData() {
    if (data) return
    setLoading(true)
    try {
      const [txns, events] = await Promise.all([fetchTransactions('real'), fetchSecurityEvents(20)])
      setData({ txns, events })
      setError(null)
    } catch (err) {
      setError(readableAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open) return
    function onOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [open])

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []

    const out: SearchResult[] = []

    for (const txn of data?.txns ?? []) {
      if (`${txn.merchant} ${txn.category}`.toLowerCase().includes(q)) {
        out.push({
          kind: 'transaction',
          icon: CreditCard,
          title: txn.merchant,
          subtitle: `${txn.category} · ${formatDay(txn.occurred_at)}`,
          to: `/transactions?q=${encodeURIComponent(txn.merchant)}`,
        })
      }
    }

    for (const event of data?.events ?? []) {
      const label = securityEventLabels[event.event_type] ?? event.event_type
      if (label.toLowerCase().includes(q)) {
        out.push({
          kind: 'event',
          icon: Radio,
          title: label,
          subtitle: event.user_agent ? describeDevice(event.user_agent).label : 'Security event',
          to: '/security-feed',
        })
      }
    }

    for (const passkey of passkeys) {
      const name = passkey.friendly_name ?? 'Passkey'
      if (name.toLowerCase().includes(q)) {
        out.push({
          kind: 'passkey',
          icon: Fingerprint,
          title: name,
          subtitle: 'Passkey',
          to: '/passkeys',
        })
      }
    }

    for (const device of devices) {
      if (device.label.toLowerCase().includes(q)) {
        out.push({
          kind: 'device',
          icon: Smartphone,
          title: device.label,
          subtitle: 'Trusted device',
          to: '/devices',
        })
      }
    }

    return out.slice(0, 8)
  }, [query, data, passkeys, devices])

  function go(to: string) {
    setOpen(false)
    setQuery('')
    navigate(to)
  }

  return (
    <div ref={wrapRef} className="relative">
      <div className="hidden items-center gap-2 rounded-full border border-white/8 bg-white/5 px-4 py-2.5 text-sm text-mist-400 md:flex lg:w-72">
        <Search size={16} className="shrink-0" />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => {
            setOpen(true)
            void ensureData()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false)
              setQuery('')
            }
          }}
          placeholder="Search account activity"
          aria-label="Search account activity"
          className="focus-ring w-full bg-transparent text-sm text-mist-50 outline-none placeholder:text-mist-500"
        />
      </div>

      {open && (
        <div className="glass-card absolute top-12 right-0 z-50 w-80 overflow-hidden sm:w-88">
          <div className="max-h-96 overflow-y-auto">
            {error ? (
              <p className="px-4 py-6 text-center text-sm text-mist-500">{error}</p>
            ) : loading && !data ? (
              <p className="px-4 py-6 text-center text-sm text-mist-500">Searching…</p>
            ) : query.trim() === '' ? (
              <p className="px-4 py-6 text-center text-sm text-mist-500">
                Type to search transactions, security events, passkeys and devices.
              </p>
            ) : results.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-mist-500">
                Nothing matches “{query}”.
              </p>
            ) : (
              <ul className="divide-y divide-white/6">
                {results.map((result, index) => {
                  const Icon = result.icon
                  return (
                    <li key={`${result.kind}-${index}`}>
                      <button
                        type="button"
                        onClick={() => go(result.to)}
                        className="focus-ring flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/6"
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/6 text-mist-300">
                          <Icon size={16} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{result.title}</span>
                          <span className="mt-0.5 block truncate text-xs text-mist-500">
                            {result.subtitle}
                          </span>
                        </span>
                        <ArrowRight size={14} className="shrink-0 text-mist-500" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {query.trim() !== '' && !error && (
            <div className="border-t border-white/6 p-2">
              <button
                type="button"
                onClick={() => go(`/transactions?q=${encodeURIComponent(query.trim())}`)}
                className={cn(
                  'focus-ring flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5',
                  'text-sm font-medium text-accent-400 transition hover:bg-white/6',
                )}
              >
                Search transactions for “{query.trim()}”
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
