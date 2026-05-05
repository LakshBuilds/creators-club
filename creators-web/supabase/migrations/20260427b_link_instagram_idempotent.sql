-- Run in Supabase → SQL editor.
-- Fixes: 23505 duplicate key on creators_ig_user_id_key when re-linking the same IG handle
-- to a new profile (after delete-account / new signup with the same Instagram).

-- 1) One-shot cleanup of orphan creator rows whose profile no longer exists.
-- Schema drift on the deployed DB may have left these around even though the FK
-- cascade should have cleaned them up.
delete from public.creators c
where c.profile_id is null
   or not exists (select 1 from public.profiles p where p.id = c.profile_id);

-- 2) Atomic IG link: clear any prior binding of this ig_user_id, then upsert
-- the calling user's creator row. Runs with elevated rights so it can wipe a
-- stale row that belongs to a different profile.
create or replace function public.link_instagram_account(
  p_ig_user_id text,
  p_ig_username text,
  p_handle text,
  p_token text,
  p_expires_at timestamptz
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  -- Strip the IG link from any other creator row currently holding this ig_user_id,
  -- AND from the caller's own row first — this guarantees the unique (ig_user_id) index
  -- has no live entry for p_ig_user_id by the time we upsert below.
  update public.creators
     set ig_user_id = null,
         ig_long_lived_token = null,
         ig_token_expires_at = null
   where ig_user_id = p_ig_user_id;

  -- Ensure the caller has a creator row, then attach the IG fields.
  insert into public.creators (profile_id, ig_user_id, ig_username, handle,
                               ig_long_lived_token, ig_token_expires_at)
  values (v_uid, p_ig_user_id, p_ig_username, p_handle, p_token, p_expires_at)
  on conflict (profile_id) do update
    set ig_user_id = excluded.ig_user_id,
        ig_username = excluded.ig_username,
        handle = excluded.handle,
        ig_long_lived_token = excluded.ig_long_lived_token,
        ig_token_expires_at = excluded.ig_token_expires_at,
        updated_at = now();
end;
$$;

revoke all on function public.link_instagram_account(text, text, text, text, timestamptz) from public;
grant execute on function public.link_instagram_account(text, text, text, text, timestamptz) to authenticated;

-- Refresh PostgREST cache so the RPC is callable without a manual reload.
notify pgrst, 'reload schema';
