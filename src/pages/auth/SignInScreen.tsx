import { ArrowLeft, Fingerprint, IdCard } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wordmark } from '@/components/layout/Sidebar'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { CodeInput } from '@/components/ui/CodeInput'
import { Input } from '@/components/ui/Input'
import { passkeySupport, readableAuthError, signInWithPasskey } from '@/auth/passkeys'
import { trustDevice } from '@/lib/devices'
import { env } from '@/lib/env'
import { supabase } from '@/lib/supabase'
import {
  normaliseUserId,
  requestSignInCode,
  USER_ID_PATTERN,
  verifySignInCode,
} from '@/lib/userId'

type Step = 'userId' | 'otp' | 'passkey'

const OTP_LENGTH = env.otpLength

export function SignInScreen() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('userId')
  const [userId, setUserId] = useState('')
  const [code, setCode] = useState('')
  const [hint, setHint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const support = passkeySupport()

  async function requestCode(event?: FormEvent) {
    event?.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const result = await requestSignInCode(userId)
      setHint(result.hint ?? null)
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
      await verifySignInCode(userId, value)
      // Session exists now, but sign-in is not finished: the passkey below is
      // the device-verification factor.
      setStep('passkey')
    } catch (err) {
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

              <CodeInput
                label={`${OTP_LENGTH}-digit code`}
                value={code}
                onChange={setCode}
                length={OTP_LENGTH}
                autoFocus
                disabled={busy}
                onComplete={verifyCode}
              />

              <Button
                size="lg"
                className="w-full"
                onClick={() => verifyCode(code)}
                disabled={busy || code.length < OTP_LENGTH}
              >
                {busy ? 'Verifying…' : 'Verify'}
              </Button>

              <button
                type="button"
                onClick={() => requestCode()}
                disabled={busy}
                className="focus-ring w-full rounded-full py-1 text-sm text-mist-400 transition hover:text-mist-50 disabled:opacity-50"
              >
                Resend code
              </button>
            </div>
          )}

          {step === 'passkey' && (
            <div className="space-y-5">
              <span className="accent-gradient grid size-12 place-items-center rounded-2xl text-ink-950">
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
