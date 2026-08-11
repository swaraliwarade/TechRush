import { describeDevice } from './device'
import { supabase } from './supabase'

export type TrustedDevice = {
  id: string
  user_id: string
  fingerprint: string
  label: string
  user_agent: string | null
  ip_prefix: string | null
  created_at: string
  last_seen_at: string
}

export type DeviceCheck = {
  known: boolean
  fingerprint: string
  device_id: string | null
  label: string | null
}

/**
 * Asks the server whether this device is already trusted. The fingerprint is
 * derived server-side from the request headers, so the answer can't be forged
 * by editing anything in the browser.
 */
export async function checkDevice(): Promise<DeviceCheck> {
  const { data, error } = await supabase.rpc('device_check')
  if (error) throw error
  return data as DeviceCheck
}

/** Only call after step-up verification succeeds. */
export async function trustDevice(label = describeDevice().label) {
  const { data, error } = await supabase.rpc('device_trust', { p_label: label })
  if (error) throw error
  return data as { device_id: string; fingerprint: string; label: string }
}

export async function listDevices(): Promise<TrustedDevice[]> {
  const { data, error } = await supabase
    .from('trusted_devices')
    .select('*')
    .order('last_seen_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as TrustedDevice[]
}

export async function revokeDevice(id: string) {
  const { error } = await supabase.from('trusted_devices').delete().eq('id', id)
  if (error) throw error
}

/**
 * Revokes every trusted device except the one making the call. The current
 * device is identified server-side from the request headers (the same
 * fingerprint device_check() uses), so the caller can't exempt an arbitrary
 * device. Returns how many devices were revoked.
 */
export async function revokeOtherDevices(): Promise<number> {
  const { data, error } = await supabase.rpc('device_revoke_others')
  if (error) throw error
  return (data as number) ?? 0
}
