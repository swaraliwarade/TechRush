# TrustPass

Welcome to **TrustPass**, a modern, password‑less banking application prototype built with a premium fintech UI.

## Table of Contents
- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the Development Server](#running-the-development-server)
  - [Building for Production](#building-for-production)
- [Supabase Setup](#supabase-setup)
- [Folder Structure](#folder-structure)
- [Key Features](#key-features)
- [Adding New Banks / Sign‑In Methods](#adding-new-banks--sign‑in-methods)
- [Testing & Linting](#testing--linting)
- [Contributing](#contributing)
- [License](#license)

---

## Project Overview
TrustPass demonstrates a **password‑less** authentication flow using **Passkeys** (Face ID, Touch ID, Windows Hello). Users create an account with basic details, then are prompted to register a Passkey. After registration they land on a dashboard where they can choose between two partner banks – each with its own (future) sign‑in method.

The UI follows a premium fintech aesthetic (think Stripe, Revolut) with smooth animations, responsive design, and full accessibility support.

---

## Tech Stack
- **Framework**: Next.js 16 (App Router) – React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 + Shadcn UI primitives (custom animated components)
- **Animations**: Framer Motion
- **Auth & Data**: Supabase (PostgreSQL) – used for storing user profiles and bank selection data
- **Package Manager**: npm (Node.js 20)
- **Testing**: Jest + React Testing Library (optional, scaffolded)
- **Linting/Formatting**: ESLint + Prettier

---

## Architecture Overview
```
src/
├─ app/                # Next.js App Router pages & layout
│   ├─ (auth)/        # Registration & Passkey flow
│   └─ dashboard/     # Bank selection landing page
├─ components/        # UI primitives (Button, Input, Card, Dialog)
├─ lib/               # Supabase client wrapper & API helpers
└─ styles/            # Global Tailwind + CSS variables
```

- **Registration Flow** (`/app/(auth)/page.tsx`): collects name, email, customer ID, optional phone, validates on blur, calls `/api/register`.
- **Passkey Modal** (`components/PasskeyModal.tsx`): mock UI that simulates biometric registration.
- **Dashboard** (`/app/dashboard/page.tsx`): shows two banks with placeholder cards; each will later host its own sign‑in integration.
- **Supabase Layer** (`lib/supabase.ts` + `pages/api/register.ts`): thin API wrapper that inserts a new user record. In development a mock fallback is used if Supabase keys are missing.

---

## Getting Started
### Prerequisites
- Node.js **≥20**
- npm **≥9**
- A Supabase project (free tier works) – you will need the `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

### Installation

### Downloading the repository

You can obtain the code in two ways:

**1. Clone with Git** (recommended for development):
```bash
git clone <repo‑url>
cd banking
npm install
```

**2. Download as a ZIP** (if you don't have Git installed):
1. Click the **Code** button on the GitHub repository page.
2. Select **Download ZIP**.
3. Extract the archive:
```bash
unzip banking-main.zip
cd banking
npm install
```

After installing dependencies, you can run the development server or build the project as described below.

### Running the Development Server
```bash
# Copy the env template and fill in your Supabase credentials
cp .env.example .env.local
# Edit .env.local → set SUPABASE_URL and SUPABASE_ANON_KEY

npm run dev   # Starts the Next.js dev server at http://localhost:3000
```

### Building for Production
```bash
npm run build   # Generates an optimized production bundle
npm start       # Serves the built app (default PORT=3000)
```

---

## Supabase Setup
1. **Create a new project** on supabase.com.
2. In the dashboard, go to **SQL editor** and run the provided `schema.sql` (found in `supabase/` folder) to create the `users` table.
3. Grab the **API URL** and **anon key** from **Settings → API**.
4. Put them into `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```
5. The `/api/register` route will now persist registrations.

---

## Folder Structure
| Path | Description |
|------|-------------|
| `src/app/` | Next.js App Router pages (registration, dashboard, etc.) |
| `src/components/` | Re‑usable UI primitives (Button, Input, Card, Dialog) and higher‑level flow components |
| `src/lib/` | Supabase client wrapper, helper functions |
| `public/` | Static assets (logo, mock images) |
| `supabase/` | SQL schema file and optional seed scripts |
| `styles/` | Tailwind config, global CSS (including dialog animations) |

---

## Key Features
- **Password‑less registration** – collects minimal user data, then prompts for a Passkey.
- **Animated, accessible UI** – built with Shadcn UI + Framer Motion, follows WCAG best practices.
- **Responsive design** – works on mobile, tablet, and desktop.
- **Supabase integration** – user data stored in a hosted PostgreSQL instance.
- **Scalable dashboard** – placeholder for multiple partner banks; each bank can implement its own future sign‑in method.

---

## Adding New Banks / Sign‑In Methods
1. Create a new component under `src/components/banks/` (e.g., `BankACard.tsx`).
2. Add a route or modal for the bank’s custom sign‑in flow.
3. Wire the UI into `src/app/dashboard/page.tsx` by importing the new card component.
4. If the bank requires additional user data, extend the Supabase `users` table and update the registration form accordingly.
5. Remember to add unit tests for the new flow under `__tests__/`.

---

## Testing & Linting
```bash
# Run unit tests
npm test

# Lint the codebase
npm run lint
```
The CI pipeline (if configured) will run these on every push.

---

## Contributing
1. Fork the repository.
2. Create a feature branch (`git checkout -b feat/new‑bank`).
3. Ensure the app builds (`npm run build`) and all tests pass.
4. Open a PR with a clear description of the changes.

Please keep the design language consistent – use the existing UI primitives, Tailwind color tokens, and Framer Motion animations.

---

## License
MIT – feel free to use, modify, and share.

---

*Happy coding!*
