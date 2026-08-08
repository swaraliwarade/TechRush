// TrustPass — start sign-in from a User ID alone.
//
// The sign-in screen never shows an email field, so the client cannot call
// signInWithOtp() itself: it has no address to pass. This function resolves the
// User ID to the account's registered email with the service role and triggers
// the OTP, so the address never reaches the browser.
//
// Sending goes through Supabase's own configured SMTP (Authentication ->
// Emails), reusing the templates that already carry {{ .Token }}. It does not
// touch the denomailer path used by send-pin-briefing.
//
// Deploy (must skip JWT verification — callers have no session yet):
//   supabase functions deploy signin-request --no-verify-jwt

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

/** "sumeet.ganiger@gmail.com" -> "su•••••@gmail.com" */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return '•••'
  const head = local.slice(0, 2)
  return `${head}${'•'.repeat(Math.max(local.length - 2, 3))}@${domain}`
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let userId: string
  try {
    const body = await req.json()
    userId = String(body?.userId ?? '').trim().toUpperCase()
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }

  if (!/^[A-Z][0-9]{9}$/.test(userId)) {
    return json({ error: "That doesn't look like a TrustPass User ID." }, 400)
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  const { data: profile, error: lookupError } = await admin
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (lookupError) {
    console.error('profile lookup failed', lookupError.message)
    return json({ error: 'Could not start sign-in. Try again.' }, 500)
  }

  // Unknown ID: report success anyway. Returning "no such user" here would turn
  // this endpoint into an account-existence oracle.
  if (!profile) {
    return json({ ok: true, sent: false })
  }

  const { data: userData, error: userError } = await admin.auth.admin.getUserById(profile.id)
  if (userError || !userData.user?.email) {
    console.error('user lookup failed', userError?.message)
    return json({ ok: true, sent: false })
  }

  const email = userData.user.email

  const { error: otpError } = await admin.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  })

  if (otpError) {
    console.error('otp send failed', otpError.message)
    return json({ error: 'Could not send your code. Try again shortly.' }, 502)
  }

  // Masked only — enough to reassure the user which inbox to open, without
  // handing the address back to the browser.
  return json({ ok: true, sent: true, hint: maskEmail(email) })
})
