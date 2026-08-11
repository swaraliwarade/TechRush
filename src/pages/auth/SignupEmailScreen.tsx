import { ArrowLeft, Mail } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wordmark } from '@/components/layout/Sidebar'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { CodeInput } from '@/components/ui/CodeInput'
import { Input } from '@/components/ui/Input'
import { readableAuthError } from '@/auth/passkeys'
import { formatCountdown, useOtpCooldown } from '@/hooks/useOtpCooldown'
import { env } from '@/lib/env'
import { supabase } from '@/lib/supabase'

const OTP_LENGTH = env.otpLength

/**
 * Signup: email then code. There is deliberately no passkey option here — a
 * passkey is a credential the account does not have yet, so offering it at this
 * point can only fail. Enrolment happens after verification, in the gate
 * sequence, once there is an account to bind it to.
 *
 * The code screen is rate-limited: a wrong code forces a short wait before
 * retrying, and resend has a countdown.
 */
export function SignupEmailScreen() {
  const navigate = useNavigate()
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const cooldown = useOtpCooldown()

  async function sendCode(event?: FormEvent) {
    event?.preventDefault()
    setError(null)
    setNotice(null)
    setBusy(true)
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/`,
        },
      })
      if (otpError) throw otpError
      cooldown.codeSent()
      setNotice(`Code sent to ${email.trim()}. It expires in 1 hour.`)
      setStep('otp')
    } catch (err) {
      setError(readableAuthError(err))
    } finally {
      setBusy(false)
    }
  }

  async function verify(value: string) {
    setError(null)
    setBusy(true)
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: value,
        type: 'email',
      })
      if (verifyError) throw verifyError
      cooldown.reset()
      // AuthProvider picks up the session; the gate sequence takes it from here.
    } catch (err) {
      cooldown.verifyFailed()
      setError(readableAuthError(err))
      setCode('')
    } finally {
      setBusy(false)
    }
  }

  const verifyLocked = cooldown.retryIn > 0 || cooldown.locked
  const resendLocked = cooldown.resendIn > 0 || cooldown.retryIn > 0 || cooldown.locked

  return (
    <div className="grid min-h-dvh place-items-center p-4 sm:p-8">
      <div className="w-full max-w-md space-y-5">
        <Wordmark />

        <Card className="p-6 sm:p-8" glow>
          <button
            type="button"
            onClick={() => (step === 'otp' ? setStep('email') : navigate('/signup'))}
            className="focus-ring mb-5 inline-flex items-center gap-1.5 rounded-full text-sm text-mist-400 transition hover:text-mist-50"
          >
            <ArrowLeft size={15} /> Back
          </button>

          {step === 'email' ? (
            <form onSubmit={sendCode} className="space-y-5">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
                <p className="mt-2 text-sm leading-relaxed text-mist-400">
                  We'll email you a one-time code to confirm it's you.
                </p>
              </div>

              {error && <Alert tone="error">{error}</Alert>}

              <Input
                label="Email address"
                type="email"
                required
                autoFocus
                autoComplete="email"
                placeholder="you@company.com"
                icon={<Mail size={16} />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <Button size="lg" type="submit" className="w-full" disabled={busy || !email.trim()}>
                {busy ? 'Sending…' : 'Send code'}
              </Button>
            </form>
          ) : (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Enter your code</h1>
                <p className="mt-2 text-sm break-words text-mist-400">
                  Sent to <span className="text-mist-50">{email.trim()}</span>
                </p>
              </div>

              {error && <Alert tone="error">{error}</Alert>}
              {notice && !error && <Alert tone="success">{notice}</Alert>}

              {verifyLocked && (
                <p className="rounded-2xl border border-warn-400/25 bg-warn-400/10 px-4 py-2.5 text-center text-sm font-medium text-warn-400">
                  {cooldown.locked
                    ? `Too many wrong attempts. Request a new code in ${formatCountdown(cooldown.retryIn)}.`
                    : `Too many attempts can lock signup. Try again in ${formatCountdown(cooldown.retryIn)}.`}
                </p>
              )}

              <CodeInput
                label={`${OTP_LENGTH}-digit code`}
                value={code}
                onChange={setCode}
                length={OTP_LENGTH}
                autoFocus
                disabled={busy || verifyLocked}
                onComplete={verify}
              />

              <Button
                size="lg"
                className="w-full"
                onClick={() => verify(code)}
                disabled={busy || verifyLocked || code.length < OTP_LENGTH}
              >
                {busy ? 'Verifying…' : 'Verify and continue'}
              </Button>

              <button
                type="button"
                onClick={() => sendCode()}
                disabled={busy || resendLocked}
                className="focus-ring w-full rounded-full py-1 text-sm text-mist-400 transition hover:text-mist-50 disabled:opacity-50"
              >
                {resendLocked
                  ? `Resend in ${formatCountdown(Math.max(cooldown.resendIn, cooldown.retryIn))}`
                  : 'Resend code'}
              </button>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
