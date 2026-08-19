# K3 Logistics V3 core baseline

`20260815000000_v3_core_baseline.sql` е историческият V3 core baseline непосредствено преди първата налична repository migration `20260815162400_create_fixed_locations.sql`.

## Предназначение

Baseline-ът позволява нов празен Supabase проект да бъде възстановен до текущото V3 schema състояние чрез:

1. `supabase/baseline/20260815000000_v3_core_baseline.sql`
2. съществуващите 13 файла в `supabase/migrations/`, в техния непроменен хронологичен ред.

Baseline-ът умишлено е извън `supabase/migrations/`. Той **не трябва да се изпълнява върху населена production база**, защото production вече съдържа тези V3 core обекти.

## Граници

Baseline-ът съдържа само schema/RBAC/RLS/constraints/indexes/functions/triggers/grants и минималните системни RBAC seed записи, необходими за V3 core. Не съдържа production business data, Auth потребители, телефони, пароли, access tokens, service-role keys или други secrets/PII.

Не съдържа V4 Relation обекти.

## Доказана последователност

След baseline-а се изпълняват без редакция:

1. `20260815162400_create_fixed_locations.sql`
2. `20260816121500_orders_assign_location_load.sql`
3. `20260816123700_orders_assign_location_load_lock_order.sql`
4. `20260816135200_trips_admin_driver_archive.sql`
5. `20260816143500_trips_get_driver_archive.sql`
6. `20260816154500_trips_admin_bioexis_report.sql`
7. `20260817042000_dispatcher_operations_authorization.sql`
8. `20260817080500_client_single_active_site.sql`
9. `20260817102500_trips_official_bioexis_weight.sql`
10. `20260817104500_official_weight_kg_display_fix.sql`
11. `20260817144000_password_reset_requests.sql`
12. `20260817162500_password_reset_admin_workflow.sql`
13. `20260818070000_password_reset_active_client_memberships.sql`

Phase 3 staging proof изпълни точно тази последователност и сравни получения business schema с production.

## Checksum

SHA-256:

`eb2449ea9963902c6ab8181669abd1a28f8e7da8105b6253eafe696ce060b307`

Виж `docs/V4-PHASE-3-BASELINE-PROOF.md` за пълното доказателство и ограниченията.


## Phase 3C correction

Phase 3C добавя explicit USAGE, SELECT и UPDATE права за:

- public.orders_order_number_seq
- public.trips_trip_number_seq

за ролите:

- anon
- authenticated
- service_role

Production broad default privileges не се копират в baseline-а.

Corrected baseline + unchanged 13 migrations е доказан успешно върху празна изолирана Supabase база.
