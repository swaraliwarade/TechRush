-- ============================================================================
-- TrustPass — Phase 3: accounts + transaction history
--
-- Run in Supabase Dashboard -> SQL Editor -> New query. Idempotent.
--
-- The `dataset` column exists from the start so phase 4's duress view is a
-- filter over the same tables rather than a parallel schema.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- accounts — one row per (user, dataset)
-- Money is stored in minor units (cents) as bigint. Never float: binary
-- floating point cannot represent 0.10 exactly and the rounding drift shows up
-- in balances.
-- ---------------------------------------------------------------------------
create table if not exists public.accounts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  dataset       text not null default 'real' check (dataset in ('real', 'duress')),
  name          text not null default 'Everyday Account',
  balance_cents bigint not null default 0,
  currency      text not null default 'USD',
  created_at    timestamptz not null default now(),
  unique (user_id, dataset)
);

alter table public.accounts enable row level security;

drop policy if exists "accounts: read own" on public.accounts;
create policy "accounts: read own"
  on public.accounts for select
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- transactions — amount_cents is signed: negative = money out.
-- ---------------------------------------------------------------------------
create table if not exists public.transactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  dataset      text not null default 'real' check (dataset in ('real', 'duress')),
  merchant     text not null,
  category     text not null,
  amount_cents bigint not null,
  occurred_at  timestamptz not null default now(),
  status       text not null default 'settled' check (status in ('settled', 'pending')),
  created_at   timestamptz not null default now()
);

create index if not exists transactions_user_dataset_idx
  on public.transactions (user_id, dataset, occurred_at desc);

alter table public.transactions enable row level security;

drop policy if exists "transactions: read own" on public.transactions;
create policy "transactions: read own"
  on public.transactions for select
  using (auth.uid() = user_id);

-- Note: there are deliberately no insert/update/delete policies on either
-- table. Rows arrive only through seed_demo_data(), which is SECURITY DEFINER
-- and therefore the single writer — a compromised client token cannot fabricate
-- balances or transaction history.

-- ---------------------------------------------------------------------------
-- seed_demo_data() — idempotent per user. Called by the app on first load of
-- the dashboard. Spreads 20 transactions across the last ~90 days with a
-- realistic monthly rhythm (salary in, rent out, everyday spend between).
--
-- SECURITY DEFINER because the tables above expose no INSERT policy: this
-- function is the only sanctioned writer. It is safe because every write is
-- hard-scoped to auth.uid(), which reads the caller's JWT claim and is
-- unaffected by the elevated execution role. search_path is pinned empty and
-- every object reference is schema-qualified, so nothing can be shadowed.
-- ---------------------------------------------------------------------------
create or replace function public.seed_demo_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid            uuid := auth.uid();
  existing       int;
  opening_cents  bigint;
  total_cents    bigint;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select count(*) into existing
    from public.transactions
   where user_id = uid and dataset = 'real';

  if existing > 0 then
    return jsonb_build_object('seeded', false, 'reason', 'already seeded');
  end if;

  insert into public.transactions
    (user_id, dataset, merchant, category, amount_cents, occurred_at, status)
  values
    (uid, 'real', 'Northwind Payroll',      'Income',        320000, now() - interval '2 days',  'settled'),
    (uid, 'real', 'Blue Ridge Apartments',  'Housing',      -145000, now() - interval '3 days',  'settled'),
    (uid, 'real', 'Corner Market',          'Groceries',      -8425, now() - interval '4 days',  'settled'),
    (uid, 'real', 'Daybreak Coffee',        'Dining',          -525, now() - interval '5 days',  'settled'),
    (uid, 'real', 'Metro Transit',          'Transport',      -2800, now() - interval '7 days',  'settled'),
    (uid, 'real', 'Lumen Streaming',        'Subscriptions',  -1599, now() - interval '9 days',  'settled'),
    (uid, 'real', 'Corner Market',          'Groceries',     -11240, now() - interval '12 days', 'settled'),
    (uid, 'real', 'Harbour Pharmacy',       'Health',         -2760, now() - interval '15 days', 'settled'),
    (uid, 'real', 'Savings Transfer',       'Transfer',      -40000, now() - interval '18 days', 'settled'),
    (uid, 'real', 'Onyx Fitness',           'Health',         -3200, now() - interval '21 days', 'settled'),
    (uid, 'real', 'Cedar & Vine',           'Dining',         -6420, now() - interval '24 days', 'settled'),
    (uid, 'real', 'Municipal Utilities',    'Utilities',      -8940, now() - interval '28 days', 'settled'),
    (uid, 'real', 'Northwind Payroll',      'Income',        320000, now() - interval '32 days', 'settled'),
    (uid, 'real', 'Blue Ridge Apartments',  'Housing',      -145000, now() - interval '33 days', 'settled'),
    (uid, 'real', 'Atlas Mobile',           'Utilities',      -4500, now() - interval '36 days', 'settled'),
    (uid, 'real', 'Corner Market',          'Groceries',      -9615, now() - interval '41 days', 'settled'),
    (uid, 'real', 'Meridian Outfitters',    'Shopping',      -11235, now() - interval '47 days', 'settled'),
    (uid, 'real', 'Meridian Outfitters',    'Refund',          2399, now() - interval '52 days', 'settled'),
    (uid, 'real', 'Kestrel Rideshare',      'Transport',      -1840, now() - interval '61 days', 'settled'),
    (uid, 'real', 'Northwind Payroll',      'Income',        320000, now() - interval '63 days', 'settled');

  select coalesce(sum(amount_cents), 0) into total_cents
    from public.transactions
   where user_id = uid and dataset = 'real';

  -- Pick the opening balance so the closing balance lands on a tidy figure.
  opening_cents := 1230411 - total_cents;

  insert into public.accounts (user_id, dataset, name, balance_cents, currency)
  values (uid, 'real', 'Everyday Account', 1230411, 'USD')
  on conflict (user_id, dataset)
  do update set balance_cents = excluded.balance_cents;

  return jsonb_build_object(
    'seeded', true,
    'transactions', 20,
    'opening_cents', opening_cents,
    'balance_cents', 1230411
  );
end;
$$;

-- Functions are executable by PUBLIC by default. An anonymous caller would only
-- hit the 'not authenticated' guard, but narrow the grant anyway.
revoke all on function public.seed_demo_data() from public;
grant execute on function public.seed_demo_data() to authenticated;
