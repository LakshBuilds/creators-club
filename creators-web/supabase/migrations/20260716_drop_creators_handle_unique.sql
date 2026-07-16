-- Run in Supabase → SQL editor.
--
-- Fixes: 23505 duplicate key on "creators_handle_key" when linking Instagram
-- after a previous account was deleted/re-created.
--
-- Root cause: the live DB has a UNIQUE constraint on creators.handle
-- (creators_handle_key) that is NOT in schema.sql — undocumented drift. Since
-- handle is just the IG username (see link_instagram_account: p_handle = username)
-- and the IG account is ALREADY uniquely keyed by creators.ig_user_id, this
-- second unique constraint adds no correctness — it only blocks re-linking when
-- an orphan creator row from a prior signup still holds the same handle.
--
-- This is the same class of bug as 20260520_fix_email_reuse_after_delete, which
-- dropped the redundant UNIQUE on profiles.email for exactly this reason.

-- 1) Drop any unique constraint defined on (handle). Done dynamically so it
--    works regardless of the exact constraint name on this deployment.
do $$
declare
  cons_name text;
begin
  for cons_name in
    select conname from pg_constraint
    where conrelid = 'public.creators'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) ilike '%(handle)%'
  loop
    execute format('alter table public.creators drop constraint %I', cons_name);
  end loop;
end $$;

-- Some deployments enforce it via a unique INDEX rather than a constraint.
drop index if exists public.creators_handle_key;

-- 2) Keep a non-unique index for handle lookups.
create index if not exists creators_handle_idx on public.creators (handle);

-- 3) One-time cleanup of orphan creator rows whose profile no longer exists,
--    consistent with the earlier migration (the FK cascade should handle this,
--    but schema drift may have left rows behind).
delete from public.creators c
 where c.profile_id is null
    or not exists (select 1 from public.profiles p where p.id = c.profile_id);

-- Refresh PostgREST cache.
notify pgrst, 'reload schema';
