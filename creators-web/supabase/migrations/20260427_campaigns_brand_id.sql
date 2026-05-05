-- Run in Supabase → SQL. Fixes: missing campaigns.brand_id (42703) seen from mobile home/campaigns screens.

alter table public.campaigns
  add column if not exists brand_id uuid references public.brands(id) on delete set null;

create index if not exists campaigns_brand_id_idx on public.campaigns(brand_id);

-- Refresh PostgREST schema cache so the new column/FK is visible without a manual reload.
notify pgrst, 'reload schema';
