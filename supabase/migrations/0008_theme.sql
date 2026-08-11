-- ============================================================================
-- TrustPass — Phase 8: appearance preference
--
-- `theme` stores the user's Light/Dark choice so it survives sign-outs and
-- follows them across devices. NULL means "not chosen yet" — the app falls
-- back to the device default (dark).
--
-- Run in Supabase Dashboard -> SQL Editor -> New query.
-- Idempotent and non-destructive: re-running will not drop existing rows.
-- ============================================================================

alter table public.profiles
  add column if not exists theme text;

alter table public.profiles
  drop constraint if exists profiles_theme_check;

alter table public.profiles
  add constraint profiles_theme_check check (theme in ('dark', 'light'));
