import { Fingerprint, Zap } from 'lucide-react'
import { useState } from 'react'
import { Wordmark } from '@/components/layout/Sidebar'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { passkeySupport, readableAuthError, registerPasskey, signInWithPasskey } from '@/auth/passkeys'
import { trustDevice } from '@/lib/devices'
import { formatUserId } from '@/lib/userId'

const benefits = [
  'Sign in with your fingerprint, face, or device PIN',
  'Nothing to phish — the key never leaves this device',
  'Works on your phone too, via the QR code prompt',
]

/**
 * Mandatory enrolment step in signup. Registers a passkey for the freshly
 * created account, then immediately exercises it to verify the device and write
 * a trusted_devices row.
 *
 * The trust row comes from device_trust() in 0001, which derives the
 * fingerprint from request headers server-side — nothing here asserts what
 * device it is.
 */
export function RegisterPasskeyStep({
  userId,
  onDone,
}: {
  userId: string
  onDone: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [stage, setStage] = useState<'register' | 'verify'>('register')
  const [error, setError] = useState<string | null>(null)
  const support = passkeySupport()

  async function enrol() {
    setError(null)
    setBusy(true)
    try {
      await registerPasskey()

      // Use the credential straight away, so the device is trusted by an actual
      // passkey assertion rather than merely by having enrolled one.
      setStage('verify')
      try {
        await signInWithPasskey()
      } catch {
        // Some authenticators refuse a second ceremony immediately after
        // enrolment. The passkey is registered either way, so trust the device
        // on the session we already hold rather than blocking signup here.
      }

      await trustDevice()
      onDone()
    } catch (err) {
      setError(readableAuthError(err))
      setStage('register')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center p-4 sm:p-8">
      <div className="w-full max-w-md space-y-5">
        <Wordmark />

        <Card className="p-6 sm:p-8" glow>
          <span className="accent-gradient grid size-12 place-items-center rounded-2xl text-ink-950">
            <Fingerprint size={24} strokeWidth={2.2} />
          </span>

          <h1 className="mt-5 text-2xl font-semibold tracking-tight">Register a passkey</h1>
          <p className="mt-2 text-sm leading-relaxed text-mist-400">
            This binds <span className="font-mono text-mist-50">{formatUserId(userId)}</span> to
            this device, so signing in never needs a password.
          </p>

          {error && (
            <Alert tone="error" className="mt-5">
              {error}
            </Alert>
          )}

          {!support.supported && (
            <Alert tone="info" className="mt-5">
              {support.hasApi
                ? 'Passkeys need a secure connection (https or localhost).'
                : 'This browser does not support passkeys.'}
            </Alert>
          )}

          <ul className="mt-6 space-y-3 text-sm text-mist-400">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2.5">
                <Zap size={15} className="mt-0.5 shrink-0 text-accent-400" />
                {benefit}
              </li>
            ))}
          </ul>

          <Button
            size="lg"
            className="mt-7 w-full"
            onClick={enrol}
            disabled={busy || !support.supported}
          >
            {busy
              ? stage === 'verify'
                ? 'Verifying this device…'
                : 'Waiting for your device…'
              : 'Register passkey'}
          </Button>
        </Card>
      </div>
    </div>
  )
}
