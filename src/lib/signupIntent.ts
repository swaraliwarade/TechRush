import type { AccountType } from './profile'

const KEY = 'trustpass.signup.accountType'

/**
 * Carries the account type a visitor picked before signing up, so they aren't
 * asked the same question again once the session exists.
 *
 * Read and clear are separate on purpose: StrictMode double-invokes state
 * initialisers in development, and a read-and-delete would lose the value on
 * the second call.
 */
export function rememberSignupIntent(type: AccountType) {
  try {
    sessionStorage.setItem(KEY, type)
  } catch {
    // Private browsing can block storage; the user just picks again later.
  }
}

export function readSignupIntent(): AccountType | null {
  try {
    const value = sessionStorage.getItem(KEY)
    return value === 'personal' || value === 'business' ? value : null
  } catch {
    return null
  }
}

export function clearSignupIntent() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // Nothing to do — a stale intent is harmless.
  }
}
