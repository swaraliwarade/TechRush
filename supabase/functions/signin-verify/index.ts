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
// Deploy (must skip JWT verification — callers have no session yet):
//   supabase functions deploy signin-verify --no-verify-jwt

import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })

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

  return json({
    ok: true,
    user_id: userId,
    // Consumed by supabase.auth.setSession() on the client.
    access_token: verified.session.access_token,
    refresh_token: verified.session.refresh_token,
  })
})
