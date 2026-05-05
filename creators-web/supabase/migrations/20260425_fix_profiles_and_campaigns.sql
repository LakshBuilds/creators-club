-- Run in Supabase → SQL. Fixes: missing profile row (FK 23503), missing campaigns.deadline (42703).

-- 1) Let signed-in users insert their own profile row (trigger or upsert on mobile)
drop policy if exists p_insert_self on profiles;
create policy p_insert_self on profiles
  for insert with check (id = auth.uid());

-- 2) campaigns.deadline (referenced by mobile + web)
alter table public.campaigns
  add column if not exists deadline timestamptz;
