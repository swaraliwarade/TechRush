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

`0005` fully recreates `pin_verify`, so running it makes `0004` redundant on a fresh project.

## Auth flow

**Signup** — account type → email → OTP → User ID allocated and shown → passkey registered →
device trusted → dashboard (business accounts then set their PINs). No passkey option appears on
the signup screen: the account has no credential yet, so offering one could only fail.

**Sign-in** — User ID → OTP → passkey. There is no email field anywhere on the sign-in screen; the
address is resolved from the User ID server-side and never returned to the browser.

## Edge Functions

`signin-request` and `signin-verify` back the User-ID sign-in. `verifyOtp()` needs an email address,
and the sign-in screen deliberately never collects one, so both send and verify run server-side with
the service role. They use Supabase's own configured SMTP, not the `send-pin-briefing` mailer.

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

Dark, near-black canvas with charcoal glass surfaces and a purple→pink gradient accent. Tokens live
in `src/index.css` (`glass-card`, `glass-tile`, `accent-gradient`, `focus-ring`); every screen
composes from them rather than restyling.

## Security notes

- PIN hashes are bcrypt (cost 10, independent salts) in `pin_credentials`, a table with RLS enabled
  and **no policies** — no client can read a hash. All access is via `SECURITY DEFINER` functions
  with `search_path` pinned empty.
- `transactions` and `accounts` expose select-only policies; rows arrive solely through vetted
  functions, so a stolen token cannot fabricate history.
- Device fingerprints are derived server-side from request headers, not client-asserted values.
- The two PIN paths are kept indistinguishable in timing, response payload, and side effects. See
  the comments in `0003_pin_duress_and_events.sql` before changing `pin_verify`.
