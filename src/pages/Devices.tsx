import { Laptop, Smartphone, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader } from '@/components/ui/Card'
import { readableAuthError } from '@/auth/passkeys'
import { revokeDevice } from '@/lib/devices'
import { isMobileDevice } from '@/lib/device'
import { useSecurity } from '@/security/SecurityProvider'

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.round(diffMs / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export function DevicesPage() {
  const { devices, loading, error: contextError, refresh } = useSecurity()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  const error = localError ?? contextError
  const setError = setLocalError

  async function revoke(id: string) {
    setBusyId(id)
    try {
      await revokeDevice(id)
      await refresh()
    } catch (err) {
      setError(readableAuthError(err))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <Card className="p-5 sm:p-6">
        <CardHeader
          title="Trusted devices"
          action={<Badge tone={devices.length ? 'gain' : 'neutral'}>{devices.length} trusted</Badge>}
        />

        {error && (
          <Alert tone="error" className="mt-4">
            {error}
          </Alert>
        )}

        {loading ? (
          <p className="py-10 text-center text-sm text-mist-500">Loading devices…</p>
        ) : devices.length === 0 ? (
          <p className="py-10 text-center text-sm text-mist-500">
            No trusted devices yet. The next unrecognized sign-in will ask for an email code.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-white/6">
            {devices.map((device) => {
              const mobile = isMobileDevice(device.user_agent ?? '')
              const Icon = mobile ? Smartphone : Laptop
              return (
                <li key={device.id} className="flex items-center gap-3 py-3.5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/6 text-accent-400">
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{device.label}</p>
                    <p className="mt-0.5 truncate text-xs text-mist-500">
                      Last seen {relativeTime(device.last_seen_at)}
                      {device.ip_prefix && device.ip_prefix !== 'unknown' && (
                        <> · network {device.ip_prefix}.x</>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => revoke(device.id)}
                    disabled={busyId === device.id}
                    aria-label={`Revoke ${device.label}`}
                    className="focus-ring grid size-9 shrink-0 place-items-center rounded-full text-mist-400 transition hover:bg-loss-400/10 hover:text-loss-400 disabled:opacity-50"
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <Card className="p-5 sm:p-6" glow>
        <CardHeader title="How device checks work" />
        <ul className="mt-4 space-y-3.5 text-sm leading-relaxed text-mist-400">
          <li className="flex gap-3">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent-400" />
            Every sign-in is checked against this list before you reach your account.
          </li>
          <li className="flex gap-3">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent-400" />
            The fingerprint combines your browser with a coarse network prefix, and is computed on
            the server — a stolen session token alone won't match.
          </li>
          <li className="flex gap-3">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent-400" />
            Unrecognized devices must clear an emailed code before they're added here.
          </li>
          <li className="flex gap-3">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent-400" />
            Revoking a device forces that verification again next time it signs in.
          </li>
        </ul>
      </Card>
    </div>
  )
}
