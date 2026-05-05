-- Onboarding flow (mobile): personal details, niches, referral.
alter table profiles
  add column if not exists age int,
  add column if not exists city text,
  add column if not exists gender text,
  add column if not exists referred_by_code text,
  add column if not exists onboarding_completed boolean not null default false;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_gender_check'
  ) then
    alter table profiles
      add constraint profiles_gender_check
      check (gender is null or gender in ('male','female','other'));
  end if;
end $$;

alter table creators
  add column if not exists categories text[] not null default '{}';

-- Creator row auto-created on profile insert so mobile can upsert without a round-trip.
create or replace function ensure_creator_row() returns trigger as $$
begin
  insert into creators (profile_id) values (new.id)
    on conflict (profile_id) do nothing;
  return new;
end; $$ language plpgsql security definer;

do $$ begin
  perform 1 from pg_trigger where tgname = 'trg_ensure_creator_row';
  if not found then
    create trigger trg_ensure_creator_row after insert on profiles
      for each row execute function ensure_creator_row();
  end if;
end $$;

-- Allow creator to insert own row (fallback if trigger is disabled).
drop policy if exists c_insert_self on creators;
create policy c_insert_self on creators for insert with check (profile_id = auth.uid());
