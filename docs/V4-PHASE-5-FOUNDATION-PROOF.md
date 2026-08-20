# K3 Logistics V4 — Phase 5 Relation Foundation Proof

## Status

**SUCCESS — Relation foundation dark launch completed on isolated staging.**

Phase 5 creates and validates only the Relation database foundation. No Relation permissions/RPC layer, planning flow, dispatcher UI, reservation/capacity layer, or Relation-to-Trip materialization was started.

## Repository guards

- Repository: `aleksandurbojilov09-lgtm/cm-logistics-v3`
- Starting `main`: `4fb51dd0fb207e1642325ad60a83ca3bfd51e103`
- Starting `dev`: `814d1ef35ba69b0b27b0e5fb8ccc39fe09b9235a`
- Phase 5 migration commit: `38542845072f35d9d1c9f9568e6162f82d9c3f26`
- Commit message: `Add V4 relation foundation`
- The first Phase 5 commit contains exactly one new file: `supabase/migrations/20260819180000_v4_relation_foundation.sql`.
- `main` remained unchanged throughout Phase 5 staging work.

## Migration artifact

- Migration: `supabase/migrations/20260819180000_v4_relation_foundation.sql`
- SHA-256: `db7f19fd214b31a01e107e6881e7175c810d2883320b8f6007551bddc76d7b83`
- Size during commit proof: 339 lines / 12,885 bytes.

The migration creates only the approved Phase 5 Relation foundation:

- `public.relations`
- `public.relation_stops`
- `public.relation_order_allocations`
- `public.relation_events`
- `public.relations_relation_number_seq`
- nullable integration links `trips.relation_id`, `trip_stops.relation_stop_id`, `order_assignments.relation_allocation_id`
- `btree_gist` in the existing `extensions` schema
- three partial GiST exclusion constraints for Truck/Driver/Trailer overlap in `assigned` and `in_progress`
- `cm_private.enforce_relation_allocation_stop_identity()` and its trigger
- existing `cm_private.set_updated_at()` triggers for mutable Relation tables
- RLS enablement and dark-launch grants.

The migration does **not** create Phase 6 permissions, `user_permissions`, `relations.plan`, `relations.dispatch`, Relation lifecycle RPCs, reservation/capacity logic, Relation UI, or Trip materialization.

## Mandatory source inputs

Phase 5 was executed against the repository state documented by:

1. `docs/V4-PHASE-2-ARCHITECTURE.md`
2. `docs/V4-PHASE-3-BASELINE-PROOF.md`
3. `docs/V4-PHASE-3C-SEQUENCE-ACL-CORRECTION.md`
4. `docs/V4-PHASE-4-BASELINE-ACTIVATION.md`
5. `docs/V4-PHASE-5-INPUTS.md`
6. `supabase/baseline/README.md`

The active V3 baseline SHA-256 remained `eb2449ea9963902c6ab8181669abd1a28f8e7da8105b6253eafe696ce060b307`.

## Staging target and migration-history alignment

- Staging Supabase project ref: `vgbubxgjbfjnlcywllwc`
- Production Supabase project ref: `bqrwcgortfmjjdywqzqu`

Before Phase 5 apply, the CLI confirmed the explicit staging project ref. Staging still contained the Phase 3 connector-generated migration execution timestamps instead of canonical repository filename timestamps. The exact 14 known Phase 3 remote versions were verified, then migration history was repaired **on staging only** so the same already-applied V3 schema was represented by the canonical repository versions:

- `20260815000000`
- `20260815162400`
- `20260816121500`
- `20260816123700`
- `20260816135200`
- `20260816143500`
- `20260816154500`
- `20260817042000`
- `20260817080500`
- `20260817102500`
- `20260817104500`
- `20260817144000`
- `20260817162500`
- `20260818070000`

After alignment, `supabase db push --linked --dry-run` reported exactly one pending migration: `20260819180000_v4_relation_foundation.sql`.

The migration was then applied only to staging, and the staging migration history recorded `20260819180000` as applied.

## Structural verification

Post-apply SQL assertions completed successfully and verified:

- all four Relation tables exist;
- `relations_relation_number_seq` exists;
- expected Relation columns and nullable V3 integration columns exist;
- `btree_gist` exists in `extensions`;
- required FK/unique/check constraints exist;
- three partial GiST exclusion constraints exist with inclusive `daterange(..., '[]')` overlap checks;
- `relation_order_allocations_relation_stop_fkey` is composite and deferrable as designed;
- `relations`, `relation_stops`, and `relation_order_allocations` reuse `cm_private.set_updated_at()`;
- `relation_events` has no mutable `updated_at` trigger;
- the allocation physical-identity helper exists as SECURITY INVOKER with hardened empty search path;
- the allocation identity trigger exists.

## Security dark-launch verification

Verified on staging:

- RLS enabled on all four Relation tables;
- zero Relation RLS policies in Phase 5;
- no direct table privileges for `PUBLIC`, `anon`, or `authenticated`;
- `service_role` has `SELECT, INSERT, UPDATE, DELETE` on `relations`, `relation_stops`, and `relation_order_allocations`;
- `service_role` has only `SELECT, INSERT` on `relation_events`;
- `service_role` does not have `UPDATE` or `DELETE` on `relation_events`;
- Relation sequence is not usable by `anon` or `authenticated`;
- `service_role` has Relation sequence `USAGE` and `SELECT`, not `UPDATE`;
- the allocation helper is not directly executable by `PUBLIC`, `anon`, `authenticated`, or `service_role`.

## Relation regression suite

The staging database was empty before testing. Synthetic Auth/V3 fleet/client/order fixtures were created only inside a transaction and the complete regression run ended with `ROLLBACK`.

Final corrected suite result: **SUCCESS**.

