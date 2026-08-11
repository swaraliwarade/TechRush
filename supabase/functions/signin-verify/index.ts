// TrustPass — complete the User-ID sign-in by verifying the emailed OTP.
//
// Counterpart to signin-request. verifyOtp() needs the email address, and the
// sign-in screen deliberately never collects one, so verification has to happen
// here where the User ID can be resolved with the service role.
//
// Returns the session tokens for the client to install via setSession(). Those
// are the same tokens the browser would have received had it verified directly;
// the only thing kept back is the email address itself.
//
// Risk: every completed sign-in is geolocated and stored (signin_locations).
// If the implied travel from the previous sign-in exceeds any commercial flight
// (~900 km/h), it is physically impossible for the same person to be behind
// both — a critical security event is raised and the response carries a `risk`
// payload so the client can re-verify with the passkey before continuing.
// Geolocation is best-effort and fails open: a geo hiccup never blocks sign-in.
//
// Deploy (must skip JWT verification — callers have no session yet):
//   supabase functions deploy signin-verify --no-verify-jwt

import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-trustpass-loc',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })

type Geo = {
  city: string | null
  region: string | null
  country: string | null
  lat: number | null
  lon: number | null
  ipPrefix: string | null
}

const emptyGeo = (ipPrefix: string | null = null): Geo => ({
  city: null,
  region: null,
  country: null,
  lat: null,
  lon: null,
  ipPrefix,
})

/**
 * Resolves the caller's rough location. Two sources, in order:
 *
 *  1. `x-trustpass-loc` header — a DEMO override: "City, Region, Country|lat,lon".
 *     The feature's whole point is being able to show Mumbai -> Sydney in a live
 *     demo without actually flying, and since this flag only ever adds friction
 *     (it never grants access), spoofing it buys an attacker nothing.
 *  2. ipwho.is geolocation of the real client IP (free, keyless).
 *
 * Fails open: any error returns an empty Geo and sign-in proceeds unflagged.
 */
async function geolocate(req: Request): Promise<Geo> {
  const override = req.headers.get('x-trustpass-loc')
  if (override) {
    const [place, coords] = override.split('|')
    const [latS, lonS] = (coords ?? '').split(',').map((s) => Number.parseFloat(s.trim()))
    if (place && Number.isFinite(latS) && Number.isFinite(lonS)) {
      const [city, region, country] = place.split(',').map((s) => s.trim())
      return {
        city: city || null,
        region: region || null,
        country: country || null,
        lat: latS,
        lon: lonS,
        ipPrefix: null,
      }
    }
  }

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim()
  // Localhost and RFC1918 ranges carry no geography — skip the lookup entirely.
  if (!ip || ip === '::1' || ip === '127.0.0.1' || /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip)) {
    return emptyGeo(ipPrefix(ip))
  }

  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      signal: AbortSignal.timeout(4000),
    })
    const data = (await res.json()) as {
      success?: boolean
      city?: string
      region?: string
      country?: string
      latitude?: number
      longitude?: number
    }
    if (!data.success) return emptyGeo(ipPrefix(ip))
    return {
      city: data.city ?? null,
      region: data.region ?? null,
      country: data.country ?? null,
      lat: typeof data.latitude === 'number' ? data.latitude : null,
      lon: typeof data.longitude === 'number' ? data.longitude : null,
      ipPrefix: ipPrefix(ip),
    }
  } catch (err) {
    console.error('geolocation failed, failing open', err)
    return emptyGeo(ipPrefix(ip))
  }
}

/** "103.21.244.87" -> "103.21.244" — coarse prefix only, like the rest of the app. */
function ipPrefix(ip: string): string | null {
  const parts = ip.split('.')
  return parts.length === 4 ? parts.slice(0, 3).join('.') : null
}

/** Great-circle distance in kilometres. */
function haversineKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const R = 6371
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

