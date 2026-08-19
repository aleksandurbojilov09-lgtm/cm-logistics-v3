# K3 Logistics V4 — Phase 3 Baseline Proof

## Status

**SUCCESS — reproducible V3 baseline proven on isolated staging.**

Phase 3 доказва възпроизводимостта на текущия V3 database слой. Не започва V4 Relation implementation и не променя production migration history.

## Verified starting state

- Repository: `aleksandurbojilov09-lgtm/cm-logistics-v3`
- Starting `main`: `4fb51dd0fb207e1642325ad60a83ca3bfd51e103`
- Starting `dev`: `32be5607cd3806024296469be830d00764807d7c`
- Production Supabase ref: `bqrwcgortfmjjdywqzqu`
- Staging Supabase ref: `vgbubxgjbfjnlcywllwc`
- Staging name: `cm-logistics-v4-staging`
- Staging region: `eu-central-1`
- Staging status during proof: `ACTIVE_HEALTHY`
- Confirmed staging cost: `10 USD/month`
- Staging остава активен след Phase 3 и продължава да се таксува, докато не бъде отделно спрян/изтрит.

Production беше използвана само read-only за schema/migration inspection. Няма production SQL write, migration apply, migration-history repair, Edge Function deployment или тестови данни.

## Baseline artifact

- Path: `supabase/baseline/20260815000000_v3_core_baseline.sql`
- Original Phase 3 SHA-256: `92537e68b5679bd1c869ad88d64c38b529c31c5bea32262c6c1327223cf6b299`
- Corrected Phase 3C SHA-256: `eb2449ea9963902c6ab8181669abd1a28f8e7da8105b6253eafe696ce060b307`
- UTF-8 byte size during proof: `215877`
- Baseline е извън активната `supabase/migrations/` директория.
- Baseline не съдържа production business data, Auth users, passwords, tokens или production PII.
- Baseline не съдържа V4 Relation таблици, permissions или RPCs.

Baseline представлява V3 core състоянието непосредствено преди `20260815162400_create_fixed_locations.sql`, а не dump на текущата production база. Обектите, въведени от последващите 13 migrations, са изключени от baseline-а. Pre-migration вариантът на `admin_review_client_registration` е възстановен като част от историческия core state.

## Existing migrations

Тринадесетте repository migrations са източникът на последващата delta и не са редактирани:

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

За scratch proof файловете бяха прочетени от immutable GitHub commit `32be5607cd3806024296469be830d00764807d7c`, а не от подвижен branch.

## Rebuild proof

Празният staging core беше възстановен чрез baseline + 13 migrations без ръчна SQL поправка между migrations. След материализирането на финалния baseline същият файл беше изпълнен отново в изолирани scratch schema-и вътре в staging, последван от същите 13 immutable migration SQL файла.

Финалният scratch rebuild създаде:

- 25 business tables след всички migrations;
- 58 public functions;
- 26 private/core functions.

Scratch schema-ите бяха премахнати след сравнението. Временният HTTP transport extension и временните Phase 3 baseline-generator functions също бяха премахнати.

## Schema comparison

След baseline + 13 migrations staging/scratch резултатът беше сравнен с доказаното V3 schema състояние. След нормализиране единствено на scratch schema qualification имената:

- Business tables and columns: **MATCH / 0 differences**
- Data types/nullability/defaults/generated values: **MATCH / 0 differences**
- Primary/foreign/check/unique constraints: **MATCH / 0 differences**
- Indexes and partial indexes: **MATCH / 0 differences**
- RLS enablement: **MATCH**
- Policies: **MATCH / 0 differences**
- Triggers: **MATCH / 0 differences**
- Function signatures/return types/SECURITY mode/search_path metadata: **MATCH / 0 differences**
- Function bodies: **MATCH / 0 differences**
- Effective function EXECUTE grants: **MATCH / 0 differences**
- Table grants: **MATCH / 0 differences**
- Sequence ACLs: **ORIGINAL PHASE 3 RESULT WAS INCORRECT — corrected by Phase 3C**
- Extensions relevant to the proven final state: **MATCH**
- Enums: `0 / 0`
- Views/materialized views: `0 / 0`

Raw PostgreSQL ACL text can represent equivalent privileges differently (`NULL`/default PUBLIC EXECUTE versus explicit ACL entries), затова function access беше сравнен и по ефективни EXECUTE права. Ефективните права съвпадат.

Supabase-managed `auth`, `storage` и други project-specific managed schemas не са част от K3 business-schema equality proof.

## Staging migration history

Staging съдържа baseline + 13 migrations. При `apply_migration` Supabase connector генерира execution timestamp версии; затова staging history version timestamps не са оригиналните filename timestamps. Migration names и доказаният source order съответстват на baseline-а и 13-те repository migrations.

Observed staging sequence:

