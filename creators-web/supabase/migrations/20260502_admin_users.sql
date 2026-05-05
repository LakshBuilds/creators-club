-- Admin accounts decoupled from Supabase Auth — JWT-cookie based session.
-- Service role manages this table; RLS denies everything else.
create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  name text,
  created_at timestamptz not null default now()
);

alter table admin_users enable row level security;
drop policy if exists admin_users_no_anon on admin_users;
create policy admin_users_no_anon on admin_users
  for all using (false) with check (false);
