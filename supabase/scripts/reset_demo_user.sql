-- ============================================================================
-- Demo reset helpers
--
-- Run in Supabase Dashboard -> SQL Editor. Pick ONE option and edit the email.
-- Everything here is destructive; there is no undo.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- OPTION A — full delete. Use before a clean demo run.
--
-- Every app table references auth.users with ON DELETE CASCADE, so this one
-- statement also removes: profiles, trusted_devices, pin_credentials,
-- accounts, transactions, security_events, and the user's passkeys.
--
-- The email becomes reusable immediately. Signing up again is treated as a new
-- user, so the "Confirm signup" template is sent rather than "Magic Link" —
-- both carry {{ .Token }}, so either way a code arrives.
-- ---------------------------------------------------------------------------
delete from auth.users
 where email = 'you@example.com';


-- ---------------------------------------------------------------------------
-- OPTION B — soft reset. Keeps the account and its passkeys, wipes everything
-- the demo walks through. Faster between runs because there is no email round
-- trip: you stay signed in.
--
-- Returns the user to: account-type chooser -> PIN setup -> briefing screen,
-- with the ledger re-seeded on next dashboard load.
-- ---------------------------------------------------------------------------
-- do $$
-- declare
--   uid uuid;
-- begin
--   select id into uid from auth.users where email = 'you@example.com';
--   if uid is null then
--     raise exception 'no user with that email';
--   end if;
--
--   delete from public.pin_credentials where user_id = uid;
--   delete from public.trusted_devices  where user_id = uid;
--   delete from public.security_events  where user_id = uid;
--   delete from public.transactions     where user_id = uid;
--   delete from public.accounts         where user_id = uid;
--
--   -- NULL account_type is what makes the app show the chooser again.
--   update public.profiles set account_type = null where id = uid;
-- end;
-- $$;


-- ---------------------------------------------------------------------------
-- OPTION C — reset only the PINs. Use to re-demo the two-PIN onboarding and
-- the one-time briefing screen without touching anything else.
-- ---------------------------------------------------------------------------
-- delete from public.pin_credentials
--  where user_id = (select id from auth.users where email = 'you@example.com');
--
-- -- Also clear the decoy ledger so pin_set() re-seeds it fresh.
-- delete from public.transactions
--  where dataset = 'duress'
--    and user_id = (select id from auth.users where email = 'you@example.com');


-- ---------------------------------------------------------------------------
-- Useful checks
-- ---------------------------------------------------------------------------
-- Who exists right now:
--   select email, created_at, last_sign_in_at from auth.users order by created_at desc;
--
-- Confirm a user is fully gone:
--   select count(*) from auth.users where email = 'you@example.com';
--
-- Locate the passkey table if you ever need to inspect it directly:
--   select table_name from information_schema.tables
--    where table_schema = 'auth' and table_name ilike '%passkey%';