Coverage:

1. Valid `draft` Relation.
2. Valid `sent` Relation.
3. Valid `assigned` Relation.
4. Invalid status rejection.
5. Invalid date range rejection.
6. Invalid revision rejection.
7. Invalid `draft` lifecycle rejection.
8. Invalid `sent` lifecycle rejection.
9. Invalid `assigned` lifecycle rejection.
10. Invalid `in_progress` lifecycle rejection.
11. Invalid `completed` lifecycle rejection.
12. Invalid `cancelled` lifecycle rejection.
13. Valid Relation Stops.
14. Valid Order allocation with matching `(company_id, site_id)` physical identity.
15. Allocation physical-identity mismatch rejected with SQLSTATE `23514` and `RELATION_ALLOCATION_STOP_IDENTITY_MISMATCH`.
16. Truck date overlap rejected by `relations_planned_truck_no_overlap`.
17. Driver date overlap rejected by `relations_planned_driver_no_overlap`.
18. Trailer date overlap rejected by `relations_planned_trailer_no_overlap`.
19. Draft/Sent date coexistence allowed because those states do not reserve fleet.
20. Valid Relation event insert.

The first regression attempt exposed a test-fixture issue: `orders.order_number` is `GENERATED ALWAYS`; the final suite correctly used `OVERRIDING SYSTEM VALUE` for synthetic test fixtures. A later assertion was also corrected because an invalid Relation status can violate both the dedicated status check and the aggregate lifecycle check; PostgreSQL is free to report either failing CHECK first. Neither issue required a migration change.

## Cleanup proof

After final `ROLLBACK`, all synthetic rows were verified as zero in:

- `auth.users`
- `profiles`
- `drivers`
- `trucks`
- `trailers`
- `client_companies`
- `client_sites`
- `orders`
- `relations`
- `relation_stops`
- `relation_order_allocations`
- `relation_events`

`relations_relation_number_seq.is_called` remained `false`, so the Relation sequence was not advanced by the regression suite.

## V3 regression / compatibility proof

`npm run k3:check` completed successfully after Phase 5 staging apply, including the production build and `git diff --check`. The existing known Vite warning about `login-page.ts` being both statically and dynamically imported remained non-blocking.

The current staging and production inventories both contain 84 pre-Relation V3 functions. Additional diagnostics verified:

- staging V3 function count: `84`
- production V3 function count: `84`
- staging-only V3 functions: `0`
- production-only V3 functions: `0`
- V3 function metadata differences: `0`

An additional stricter diagnostic compared stored legacy V3 function body text and found 72 `prosrc` text differences between rebuilt staging and production, including after comment/whitespace normalization. This diagnostic is recorded explicitly rather than hidden. It is **not a Phase 5 mutation**: the Phase 5 repository delta is exactly one new Relation migration, and that migration does not replace any existing V3 function. It adds only the new Relation allocation helper. Phase 3 had previously documented V3 function-body equality during its reproducibility proof, so this current staging/production body-text discrepancy should be treated as a pre-existing baseline-representation/reproducibility diagnostic to reconcile separately if legacy V3 functions are modified later. It did not require or authorize any Phase 5 production or V3-function rewrite.

## Production safety proof

Production was never an authorized DDL target in Phase 5.

A GitHub Actions `dev` dry-run was discovered to be linked to production, but the workflow command was `supabase db push --linked --dry-run`; it reported the Phase 5 migration as pending and performed no database write. No workflow dispatch was able to start from the Codespace integration token.

Final production verification was read-only and confirmed:

- production migration history still contains exactly the original 14 canonical V3 versions;
- `20260819180000` is **not** in production migration history;
- `public.relations`, `public.relation_stops`, `public.relation_order_allocations`, `public.relation_events`, and `public.relations_relation_number_seq` do not exist in production;
- `trips.relation_id`, `trip_stops.relation_stop_id`, and `order_assignments.relation_allocation_id` do not exist in production;
- `btree_gist` remains absent in production;
- key V3 function inventory remains 58 `public` + 26 `cm_private` = 84 functions;
- `public.trips_admin_get_driver_archive(date)` still exists;
- production business row counts remained exactly at the Phase 5 preflight values:
  - roles 4
  - trips 18
  - orders 11
  - trucks 2
  - drivers 2
  - profiles 10
  - trailers 2
  - trip_stops 29
  - user_roles 10
  - permissions 12
  - client_sites 5
  - client_users 5
  - discrepancies 2
  - notifications 7
  - trip_segments 25
  - fixed_locations 2
  - client_companies 5
  - role_permissions 12
  - order_assignments 44
  - driver_home_trucks 2
  - vehicle_assignments 21
  - password_reset_requests 2
  - client_registration_requests 6.

The Phase 5 preflight production schema fingerprint was `32fe57497662c8077e87dd4958ad073d`. The exact fingerprint query was not rerun in the final terminal proof; instead, migration history, Relation-object absence, integration-column absence, extension absence, function inventory, key function existence, and all recorded business row counts were independently reverified.

## Branch and production conclusion

- `main` remained `4fb51dd0fb207e1642325ad60a83ca3bfd51e103` throughout Phase 5.
- Production Relation objects: **0**.
- Production Phase 5 migration applications: **0**.
- Staging Relation foundation migration: **applied and verified**.
- Test data remaining in staging: **0**.
- No Phase 6 implementation was started.

## Phase 5 conclusion

Phase 5 Relation foundation dark launch is complete on isolated staging. The Relation schema, overlap constraints, physical identity guard, RLS dark-launch posture, service-role grants, migration history, regression behavior, rollback cleanup, V3 compatibility guardrails, and production isolation were verified without deploying Relation foundation to production.

Next recommended step:

**Фаза 6 — Relation permissions and transactional RPC layer**
