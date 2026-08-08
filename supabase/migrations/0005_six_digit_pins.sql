-- ============================================================================
-- TrustPass — 6-digit PIN onboarding
--
-- Run in Supabase Dashboard -> SQL Editor -> New query. Idempotent.
--
--  * renames real_pin_hash -> pin_hash
--  * moves PIN length from 4 to 6 digits
--  * rejects sequential and repeated PINs server-side
--
-- Both hashes are written by a single plpgsql function, which runs as one
-- transaction — a partial write leaving a real PIN with no duress PIN would be
-- worse than no enrolment at all.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Column rename (guarded so the migration is re-runnable).
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name   = 'pin_credentials'
       and column_name  = 'real_pin_hash'
  ) then
    alter table public.pin_credentials rename column real_pin_hash to pin_hash;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Shared weak-PIN check. Client-side validation is for fast feedback only;
-- this is the authoritative one, since the RPC is directly callable.
-- ---------------------------------------------------------------------------
create or replace function public.pin_is_weak(p_pin text)
returns boolean
language sql
immutable
as $$
  select
    p_pin !~ '^\d{6}$'
    -- all six digits identical: 111111
    or p_pin ~ '^(.)\1{5}$'
    -- straight runs, ascending or descending
    or p_pin in (
      '012345', '123456', '234567', '345678', '456789',
      '987654', '876543', '765432', '654321', '543210'
    );
$$;

-- ---------------------------------------------------------------------------
-- pin_set(pin, duress) — enrols both in one transaction.
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

  if p_real !~ '^\d{6}$' or p_duress !~ '^\d{6}$' then
    raise exception 'PIN must be exactly 6 digits';
  end if;

  if public.pin_is_weak(p_real) or public.pin_is_weak(p_duress) then
    raise exception 'PIN is too easy to guess';
  end if;

  if p_real = p_duress then
    raise exception 'The two PINs must be different';
  end if;

  -- bcrypt, cost 10, independent salts. Both columns land in the same
  -- statement, so there is no window where only one is set.
  insert into public.pin_credentials (user_id, pin_hash, duress_pin_hash)
  values (
    uid,
    extensions.crypt(p_real,   extensions.gen_salt('bf', 10)),
    extensions.crypt(p_duress, extensions.gen_salt('bf', 10))
  )
  on conflict (user_id) do update
    set pin_hash        = excluded.pin_hash,
        duress_pin_hash = excluded.duress_pin_hash,
        failed_attempts = 0,
        locked_until    = null,
        updated_at      = now();

  perform public.seed_duress_data();

  return jsonb_build_object('configured', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- pin_verify(pin) — unchanged behaviour, updated for the renamed column.
-- The two success paths remain byte-for-byte symmetric; see 0003 for why.
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
  real_match   := (cred.pin_hash        = extensions.crypt(p_pin, cred.pin_hash));
  duress_match := (cred.duress_pin_hash = extensions.crypt(p_pin, cred.duress_pin_hash));

  if real_match or duress_match then
    update public.pin_credentials
       set failed_attempts = 0, locked_until = null, updated_at = now()
     where user_id = uid;

    ds := case when duress_match then 'duress' else 'real' end;

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

  attempts := cred.failed_attempts + 1;

  insert into public.security_events (user_id, event_type, severity, ip_prefix, user_agent)
  values (uid, 'pin_failed', 'info',
          public.request_ip_prefix(), public.request_user_agent());

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

revoke all on function public.pin_is_weak(text)     from public;
revoke all on function public.pin_set(text, text)   from public;
revoke all on function public.pin_verify(text)      from public;

grant execute on function public.pin_is_weak(text)   to authenticated;
grant execute on function public.pin_set(text, text) to authenticated;
grant execute on function public.pin_verify(text)    to authenticated;
