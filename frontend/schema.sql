-- ====================================================================
-- TrustPass Banking Schema Configuration
-- Copy and execute this script inside the SQL Editor of your Supabase console.
-- ====================================================================

-- 1. Create the accounts registration table
create table if not exists public.accounts (
    id uuid default gen_random_uuid() primary key,
    full_name text not null check (char_length(trim(full_name)) >= 2),
    email text not null unique check (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$'),
    customer_id text not null unique check (char_length(customer_id) between 6 and 12),
    phone_number text check (phone_number is null or char_length(phone_number) >= 10),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Authentication sessions (server-validated sign-in progress)
create table if not exists public.auth_sessions (
    id uuid default gen_random_uuid() primary key,
    account_id uuid not null references public.accounts(id) on delete cascade,
    email_verified boolean not null default false,
    phone_verified boolean not null default false,
    biometric_verified boolean not null default false,
    expires_at timestamp with time zone not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Expiring challenges for email, OTP, and WebAuthn ceremonies
create table if not exists public.auth_challenges (
    id uuid default gen_random_uuid() primary key,
    session_id uuid not null references public.auth_sessions(id) on delete cascade,
    challenge_type text not null check (challenge_type in ('email', 'otp', 'webauthn_register', 'webauthn_login')),
    token_hash text,
    challenge_data jsonb,
    used boolean not null default false,
    expires_at timestamp with time zone not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. WebAuthn credential references (public keys only — no biometric data)
create table if not exists public.webauthn_credentials (
    id uuid default gen_random_uuid() primary key,
    account_id uuid not null references public.accounts(id) on delete cascade,
    credential_id text not null unique,
    public_key text not null,
    counter bigint not null default 0,
    device_type text not null default 'retail' check (device_type in ('retail', 'commercial')),
    transports text[],
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Enable Row-Level Security
alter table public.accounts enable row level security;
alter table public.auth_sessions enable row level security;
alter table public.auth_challenges enable row level security;
alter table public.webauthn_credentials enable row level security;

-- 6. Accounts policies
create policy "Allow anonymous account creation"
on public.accounts
for insert
with check (true);

create policy "Allow read access to specific account"
on public.accounts
for select
using (true);

-- 7. Auth tables — service role only (no anon access)
create policy "Deny anon auth_sessions"
on public.auth_sessions
for all
using (false)
with check (false);

create policy "Deny anon auth_challenges"
on public.auth_challenges
for all
using (false)
with check (false);

create policy "Deny anon webauthn_credentials"
on public.webauthn_credentials
for all
using (false)
with check (false);

-- 8. Indexes
create index if not exists accounts_email_idx on public.accounts(email);
create index if not exists accounts_customer_id_idx on public.accounts(customer_id);
create index if not exists auth_sessions_account_id_idx on public.auth_sessions(account_id);
create index if not exists auth_challenges_session_id_idx on public.auth_challenges(session_id);
create index if not exists auth_challenges_token_hash_idx on public.auth_challenges(token_hash);
create index if not exists webauthn_credentials_account_id_idx on public.webauthn_credentials(account_id);
