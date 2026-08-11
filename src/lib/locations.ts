import { supabase } from './supabase'

export type SignInLocation = {
  id: string
  city: string | null
  region: string | null
  country: string | null
  ip_prefix: string | null
  created_at: string
}

/** "Mumbai, Maharashtra, India" — or null when every field is unknown. */
export function describePlace(
  loc: Pick<SignInLocation, 'city' | 'region' | 'country'>,
): string | null {
  const parts = [loc.city, loc.region, loc.country].filter(Boolean)
  return parts.length ? parts.join(', ') : null
}

export type RecentSignInsResult =
  | { ok: true; locations: SignInLocation[] }
  | { ok: false }

/**
 * The account's most recent completed sign-in locations, newest first, written
 * server-side by signin-verify on every sign-in. RLS scopes the query to the
 * caller's own rows. Fails open like the rest of the app: if location tracking
 * isn't set up yet (migration 0010 not run / function not deployed), the query
 * errors and this returns { ok: false } so the UI can say so instead of
 * crashing.
 */
export async function recentSignInLocations(limit = 5): Promise<RecentSignInsResult> {
  try {
    const { data, error } = await supabase
      .from('signin_locations')
      .select('id, city, region, country, ip_prefix, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) return { ok: false }
    return { ok: true, locations: (data as SignInLocation[] | null) ?? [] }
  } catch {
    return { ok: false }
  }
}
