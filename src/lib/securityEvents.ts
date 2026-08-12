import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabase'

export type Severity = 'info' | 'warning' | 'critical'

export type SecurityEvent = {
  id: string
  user_id: string
  event_type: string
  severity: Severity
  ip_prefix: string | null
  user_agent: string | null
  /** Event-specific payload, e.g. the two locations on an impossible-travel event. */
  detail: Record<string, unknown> | null
  created_at: string
}

/**
 * Short labels for known event types — shared by the notifications bell and
 * account search. (SecurityFeed keeps its own richer, deliberately
 * non-explanatory copy.)
 */
export const securityEventLabels: Record<string, string> = {
  duress_pin_used: 'Priority alert',
  pin_failed: 'Incorrect PIN',
  pin_lockout: 'Vault locked out',
  vault_unlocked: 'Vault unlocked',
  impossible_travel_detected: 'Impossible travel',
  impossible_travel_verified: 'Impossible travel verified',
}

export async function fetchSecurityEvents(limit = 50): Promise<SecurityEvent[]> {
  const { data, error } = await supabase
    .from('security_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as SecurityEvent[]
}

export type FeedStatus = 'connecting' | 'live' | 'error'

/**
 * Subscribes to INSERTs on security_events.
 *
 * RLS applies to the realtime stream too — the channel carries the user's JWT,
 * so the "events: read own" policy means a subscriber is only ever pushed rows
 * belonging to them. No client-side filtering needed.
 */
export function subscribeToSecurityEvents(
  onInsert: (event: SecurityEvent) => void,
  onStatus?: (status: FeedStatus) => void,
): RealtimeChannel {
  const channel = supabase
    .channel(`security-events-${crypto.randomUUID()}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'security_events' },
      (payload) => onInsert(payload.new as SecurityEvent),
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') onStatus?.('live')
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') onStatus?.('error')
      else onStatus?.('connecting')
    })

  return channel
}
