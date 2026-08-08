-- ============================================================================
-- TrustPass — Phase 2: profiles + trusted devices
--
-- Run in Supabase Dashboard -> SQL Editor -> New query.
-- Idempotent and non-destructive: re-running will not drop existing rows.
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- profiles
-- account_type stays NULL until the user picks one; the app reads that NULL to
-- decide whether to show the account-type chooser.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  account_type text check (account_type in ('personal', 'business')),
  display_name text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles: read own"   on public.profiles;
drop policy if exists "profiles: insert own" on public.profiles;
drop policy if exists "profiles: update own" on public.profiles;

create policy "profiles: read own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: insert own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- trusted_devices
-- fingerprint = sha256(user agent + coarse IP prefix). Both inputs are read
-- server-side from the request headers, so a client cannot assert a device it
-- isn't actually using.
-- ---------------------------------------------------------------------------
create table if not exists public.trusted_devices (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  fingerprint  text not null,
  label        text not null,
  user_agent   text,
  ip_prefix    text,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (user_id, fingerprint)
);

create index if not exists trusted_devices_user_idx
  on public.trusted_devices (user_id, last_seen_at desc);

alter table public.trusted_devices enable row level security;

drop policy if exists "devices: read own"   on public.trusted_devices;
drop policy if exists "devices: insert own" on public.trusted_devices;
drop policy if exists "devices: update own" on public.trusted_devices;
drop policy if exists "devices: delete own" on public.trusted_devices;

create policy "devices: read own"
  on public.trusted_devices for select
  using (auth.uid() = user_id);

create policy "devices: insert own"
  on public.trusted_devices for insert
  with check (auth.uid() = user_id);

create policy "devices: update own"
  on public.trusted_devices for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "devices: delete own"
  on public.trusted_devices for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Request introspection
-- PostgREST exposes inbound HTTP headers as a JSON GUC, which is how we read
-- the real client IP and user agent instead of trusting client-supplied values.
-- ---------------------------------------------------------------------------
create or replace function public.request_headers()
returns jsonb
language sql
stable
as $$
  select coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
$$;

create or replace function public.request_user_agent()
returns text
language sql
stable
as $$
  select coalesce(public.request_headers() ->> 'user-agent', 'unknown');
$$;

-- Coarse network prefix: IPv4 /16, or the first three IPv6 groups. Deliberately
-- blunt, so a phone moving between cell towers keeps the same fingerprint.
create or replace function public.request_ip_prefix()
returns text
language plpgsql
stable
as $$
declare
  raw_ip text;
begin
  raw_ip := btrim(split_part(coalesce(public.request_headers() ->> 'x-forwarded-for', ''), ',', 1));

  if raw_ip = '' then
    return 'unknown';
  elsif position(':' in raw_ip) > 0 then
    return split_part(raw_ip, ':', 1) || ':' || split_part(raw_ip, ':', 2) || ':' || split_part(raw_ip, ':', 3);
  else
    return split_part(raw_ip, '.', 1) || '.' || split_part(raw_ip, '.', 2);
  end if;
end;
$$;

create or replace function public.current_fingerprint()
returns text
language sql
stable
set search_path = public, extensions
as $$
  select encode(
    extensions.digest(public.request_user_agent() || '|' || public.request_ip_prefix(), 'sha256'),
    'hex'
  );
$$;

-- ---------------------------------------------------------------------------
-- device_check()
-- Runs right after every login. Reports whether this device is already trusted
-- and bumps last_seen_at when it is. Never registers a new device — that only
-- happens once step-up verification has passed.
-- ---------------------------------------------------------------------------
create or replace function public.device_check()
returns jsonb
language plpgsql
security invoker
set search_path = public, extensions
as $$
declare
  fp      text;
  matched public.trusted_devices%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  fp := public.current_fingerprint();

  update public.trusted_devices
     set last_seen_at = now()
   where user_id = auth.uid()
     and fingerprint = fp
  returning * into matched;

  return jsonb_build_object(
    'known',       matched.id is not null,
    'fingerprint', fp,
    'device_id',   matched.id,
    'label',       matched.label
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- device_trust(label) — called only after step-up verification succeeds.
-- ---------------------------------------------------------------------------
create or replace function public.device_trust(p_label text)
returns jsonb
language plpgsql
security invoker
set search_path = public, extensions
as $$
declare
  fp      text;
  saved   public.trusted_devices%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  fp := public.current_fingerprint();

  insert into public.trusted_devices (user_id, fingerprint, label, user_agent, ip_prefix)
  values (
    auth.uid(),
    fp,
    coalesce(nullif(btrim(p_label), ''), 'Unknown device'),
    public.request_user_agent(),
    public.request_ip_prefix()
  )
  on conflict (user_id, fingerprint)
  do update set last_seen_at = now(), label = excluded.label
  returning * into saved;

  return jsonb_build_object('device_id', saved.id, 'fingerprint', fp, 'label', saved.label);
end;
$$;

-- ---------------------------------------------------------------------------
-- Auto-create a profile for every new auth user, and backfill anyone who
-- signed up before this migration ran.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.profiles (id)
select u.id from auth.users u
on conflict (id) do nothing;
