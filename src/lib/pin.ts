import { supabase } from './supabase'
import type { LedgerAccount, LedgerEntry } from './transactions'

export { PIN_LENGTH } from './pinValidation'
export const MAX_PIN_ATTEMPTS = 4

export type PinStatus = {
  configured: boolean
  locked: boolean
  locked_until?: string | null
  attempts_remaining: number
}

/**
 * Note what is absent: no field identifies which ledger came back. The client
 * genuinely cannot tell a duress unlock from a real one, which is what keeps
 * the two paths identical even with devtools open.
 */
export type PinVerifyResult = PinStatus & {
  ok: boolean
  account?: LedgerAccount
  transactions?: LedgerEntry[]
}

export async function pinStatus(): Promise<PinStatus> {
  const { data, error } = await supabase.rpc('pin_status')
  if (error) throw error
  return data as PinStatus
}

/** Writes both hashes in a single transaction — see pin_set() in 0005. */
export async function pinSet(firstPin: string, secondPin: string) {
  const { error } = await supabase.rpc('pin_set', { p_real: firstPin, p_duress: secondPin })
  if (error) throw error
}

/**
 * Emails the briefing that explains what the second PIN does.
 *
 * No longer called: the explanation is now shown once on screen at enrolment
 * instead (see PinSetup). Kept because the `send-pin-briefing` Edge Function is
 * still deployed, and email is the stronger option if you ever want it back —
 * an on-screen briefing can be read by whoever is standing next to the user.
 */
export async function sendPinBriefing() {
  const { error } = await supabase.functions.invoke('send-pin-briefing', { body: {} })
  if (!error) return

  // functions.invoke collapses every failure into "Edge Function returned a
  // non-2xx status code". The useful text is in the attached Response, so read
  // it back before throwing.
  const response = (error as { context?: Response }).context
  if (response && typeof response.text === 'function') {
    try {
      const raw = await response.text()
      const parsed = JSON.parse(raw) as { error?: string; detail?: string }
      const message = [parsed.error, parsed.detail].filter(Boolean).join(' — ')
      if (message) throw new Error(`${message} (HTTP ${response.status})`)
      if (raw) throw new Error(`${raw} (HTTP ${response.status})`)
    } catch (readError) {
      if (readError instanceof Error && readError.message.includes('HTTP')) throw readError
      // Body unreadable or not JSON — fall through to the original error.
    }
  }

  throw error
}

export async function pinVerify(pin: string): Promise<PinVerifyResult> {
  const { data, error } = await supabase.rpc('pin_verify', { p_pin: pin })
  if (error) throw error
  return data as PinVerifyResult
}

/** Counts today's `pin_failed` audit rows — see migration 0004. */
export async function failedPinAttemptsToday(): Promise<number> {
  const midnight = new Date()
  midnight.setHours(0, 0, 0, 0)

  const { count, error } = await supabase
    .from('security_events')
    .select('id', { count: 'exact', head: true })
    .eq('event_type', 'pin_failed')
    .gte('created_at', midnight.toISOString())

  if (error) throw error
  return count ?? 0
}
