# TrustPass — Team Planning, Structure & Roadmap

*Shared reference for the team: what exists today, how the code is organised, and where we go next.*

---

## 1. What the app is right now

TrustPass is a **passwordless banking demo**: sign in with an email OTP + a WebAuthn passkey — never a password. The whole thesis is *"passwords are broken (phishing, stuffing, reuse, breaches); possession of your device is the credential."* Everything else in the app exists to make that story credible and demonstrable.

### Current feature set (all working)

| Area | What exists | Where |
| --- | --- | --- |
| **Signup** | Account type (personal/business) → email → OTP → User ID shown → passkey registration → device trusted → dashboard | `src/pages/auth/`, `src/pages/landing/SignupChoice.tsx` |
| **Sign-in** | User ID (letter + 9 digits) → OTP → passkey. No email field anywhere — the address is resolved server-side and never returned to the browser | `src/pages/auth/SignInScreen.tsx`, `src/lib/userId.ts` |
| **OTP security** | Wrong-code cooldown (20s lock), resend countdown (30s), lockout after 5 misses → forced fresh code | `src/hooks/useOtpCooldown.ts` |
| **Passkeys** | WebAuthn registration + sign-in, multi-passkey support, list/rename/revoke | `src/auth/passkeys.ts`, `src/pages/Passkeys.tsx` |
| **Step-up verification** | Email-code re-verification for new devices and sensitive actions | `src/pages/auth/StepUpVerification.tsx` |
| **Trusted devices** | Server-side device fingerprinting (headers, not client-asserted), "new device must clear a code" | `src/lib/devices.ts`, `src/pages/Devices.tsx` |
| **Business second PIN** | 6-digit PIN gate over the vault; bcrypt-hashed, RLS-locked table, `SECURITY DEFINER` functions | `src/pages/vault/`, `supabase/migrations/0003,0005` |
| **Duress PIN** | Entering the duress code opens a *fake* vault (looks real, shows decoy data) and raises an event | `src/pages/vault/`, `0003` |
| **Security score** | Live 0–100 score with per-factor breakdown, weighted differently for personal vs business so both can reach 100 | `src/security/score.ts`, `src/security/SecurityProvider.tsx` |
| **Security feed** | Realtime event stream (sign-ins, new devices, PIN attempts, duress, impossible travel) — server-writable only | `src/lib/securityEvents.ts`, `src/pages/SecurityFeed.tsx` |
| **Impossible travel** | Server-side IP geolocation + Haversine speed check at sign-in; flags cross-continent jumps, forces a **secondary authentication method** (fresh emailed code) plus passkey re-verification. **On disk but not yet live — needs migration 0010 + function deploy (see §4)** | `supabase/functions/signin-verify/index.ts`, `supabase/migrations/0010_impossible_travel.sql` |
| **Dashboard** | Balance, in/out, net movement, chart, transaction history, demo INR ledgers | `src/components/account/`, `src/pages/Dashboard.tsx`, `src/pages/BusinessDashboard.tsx` |
| **Theming** | "Deepwater" dark + light mode; preference stored on profile (survives sign-out, follows the account) | `src/index.css`, `src/lib/theme.ts`, `migration 0008` |
| **Motion** | Aurora background, animated numbers, staggered reveals, route transitions — all reduced-motion aware | `src/components/motion/` |

### Stack (all free tiers)

Frontend: **Vite + React 19 + TypeScript + Tailwind CSS v4** · Backend: **Supabase** (Postgres, Auth, Realtime) · Email OTP: **Gmail SMTP via Supabase + edge functions** · Hosting: **Vercel**.

---

## 2. How the code is structured

```
src/
  auth/        SessionGates (route guarding), AuthProvider, passkeys (WebAuthn wrapper)
  security/    SecurityProvider (feeds passkeys/devices/PIN state), score computation
  components/
    ui/        Button, Card, Input, PinPad, CodeInput, Alert, Badge, PillTabs, Splash
    layout/    AppShell (route transitions), TopBar, Sidebar, SecurityPanel
    motion/    AuroraBackground, AnimatedNumber, Reveal
    charts/    chart components
    account/   AccountOverview (balance/in-out/net + chart)
  hooks/       useOtpCooldown (the security timers), useIdleTimer
  lib/         data access + domain: devices, securityEvents, userId, pin, profile,
               transactions, theme, env, supabase client, money (INR), retry, cn
  pages/       landing/ (Landing, SignupChoice) · auth/ (sign-in, signup, step-up,
               passkey registration) · vault/ (PinGate, PinSetup, Vault) · Dashboard,
               BusinessDashboard, SecurityFeed, Devices, Passkeys, Settings, Support
supabase/
  migrations/  0001 → 0010, idempotent, run in order via SQL editor
  functions/   signin-request, signin-verify (active) · send-pin-briefing (unused)
  config.toml  project_id pinned; verify_jwt off for the two sign-in functions
```

