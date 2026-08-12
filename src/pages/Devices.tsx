import { Laptop, LogOut, MapPin, Smartphone, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { readableAuthError } from '@/auth/passkeys'
import { revokeDevice, revokeOtherDevices } from '@/lib/devices'
import { isMobileDevice } from '@/lib/device'
import { describePlace, recentSignInLocations, type RecentSignInsResult } from '@/lib/locations'
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
  const [busyAll, setBusyAll] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [signIns, setSignIns] = useState<RecentSignInsResult | null>(null)

  useEffect(() => {
    let active = true
    recentSignInLocations().then((result) => {
      if (active) setSignIns(result)
    })
    return () => {
      active = false
    }
  }, [])

  const error = localError ?? contextError
  const setError = setLocalError
  const locations = signIns?.ok ? signIns.locations : []

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

  async function revokeOthers() {
    setBusyAll(true)
    setNotice(null)
    setError(null)
    try {
      const revoked = await revokeOtherDevices()
      await refresh()
      setNotice(
        revoked > 0
          ? `Signed out of ${revoked} other device${revoked === 1 ? '' : 's'}.`
          : 'No other devices to sign out.',
      )
    } catch (err) {
      setError(readableAuthError(err))
    } finally {
      setBusyAll(false)
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
        {notice && (
          <Alert tone="success" className="mt-4">
            {notice}
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

        {devices.length > 1 && !loading && (
          <div className="mt-3 border-t border-white/6 pt-4">
            <Button
              variant="outline"
              size="sm"
              className="w-full hover:border-loss-400/40 hover:bg-loss-400/10 hover:text-loss-400"
              onClick={revokeOthers}
              disabled={busyAll}
            >
              <LogOut size={15} />
              {busyAll ? 'Signing out…' : 'Sign out of all other devices'}
            </Button>
            <p className="mt-2 text-center text-xs text-mist-500">
              Every other device must verify again on its next sign-in.
            </p>
          </div>
        )}
      </Card>

      <Card className="p-5 sm:p-6">
        <CardHeader
          title="Sign-in locations"
          action={
            locations.length > 0 ? (
              <Badge tone="neutral">{locations.length} recent</Badge>
            ) : undefined
          }
        />

        {signIns === null ? (
          <p className="py-6 text-center text-sm text-mist-500">Checking…</p>
        ) : !signIns.ok ? (
          <p className="py-6 text-center text-sm text-mist-500">
            Location tracking isn't set up on this project yet.
          </p>
        ) : locations.length === 0 ? (
          <p className="py-6 text-center text-sm text-mist-500">
            No sign-in locations recorded yet.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-white/6">
            {locations.map((location, index) => {
              const place = describePlace(location)
              return (
                <li key={location.id} className="flex items-center gap-3 py-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/6 text-accent-400">
                    <MapPin size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {place ?? 'Unknown location'}
                      {index === 0 && <Badge tone="gain" className="ml-2">Latest</Badge>}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-mist-500">
                      {relativeTime(location.created_at)}
                      {location.ip_prefix && <>{' · network ' + location.ip_prefix}.x</>}
                    </p>
                  </div>
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
          <li className="flex gap-3">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent-400" />
            Every completed sign-in also records its location — an unexpected city here is
            worth a look at your security feed.
          </li>
        </ul>
      </Card>
    </div>
  )
}
