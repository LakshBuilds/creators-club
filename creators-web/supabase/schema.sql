-- Run in Supabase → SQL editor.

create extension if not exists "pgcrypto";

-- Creators (one row per connected Instagram account)
create table if not exists creators (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  handle text,
  niche text,
  ig_user_id text unique not null,
  ig_username text,
  ig_name text,
  ig_profile_picture_url text,
  ig_long_lived_token text,
  ig_token_expires_at timestamptz,
  followers_count int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  brief text not null,
  budget_inr int not null check (budget_inr >= 0),
  status text not null default 'open' check (status in ('open','closed','archived')),
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns on delete cascade,
  creator_id uuid not null references creators on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz not null default now(),
  unique (campaign_id, creator_id)
);

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications on delete cascade,
  video_url text not null,
  status text not null default 'submitted' check (status in ('submitted','revision','approved','paid')),
  notes text,
  created_at timestamptz not null default now()
);

-- Simple updated_at trigger for creators
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;

drop trigger if exists trg_creators_updated on creators;
create trigger trg_creators_updated before update on creators
  for each row execute function set_updated_at();

-- RLS on
alter table creators enable row level security;
alter table campaigns enable row level security;
alter table applications enable row level security;
alter table submissions enable row level security;

-- Creators: a signed-in user can read/update their own creator row.
drop policy if exists creators_select_self on creators;
create policy creators_select_self on creators
  for select using (auth.uid() = user_id);

drop policy if exists creators_update_self on creators;
create policy creators_update_self on creators
  for update using (auth.uid() = user_id);

-- Campaigns are public-read for MVP (tighten later)
drop policy if exists campaigns_select_all on campaigns;
create policy campaigns_select_all on campaigns for select using (true);

-- Applications: creator sees their own
drop policy if exists applications_select_self on applications;
create policy applications_select_self on applications
  for select using (
    creator_id in (select id from creators where user_id = auth.uid())
  );

-- Server-side writes use the service_role key (bypasses RLS), so no insert policies are needed here.
