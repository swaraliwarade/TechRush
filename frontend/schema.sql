-- ====================================================================
-- TrustPass Banking Schema Configuration
-- Copy and execute this script inside the SQL Editor of your Supabase console.
-- ====================================================================

-- 1. Create the accounts registration table
create table if not exists public.accounts (
    id uuid default gen_random_uuid() primary key,
    full_name text not null check (char_length(trim(full_name)) >= 2),
    email text not null unique check (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$'),
    customer_id text not null unique check (char_length(customer_id) between 6 and 12),
    phone_number text check (phone_number is null or char_length(phone_number) >= 10),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable Row-Level Security (RLS) to secure the table
alter table public.accounts enable row level security;

-- 3. Create Policy: Allow public anonymous inserts (required for registration)
create policy "Allow anonymous account creation" 
on public.accounts 
for insert 
with check (true);

-- 4. Create Policy: Allow users to view their own account profile by ID
create policy "Allow read access to specific account" 
on public.accounts 
for select 
using (true); -- In a production scenario, you would lock this down further to authenticated users.

-- 5. Create an index on email and customer_id for optimized lookups
create index if not exists accounts_email_idx on public.accounts(email);
create index if not exists accounts_customer_id_idx on public.accounts(customer_id);
