import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '@/auth/AuthProvider'
import { listPasskeys, readableAuthError } from '@/auth/passkeys'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Splash } from '@/components/ui/Splash'
import { Wordmark } from '@/components/layout/Sidebar'
import { checkDevice } from '@/lib/devices'
import { fetchProfile, type Profile } from '@/lib/profile'
import { retryTransient } from '@/lib/retry'
import { readSignupIntent } from '@/lib/signupIntent'
import { ChooseAccountType } from '@/pages/auth/ChooseAccountType'
import { RegisterPasskeyStep } from '@/pages/auth/RegisterPasskeyStep'
import { StepUpVerification } from '@/pages/auth/StepUpVerification'
import { UserIdReveal } from '@/pages/auth/UserIdReveal'

type DeviceState = 'checking' | 'known' | 'unknown'

function GateError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="grid min-h-dvh place-items-center p-4 sm:p-8">
      <div className="w-full max-w-md space-y-5">
        <Wordmark />
        <Card className="p-6 sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight">Couldn't complete security checks</h1>
          <Alert tone="error" className="mt-4">
            {message}
          </Alert>
          <p className="mt-4 text-sm leading-relaxed text-mist-400">
            This is usually temporary. Try again, and sign out and back in if it persists.
          </p>
          <Button className="mt-5 w-full" onClick={onRetry}>
            Try again
          </Button>
        </Card>
      </div>
    </div>
  )
}

/**
 * Ordered post-login checks, run once per user.
 *
 *   1. account type      — chosen on the public signup page, applied here
 *   2. User ID           — allocated server-side, shown once
 *   3. passkey           — enrolled, then used to trust this device
 *   4. device recognised — step-up by email only for an already-enrolled user
 *
 * Order matters. The device check used to run first, which meant a brand-new
 * account was asked for an emailed code immediately after having just verified
 * one. Steps 1-3 finish by writing a trusted_devices row, so signup reaches the
 * dashboard without a second code, and step 4 only ever fires for a returning
 * user on an unfamiliar device.
 */
export function SessionGates({ children }: { children: (profile: Profile) => ReactNode }) {
  const { user, signOut } = useAuth()
  const userId = user?.id
  const email = user?.email ?? ''

  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [passkeyCount, setPasskeyCount] = useState<number | null>(null)
  const [device, setDevice] = useState<DeviceState>('checking')
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  // Read (not consumed) here — ChooseAccountType clears it once applied.
  const [signupIntent] = useState(() => readSignupIntent())

  useEffect(() => {
    if (!userId) return
    let active = true
    setProfileLoading(true)

    retryTransient(() => fetchProfile(userId))
      .then((result) => {
        if (active) setProfile(result)
      })
      .catch((err) => {
        if (active) setError(readableAuthError(err))
      })
      .finally(() => {
        if (active) setProfileLoading(false)
      })

    return () => {
      active = false
    }
  }, [userId, attempt])

  useEffect(() => {
    if (!userId) return
    let active = true

    retryTransient(() => listPasskeys())
      .then((keys) => {
        if (active) setPasskeyCount(keys.length)
      })
      .catch((err) => {
        if (active) setError(readableAuthError(err))
      })

    return () => {
      active = false
    }
  }, [userId, attempt])

  // Keyed on userId alone, deliberately: the step-up flow issues a fresh
  // session, and re-running the check on that would email a second code
  // mid-verification.
  useEffect(() => {
    if (!userId) return
    let active = true
    setDevice('checking')

    retryTransient(() => checkDevice())
      .then((result) => {
        if (active) setDevice(result.known ? 'known' : 'unknown')
      })
      .catch((err) => {
        if (active) setError(readableAuthError(err))
      })

    return () => {
      active = false
    }
  }, [userId, attempt])

  const retry = useCallback(() => {
    setError(null)
    setAttempt((n) => n + 1)
  }, [])

  const reloadProfile = useCallback(async () => {
    if (!userId) return
    setProfile(await fetchProfile(userId))
  }, [userId])

  const refreshPasskeys = useCallback(async () => {
    setPasskeyCount((await listPasskeys()).length)
    setDevice('known')
  }, [])

  if (error) return <GateError message={error} onRetry={retry} />
  if (!userId) return <Splash message="Loading account…" />
  if (profileLoading) return <Splash message="Loading your profile…" />

  // 1 — account type
  if (!profile?.account_type) {
    return <ChooseAccountType userId={userId} preset={signupIntent} onChosen={reloadProfile} />
  }

  // 2 — User ID
  if (!profile.user_id) {
    return <UserIdReveal onContinue={reloadProfile} />
  }

  if (passkeyCount === null) return <Splash message="Checking your security setup…" />

  // 3 — passkey enrolment, which also trusts this device
  if (passkeyCount === 0) {
    return <RegisterPasskeyStep userId={profile.user_id} onDone={refreshPasskeys} />
  }

  // 4 — device recognition for already-enrolled accounts
  if (device === 'checking') return <Splash message="Checking this device…" />

  if (device === 'unknown') {
    return (
      <StepUpVerification email={email} onVerified={() => setDevice('known')} onSignOut={signOut} />
    )
  }

  return <>{children(profile)}</>
}
