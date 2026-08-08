import { MapPin, MonitorSmartphone, ShieldAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Wordmark } from '@/components/layout/Sidebar'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { CodeInput } from '@/components/ui/CodeInput'
import { readableAuthError } from '@/auth/passkeys'
import { describeDevice } from '@/lib/device'
import { trustDevice } from '@/lib/devices'
import { env } from '@/lib/env'
import { supabase } from '@/lib/supabase'

const OTP_LENGTH = env.otpLength

/**
 * Shown when device_check() reports an unrecognized device. The user already
 * holds a valid session at this point — this is a second factor against a
 * stolen session or a passkey used somewhere unexpected, not a login screen.
 */
export function StepUpVerification({
  email,
  onVerified,
  onSignOut,
}: {
  email: string
  onVerified: () => void
  onSignOut: () => void
}) {
  const [code, setCode] = useState('')
  const [sending, setSending] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const device = describeDevice()

  async function sendCode() {
    setError(null)
    setNotice(null)
    setSending(true)
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      })
      if (otpError) throw otpError
      setNotice(`Verification code sent to ${email}.`)
    } catch (err) {
      setError(readableAuthError(err))
    } finally {
      setSending(false)
    }
  }

  // Fire the code automatically — the user did not ask to be here, so making
  // them click "send" first is pure friction.
  useEffect(() => {
    sendCode()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function verify(value: string) {
    setError(null)
    setBusy(true)
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: value,
        type: 'email',
      })
      if (verifyError) throw verifyError

      await trustDevice(device.label)
      onVerified()
    } catch (err) {
      setError(readableAuthError(err))
      setCode('')
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center p-4 sm:p-8">
      <div className="w-full max-w-md space-y-5">
        <Wordmark />

        <Card className="p-6 sm:p-8" glow>
          <span className="grid size-12 place-items-center rounded-2xl border border-warn-400/20 bg-warn-400/10 text-warn-400">
            <ShieldAlert size={23} />
          </span>

          <h1 className="mt-5 text-2xl font-semibold tracking-tight">Verify this device</h1>
          <p className="mt-2 text-sm leading-relaxed text-mist-400">
            We haven't seen this device on your account before. Enter the code we just emailed to
            confirm it's you.
          </p>

          <div className="glass-tile mt-5 space-y-2.5 p-4">
            <div className="flex items-center gap-2.5 text-sm">
              <MonitorSmartphone size={15} className="shrink-0 text-mist-500" />
              <span className="text-mist-300">{device.label}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm">
              <MapPin size={15} className="shrink-0 text-mist-500" />
              <span className="break-all text-mist-300">{email}</span>
            </div>
          </div>

          {error && (
            <Alert tone="error" className="mt-5">
              {error}
            </Alert>
          )}
          {notice && !error && (
            <Alert tone="success" className="mt-5">
              {notice}
            </Alert>
          )}

          <div className="mt-5">
            <CodeInput
              label={`${OTP_LENGTH}-digit code`}
              value={code}
              onChange={setCode}
              length={OTP_LENGTH}
              autoFocus
              disabled={busy || sending}
              onComplete={verify}
            />
          </div>

          <Button
            size="lg"
            className="mt-5 w-full"
            onClick={() => verify(code)}
            disabled={busy || sending || code.length < OTP_LENGTH}
          >
            {busy ? 'Verifying…' : 'Verify and trust this device'}
          </Button>

          <div className="mt-4 flex items-center justify-between gap-3 text-sm">
            <button
              type="button"
              onClick={sendCode}
              disabled={sending || busy}
              className="focus-ring rounded-full text-mist-400 transition hover:text-mist-50 disabled:opacity-50"
            >
              {sending ? 'Sending…' : 'Resend code'}
            </button>
            <button
              type="button"
              onClick={onSignOut}
              className="focus-ring rounded-full text-mist-400 transition hover:text-mist-50"
            >
              Not you? Sign out
            </button>
          </div>
        </Card>
      </div>
    </div>
  )
}
