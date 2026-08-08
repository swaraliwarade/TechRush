-- ============================================================================
-- TrustPass — Phase 4: PIN gate, duress mode, lockout, security events
--
-- Run in Supabase Dashboard -> SQL Editor -> New query. Idempotent.
--
-- Threat model note: the real and duress PINs must be indistinguishable to an
-- observer who is watching the victim's screen AND to one inspecting network
-- traffic or timing. Every design choice below follows from that.
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- pin_credentials
--
-- RLS is enabled with NO policies at all. That is deliberate: it means no
-- client can ever SELECT a PIN hash, not even its own. Every read and write
-- goes through the SECURITY DEFINER functions below.
-- ---------------------------------------------------------------------------
create table if not exists public.pin_credentials (
  user_id         uuid primary key references auth.users (id) on delete cascade,
  real_pin_hash   text not null,
  duress_pin_hash text not null,
  failed_attempts int not null default 0,
  locked_until    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.pin_credentials enable row level security;

-- ---------------------------------------------------------------------------
-- security_events — the feed phase 5 subscribes to.
-- Readable by its owner; writable only by the definer functions below.
-- ---------------------------------------------------------------------------
create table if not exists public.security_events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  event_type   text not null,
  severity     text not null default 'info' check (severity in ('info', 'warning', 'critical')),
  ip_prefix    text,
  user_agent   text,
  created_at   timestamptz not null default now()
);

create index if not exists security_events_created_idx
  on public.security_events (created_at desc);

alter table public.security_events enable row level security;

drop policy if exists "events: read own" on public.security_events;
create policy "events: read own"
  on public.security_events for select
  using (auth.uid() = user_id);

-- Realtime needs the table in the publication to emit INSERT payloads.
do $$
begin
  alter publication supabase_realtime add table public.security_events;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

