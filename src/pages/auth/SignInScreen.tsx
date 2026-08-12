import { ArrowLeft, Fingerprint, IdCard, MapPin, ShieldAlert } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Wordmark } from '@/components/layout/Sidebar'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { CodeInput } from '@/components/ui/CodeInput'
import { Input } from '@/components/ui/Input'
import { passkeySupport, readableAuthError, signInWithPasskey } from '@/auth/passkeys'
import { formatCountdown, useOtpCooldown } from '@/hooks/useOtpCooldown'
import { trustDevice } from '@/lib/devices'
import { env } from '@/lib/env'
import { supabase } from '@/lib/supabase'
import {
  normaliseUserId,
  requestSignInCode,
  USER_ID_PATTERN,
  verifySignInCode,
  type TravelRisk,
} from '@/lib/userId'

type Step = 'userId' | 'otp' | 'risk' | 'riskCode' | 'passkey'

const OTP_LENGTH = env.otpLength

/** 10 -> "10 minutes ago", 90 -> "2 hours ago" */
function travelTimeLabel(minutes?: number): string | null {
  if (minutes === undefined || minutes < 0) return null
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  const hours = Math.round(minutes / 60)
  return `${hours} hour${hours === 1 ? '' : 's'} ago`
}

export function SignInScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const [step, setStep] = useState<Step>('userId')
  const [userId, setUserId] = useState('')
  const [code, setCode] = useState('')
  const [hint, setHint] = useState<string | null>(null)
  const [risk, setRisk] = useState<TravelRisk | null>(null)
  const [secondaryEmail, setSecondaryEmail] = useState<string | null>(null)
  const [sendingCode, setSendingCode] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cooldown = useOtpCooldown()

  // Captured once, from SignupEmailScreen's redirect when the entered email
  // already has an account. Lazy init means it only reads location.state on
  // first mount, not on every re-render.
  const [signupNotice] = useState<string | null>(
    () => (location.state as { notice?: string } | null)?.notice ?? null,
  )

  const support = passkeySupport()

  async function requestCode(event?: FormEvent) {
    event?.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const result = await requestSignInCode(userId)
      setHint(result.hint ?? null)
      cooldown.codeSent()
      setStep('otp')
    } catch (err) {
      setError(readableAuthError(err))
    } finally {
      setBusy(false)
    }
  }

  async function verifyCode(value: string) {
    setError(null)
    setBusy(true)
    try {
      const nextRisk = await verifySignInCode(userId, value)
      cooldown.reset()
      setRisk(nextRisk)
      // Session exists now, but sign-in is not finished: if the server flagged
      // impossible travel, the user acknowledges it, clears a fresh emailed
      // secondary code, and only then confirms with the passkey.
      setStep(nextRisk.flagged ? 'risk' : 'passkey')
    } catch (err) {
      cooldown.verifyFailed()
      setError(readableAuthError(err))
      setCode('')
    } finally {
      setBusy(false)
    }
  }

  /**
   * The secondary authentication method for a flagged sign-in: a fresh code is
   * emailed to the account right now, independent of the code already used to
   * sign in. Access to that inbox is the second proof; the passkey that follows
   * is the third (device possession).
   */
  async function beginSecondaryVerification() {
    const { data } = await supabase.auth.getUser()
    const email = data.user?.email ?? null
    if (!email) {
      setError('Could not resolve your account email. Sign out and start again.')
      return
    }
    setSecondaryEmail(email)
    setCode('')
    setError(null)
    setNotice(null)
    setStep('riskCode')
  }

  async function sendSecondaryCode() {
    if (!secondaryEmail) return
    setError(null)
    setNotice(null)
    setSendingCode(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: secondaryEmail,
        options: { shouldCreateUser: false },
      })
      if (error) throw error
      cooldown.codeSent()
      setNotice(`A fresh verification code is on its way to ${secondaryEmail}.`)
    } catch (err) {
      setError(readableAuthError(err))
    } finally {
      setSendingCode(false)
    }
  }

  // Send the secondary code automatically — the user didn't ask to be here, so
  // making them click "send" first is pure friction (same as StepUpVerification).
  useEffect(() => {
    if (step === 'riskCode') sendSecondaryCode()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  async function verifySecondaryCode(value: string) {
    if (!secondaryEmail) return
    setError(null)
    setBusy(true)
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: secondaryEmail,
        token: value,
        type: 'email',
      })
      if (error) throw error
      cooldown.reset()

      // The secondary factor was the requested re-verification — record the
      // resolution so the feed shows the full detect -> verify arc.
      // Best-effort: a failure here must not undo an otherwise successful step.
      if (risk) {
        await supabase.rpc('log_security_event', {
          p_event_type: 'impossible_travel_verified',
          p_detail: {
            from: [risk.fromCity, risk.fromCountry].filter(Boolean).join(', '),
            to: [risk.toCity, risk.toCountry].filter(Boolean).join(', '),
            distance_km: risk.distanceKm,
            speed_kmh: risk.speedKmh,
            elapsed_min: risk.elapsedMin,
          },
        })
      }

      setStep('passkey')
    } catch (err) {
      cooldown.verifyFailed()
      setError(readableAuthError(err))
      setCode('')
    } finally {
      setBusy(false)
    }
  }

  async function confirmWithPasskey() {
    setError(null)
    setBusy(true)
    try {
      const expected = (await supabase.auth.getUser()).data.user?.id

      // signInWithPasskey is usernameless — it mints a session for whichever
      // credential the authenticator offers, replacing the one we just got from
      // the code. If that turns out to be a different account, drop it rather
      // than silently signing the user in as someone else.
      const result = await signInWithPasskey()
      const actual = result?.user?.id

      if (expected && actual && expected !== actual) {
        await supabase.auth.signOut()
        setError('That passkey belongs to a different account. Start again.')
        setStep('userId')
        setCode('')
        return
      }

      await trustDevice()
      // AuthProvider swaps the tree once the session settles.
    } catch (err) {
      setError(readableAuthError(err))
    } finally {
      setBusy(false)
    }
  }

  async function abandon() {
    await supabase.auth.signOut()
    setStep('userId')
    setCode('')
    setError(null)
  }

  const idValid = USER_ID_PATTERN.test(userId)

  return (
    <div className="grid min-h-dvh place-items-center p-4 sm:p-8">
      <div className="w-full max-w-md space-y-5">
        <Wordmark />

        <Card className="p-6 sm:p-8" glow>
          {step === 'userId' && (
            <form onSubmit={requestCode} className="space-y-5">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="focus-ring inline-flex items-center gap-1.5 rounded-full text-sm text-mist-400 transition hover:text-mist-50"
              >
                <ArrowLeft size={15} /> Back
              </button>

              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
                <p className="mt-2 text-sm leading-relaxed text-mist-400">
                  Enter your User ID. We'll send a code to the email on your account.
                </p>
              </div>

              {error && <Alert tone="error">{error}</Alert>}
              {signupNotice && !error && <Alert tone="info">{signupNotice}</Alert>}

              <Input
                label="User ID"
                required
                autoFocus
                inputMode="text"
                autoCapitalize="characters"
                autoComplete="username"
                placeholder="A123456789"
                icon={<IdCard size={16} />}
                value={userId}
                onChange={(e) => setUserId(normaliseUserId(e.target.value))}
                className="font-mono tracking-[0.2em] uppercase"
                hint="One letter followed by nine digits."
              />

              <Button size="lg" type="submit" className="w-full" disabled={busy || !idValid}>
                {busy ? 'Checking…' : 'Continue'}
              </Button>
            </form>
          )}

          {step === 'otp' && (
            <div className="space-y-5">
              <button
                type="button"
                onClick={() => {
                  setStep('userId')
                  setCode('')
                  setError(null)
                }}
                className="focus-ring inline-flex items-center gap-1.5 rounded-full text-sm text-mist-400 transition hover:text-mist-50"
              >
                <ArrowLeft size={15} /> Back
              </button>

              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
                <p className="mt-2 text-sm leading-relaxed text-mist-400">
                  {hint ? (
                    <>
                      We sent a code to <span className="text-mist-50">{hint}</span>.
                    </>
                  ) : (
                    <>If that User ID exists, a code is on its way to the email on file.</>
                  )}
                </p>
              </div>

              {error && <Alert tone="error">{error}</Alert>}

              {(cooldown.retryIn > 0 || cooldown.locked) && (
                <p className="rounded-2xl border border-warn-400/25 bg-warn-400/10 px-4 py-2.5 text-center text-sm font-medium text-warn-400">
                  {cooldown.locked
                    ? `Too many wrong attempts. Request a new code in ${formatCountdown(cooldown.retryIn)}.`
                    : `Too many attempts can lock sign-in. Try again in ${formatCountdown(cooldown.retryIn)}.`}
                </p>
              )}

              <CodeInput
                label={`${OTP_LENGTH}-digit code`}
                value={code}
                onChange={setCode}
                length={OTP_LENGTH}
                autoFocus
                disabled={busy || cooldown.retryIn > 0 || cooldown.locked}
                onComplete={verifyCode}
              />

              <Button
                size="lg"
                className="w-full"
                onClick={() => verifyCode(code)}
                disabled={busy || cooldown.retryIn > 0 || cooldown.locked || code.length < OTP_LENGTH}
              >
                {busy ? 'Verifying…' : 'Verify'}
              </Button>

              <button
                type="button"
                onClick={() => requestCode()}
                disabled={
                  busy || cooldown.resendIn > 0 || cooldown.retryIn > 0 || cooldown.locked
                }
                className="focus-ring w-full rounded-full py-1 text-sm text-mist-400 transition hover:text-mist-50 disabled:opacity-50"
              >
                {cooldown.resendIn > 0 || cooldown.retryIn > 0 || cooldown.locked
                  ? `Resend in ${formatCountdown(Math.max(cooldown.resendIn, cooldown.retryIn))}`
                  : 'Resend code'}
              </button>
            </div>
          )}

          {step === 'risk' && risk && (
            <div className="space-y-5">
              <span className="grid size-12 place-items-center rounded-2xl border border-loss-400/25 bg-loss-400/12 text-loss-400">
                <MapPin size={23} />
              </span>

              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Unusual sign-in location</h1>
                <p className="mt-2 text-sm leading-relaxed text-mist-400">
                  Your account was last signed in from{' '}
                  <span className="text-mist-50">
                    {[risk.fromCity, risk.fromCountry].filter(Boolean).join(', ') || 'an unknown place'}
                  </span>{' '}
                  {travelTimeLabel(risk.elapsedMin)}. This sign-in is coming from{' '}
                  <span className="text-mist-50">
                    {[risk.toCity, risk.toCountry].filter(Boolean).join(', ') || 'an unknown place'}
                  </span>
                  {risk.distanceKm !== undefined && (
                    <> — about {risk.distanceKm.toLocaleString('en-IN')} km away.</>
                  )}{' '}
                  That's faster than any flight can cover, so we can't rule out a
                  hijacked session.
                </p>
              </div>

              <Alert tone="error">
                A critical alert has been raised on your security feed. If this wasn't you,
                don't continue — sign out and contact support immediately.
              </Alert>

              <Button size="lg" className="w-full" onClick={beginSecondaryVerification}>
                Continue — verify with a secondary code
              </Button>

              <button
                type="button"
                onClick={abandon}
                className="focus-ring w-full rounded-full py-1 text-sm text-mist-400 transition hover:text-mist-50"
              >
                This isn't me — stop sign-in
              </button>
            </div>
          )}

          {step === 'riskCode' && (
            <div className="space-y-5">
              <button
                type="button"
                onClick={() => {
                  setStep('risk')
                  setCode('')
                  setError(null)
                  setNotice(null)
                }}
                className="focus-ring inline-flex items-center gap-1.5 rounded-full text-sm text-mist-400 transition hover:text-mist-50"
              >
                <ArrowLeft size={15} /> Back
              </button>

              <span className="grid size-12 place-items-center rounded-2xl border border-warn-400/25 bg-warn-400/12 text-warn-400">
                <ShieldAlert size={23} />
              </span>

              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Secondary verification</h1>
                <p className="mt-2 text-sm leading-relaxed text-mist-400">
                  An unusual sign-in needs a second proof. We've sent a fresh code to{' '}
                  <span className="break-all text-mist-50">{secondaryEmail}</span> — enter it
                  to confirm this sign-in is yours, then you'll confirm with your passkey.
                </p>
              </div>

              {error && <Alert tone="error">{error}</Alert>}
              {notice && !error && <Alert tone="success">{notice}</Alert>}

              {(cooldown.retryIn > 0 || cooldown.locked) && (
                <p className="rounded-2xl border border-warn-400/25 bg-warn-400/10 px-4 py-2.5 text-center text-sm font-medium text-warn-400">
                  {cooldown.locked
                    ? `Too many wrong attempts. Request a new code in ${formatCountdown(cooldown.retryIn)}.`
                    : `Too many attempts can lock sign-in. Try again in ${formatCountdown(cooldown.retryIn)}.`}
                </p>
              )}

              <CodeInput
                label={`Secondary ${OTP_LENGTH}-digit code`}
                value={code}
                onChange={setCode}
                length={OTP_LENGTH}
                autoFocus
                disabled={busy || sendingCode || cooldown.retryIn > 0 || cooldown.locked}
                onComplete={verifySecondaryCode}
              />

              <Button
                size="lg"
                className="w-full"
                onClick={() => verifySecondaryCode(code)}
                disabled={
                  busy || sendingCode || cooldown.retryIn > 0 || cooldown.locked || code.length < OTP_LENGTH
                }
              >
                {busy ? 'Verifying…' : 'Verify'}
              </Button>

              <button
                type="button"
                onClick={sendSecondaryCode}
                disabled={
                  busy || sendingCode || cooldown.resendIn > 0 || cooldown.retryIn > 0 || cooldown.locked
                }
                className="focus-ring w-full rounded-full py-1 text-sm text-mist-400 transition hover:text-mist-50 disabled:opacity-50"
              >
                {sendingCode
                  ? 'Sending…'
                  : cooldown.resendIn > 0 || cooldown.retryIn > 0 || cooldown.locked
                    ? `Resend in ${formatCountdown(Math.max(cooldown.resendIn, cooldown.retryIn))}`
                    : 'Resend code'}
              </button>

              <button
                type="button"
                onClick={abandon}
                className="focus-ring w-full rounded-full py-1 text-sm text-mist-400 transition hover:text-mist-50"
              >
                This isn't me — stop sign-in
              </button>
            </div>
          )}

          {step === 'passkey' && (
            <div className="space-y-5">
              <span className="accent-gradient grid size-12 place-items-center rounded-2xl text-on-accent">
                <Fingerprint size={24} strokeWidth={2.2} />
              </span>

              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Confirm it's your device</h1>
                <p className="mt-2 text-sm leading-relaxed text-mist-400">
                  Use the passkey you registered to finish signing in.
                </p>
              </div>

              {error && <Alert tone="error">{error}</Alert>}

              {!support.supported && (
                <Alert tone="info">
                  {support.hasApi
                    ? 'Passkeys need a secure connection (https or localhost).'
                    : 'This browser does not support passkeys.'}
                </Alert>
              )}

              <Button
                size="lg"
                className="w-full"
                onClick={confirmWithPasskey}
                disabled={busy || !support.supported}
              >
                <Fingerprint size={18} />
                {busy ? 'Waiting for your device…' : 'Verify with passkey'}
              </Button>

              <button
                type="button"
                onClick={abandon}
                className="focus-ring w-full rounded-full py-1 text-sm text-mist-400 transition hover:text-mist-50"
              >
                Cancel and start over
              </button>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
