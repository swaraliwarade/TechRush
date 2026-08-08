// TrustPass — one-time PIN briefing email.
//
// This is the ONLY place the two-PIN mechanism is ever explained. Keeping it
// out of the app UI is the point: an attacker coercing the account holder must
// not be able to discover from any screen that a second PIN exists.
//
// Runs as a Supabase Edge Function so the Gmail app password stays server-side.
// A browser cannot open an SMTP connection, and shipping the credential to the
// client would expose it to anyone who opens devtools.
//
// Deploy:
//   supabase secrets set GMAIL_USER=you@gmail.com GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx
//   supabase functions deploy send-pin-briefing

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

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

function briefingHtml(): string {
  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0a0709;padding:32px 12px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;background-color:#161215;border:1px solid #262027;border-radius:20px;padding:32px;">
      <tr><td style="font-size:18px;font-weight:600;color:#f6f2f5;padding-bottom:20px;">TrustPass</td></tr>
      <tr><td style="font-size:20px;font-weight:600;color:#f6f2f5;padding-bottom:16px;">About your two PINs</td></tr>
      <tr><td style="font-size:14px;line-height:23px;color:#b8adb6;padding-bottom:16px;">
        You just set up two PINs. They behave differently, and the difference matters.
      </td></tr>
      <tr><td style="background-color:#0a0709;border:1px solid #262027;border-radius:16px;padding:18px;">
        <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#f6f2f5;">Your first PIN</p>
        <p style="margin:0;font-size:13px;line-height:21px;color:#8d8290;">
          Opens your vault normally and shows your real balance and full transaction history.
          This is the one to use day to day.
        </p>
      </td></tr>
      <tr><td style="padding-top:12px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0a0709;border:1px solid #4a2b3d;border-radius:16px;padding:18px;">
          <tr><td>
            <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#f6f2f5;">Your second PIN</p>
            <p style="margin:0;font-size:13px;line-height:21px;color:#8d8290;">
              Opens the vault to a safe view instead &mdash; a low balance and an ordinary-looking
              history that is not your real account. Use it if you are ever pressured or forced to
              open your account in front of someone.
            </p>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="font-size:14px;line-height:23px;color:#b8adb6;padding-top:20px;">
        The app looks and behaves identically either way. Nobody watching your screen can tell
        which PIN you entered. Entering the second one quietly notifies our security team.
      </td></tr>
      <tr><td style="font-size:13px;line-height:21px;color:#8d8290;padding-top:20px;border-top:1px solid #262027;margin-top:20px;">
        Keep this email somewhere private, or delete it once you have memorised both PINs.
        This explanation appears nowhere inside the app.
      </td></tr>
    </table>
  </td></tr>
</table>`.trim()
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const gmailUser = Deno.env.get('GMAIL_USER')
  const gmailPassword = Deno.env.get('GMAIL_APP_PASSWORD')
  if (!gmailUser || !gmailPassword) {
    return json({ error: 'Email is not configured on the server.' }, 500)
  }

  // Identify the caller from their JWT. The recipient is taken from the token,
  // never from the request body — otherwise this endpoint is an open relay.
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Missing authorization header' }, 401)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user?.email) {
    return json({ error: 'Not authenticated' }, 401)
  }

  const recipient = userData.user.email

  // Two transports, tried in order. 465 is implicit TLS; 587 negotiates
  // STARTTLS over a plaintext socket. Which one works depends on what outbound
  // ports the edge runtime allows, so fall through rather than guess.
  const transports = [
    { label: 'smtps:465', port: 465, tls: true },
    { label: 'smtp:587-starttls', port: 587, tls: false },
  ]

  const failures: string[] = []

  for (const transport of transports) {
    const client = new SMTPClient({
      connection: {
        hostname: 'smtp.gmail.com',
        port: transport.port,
        tls: transport.tls,
        auth: { username: gmailUser, password: gmailPassword },
      },
    })

    try {
      await client.send({
        from: `TrustPass <${gmailUser}>`,
        to: recipient,
        subject: 'About your two TrustPass PINs',
        html: briefingHtml(),
        content: 'auto',
      })
      console.log(`briefing sent via ${transport.label}`)
      return json({ sent: true, transport: transport.label })
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      console.error(`SMTP send failed on ${transport.label}:`, detail)
      failures.push(`${transport.label}: ${detail}`)
    } finally {
      try {
        await client.close()
      } catch {
        // Gmail often drops the socket before QUIT completes. By this point the
        // message is already accepted, so this must not fail the request.
      }
    }
  }

  // Surface the real SMTP text. This is the caller's own account and the
  // credential never appears in the error, so the detail is safe to return —
  // and without it the client only sees "non-2xx status code".
  return json({ error: 'Could not send the email.', detail: failures.join(' | ') }, 502)
})