-- ---------------------------------------------------------------------------
-- pin_set(real, duress) — enrols both PINs and seeds the duress dataset.
-- ---------------------------------------------------------------------------
create or replace function public.pin_set(p_real text, p_duress text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if p_real !~ '^\d{4}$' or p_duress !~ '^\d{4}$' then
    raise exception 'PIN must be exactly 4 digits';
  end if;

  if p_real = p_duress then
    raise exception 'Duress PIN must differ from your real PIN';
  end if;

  -- bcrypt, cost 10. Separate salts, so identical PINs would still produce
  -- different hashes and the two columns reveal nothing by comparison.
  insert into public.pin_credentials (user_id, real_pin_hash, duress_pin_hash)
  values (
    uid,
    extensions.crypt(p_real,   extensions.gen_salt('bf', 10)),
    extensions.crypt(p_duress, extensions.gen_salt('bf', 10))
  )
  on conflict (user_id) do update
    set real_pin_hash   = excluded.real_pin_hash,
        duress_pin_hash = excluded.duress_pin_hash,
        failed_attempts = 0,
        locked_until    = null,
        updated_at      = now();

  perform public.seed_duress_data();

  return jsonb_build_object('configured', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- seed_duress_data() — the decoy ledger.
--
-- Plausibly dull: a low but not empty balance, small everyday amounts, nothing
-- round, no large transfers. It has to read as someone's thin current account,
-- not as a placeholder.
-- ---------------------------------------------------------------------------
create or replace function public.seed_duress_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid      uuid := auth.uid();
  existing int;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  -- Upsert the account first and unconditionally. If this sat behind the
  -- early return below, a partial seed could leave duress transactions with no
  -- duress account, and pin_verify would hand back a null balance — which is
  -- exactly the kind of visible anomaly the duress path must never produce.
  insert into public.accounts (user_id, dataset, name, balance_cents, currency)
  values (uid, 'duress', 'Everyday Account', 41268, 'USD')
  on conflict (user_id, dataset)
  do update set balance_cents = excluded.balance_cents;

  select count(*) into existing
    from public.transactions
   where user_id = uid and dataset = 'duress';

  if existing > 0 then
    return jsonb_build_object('seeded', false);
  end if;

  insert into public.transactions
    (user_id, dataset, merchant, category, amount_cents, occurred_at, status)
  values
    (uid, 'duress', 'Corner Market',       'Groceries',   -2317, now() - interval '1 day',   'settled'),
    (uid, 'duress', 'Metro Transit',       'Transport',    -275, now() - interval '2 days',  'settled'),
    (uid, 'duress', 'Daybreak Coffee',     'Dining',       -485, now() - interval '4 days',  'settled'),
    (uid, 'duress', 'Atlas Mobile',        'Utilities',   -1500, now() - interval '6 days',  'settled'),
    (uid, 'duress', 'Corner Market',       'Groceries',   -3142, now() - interval '9 days',  'settled'),
    (uid, 'duress', 'Riverside Laundry',   'Services',    -1250, now() - interval '13 days', 'settled'),
    (uid, 'duress', 'Part-time Payroll',   'Income',      68400, now() - interval '16 days', 'settled'),
    (uid, 'duress', 'Metro Transit',       'Transport',    -275, now() - interval '19 days', 'settled'),
    (uid, 'duress', 'Corner Market',       'Groceries',   -2884, now() - interval '23 days', 'settled'),
    (uid, 'duress', 'Harbour Pharmacy',    'Health',       -940, now() - interval '27 days', 'settled'),
    (uid, 'duress', 'Daybreak Coffee',     'Dining',       -485, now() - interval '31 days', 'settled');

  return jsonb_build_object('seeded', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- pin_status() — what the client may safely know before unlocking.
-- Never reveals anything about the PIN values themselves.
-- ---------------------------------------------------------------------------
create or replace function public.pin_status()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid  uuid := auth.uid();
  cred public.pin_credentials%rowtype;
  max_attempts constant int := 4;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select * into cred from public.pin_credentials where user_id = uid;

  if cred.user_id is null then
    return jsonb_build_object('configured', false, 'locked', false, 'attempts_remaining', max_attempts);
  end if;

  return jsonb_build_object(
    'configured',         true,
    'locked',             cred.locked_until is not null and cred.locked_until > now(),
    'locked_until',       cred.locked_until,
    'attempts_remaining', greatest(max_attempts - cred.failed_attempts, 0)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- pin_verify(pin) — the core of the duress feature.
--
-- Three properties this function must hold:
--
--  1. TIMING. Both bcrypt comparisons always run, even once the first matches.
--     Short-circuiting would make a duress hit measurably slower than a real
--     one (two hashes vs one, ~100ms at cost 10) and leak the mode.
--
--  2. PAYLOAD. The response never names which dataset it came from. It carries
--     the ledger itself, so a coerced user's screen and the JSON behind it look
--     the same either way. A `dataset: 'duress'` field would defeat the whole
--     feature for anyone with devtools open.
--
--  3. SIDE EFFECTS. Both success paths write exactly one security_events row,
--     so the write cost cannot distinguish them either. Only event_type and
--     severity differ, and those are never returned to the caller.
-- ---------------------------------------------------------------------------
create or replace function public.pin_verify(p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid          uuid := auth.uid();
  cred         public.pin_credentials%rowtype;
  real_match   boolean;
  duress_match boolean;
  ds           text;
  acct         public.accounts%rowtype;
  txns         jsonb;
  attempts     int;
  max_attempts constant int := 4;
  lockout      constant interval := interval '15 minutes';
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select * into cred from public.pin_credentials where user_id = uid for update;

  if cred.user_id is null then
    return jsonb_build_object('ok', false, 'configured', false, 'locked', false,
                              'attempts_remaining', max_attempts);
  end if;

  if cred.locked_until is not null and cred.locked_until > now() then
    return jsonb_build_object('ok', false, 'configured', true, 'locked', true,
                              'locked_until', cred.locked_until, 'attempts_remaining', 0);
  end if;

  -- Both comparisons, unconditionally. Do not refactor into an OR expression:
  -- plpgsql short-circuits and the timing difference becomes observable.
  real_match   := (cred.real_pin_hash   = extensions.crypt(p_pin, cred.real_pin_hash));
  duress_match := (cred.duress_pin_hash = extensions.crypt(p_pin, cred.duress_pin_hash));

  if real_match or duress_match then
    update public.pin_credentials
       set failed_attempts = 0, locked_until = null, updated_at = now()
     where user_id = uid;

    ds := case when duress_match then 'duress' else 'real' end;

    -- Exactly one row on either path.
    insert into public.security_events (user_id, event_type, severity, ip_prefix, user_agent)
    values (
      uid,
      case when duress_match then 'duress_pin_used' else 'vault_unlocked' end,
      case when duress_match then 'critical'        else 'info'           end,
      public.request_ip_prefix(),
      public.request_user_agent()
    );

    select * into acct from public.accounts where user_id = uid and dataset = ds;

    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id',           t.id,
          'merchant',     t.merchant,
          'category',     t.category,
          'amount_cents', t.amount_cents,
          'occurred_at',  t.occurred_at,
          'status',       t.status
        )
        order by t.occurred_at desc
      ),
      '[]'::jsonb
    )
    into txns
    from public.transactions t
    where t.user_id = uid and t.dataset = ds;

    -- Note the absence of any dataset marker in this payload.
    return jsonb_build_object(
      'ok',                 true,
      'configured',         true,
      'locked',             false,
      'attempts_remaining', max_attempts,
      'account', jsonb_build_object(
        'id',            acct.id,
        'name',          acct.name,
        'balance_cents', acct.balance_cents,
        'currency',      acct.currency
      ),
      'transactions', txns
    );
  end if;

  -- Wrong PIN.
  attempts := cred.failed_attempts + 1;

  if attempts >= max_attempts then
    update public.pin_credentials
       set failed_attempts = attempts, locked_until = now() + lockout, updated_at = now()
     where user_id = uid;

    insert into public.security_events (user_id, event_type, severity, ip_prefix, user_agent)
    values (uid, 'pin_lockout', 'warning',
            public.request_ip_prefix(), public.request_user_agent());

    return jsonb_build_object('ok', false, 'configured', true, 'locked', true,
                              'locked_until', now() + lockout, 'attempts_remaining', 0);
  end if;

  update public.pin_credentials
     set failed_attempts = attempts, updated_at = now()
   where user_id = uid;

  return jsonb_build_object('ok', false, 'configured', true, 'locked', false,
                            'attempts_remaining', max_attempts - attempts);
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants: these functions are the only sanctioned access path, so keep them
-- off PUBLIC.
-- ---------------------------------------------------------------------------
revoke all on function public.pin_set(text, text)   from public;
revoke all on function public.pin_verify(text)      from public;
revoke all on function public.pin_status()          from public;
revoke all on function public.seed_duress_data()    from public;

grant execute on function public.pin_set(text, text) to authenticated;
grant execute on function public.pin_verify(text)    to authenticated;
grant execute on function public.pin_status()        to authenticated;
grant execute on function public.seed_duress_data()  to authenticated;
