import { Check, Fingerprint, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import {
  deletePasskey,
  passkeySupport,
  readableAuthError,
  registerPasskey,
  renamePasskey,
  type Passkey,
} from '@/auth/passkeys'
import { useSecurity } from '@/security/SecurityProvider'

function formatDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function PasskeyRow({
  passkey,
  onChanged,
  onError,
}: {
  passkey: Passkey
  onChanged: () => void
  onError: (message: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(passkey.friendly_name ?? '')
  const [busy, setBusy] = useState(false)

  async function save() {
    const trimmed = name.trim()
    if (!trimmed || trimmed === passkey.friendly_name) {
      setEditing(false)
      return
    }
    setBusy(true)
    try {
      await renamePasskey(passkey.id, trimmed)
      setEditing(false)
      onChanged()
    } catch (err) {
      onError(readableAuthError(err))
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    try {
      await deletePasskey(passkey.id)
      onChanged()
    } catch (err) {
      onError(readableAuthError(err))
      setBusy(false)
    }
  }

  return (
    <li className="flex items-center gap-3 py-3.5">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/6 text-accent-400">
        <Fingerprint size={18} />
      </span>

      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save()
              if (e.key === 'Escape') setEditing(false)
            }}
            autoFocus
            maxLength={120}
            aria-label="Passkey name"
            className="focus-ring h-9 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-sm"
          />
        ) : (
          <p className="truncate text-sm font-medium">
            {passkey.friendly_name || 'Unnamed passkey'}
          </p>
        )}
        <p className="mt-0.5 truncate text-xs text-mist-500">
          Added {formatDate(passkey.created_at)}
          {passkey.last_used_at && ` · Last used ${formatDate(passkey.last_used_at)}`}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {editing ? (
          <>
            <button
              type="button"
              onClick={save}
              disabled={busy}
              aria-label="Save name"
              className="focus-ring grid size-9 place-items-center rounded-full text-gain-400 hover:bg-white/6"
            >
              <Check size={16} />
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              aria-label="Cancel rename"
              className="focus-ring grid size-9 place-items-center rounded-full text-mist-400 hover:bg-white/6"
            >
              <X size={16} />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setEditing(true)}
              disabled={busy}
              aria-label={`Rename ${passkey.friendly_name || 'passkey'}`}
              className="focus-ring grid size-9 place-items-center rounded-full text-mist-400 transition hover:bg-white/6 hover:text-mist-50"
            >
              <Pencil size={15} />
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              aria-label={`Remove ${passkey.friendly_name || 'passkey'}`}
              className="focus-ring grid size-9 place-items-center rounded-full text-mist-400 transition hover:bg-loss-400/10 hover:text-loss-400"
            >
              <Trash2 size={15} />
            </button>
          </>
        )}
      </div>
    </li>
  )
}

export function PasskeysPage() {
  const { passkeys, loading, error: contextError, refresh } = useSecurity()
  const [enrolling, setEnrolling] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const support = passkeySupport()

  const error = localError ?? contextError
  const setError = setLocalError

  async function addPasskey() {
    setError(null)
    setSuccess(null)
    setEnrolling(true)
    try {
      await registerPasskey()
      setSuccess('Passkey added. You can now sign in without an email code.')
      await refresh()
    } catch (err) {
      setError(readableAuthError(err))
    } finally {
      setEnrolling(false)
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <Card className="p-5 sm:p-6">
        <CardHeader
          title="Your passkeys"
          action={
            <Badge tone={passkeys.length ? 'gain' : 'warn'}>
              {passkeys.length} enrolled
            </Badge>
          }
        />

        {error && (
          <Alert tone="error" className="mt-4">
            {error}
          </Alert>
        )}
        {success && !error && (
          <Alert tone="success" className="mt-4">
            {success}
          </Alert>
        )}

        {loading ? (
          <p className="py-10 text-center text-sm text-mist-500">Loading passkeys…</p>
        ) : passkeys.length === 0 ? (
          <div className="glass-tile mt-4 px-5 py-10 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-white/6 text-mist-400">
              <Fingerprint size={22} />
            </span>
            <p className="mt-4 text-sm font-medium">No passkeys yet</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-mist-500">
              Add one to sign in with your fingerprint, face, or device PIN instead of an emailed
              code.
            </p>
          </div>
        ) : (
          <ul className="mt-2 divide-y divide-white/6">
            {passkeys.map((passkey) => (
              <PasskeyRow
                key={passkey.id}
                passkey={passkey}
                onChanged={refresh}
                onError={setError}
              />
            ))}
          </ul>
        )}

        <Button
          className="mt-5 w-full sm:w-auto"
          onClick={addPasskey}
          disabled={enrolling || !support.supported}
        >
          <Plus size={17} />
          {enrolling ? 'Waiting for device…' : 'Add a passkey'}
        </Button>

        {!support.supported && (
          <p className="mt-3 text-xs text-mist-500">
            {support.hasApi
              ? 'Passkey enrollment needs https or localhost.'
              : 'This browser does not support passkeys.'}
          </p>
        )}
      </Card>

      <Card className="p-5 sm:p-6" glow>
        <CardHeader title="How passkeys work here" />
        <ul className="mt-4 space-y-3.5 text-sm leading-relaxed text-mist-400">
          <li className="flex gap-3">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent-400" />
            The private key never leaves your device. TrustPass only ever stores the public half,
            so there is no password database to breach.
          </li>
          <li className="flex gap-3">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent-400" />
            Enroll one passkey per device. Removing a device here revokes it immediately.
          </li>
          <li className="flex gap-3">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent-400" />
            Signing in on a new laptop? Choose "use a phone" at the passkey prompt and scan the QR
            code — no extra setup needed.
          </li>
          <li className="flex gap-3">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent-400" />
            Lost every device? The emailed one-time code is always available as a fallback.
          </li>
        </ul>
      </Card>
    </div>
  )
}
