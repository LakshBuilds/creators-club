-- Run in Supabase → SQL editor.
-- Backs the "Auto DM" feature: when someone comments on a configured reel, the
-- webhook handler sends them a DM and posts a random reply on the comment.

create table if not exists public.auto_dm_rules (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  ig_user_id text not null,
  ig_media_id text not null,
  dm_message text not null,
  comment_replies text[] not null default '{}',
  trigger_keyword text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, ig_media_id)
);

create index if not exists auto_dm_rules_lookup_idx
  on public.auto_dm_rules (ig_user_id, ig_media_id)
  where active = true;

do $$ begin
  perform 1 from pg_trigger where tgname = 'trg_auto_dm_rules_updated';
  if not found then
    create trigger trg_auto_dm_rules_updated before update on public.auto_dm_rules
      for each row execute function set_updated_at();
  end if;
end $$;

alter table public.auto_dm_rules enable row level security;

drop policy if exists adr_select_self on public.auto_dm_rules;
create policy adr_select_self on public.auto_dm_rules
  for select using (profile_id = auth.uid() or is_admin());

drop policy if exists adr_write_self on public.auto_dm_rules;
create policy adr_write_self on public.auto_dm_rules
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

notify pgrst, 'reload schema';