1. `v3_core_baseline`
2. `create_fixed_locations`
3. `orders_assign_location_load`
4. `orders_assign_location_load_lock_order`
5. `trips_admin_driver_archive`
6. `trips_get_driver_archive`
7. `trips_admin_bioexis_report`
8. `dispatcher_operations_authorization`
9. `client_single_active_site`
10. `trips_official_bioexis_weight`
11. `official_weight_kg_display_fix`
12. `password_reset_requests`
13. `password_reset_admin_workflow`
14. `password_reset_active_client_memberships`

По време на първоначалния proof transport wrapper statements бяха използвани за immutable GitHub raw SQL fetch. Те не променят repository migration файловете; repository filenames + immutable Git commit са provenance за byte-for-byte source content.

## Corrected V3 regression proof

Финалният corrected regression suite беше изпълнен само в staging с unique prefix `p3r1053`, в транзакция с `ROLLBACK`. Резултат: **SUCCESS**.

Покритие:

1. Core RBAC roles and permissions.
2. Dispatcher permission mappings.
3. Client company/site/user relationships.
4. Single-active-client-site negative constraint.
5. Order creation and valid status lifecycle basis.
6. Invalid Order status rejection.
7. Valid Truck allocation exactly `24000 kg`.
8. Over-`24000 kg` capacity rejection.
9. Order over-allocation rejection.
10. Permanent Driver + Truck + Trailer composition.
11. Active uniqueness for Driver, Truck and Trailer.
12. Missing-composition rejection as an isolated negative test.
13. Transactional Trip start through a valid composition.
14. Creation of the first active `trip_segment`.
15. `trip_segment` lifecycle constraint negative test.
16. Maximum one active `trip_segment` per Trip.
17. `1 order_assignment = 1 trip_stop` uniqueness.
18. Driver handoff request -> reject lifecycle.
19. Trip-stop progression: first loaded -> next en_route -> all loaded.
20. Trip finish with mandatory `official_unloaded_kg`.
21. Completed segment `start_km=1000`, `end_km=1100`, `total_km=100` archive/payable-km basis.
22. Driver archive contains the completed segment.
23. `password_reset_requests` table/functions/constraints and expected negative cases.

Двата предишни regression опита не са приети като success:

- Attempt 1: synthetic capacity fixture използва Truck без пълна composition и V3 правилно върна `Камионът няма готова композиция.`
- Attempt 2: verification PL/pgSQL имаше двусмислена `trip_id` variable/column reference.

И двата опита бяха rolled back. Финалният corrected test използва `v_*` variables, квалифицирани table aliases и отделен missing-composition negative scenario.

След финалния regression `ROLLBACK` беше проверено отделно:

- synthetic profiles: `0`
- synthetic Auth users linked to fixture: `0`
- synthetic companies: `0`
- synthetic trucks: `0`
- synthetic trailers: `0`
- synthetic orders: `0`
- synthetic password-reset rows: `0`

## Production and V4 safety

- Production Supabase business schema: **unchanged by Phase 3**.
- Production migration history: **unchanged by Phase 3**.
- `main`: **not changed by Phase 3 work before the final dev-only commit**.
- V4 Relation tables/functions/permissions: **not created**.
- No Relation UI, planner, calendar, map, or Relation-to-Trip implementation was started.

## Security findings carried forward

Phase 3 deliberately does not perform the separate security cleanup. Carry forward:

- Six Driver handoff SECURITY DEFINER RPC functions retain broader `anon EXECUTE` grants.
- Legacy broad table grants/default-privilege hygiene findings remain for a dedicated security task.
- Supabase leaked-password protection remains disabled.

The baseline reproduces the proven V3 effective privilege state; it does not silently redesign security policy during the reproducibility phase.

## Repeat / rollback procedure

For a future rebuild proof:

1. Use a new/explicitly isolated empty staging environment or isolated scratch schemas.
2. Verify the target project ref before every database write.
3. Apply the baseline first.
4. Apply the unchanged 13 migrations in filename order.
5. Compare the resulting business schema and run synthetic regression tests.
6. Roll back/remove synthetic fixtures and scratch schemas.

Never execute this baseline on the populated production database.

If a future test run fails, fix the baseline or test fixture and repeat in an isolated environment. Do not patch staging manually between migrations and then omit that change from the baseline.

## Phase 3 conclusion

The V3 core is reproducible from an explicit historical baseline plus the existing 13 migrations. Phase 3 establishes the database foundation required before any V4 Relation implementation. Phase 4 is not started by this proof.


## Phase 3C erratum

Original Phase 3 incorrectly reported:

`Sequence ACLs: MATCH / 0 differences`

The original baseline missed explicit sequence privileges for:

- `public.orders_order_number_seq`
- `public.trips_trip_number_seq`

Phase 3C corrected these privileges for:

- `anon`
- `authenticated`
- `service_role`

Corrected baseline SHA-256:

`eb2449ea9963902c6ab8181669abd1a28f8e7da8105b6253eafe696ce060b307`

Corrected baseline + unchanged 13 migrations was rebuilt successfully on an empty isolated Supabase database.

See `docs/V4-PHASE-3C-SEQUENCE-ACL-CORRECTION.md`.
