# TrustPass

Passwordless authentication (WebAuthn passkeys) with a second-PIN layer for business accounts.

## Stack

| Layer    | Choice                                          | Tier         |
| -------- | ----------------------------------------------- | ------------ |
| Frontend | Vite + React 19 + TypeScript + Tailwind CSS v4  | —            |
| Backend  | Supabase (Postgres, Auth w/ passkeys, Realtime) | Free         |
| Email    | Gmail SMTP as Supabase custom SMTP + Edge Fn    | Free         |
| Hosting  | Vercel                                          | Hobby (free) |

## Local setup

```bash
npm install
cp .env.example .env.local   # then fill in the two Supabase values
npm run dev
```

Without `.env.local`, the app renders a setup screen listing what's missing instead of failing at
runtime.

## Database

Run the files in `supabase/migrations/` in order via the Supabase SQL editor. All are idempotent.

| File | Adds |
| --- | --- |
| `0001_profiles_and_devices.sql` | `profiles`, `trusted_devices`, server-side device fingerprinting |
| `0002_accounts_and_transactions.sql` | `accounts`, `transactions`, demo seed |
| `0003_pin_duress_and_events.sql` | `pin_credentials`, `security_events`, PIN verification |
| `0004_pin_failed_events.sql` | Per-attempt failure audit rows *(superseded by 0005)* |
| `0005_six_digit_pins.sql` | 6-digit PINs, weak-PIN rejection, `pin_hash` rename |
| `0006_user_id.sql` | `profiles.user_id` (letter + 9 digits), server-side allocation |
| `0007_rupees.sql` | INR currency, re-scaled demo ledgers |
| `0008_theme.sql` | Light/dark preference on `profiles` |
| `0010_impossible_travel.sql` | `signin_locations`, `security_events.detail`, resolution RPC |
| `0011_revoke_others.sql` | `device_revoke_others` RPC — sign out of every device but the current one |

`0005` fully recreates `pin_verify`, so running it makes `0004` redundant on a fresh project.

## Auth flow

**Signup** — account type → email → OTP → User ID allocated and shown → passkey registered →
device trusted → dashboard (business accounts then set their PINs). No passkey option appears on
the signup screen: the account has no credential yet, so offering one could only fail.

**Sign-in** — User ID → OTP → passkey. There is no email field anywhere on the sign-in screen; the
address is resolved from the User ID server-side and never returned to the browser.

Both signup and sign-in gate the code screen: a wrong code forces a short wait before retrying,
and after a handful of misses the user must request a fresh code (resend also has a countdown).

**Impossible travel** — every completed sign-in is geolocated server-side (client IP via
ipwho.is, stored in `signin_locations`). If the previous sign-in implies travel faster than any
commercial flight (~900 km/h over a >400 km gap), the account was almost certainly not signed in
from both places by the same person, so a critical `impossible_travel_detected` event lands in the
security feed and the sign-in screen demands a **secondary authentication method** before
continuing: a fresh verification code is emailed to the account on the spot, and only after it's
entered does the user confirm with their passkey. Passing the code writes an
`impossible_travel_verified` event (the passkey completes the sign-in), completing the
detect → verify arc. Detection is advisory, never a blocker: any geolocation failure simply skips
the check.

For demos, `signin-verify` accepts an `x-trustpass-loc` header (`"City, Region, Country|lat,lon"`)
that overrides the IP lookup — the only way to show Mumbai → Sydney without physically flying. It
only ever adds friction (never grants access), so spoofing it buys an attacker nothing.

## Edge Functions

`signin-request` and `signin-verify` back the User-ID sign-in. `verifyOtp()` needs an email address,
and the sign-in screen deliberately never collects one, so both send and verify run server-side with
the service role. They use Supabase's own configured SMTP, not the `send-pin-briefing` mailer.
`signin-verify` also geolocates the caller and runs the impossible-travel check described above.

