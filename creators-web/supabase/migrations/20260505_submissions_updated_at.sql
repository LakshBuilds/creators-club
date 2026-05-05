-- Fix: trg_submissions_updated trigger fires BEFORE UPDATE and sets new.updated_at,
-- but the prod submissions table was created without the updated_at column,
-- causing every UPDATE to fail with: record "new" has no field "updated_at".
-- This adds the column idempotently and backfills existing rows from created_at.

alter table submissions
  add column if not exists updated_at timestamptz not null default now();

update submissions
  set updated_at = created_at
  where updated_at = '1970-01-01T00:00:00Z'::timestamptz
     or updated_at < created_at;

-- Make sure the trigger function and trigger exist (idempotent, mirrors schema.sql).
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;

do $$ begin
  perform 1 from pg_trigger where tgname = 'trg_submissions_updated';
  if not found then
    create trigger trg_submissions_updated
      before update on submissions
      for each row execute function set_updated_at();
  end if;
end $$;
