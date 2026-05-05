-- Run in Supabase SQL editor if you already applied an older schema without phone in handle_new_user.
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
