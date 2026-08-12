import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { MotionConfig } from 'motion/react'
import { AuthProvider, useAuth } from '@/auth/AuthProvider'
import { SessionGates } from '@/auth/SessionGates'
import { AppShell } from '@/components/layout/AppShell'
import { Splash } from '@/components/ui/Splash'
import { ThemeChoiceDialog } from '@/components/ui/ThemeChoiceDialog'
import { BusinessDashboard } from '@/pages/BusinessDashboard'
import { Dashboard } from '@/pages/Dashboard'
import { DevicesPage } from '@/pages/Devices'
import { PasskeysPage } from '@/pages/Passkeys'
import { SecurityFeed } from '@/pages/SecurityFeed'
import { SetupRequired } from '@/pages/SetupRequired'
import { TransactionsPage } from '@/pages/Transactions'
import { Landing } from '@/pages/landing/Landing'
import { SignupChoice } from '@/pages/landing/SignupChoice'
import { Settings } from '@/pages/Settings'
import { Support } from '@/pages/Support'
import { PinSetup } from '@/pages/vault/PinSetup'
import { Vault } from '@/pages/vault/Vault'
import { SignInScreen } from '@/pages/auth/SignInScreen'
import { SignupEmailScreen } from '@/pages/auth/SignupEmailScreen'
import { isConfigured } from '@/lib/env'
import type { Profile } from '@/lib/profile'
import { applyTheme, getStoredTheme } from '@/lib/theme'
import { SecurityProvider, useSecurity } from '@/security/SecurityProvider'

function SignedInApp({ profile }: { profile: Profile }) {
  const { user, signOut } = useAuth()
  const { pin, loading, refresh } = useSecurity()

  const email = user?.email ?? ''
  const displayName = profile.display_name || email.split('@')[0] || 'there'
  const isBusiness = profile.account_type === 'business'

  // The theme is a dashboard concern: public pages stay light, and this
  // device's saved choice (default light) comes back once the shell mounts.
  useEffect(() => {
    applyTheme(getStoredTheme())
  }, [])

  if (loading) return <Splash message="Checking your security setup…" />

  // Business onboarding: PINs are enrolled straight after the account type is
  // chosen, before any dashboard route can render. Passkey enrolment already
  // happened in SessionGates, so there is no nudge to repeat here.
  if (isBusiness && pin && !pin.configured) {
    return <PinSetup onDone={refresh} />
  }

  return (
    <>
      <ThemeChoiceDialog userId={profile.id} />
      <AppShell
        greeting={
          <>
            Welcome, <span className="text-accent-400">{displayName}</span>
          </>
        }
        subtitle={
          isBusiness ? 'Business account security overview' : 'Personal account security overview'
        }
        userName={displayName}
        userEmail={email}
        accountType={profile.account_type ?? 'personal'}
        lastSignIn={user?.last_sign_in_at}
        onSignOut={signOut}
      >
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          {/* Business accounts never render ledger data outside the vault. */}
          <Route path="/dashboard" element={isBusiness ? <BusinessDashboard /> : <Dashboard />} />
          {/* Ledger views live behind the vault for business; personal accounts
              get the full transactions page. */}
          <Route
            path="/transactions"
            element={isBusiness ? <Navigate to="/dashboard" replace /> : <TransactionsPage />}
          />
          <Route path="/passkeys" element={<PasskeysPage />} />
          <Route path="/devices" element={<DevicesPage />} />
          <Route
            path="/vault"
            element={isBusiness ? <Vault /> : <Navigate to="/dashboard" replace />}
          />
          <Route path="/security-feed" element={<SecurityFeed />} />
          <Route path="/settings" element={<Settings profile={profile} email={email} />} />

          <Route path="/support" element={<Support />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AppShell>
    </>
  )
}

/** Everything reachable without a session. */
function PublicRoutes() {
  // Marketing and sign-in are always light — theming starts at the dashboard,
  // where the first visit asks the user to pick a look.
  useEffect(() => {
    applyTheme('light')
  }, [])

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<SignInScreen />} />
      <Route path="/signup" element={<SignupChoice />} />
      <Route path="/signup/email" element={<SignupEmailScreen />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function Gate() {
  const { session, loading } = useAuth()
  if (loading) return <Splash message="Restoring your session…" />
  if (!session) return <PublicRoutes />

  return (
    <SessionGates>
      {(profile) => (
        <SecurityProvider accountType={profile.account_type ?? 'personal'}>
          <SignedInApp profile={profile} />
        </SecurityProvider>
      )}
    </SessionGates>
  )
}

export default function App() {
  if (!isConfigured()) return <SetupRequired />

  return (
    <AuthProvider>
      {/* Every motion component in the app respects the user's motion preference. */}
      <MotionConfig reducedMotion="user">
        <Gate />
      </MotionConfig>
    </AuthProvider>
  )
}