Both must skip JWT verification — callers have no session yet, and `sb_publishable_` keys are not
JWTs, so the gateway would reject them:

```bash
npx supabase functions deploy signin-request --no-verify-jwt
```

```bash
npx supabase functions deploy signin-verify --no-verify-jwt
```

`send-pin-briefing` is deployed but no longer called; the second-PIN explanation is shown once on
screen at enrolment instead. It needs secrets if you re-enable it:

```bash
npx supabase secrets set GMAIL_USER=you@gmail.com GMAIL_APP_PASSWORD=your16chars
```

## Supabase configuration

**Authentication → Passkeys** — enable, then set Relying Party ID to the bare domain
(`trustpass.vercel.app`) and Origins to the full origin (`https://trustpass.vercel.app`).

> Passkeys are cryptographically bound to the RP ID. Changing it invalidates every enrolled
> passkey, and `localhost` cannot coexist with a production domain — the RP ID must be a
> registrable suffix of every origin.

**Authentication → Emails** — both the *Magic Link* and *Confirm signup* templates must contain
`{{ .Token }}`, or the sign-in code screen has nothing to type. New users get *Confirm signup*;
existing users get *Magic Link*.

**Authentication → Sign In / Providers → Email** — "Email OTP Length" must match `VITE_OTP_LENGTH`.

## Deployment

`vercel.json` rewrites all paths to `index.html`, so client-side routes (`/login`, `/signup`,
`/dashboard`, and the magic-link landing) resolve on direct visit and refresh. Without it every
route except `/` returns 404. Static files under `/assets` are matched before rewrites, so hashed
bundles still serve normally.

Note that Vercel validates `vercel.json` against a strict schema — rewrite entries accept only
`source`/`destination` (plus `has`/`missing`). Any extra key fails the deploy with
`should NOT have additional property`.

Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_OTP_LENGTH` in the Vercel project.

Demo from the production URL only — per-deployment preview URLs are a different subdomain and
passkeys will not work there.

## Design

"Deepwater Blue": one blue family across the app, born from the landing page's pastel teal. Dark
mode sinks it to deep blue-teal shades (`#071a23` canvas, teal→cyan gradient accent); light mode
lifts it to the landing's blue canvas with white glass surfaces. Tokens live in `src/index.css`
(`glass-card`, `glass-tile`, `accent-gradient`, `focus-ring`); every screen composes from them
rather than restyling, so a re-theme is a token edit in one file.

Light and dark are the same token set — `html[data-theme='light']` inverts the canvas and
deepens the accent/status colours. The preference is stored on `profiles.theme` (migration 0008)
and mirrored to localStorage, so it survives sign-outs and follows the account across devices;
`Settings → Appearance` flips it live.

The marketing page (`/`) is its own pastel-light world regardless of the app preference: the
`.landing-pastel` scope in `index.css` re-declares the tokens (a full-page pastel-teal gradient
canvas that runs under the navbar, white glass cards, blush accents, charcoal footer) so every
component on that page re-tints without restyling. The auth and dashboard screens keep following
the stored theme.

## Security notes

- PIN hashes are bcrypt (cost 10, independent salts) in `pin_credentials`, a table with RLS enabled
  and **no policies** — no client can read a hash. All access is via `SECURITY DEFINER` functions
  with `search_path` pinned empty.
- `transactions` and `accounts` expose select-only policies; rows arrive solely through vetted
  functions, so a stolen token cannot fabricate history.
- Device fingerprints are derived server-side from request headers, not client-asserted values.
- Sign-in locations are geolocated and compared server-side; the browser never asserts its own
  position (the `x-trustpass-loc` header is an explicit demo override).
- `security_events` stays server-only except for a single whitelisted RPC
  (`log_security_event`) that lets the client record that it passed a required verification.
- The two PIN paths are kept indistinguishable in timing, response payload, and side effects. See
  the comments in `0003_pin_duress_and_events.sql` before changing `pin_verify`.
