-- Creator-submitted ideas + chatbot support tickets.
-- Run this manually in the Supabase SQL editor when ready.

create table if not exists public.creator_ideas (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  ai_used boolean not null default false,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

alter table public.creator_ideas enable row level security;

drop policy if exists "creators read their ideas" on public.creator_ideas;
create policy "creators read their ideas"
  on public.creator_ideas for select
  using (auth.uid() = creator_id);

drop policy if exists "creators insert their ideas" on public.creator_ideas;
create policy "creators insert their ideas"
  on public.creator_ideas for insert
  with check (auth.uid() = creator_id);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references public.profiles(id) on delete cascade,
  topic text not null,
  message text not null,
  -- Last few chatbot turns so the human picking it up has context.
  context jsonb,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.support_tickets enable row level security;

drop policy if exists "creators read their tickets" on public.support_tickets;
create policy "creators read their tickets"
  on public.support_tickets for select
  using (auth.uid() = creator_id);

drop policy if exists "creators insert their tickets" on public.support_tickets;
create policy "creators insert their tickets"
  on public.support_tickets for insert
  with check (auth.uid() = creator_id);

create table if not exists public.trending_reels (
  id uuid primary key default gen_random_uuid(),
  ig_video_id text,
  -- Direct mp4/webm preferred; falls back to a poster image for in-feed players that don't autoplay.
  video_url text not null,
  poster_url text,
  caption text,
  category text,
  rank int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.trending_reels enable row level security;

drop policy if exists "trending reels public read" on public.trending_reels;
create policy "trending reels public read"
  on public.trending_reels for select using (is_active);

create table if not exists public.trending_products (
  id uuid primary key default gen_random_uuid(),
  buyhatke_site_id text,
  name text not null,
  image_url text,
  url text,
  category text,
  rank int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.trending_products enable row level security;

drop policy if exists "trending products public read" on public.trending_products;
create policy "trending products public read"
  on public.trending_products for select using (is_active);

create table if not exists public.trending_audio (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text,
  cover_url text,
  ig_audio_id text,
  preview_url text,
  rank int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.trending_audio enable row level security;

drop policy if exists "trending audio public read" on public.trending_audio;
create policy "trending audio public read"
  on public.trending_audio for select using (is_active);

-- Submissions table already exists; add a 'draft' status for creators to upload
-- the cut for review before it goes live.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'submissions_status_check'
  ) then
    -- nothing to alter; constraint is on the application code level
    null;
  end if;
end $$;
