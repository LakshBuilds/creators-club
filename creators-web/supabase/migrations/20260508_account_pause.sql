-- Adds a soft-pause toggle on profiles. Paused profiles can't sign in via the
-- buyhatke bridge (we 403 with code=account_paused); a logged-in user can
-- pause themselves via /api/account/pause. Unpausing requires admin support.

alter table public.profiles
  add column if not exists paused boolean not null default false;

alter table public.profiles
  add column if not exists paused_at timestamptz;

create index if not exists profiles_paused_idx on public.profiles (paused) where paused = true;
