# Run doc — trustpass (Vite + React)

## Reproduce the uncommitted artifacts a fresh checkout needs

- `node_modules/` — install with the project's package manager:
  ```bash
  npm install
  ```
- `.env.local` — the browser app reads Supabase config from `VITE_SUPABASE_URL`
  and `VITE_SUPABASE_ANON_KEY` (plus `VITE_OTP_LENGTH`). This worktree is the
  main checkout, so `.env.local` is already present at the repo root. If it is
  ever missing, copy it from the main checkout:
  ```bash
  cp "<main checkout>/.env.local" ./.env.local
  ```
  Never commit secret values; `.env.local` is gitignored. A template lives in
  `.env.example`.

## Run the server

Dev server (Vite). Prefer the default port 5173; if it is taken, pick a free
one (e.g. 5174) and pass it explicitly:

```bash
npm run dev -- --port 5174 --strictPort
```

`vite.config.ts` sets `server.host: true` so the LAN IP is exposed (needed for
phone/passkey testing); it also means the server binds all interfaces, so use
`http://localhost:<port>/` for local preview.

Build (not needed for preview):
```bash
npm run build
```

## Detached-launch gotcha (preview threads)

When launching the dev server detached under `launchd` (`launchctl submit`),
launchd runs with a minimal PATH (`/usr/bin:/bin:/usr/sbin:/sbin`) — `npm` and
`node` are NOT on it (they live in `/opt/homebrew/bin`). `npm`'s shebang also
needs `node`, so invoking `npm` fails with `env: node: No such file or
directory`. Launch vite directly with the node binary instead:

```bash
launchctl submit -l <label> -- /bin/sh -c "cd '<repo>' && exec /opt/homebrew/bin/node node_modules/vite/bin/vite.js --port <port> --strictPort > '<log>' 2>&1"
```
