-- ============================================================================
-- TrustPass — switch demo data to Indian rupees
--
-- Run in Supabase Dashboard -> SQL Editor. Idempotent.
--
-- Amounts are re-scaled rather than converted: a 3,200 salary reads wrong in
-- rupees regardless of the symbol in front of it. Still integer paise in a
-- bigint column, same as before.
-- ============================================================================

alter table public.accounts alter column currency set default 'INR';
update public.accounts set currency = 'INR' where currency <> 'INR';

-- ---------------------------------------------------------------------------
-- Real ledger — closing balance Rs 2,48,930.55
-- ---------------------------------------------------------------------------
create or replace function public.seed_demo_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid           uuid := auth.uid();
  existing      int;
  closing_paise constant bigint := 24893055;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  insert into public.accounts (user_id, dataset, name, balance_cents, currency)
  values (uid, 'real', 'Everyday Account', closing_paise, 'INR')
  on conflict (user_id, dataset)
  do update set balance_cents = excluded.balance_cents, currency = 'INR';

  select count(*) into existing
    from public.transactions
   where user_id = uid and dataset = 'real';

  if existing > 0 then
    return jsonb_build_object('seeded', false, 'reason', 'already seeded');
  end if;

  insert into public.transactions
    (user_id, dataset, merchant, category, amount_cents, occurred_at, status)
  values
    (uid, 'real', 'Meridian Technologies', 'Income',        18500000, now() - interval '2 days',  'settled'),
    (uid, 'real', 'Prestige Residency',    'Housing',       -4200000, now() - interval '3 days',  'settled'),
    (uid, 'real', 'BigBasket',             'Groceries',      -412750, now() - interval '4 days',  'settled'),
    (uid, 'real', 'Third Wave Coffee',     'Dining',          -32000, now() - interval '5 days',  'settled'),
    (uid, 'real', 'Namma Metro',           'Transport',       -18000, now() - interval '7 days',  'settled'),
    (uid, 'real', 'Spotify India',         'Subscriptions',   -11900, now() - interval '9 days',  'settled'),
    (uid, 'real', 'Reliance Fresh',        'Groceries',      -287540, now() - interval '12 days', 'settled'),
    (uid, 'real', 'Apollo Pharmacy',       'Health',          -94500, now() - interval '15 days', 'settled'),
    (uid, 'real', 'Recurring Deposit',     'Transfer',      -2500000, now() - interval '18 days', 'settled'),
    (uid, 'real', 'Cult.fit',              'Health',         -180000, now() - interval '21 days', 'settled'),
    (uid, 'real', 'Toit Brewpub',          'Dining',         -246000, now() - interval '24 days', 'settled'),
    (uid, 'real', 'BESCOM Electricity',    'Utilities',      -318400, now() - interval '28 days', 'settled'),
    (uid, 'real', 'Meridian Technologies', 'Income',        18500000, now() - interval '32 days', 'settled'),
    (uid, 'real', 'Prestige Residency',    'Housing',       -4200000, now() - interval '33 days', 'settled'),
    (uid, 'real', 'Airtel Postpaid',       'Utilities',       -79900, now() - interval '36 days', 'settled'),
    (uid, 'real', 'BigBasket',             'Groceries',      -355620, now() - interval '41 days', 'settled'),
    (uid, 'real', 'Myntra',                'Shopping',       -489900, now() - interval '47 days', 'settled'),
    (uid, 'real', 'Myntra',                'Refund',          129900, now() - interval '52 days', 'settled'),
    (uid, 'real', 'Uber India',            'Transport',       -47300, now() - interval '61 days', 'settled'),
    (uid, 'real', 'Meridian Technologies', 'Income',        18500000, now() - interval '63 days', 'settled');

  return jsonb_build_object('seeded', true, 'transactions', 20, 'balance_paise', closing_paise);
end;
$$;

-- ---------------------------------------------------------------------------
-- Decoy ledger — Rs 8,412.60. Low but not empty, small everyday amounts,
-- nothing round. Must read as a thin current account, not a placeholder.
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

  insert into public.accounts (user_id, dataset, name, balance_cents, currency)
  values (uid, 'duress', 'Everyday Account', 841260, 'INR')
  on conflict (user_id, dataset)
  do update set balance_cents = excluded.balance_cents, currency = 'INR';

  select count(*) into existing
    from public.transactions
   where user_id = uid and dataset = 'duress';

  if existing > 0 then
    return jsonb_build_object('seeded', false);
  end if;

  insert into public.transactions
    (user_id, dataset, merchant, category, amount_cents, occurred_at, status)
  values
    (uid, 'duress', 'Reliance Fresh',   'Groceries', -68450, now() - interval '1 day',   'settled'),
    (uid, 'duress', 'Namma Metro',      'Transport',  -4500, now() - interval '2 days',  'settled'),
    (uid, 'duress', 'Chai Point',       'Dining',     -13000, now() - interval '4 days', 'settled'),
    (uid, 'duress', 'Airtel Prepaid',   'Utilities',  -23900, now() - interval '6 days', 'settled'),
    (uid, 'duress', 'Reliance Fresh',   'Groceries',  -91230, now() - interval '9 days', 'settled'),
    (uid, 'duress', 'Sunrise Laundry',  'Services',   -34000, now() - interval '13 days','settled'),
    (uid, 'duress', 'Part-time Payroll','Income',    1850000, now() - interval '16 days','settled'),
    (uid, 'duress', 'Namma Metro',      'Transport',  -4500, now() - interval '19 days', 'settled'),
    (uid, 'duress', 'Reliance Fresh',   'Groceries',  -76840, now() - interval '23 days','settled'),
    (uid, 'duress', 'Apollo Pharmacy',  'Health',     -28600, now() - interval '27 days','settled'),
    (uid, 'duress', 'Chai Point',       'Dining',     -13000, now() - interval '31 days','settled');

  return jsonb_build_object('seeded', true);
end;
$$;

revoke all on function public.seed_demo_data()   from public;
revoke all on function public.seed_duress_data() from public;
grant execute on function public.seed_demo_data()   to authenticated;
grant execute on function public.seed_duress_data() to authenticated;

-- ---------------------------------------------------------------------------
-- Clear dollar-era rows so the functions above re-seed on next dashboard load.
-- Safe to re-run: after the first pass there is nothing left to delete.
-- ---------------------------------------------------------------------------
delete from public.transactions
 where merchant in (
   'Northwind Payroll', 'Blue Ridge Apartments', 'Corner Market', 'Daybreak Coffee',
   'Metro Transit', 'Lumen Streaming', 'Harbour Pharmacy', 'Savings Transfer',
   'Onyx Fitness', 'Cedar & Vine', 'Municipal Utilities', 'Atlas Mobile',
   'Meridian Outfitters', 'Kestrel Rideshare', 'Riverside Laundry'
 );
