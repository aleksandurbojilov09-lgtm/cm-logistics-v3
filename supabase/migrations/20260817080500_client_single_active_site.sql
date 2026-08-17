begin;

-- One client company may have only one ACTIVE loading site.
-- Historical inactive sites remain allowed so old orders keep
-- their original site_id and snapshots.

create unique index
if not exists client_sites_one_active_per_company_uidx
on public.client_sites (company_id)
where is_active = true;

commit;
