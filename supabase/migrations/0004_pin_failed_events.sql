-- ============================================================================
-- TrustPass — Phase 6a: log individual failed PIN attempts
--
-- Run in Supabase Dashboard -> SQL Editor -> New query. Idempotent.
--
-- pin_credentials.failed_attempts is a streak counter that resets on every
-- success, so it cannot answer "how many failures today". This replaces
-- pin_verify() so each wrong attempt leaves its own audit row.
--
-- Note this does NOT weaken the duress guarantees from 0003: the two paths that
-- must be indistinguishable are the two SUCCESS paths, and those are untouched.
-- A failure is already distinguishable from a success by its return value.
-- ============================================================================

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

  -- Wrong PIN. One audit row per attempt, so "failed attempts today" is a real
  -- count rather than a guess derived from the streak counter.
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

revoke all on function public.pin_verify(text) from public;
grant execute on function public.pin_verify(text) to authenticated;
