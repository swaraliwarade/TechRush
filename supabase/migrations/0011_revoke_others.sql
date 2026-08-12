-- ============================================================================
-- TrustPass — sign out of all other devices
--
-- Run in Supabase Dashboard -> SQL Editor -> New query. Idempotent.
--
-- device_revoke_others() deletes every trusted device except the one making
-- the call. The current device is identified server-side from the request
-- headers — the same fingerprint device_check() uses — so the caller cannot
-- pass an arbitrary device id to exempt. Returns how many devices were
-- revoked. Everything stays within RLS (delete-own), so no definer rights are
-- needed.
-- ============================================================================

create or replace function public.device_revoke_others()
returns integer
language plpgsql
security invoker
set search_path = public, extensions
as $$
declare
  fp      text;
  revoked integer;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  fp := public.current_fingerprint();

  delete from public.trusted_devices
   where user_id = auth.uid()
     and fingerprint <> fp;

  get diagnostics revoked = row_count;
  return revoked;
end;
$$;

revoke all on function public.device_revoke_others() from public;
grant execute on function public.device_revoke_others() to authenticated;
