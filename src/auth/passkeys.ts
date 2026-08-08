import { describeDevice } from '@/lib/device'
import { supabase } from '@/lib/supabase'

export type Passkey = {
  id: string
  friendly_name?: string
  created_at: string
  last_used_at?: string
}

/** WebAuthn needs both the API and a secure context (https, or localhost). */
export function passkeySupport() {
  const hasApi =
    typeof window !== 'undefined' &&
    typeof window.PublicKeyCredential !== 'undefined' &&
    typeof navigator.credentials?.create === 'function'

  return {
    hasApi,
    secureContext: typeof window !== 'undefined' && window.isSecureContext,
    supported: hasApi && window.isSecureContext,
  }
}

/**
 * Maps the raw WebAuthn / GoTrue error onto something a user can act on.
 * WebAuthn surfaces almost everything as a bare DOMException name.
 */
export function readableAuthError(error: unknown): string {
  if (!error) return 'Something went wrong. Try again.'

  const err = error as { name?: string; message?: string; code?: string }
  const name = err.name ?? ''
  const message = err.message ?? String(error)

  if (name === 'NotAllowedError' || /not allowed|timed out/i.test(message)) {
    return 'Passkey prompt was dismissed or timed out.'
  }
  if (name === 'InvalidStateError') {
    return 'This device already has a passkey for your account.'
  }
  if (name === 'AbortError') {
    return 'Passkey request was cancelled.'
  }
  if (/no credentials|no passkey|not found/i.test(message)) {
    return 'No passkey found for this site on this device. Use the email code instead.'
  }
  if (/experimental|disabled/i.test(message) && /passkey/i.test(message)) {
    return 'Passkeys are not enabled on this Supabase project yet.'
  }
  return message || 'Something went wrong. Try again.'
}

/**
 * Sign in with a discoverable passkey. No email required — the authenticator
 * resolves the account, which is also what makes the cross-device QR flow work.
 */
export async function signInWithPasskey() {
  const { data, error } = await supabase.auth.signInWithPasskey()
  if (error) throw error
  return data
}

/**
 * Register a passkey for the signed-in user, then label it with the device name.
 * The label is cosmetic, so a failed rename is not worth failing the whole call.
 */
export async function registerPasskey() {
  const { data, error } = await supabase.auth.registerPasskey()
  if (error) throw error

  if (data?.id) {
    const { label } = describeDevice()
    await supabase.auth.passkey
      .update({ passkeyId: data.id, friendlyName: label })
      .catch(() => undefined)
  }

  return data
}

export async function listPasskeys(): Promise<Passkey[]> {
  const { data, error } = await supabase.auth.passkey.list()
  if (error) throw error
  return data ?? []
}

export async function renamePasskey(passkeyId: string, friendlyName: string) {
  const { error } = await supabase.auth.passkey.update({ passkeyId, friendlyName })
  if (error) throw error
}

export async function deletePasskey(passkeyId: string) {
  const { error } = await supabase.auth.passkey.delete({ passkeyId })
  if (error) throw error
}
