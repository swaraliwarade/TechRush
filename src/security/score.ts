import type { AccountType } from '@/lib/profile'

export type ScoreFactor = {
  id: string
  label: string
  hint: string
  points: number
  earned: boolean
}

export type SecurityScore = {
  value: number
  factors: ScoreFactor[]
  grade: 'strong' | 'fair' | 'weak'
}

/**
 * Weights differ by account type so both can reach 100. Scoring a personal
 * account against a business-only control would cap it below full marks for a
 * feature it can't enable, which reads as a bug rather than a rating.
 */
export function computeSecurityScore(input: {
  accountType: AccountType
  passkeyCount: number
  trustedDeviceCount: number
  pinConfigured: boolean
}): SecurityScore {
  const { accountType, passkeyCount, trustedDeviceCount, pinConfigured } = input
  const business = accountType === 'business'

  const factors: ScoreFactor[] = [
    {
      id: 'passkey',
      label: 'Passkey enrolled',
      hint: 'Sign in without a password',
      points: business ? 40 : 55,
      earned: passkeyCount >= 1,
    },
    {
      id: 'backup-passkey',
      label: 'Backup passkey',
      hint: 'A second device keeps you out of lockout',
      points: business ? 10 : 15,
      earned: passkeyCount >= 2,
    },
    {
      id: 'trusted-device',
      label: 'Trusted device',
      hint: 'New devices must clear an email code',
      points: business ? 20 : 30,
      earned: trustedDeviceCount >= 1,
    },
  ]

  if (business) {
    factors.push({
      // Neutral wording on purpose: this label renders in the sidebar on every
      // screen, so it must not hint at what the second PIN does.
      id: 'vault-pin',
      label: 'Vault PINs set',
      hint: 'Required before balances or activity can be viewed',
      points: 30,
      earned: pinConfigured,
    })
  }

  const value = factors.reduce((sum, factor) => sum + (factor.earned ? factor.points : 0), 0)

  return {
    value,
    factors,
    grade: value >= 85 ? 'strong' : value >= 55 ? 'fair' : 'weak',
  }
}
