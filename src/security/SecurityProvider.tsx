import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { listPasskeys, readableAuthError, type Passkey } from '@/auth/passkeys'
import { listDevices, type TrustedDevice } from '@/lib/devices'
import { pinStatus, type PinStatus } from '@/lib/pin'
import type { AccountType } from '@/lib/profile'
import { computeSecurityScore, type SecurityScore } from './score'

type SecurityContextValue = {
  passkeys: Passkey[]
  devices: TrustedDevice[]
  pin: PinStatus | null
  score: SecurityScore
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const SecurityContext = createContext<SecurityContextValue | null>(null)

export function SecurityProvider({
  accountType,
  children,
}: {
  accountType: AccountType
  children: ReactNode
}) {
  const [passkeys, setPasskeys] = useState<Passkey[]>([])
  const [devices, setDevices] = useState<TrustedDevice[]>([])
  const [pin, setPin] = useState<PinStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      // The PIN only exists for business accounts; skip the round trip otherwise.
      const [nextPasskeys, nextDevices, nextPin] = await Promise.all([
        listPasskeys(),
        listDevices(),
        accountType === 'business' ? pinStatus() : Promise.resolve(null),
      ])
      setPasskeys(nextPasskeys)
      setDevices(nextDevices)
      setPin(nextPin)
      setError(null)
    } catch (err) {
      setError(readableAuthError(err))
    } finally {
      setLoading(false)
    }
  }, [accountType])

  useEffect(() => {
    refresh()
  }, [refresh])

  const score = useMemo(
    () =>
      computeSecurityScore({
        accountType,
        passkeyCount: passkeys.length,
        trustedDeviceCount: devices.length,
        pinConfigured: pin?.configured ?? false,
      }),
    [accountType, passkeys.length, devices.length, pin?.configured],
  )

  const value = useMemo<SecurityContextValue>(
    () => ({ passkeys, devices, pin, score, loading, error, refresh }),
    [passkeys, devices, pin, score, loading, error, refresh],
  )

  return <SecurityContext value={value}>{children}</SecurityContext>
}

export function useSecurity() {
  const ctx = use(SecurityContext)
  if (!ctx) throw new Error('useSecurity must be used inside <SecurityProvider>')
  return ctx
}
