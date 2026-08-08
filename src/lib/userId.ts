import { supabase } from './supabase'

export const USER_ID_PATTERN = /^[A-Z][0-9]{9}$/

/** Display helper: A123456789 -> A12 345 6789 */
export function formatUserId(userId: string) {
  return `${userId.slice(0, 3)} ${userId.slice(3, 6)} ${userId.slice(6)}`
}

export function normaliseUserId(input: string) {
  return input.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10)
}

/**
 * Allocates the caller's User ID, or returns the existing one. Generation lives
 * in Postgres (see 0006) so the format and collision handling never ship to the
 * browser.
 */
export async function ensureUserId(): Promise<{ user_id: string; created: boolean }> {
  const { data, error } = await supabase.rpc('ensure_user_id')
  if (error) throw error
  return data as { user_id: string; created: boolean }
}

type FunctionFailure = { context?: Response }

/** functions.invoke() flattens every failure into one opaque string. */
async function unwrapFunctionError(error: unknown): Promise<never> {
  const response = (error as FunctionFailure).context
  if (response && typeof response.text === 'function') {
    try {
      const raw = await response.text()
      const parsed = JSON.parse(raw) as { error?: string }
      if (parsed.error) throw new Error(parsed.error)
    } catch (readError) {
      if (readError instanceof Error && readError.message && !readError.message.includes('JSON')) {
        throw readError
      }
    }
  }
  throw error instanceof Error ? error : new Error('Something went wrong. Try again.')
}

export type SignInRequestResult = { ok: true; sent: boolean; hint?: string }

/** Resolves the User ID to its account email server-side and sends the code. */
export async function requestSignInCode(userId: string): Promise<SignInRequestResult> {
  const { data, error } = await supabase.functions.invoke('signin-request', {
    body: { userId },
  })
  if (error) await unwrapFunctionError(error)
  return data as SignInRequestResult
}

/**
 * Verifies the emailed code and installs the returned session. The tokens come
 * back from the function because verifyOtp() needs the email, which this flow
 * intentionally never exposes to the browser.
 */
export async function verifySignInCode(userId: string, code: string) {
  const { data, error } = await supabase.functions.invoke('signin-verify', {
    body: { userId, code },
  })
  if (error) await unwrapFunctionError(error)

  const payload = data as { access_token: string; refresh_token: string }
  const { error: sessionError } = await supabase.auth.setSession({
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
  })
  if (sessionError) throw sessionError
}
