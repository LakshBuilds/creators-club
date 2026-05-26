-- Fixes the "deleted account, can't sign up with same email — app spins forever"
-- bug. Two root causes:
--
-- 1. profiles.email had a UNIQUE constraint, so any orphan profile row with the
--    same email (left over by a partially-completed cascade) blocked re-signup.
-- 2. handle_new_user() only handled id conflicts via ON CONFLICT (id), so an
--    email collision raised a unique_violation that rolled back the auth.users
--    insert. The bridge then silently continued with user=null, leaving the
--    mobile app in a session with no matching profile row → infinite spinner.
--
-- We also clean up any existing orphan rows so users currently stuck can sign in.

-- 1) Drop the unique constraint on profiles.email. Uniqueness is already
--    enforced upstream by auth.users.email, so this constraint added no
--    correctness — only a re-signup footgun.
do $$
declare
  cons_name text;
begin
  for cons_name in
    select conname from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) ilike '%(email)%'
  loop
    execute format('alter table public.profiles drop constraint %I', cons_name);
  end loop;
end $$;

-- Keep a non-unique index for lookup performance.
create index if not exists profiles_email_idx on public.profiles (email);

-- 2) Harden the trigger so an email collision can never block sign-up. If a
--    stale profile with the same email exists from a previous orphan, delete
--    it first (its FK to auth.users has cascaded by this point, so the row is
--    safe to remove). Then insert as usual.
create or replace function public.handle_new_user() returns trigger
  language plpgsql security definer
as $$
begin
  -- Best-effort orphan cleanup. If a previous account was deleted but a
  -- profiles row leaked with the same email, drop it before inserting the new
  -- one. We only delete rows whose id doesn't match an existing auth.users row
  -- (true orphans), so we never blow away a real user.
  delete from public.profiles
   where email = new.email
     and id != new.id
     and not exists (select 1 from auth.users u where u.id = public.profiles.id);

  insert into public.profiles (id, email, phone, full_name)
    values (
      new.id,
      new.email,
      new.phone,
      coalesce(new.raw_user_meta_data->>'full_name', '')
    )
    on conflict (id) do nothing;
  return new;
end;
$$;

-- 3) One-time cleanup: delete any profile rows that point to a non-existent
--    auth.users row. These are the orphans currently blocking re-signup.
delete from public.profiles p
 where not exists (select 1 from auth.users u where u.id = p.id);

-- Same for creators that pointed to a profile that's now gone.
delete from public.creators c
 where c.profile_id is not null
   and not exists (select 1 from public.profiles p where p.id = c.profile_id);
