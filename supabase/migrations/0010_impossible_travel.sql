-- ============================================================================
-- TrustPass — Phase 8: impossible-travel detection
--
-- Run in Supabase Dashboard -> SQL Editor -> New query. Idempotent.
--
-- At every completed sign-in the signin-verify edge function geolocates the
-- client IP, stores the location here, and compares it against the previous
-- sign-in. If the implied speed exceeds any commercial flight (Haversine
-- distance / elapsed time > 900 km/h) it is physically impossible for the same
-- person to be responsible for both — so a critical security event is raised
-- and the client is asked to re-verify with the passkey before continuing.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- signin_locations — one row per completed sign-in.
-- Readable by its owner; written only by the edge function (service role).
-- ---------------------------------------------------------------------------
create table if not exists public.signin_locations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  city       text,
  region     text,
  country    text,
  lat        double precision,
  lon        double precision,
  ip_prefix  text,
  created_at timestamptz not null default now()
);

create index if not exists signin_locations_user_created_idx
  on public.signin_locations (user_id, created_at desc);

alter table public.signin_locations enable row level security;

drop policy if exists "locations: read own" on public.signin_locations;
create policy "locations: read own"
  on public.signin_locations for select
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- security_events.detail — event-specific payload (e.g. the two locations and
-- the computed distance on an impossible-travel event). Null for everything
-- else, so existing rows and reads are unaffected.
-- ---------------------------------------------------------------------------
alter table public.security_events
  add column if not exists detail jsonb;

-- ---------------------------------------------------------------------------
-- log_security_event(type, detail) — the only client-visible write path into
-- security_events, and deliberately narrow: the feed is otherwise server-only
-- (pin functions + edge functions) so a compromised session can't fabricate
-- alerts. Only resolution events for risks the client was asked to confirm are
-- whitelisted, and severity is pinned to 'info'.
-- ---------------------------------------------------------------------------
create or replace function public.log_security_event(p_event_type text, p_detail jsonb default null)
returns void
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

  if p_event_type not in ('impossible_travel_verified') then
    raise exception 'event type not permitted';
  end if;

  insert into public.security_events (user_id, event_type, severity, detail, ip_prefix, user_agent)
  values (
    uid,
    p_event_type,
    'info',
    p_detail,
    public.request_ip_prefix(),
    public.request_user_agent()
  );
end;
$$;

revoke all on function public.log_security_event(text, jsonb) from public;
grant execute on function public.log_security_event(text, jsonb) to authenticated;
