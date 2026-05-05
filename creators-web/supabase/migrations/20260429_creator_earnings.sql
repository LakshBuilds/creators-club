-- Run in Supabase → SQL Editor.
-- Backs the home-screen earnings strip ("Dipanshu earned ₹50,000" pills).
-- Seeded with placeholder names; real payouts can replace these later.

create table if not exists public.creator_earnings (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  amount_inr integer not null,
  earned_at timestamptz not null default now()
);

create index if not exists creator_earnings_recent_idx
  on public.creator_earnings (earned_at desc);

alter table public.creator_earnings enable row level security;

drop policy if exists "creator_earnings read" on public.creator_earnings;
create policy "creator_earnings read"
  on public.creator_earnings for select
  to authenticated, anon
  using (true);

insert into public.creator_earnings (display_name, amount_inr, earned_at) values
  ('Dipanshu',  50000, now() - interval '2 hours'),
  ('Abhijay',   10000, now() - interval '5 hours'),
  ('Riya',      35000, now() - interval '1 day'),
  ('Karan',     22000, now() - interval '1 day 6 hours'),
  ('Ananya',    18500, now() - interval '2 days'),
  ('Devansh',   27000, now() - interval '2 days 4 hours'),
  ('Saanvi',    41200, now() - interval '3 days'),
  ('Aarav',     15800, now() - interval '4 days'),
  ('Meera',     31000, now() - interval '5 days'),
  ('Vivaan',    29500, now() - interval '6 days'),
  ('Ishaan',    12700, now() - interval '7 days'),
  ('Tara',      46800, now() - interval '8 days')
on conflict do nothing;
