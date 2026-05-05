-- Run in Supabase → SQL editor.

create extension if not exists "pgcrypto";

-- App profile mirrors auth.users; used to distinguish roles (admin vs creator).
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  email text unique,
  full_name text,
  role text not null default 'creator' check (role in ('admin','creator')),
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Creator social profile (linked to profile). Instagram token lives here.
create table if not exists creators (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references profiles on delete cascade,
  handle text,
  niche text,
  bio text,
  ig_user_id text unique,
  ig_username text,
  ig_name text,
  ig_profile_picture_url text,
  ig_long_lived_token text,
  ig_token_expires_at timestamptz,
  followers_count int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  website text,
  logo_url text,
  created_at timestamptz not null default now()
);

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references brands on delete set null,
  title text not null,
  brief text not null,
  budget_inr int not null check (budget_inr >= 0),
  deliverable text,
  deadline timestamptz,
  status text not null default 'open' check (status in ('draft','open','closed','archived')),
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns on delete cascade,
  creator_id uuid not null references creators on delete cascade,
  pitch text,
  status text not null default 'pending' check (status in ('pending','accepted','rejected','withdrawn')),
  created_at timestamptz not null default now(),
  unique (campaign_id, creator_id)
);

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications on delete cascade,
  video_url text not null,
  notes text,
  status text not null default 'submitted' check (status in ('submitted','revision','approved','rejected','paid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists payouts (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid unique references submissions on delete set null,
  creator_id uuid not null references creators on delete cascade,
  amount_inr int not null check (amount_inr >= 0),
  provider text default 'razorpay',
  provider_ref text,
  status text not null default 'pending' check (status in ('pending','processing','paid','failed')),
  created_at timestamptz not null default now()
);

-- updated_at triggers
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;

do $$ begin
  perform 1 from pg_trigger where tgname = 'trg_profiles_updated';
  if not found then
    create trigger trg_profiles_updated before update on profiles for each row execute function set_updated_at();
  end if;
  perform 1 from pg_trigger where tgname = 'trg_creators_updated';
  if not found then
    create trigger trg_creators_updated before update on creators for each row execute function set_updated_at();
  end if;
  perform 1 from pg_trigger where tgname = 'trg_campaigns_updated';
  if not found then
    create trigger trg_campaigns_updated before update on campaigns for each row execute function set_updated_at();
  end if;
  perform 1 from pg_trigger where tgname = 'trg_submissions_updated';
  if not found then
    create trigger trg_submissions_updated before update on submissions for each row execute function set_updated_at();
  end if;
end $$;

-- Auto-create a profile on signup. Default role = creator; admins promoted manually.
-- Phone auth: auth.users has phone, email may be null.
create or replace function handle_new_user() returns trigger as $$
begin
  insert into profiles (id, email, phone, full_name)
    values (
      new.id,
      new.email,
      new.phone,
      coalesce(new.raw_user_meta_data->>'full_name', '')
    )
    on conflict (id) do nothing;
  return new;
end; $$ language plpgsql security definer;

do $$ begin
  perform 1 from pg_trigger where tgname = 'trg_on_auth_user_created';
  if not found then
    create trigger trg_on_auth_user_created after insert on auth.users
      for each row execute function handle_new_user();
  end if;
end $$;

-- Helper: is current user admin?
create or replace function is_admin() returns boolean as $$
  select exists(select 1 from profiles where id = auth.uid() and role = 'admin');
$$ language sql stable;

-- RLS
alter table profiles enable row level security;
alter table creators enable row level security;
alter table brands enable row level security;
alter table campaigns enable row level security;
alter table applications enable row level security;
alter table submissions enable row level security;
alter table payouts enable row level security;

-- profiles
drop policy if exists p_self_or_admin on profiles;
create policy p_self_or_admin on profiles
  for select using (id = auth.uid() or is_admin());
drop policy if exists p_update_self on profiles;
create policy p_update_self on profiles
  for update using (id = auth.uid());
drop policy if exists p_insert_self on profiles;
create policy p_insert_self on profiles
  for insert with check (id = auth.uid());

-- creators: creator sees own, admin sees all
drop policy if exists c_select on creators;
create policy c_select on creators for select using (
  profile_id = auth.uid() or is_admin()
);
drop policy if exists c_update_self on creators;
create policy c_update_self on creators for update using (profile_id = auth.uid());

-- campaigns: everyone signed-in can read open campaigns; admin can read all
drop policy if exists camp_select on campaigns;
create policy camp_select on campaigns for select using (
  status = 'open' or is_admin() or created_by = auth.uid()
);
drop policy if exists camp_admin_write on campaigns;
create policy camp_admin_write on campaigns
  for all using (is_admin()) with check (is_admin());

-- brands: read for all signed-in, write admin
drop policy if exists b_select on brands;
create policy b_select on brands for select using (auth.role() = 'authenticated');
drop policy if exists b_admin_write on brands;
create policy b_admin_write on brands for all using (is_admin()) with check (is_admin());

-- applications: creator sees/writes own; admin sees all
drop policy if exists app_select on applications;
create policy app_select on applications for select using (
  is_admin() or creator_id in (select id from creators where profile_id = auth.uid())
);
drop policy if exists app_insert on applications;
create policy app_insert on applications for insert with check (
  creator_id in (select id from creators where profile_id = auth.uid())
);
drop policy if exists app_update_admin on applications;
create policy app_update_admin on applications for update using (is_admin());

-- submissions: creator can insert/update their own; admin all
drop policy if exists sub_select on submissions;
create policy sub_select on submissions for select using (
  is_admin() or application_id in (
    select a.id from applications a
    join creators c on c.id = a.creator_id
    where c.profile_id = auth.uid()
  )
);
drop policy if exists sub_insert on submissions;
create policy sub_insert on submissions for insert with check (
  application_id in (
    select a.id from applications a
    join creators c on c.id = a.creator_id
    where c.profile_id = auth.uid()
  )
);
drop policy if exists sub_update_admin on submissions;
create policy sub_update_admin on submissions for update using (is_admin());

-- payouts: admin only
drop policy if exists pay_admin on payouts;
create policy pay_admin on payouts for all using (is_admin()) with check (is_admin());