**Conventions that matter (please keep):**
- **Tokens, not one-off styles.** All theme values live in `src/index.css` (`glass-card`, `glass-tile`, `accent-gradient`, `focus-ring`); screens compose from them so a re-theme is one-file edit.
- **Server is the source of truth for security.** PIN hashes, device fingerprints, sign-in locations, and event writes never trust the client. `security_events` is server-only except one whitelisted RPC (`log_security_event`).
- **Migrations are idempotent** (`add column if not exists`, `create or replace`, `drop policy if exists` patterns) — safe to re-run.
- **Fails open.** Geolocation hiccups, unknown IPs, etc. never block a legit sign-in; security checks add friction, they don't lock people out.
- **Both PIN paths are indistinguishable** (timing, response, side effects) — see the comments in `0003` before touching `pin_verify`.

---

## 3. The pitch through-line (what judges should see)

**Signup → passkey (never a password) → new-device challenge → phishing attempt fails → feed catches an attack → impossible-travel flag → recovery codes as the escape hatch.**

Every feature we add should serve this arc. If it doesn't make the passwordless story stronger or more demoable, it's decoration — skip it.

---

## 4. Outstanding setup (do these before demo day)

1. Run `supabase/migrations/0008_theme.sql` and `0010_impossible_travel.sql` in the Supabase SQL editor.
2. Enable **Authentication → Passkeys**; set RP ID + Origins to the production domain (see README — passkeys are cryptographically bound to the RP ID).
3. Check email templates contain `{{ .Token }}` and OTP length matches `VITE_OTP_LENGTH`.
4. Deploy the edge functions (requires a one-time `supabase login` or `SUPABASE_ACCESS_TOKEN`):
   ```bash
   npx supabase functions deploy signin-request --no-verify-jwt
   npx supabase functions deploy signin-verify --no-verify-jwt
   ```
5. Demo from the **production URL only** — preview subdomains break passkeys.

---

## 5. Future improvements — prioritized

### Tier 1 — completes the passwordless story (highest value, do these)

1. **Recovery / backup codes.** The one real gap in passwordless auth: "what if I lose my device?" One-time codes generated at signup (stored hashed, shown once, regenerable) + a recovery sign-in path. This is the completeness proof — the first question any judge asks.
2. **Threat-model demo mode.** A scripted demo where an "attacker" tries wrong PINs, a new device, and a duress transfer, while the security feed reacts live. Turns the feed + step-up + impossible travel into a showstopper.
3. **Cross-device / hybrid WebAuthn.** Phone-as-authenticator flow (QR) so judges see passkeys working across devices, not just on one laptop.
4. **Step-up on sensitive actions.** Extend the existing device step-up to a "high-risk action" confirmation → shows *layered* auth (passkey + OTP), exactly what production passwordless apps do.

### Tier 2 — completes the banking loop

5. **Send money (transfers)** with passkey re-confirmation on send. Makes the app more than read-only and lights up the balance chart + feed.
6. **Duress on payments.** Enter duress PIN → transfer *looks* successful but is blocked + flagged silently. Best live demo moment in the deck.
7. **Session management.** List active sessions, revoke remotely. "Your passkey just signed in on a phone in Mumbai — revoke it here."
8. **Live alerts / notification bell.** Wire the TopBar bell to realtime security events with an unread badge.

### Tier 3 — polish & engineering maturity

9. **App-wide idle lock.** Extend `useIdleTimer` from the vault to the whole shell.
10. **Statement export (CSV/PDF).** The mock already shows the export icon; one-afternoon add.
11. **Lazy-load routes.** Bundle is ~687 KB; route-level code splitting shows maturity.
12. **Tests.** There are none today — unit tests for `score.ts`, `useOtpCooldown`, and the Haversine check would harden the demo.
13. **AI spending insights** (optional): edge function calling a free-tier LLM for a monthly summary. Judges hear "AI" and lean in — but it's the least essential item here.

### If we ship exactly three things
**Backup codes → attack-simulator demo → impossible travel live (finish §4).** That's a complete, demoable passwordless arc with a built-in wow moment.
