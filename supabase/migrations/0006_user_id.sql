-- ============================================================================
-- TrustPass — public User ID on profiles
--
-- Run in Supabase Dashboard -> SQL Editor. Idempotent.
--
-- Format: 10 characters — one uppercase letter A-Z, then 9 digits (2.6e10
-- combinations). Assigned server-side and immutable once set: the client never
-- proposes a value, so generation logic stays out of the bundle and two
-- concurrent signups cannot race into the same ID.
--
-- Touches profiles only. pin_credentials references auth.users directly, so the
-- PIN framework in 0003/0005 is unaffected by anything here.
-- ============================================================================

alter table public.profiles
  add column if not exists user_id text;

do $$
begin
  alter table public.profiles
    add constraint profiles_user_id_format check (user_id ~ '^[A-Z][0-9]{9}$');
exception
  when duplicate_object then null;
end;
$$;

-- Partial unique index: many profiles may sit at NULL before assignment.
create unique index if not exists profiles_user_id_key
  on public.profiles (user_id)
  where user_id is not null;

-- ---------------------------------------------------------------------------
-- Candidate generator. Not security definer — it only returns a random string
-- and is never the authority on uniqueness; the unique index is.
-- ---------------------------------------------------------------------------
create or replace function public.generate_user_id()
returns text
language sql
volatile
set search_path = ''
as $$
  select chr(65 + (floor(random() * 26))::int)
      || lpad((floor(random() * 1000000000))::bigint::text, 9, '0');
$$;

-- ---------------------------------------------------------------------------
-- user_id is server-assigned. profiles carries an "update own" RLS policy that
-- covers every column, so without this trigger a client could simply PATCH
-- itself a chosen ID or overwrite someone else's on a collision.
--
-- ensure_user_id() sets a transaction-local flag to authorise its own write.
-- ---------------------------------------------------------------------------
create or replace function public.protect_user_id()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  authorised boolean :=
    coalesce(current_setting('trustpass.assigning_user_id', true), '') = 'on';
begin
  if tg_op = 'INSERT' then
    if new.user_id is not null and not authorised then
      raise exception 'user_id is assigned by the server and cannot be set directly';
    end if;
  elsif new.user_id is distinct from old.user_id and not authorised then
    raise exception 'user_id is assigned by the server and cannot be changed';
  end if;

  return new;
end;
$$;

-- Covers INSERT as well as UPDATE: the "insert own" policy on profiles would
-- otherwise let a client create its own row carrying a self-chosen ID.
drop trigger if exists profiles_protect_user_id on public.profiles;
create trigger profiles_protect_user_id
  before insert or update on public.profiles
  for each row execute function public.protect_user_id();

-- ---------------------------------------------------------------------------
-- ensure_user_id() — idempotent. Returns the caller's existing ID, or allocates
-- one, retrying on collision until the unique index accepts a candidate.
-- ---------------------------------------------------------------------------
create or replace function public.ensure_user_id()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid       uuid := auth.uid();
  existing  text;
  candidate text;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select p.user_id into existing from public.profiles p where p.id = uid;
  if existing is not null then
    return jsonb_build_object('user_id', existing, 'created', false);
  end if;

  perform set_config('trustpass.assigning_user_id', 'on', true);

  for _attempt in 1..12 loop
    candidate := public.generate_user_id();
    begin
      insert into public.profiles (id, user_id)
      values (uid, candidate)
      on conflict (id) do update
        set user_id = candidate, updated_at = now();

      return jsonb_build_object('user_id', candidate, 'created', true);
    exception
      when unique_violation then
        -- Candidate already taken; loop and draw another.
        null;
    end;
  end loop;

  raise exception 'could not allocate a unique user id';
end;
$$;

revoke all on function public.ensure_user_id()   from public;
revoke all on function public.generate_user_id() from public;
grant execute on function public.ensure_user_id() to authenticated;