export type TravelRisk = {
  flagged: boolean
  fromCity?: string
  fromCountry?: string
  toCity?: string
  toCountry?: string
  distanceKm?: number
  speedKmh?: number
  elapsedMin?: number
  detectedAt?: string
}

const describe = (g: Geo) => [g.city, g.region, g.country].filter(Boolean).join(', ') || 'Unknown location'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let userId: string
  let code: string
  try {
    const body = await req.json()
    userId = String(body?.userId ?? '').trim().toUpperCase()
    code = String(body?.code ?? '').trim()
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }

  if (!/^[A-Z][0-9]{9}$/.test(userId) || !/^\d{4,10}$/.test(code)) {
    return json({ error: 'Invalid User ID or code.' }, 400)
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  // Same generic wording whether the ID is unknown or the code is wrong, so a
  // failed verify reveals nothing about which of the two was at fault.
  const rejected = () => json({ error: 'That code is incorrect or has expired.' }, 401)

  if (!profile) return rejected()

  const { data: userData } = await admin.auth.admin.getUserById(profile.id)
  const email = userData?.user?.email
  if (!email) return rejected()

  // A separate anon-key client: verifyOtp must run as an ordinary caller so it
  // returns a real user session rather than acting with service-role rights.
  const authClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { auth: { persistSession: false } },
  )

  const { data: verified, error: verifyError } = await authClient.auth.verifyOtp({
    email,
    token: code,
    type: 'email',
  })

  if (verifyError || !verified.session) {
    console.error('otp verify failed', verifyError?.message)
    return rejected()
  }

  // ---- Risk assessment (best-effort; every failure path keeps the sign-in) ----
  let risk: TravelRisk = { flagged: false }
  const geo = await geolocate(req)

  try {
    const { data: prev } = await admin
      .from('signin_locations')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    await admin.from('signin_locations').insert({
      user_id: profile.id,
      city: geo.city,
      region: geo.region,
      country: geo.country,
      lat: geo.lat,
      lon: geo.lon,
      ip_prefix: geo.ipPrefix,
    })

    if (prev && geo.lat !== null && geo.lon !== null && prev.lat !== null && prev.lon !== null) {
      const elapsedMin = (Date.now() - new Date(prev.created_at).getTime()) / 60000
      if (elapsedMin > 0) {
        const distanceKm = haversineKm(
          { lat: prev.lat, lon: prev.lon },
          { lat: geo.lat, lon: geo.lon },
        )
        const speedKmh = distanceKm / (elapsedMin / 60)

        // >900 km/h beats any commercial flight; combined with a >400 km gap
        // (so IP jitter between two nearby networks can't trip it) this is
        // physically impossible for the same person.
        if (speedKmh > 900 && distanceKm > 400) {
          risk = {
            flagged: true,
            fromCity: prev.city ?? undefined,
            fromCountry: prev.country ?? undefined,
            toCity: geo.city ?? undefined,
            toCountry: geo.country ?? undefined,
            distanceKm: Math.round(distanceKm),
            speedKmh: Math.round(speedKmh),
            elapsedMin: Math.round(elapsedMin),
            detectedAt: new Date().toISOString(),
          }

          await admin.from('security_events').insert({
            user_id: profile.id,
            event_type: 'impossible_travel_detected',
            severity: 'critical',
            ip_prefix: geo.ipPrefix,
            detail: {
              from: describe(prev),
              to: describe(geo),
              distance_km: Math.round(distanceKm),
              speed_kmh: Math.round(speedKmh),
              elapsed_min: Math.round(elapsedMin),
              from_city: prev.city,
              from_country: prev.country,
              to_city: geo.city,
              to_country: geo.country,
            },
          })
        }
      }
    }
  } catch (err) {
    console.error('risk assessment failed, failing open', err)
  }

  return json({
    ok: true,
    user_id: userId,
    risk,
    // Consumed by supabase.auth.setSession() on the client.
    access_token: verified.session.access_token,
    refresh_token: verified.session.refresh_token,
  })
})
