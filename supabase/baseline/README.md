# K3 Logistics V3 core baseline

Историческият V3 core baseline вече е активната първа repository migration:

`supabase/migrations/20260815000000_v3_core_baseline.sql`

Той представлява V3 core състоянието непосредствено преди
`20260815162400_create_fixed_locations.sql`.

## Phase 4 activation

Phase 4 премества доказания baseline от `supabase/baseline/` в
`supabase/migrations/` чрез Git rename без промяна на SQL съдържанието.

SHA-256:

`eb2449ea9963902c6ab8181669abd1a28f8e7da8105b6253eafe696ce060b307`

Production вече съдържа V3 core schema. Затова baseline SQL **никога не трябва
да се изпълнява ръчно върху populated production**.

За production Phase 4 използва единствено официалния Supabase migration
repair механизъм, за да маркира version `20260815000000` като вече приложена,
без изпълнение на baseline DDL.

## Repository migration order

1. `20260815000000_v3_core_baseline.sql`
2. `20260815162400_create_fixed_locations.sql`
3. `20260816121500_orders_assign_location_load.sql`
4. `20260816123700_orders_assign_location_load_lock_order.sql`
5. `20260816135200_trips_admin_driver_archive.sql`
6. `20260816143500_trips_get_driver_archive.sql`
7. `20260816154500_trips_admin_bioexis_report.sql`
8. `20260817042000_dispatcher_operations_authorization.sql`
9. `20260817080500_client_single_active_site.sql`
10. `20260817102500_trips_official_bioexis_weight.sql`
11. `20260817104500_official_weight_kg_display_fix.sql`
12. `20260817144000_password_reset_requests.sql`
13. `20260817162500_password_reset_admin_workflow.sql`
14. `20260818070000_password_reset_active_client_memberships.sql`

Оригиналните 13 post-baseline migrations остават byte-for-byte непроменени.

## Phase 3C correction

Baseline-ът включва доказаните explicit `USAGE`, `SELECT` и `UPDATE` права
върху:

- `public.orders_order_number_seq`
- `public.trips_trip_number_seq`

за:

- `anon`
- `authenticated`
- `service_role`

Broad production default privileges не са копирани в baseline-а.
