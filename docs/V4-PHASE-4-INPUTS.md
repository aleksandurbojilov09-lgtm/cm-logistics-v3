# K3 Logistics V4 — Phase 4 Inputs

## Phase 3 result

Phase 3 baseline proof: **SUCCESS**.

V4 implementation has **not** started. This document is input only for an independently approved Phase 4 plan.

## Source state

- Repository: `aleksandurbojilov09-lgtm/cm-logistics-v3`
- Phase 3 starting `main`: `4fb51dd0fb207e1642325ad60a83ca3bfd51e103`
- Phase 3 starting `dev`: `32be5607cd3806024296469be830d00764807d7c`
- Production Supabase ref: `bqrwcgortfmjjdywqzqu`
- Staging Supabase ref: `vgbubxgjbfjnlcywllwc`
- Staging name: `cm-logistics-v4-staging`
- Staging status at Phase 3 proof: `ACTIVE_HEALTHY`
- Staging cost: `10 USD/month`

## Reproducible V3 baseline

- Baseline path: `supabase/baseline/20260815000000_v3_core_baseline.sql`
- Original Phase 3 baseline SHA-256: `92537e68b5679bd1c869ad88d64c38b529c31c5bea32262c6c1327223cf6b299`
- Corrected Phase 3C baseline SHA-256: `eb2449ea9963902c6ab8181669abd1a28f8e7da8105b6253eafe696ce060b307`
- Baseline is intentionally outside `supabase/migrations/`.
- Existing 13 migrations remain the immutable post-baseline delta.

Proven rebuild order: baseline -> all 13 existing migrations in chronological filename order.

## Migration-history result

Production migration history still contains the original 13 migrations and was not changed in Phase 3.

Staging contains the baseline plus the same 13 migration names/order. Supabase connector execution timestamps are staging execution metadata and are not replacements for the immutable repository filename timestamps.

## Schema comparison result

Final baseline + 13 migration scratch rebuild matched the proven V3 business schema with zero normalized differences for:

- tables/columns/types/nullability/defaults/generated values;
- constraints;
- indexes/partial indexes;
- RLS and policies;
- triggers;
- function metadata;
- function behavior revalidated by the successful Phase 3C regression suite;
- effective function grants;
- table grants;
- sequence ACLs — original Phase 3 result superseded by the Phase 3C correction.

Enums/views were `0 / 0`. Project-specific Supabase-managed schemas are outside the business-schema equality proof.

## Regression result

Corrected synthetic staging regression: **SUCCESS**.

Covered RBAC, client relationships, order lifecycle, 24t capacity, over-allocation, Fleet active uniqueness, valid Trip start, trip segments, trip stops, Driver handoff request/reject, official BIOEXIS finish, completed-segment archive/payable-km basis, and password reset objects/constraints.

All synthetic data was rolled back; post-test leftovers are zero.

## Production migration-history repair proposal — future approval required

Production already contains the V3 core objects but has no historical baseline migration entry representing their pre-first-migration creation. A future, separately approved administrative task should consider recording the baseline version `20260815000000` as **already applied** in production migration history **without executing the baseline DDL**.

This is only a proposal. Phase 3 does not perform it.

Before any such repair:

1. Reconfirm exact production project ref `bqrwcgortfmjjdywqzqu`.
2. Capture/verify current production migration history and business-schema fingerprints.
3. Verify the repository baseline checksum exactly.
4. Confirm the supported Supabase migration-history repair mechanism from current official documentation/CLI help.
5. Obtain explicit approval for the production administrative write.
6. Record only the historical marker; never execute baseline DDL against populated production.
7. Re-read migration history and schema fingerprints immediately afterward.

Rollback strategy for that administrative operation: remove/revert only the migration-history marker using the supported Supabase repair mechanism if validation fails; do not roll back or drop V3 schema objects that pre-existed the marker.

## Risks carried into Phase 4

- The production baseline-history marker is not yet repaired.
- Six Driver handoff SECURITY DEFINER RPCs have broader `anon EXECUTE` findings.
- Legacy broad table grants/default privileges need a separate security-hardening task.
- Supabase leaked-password protection is disabled.
- Staging remains an active paid project until separately paused/deleted.

These are carry-forward risks; they were not changed as part of Phase 3.

## Phase 4 gate

Any Phase 4 V4 Relation implementation must use the committed Phase 3 baseline proof as its database safety reference and must not assume production migration-history repair has already occurred unless that separate operation is explicitly verified.

No `relations`, `relation_stops`, `relation_order_allocations`, `relation_events`, Relation RPCs, Relation permissions, Planner UI, Dispatcher Relation UI, Relation map/calendar, or Relation-to-Trip materialization has been implemented in Phase 3.


## Phase 3C correction

Phase 3C corrected the missing sequence privileges for:

- `public.orders_order_number_seq`
- `public.trips_trip_number_seq`

Required roles:

- `anon`
- `authenticated`
- `service_role`

Required privileges:

- `USAGE`
- `SELECT`
- `UPDATE`

Corrected baseline SHA-256:

`eb2449ea9963902c6ab8181669abd1a28f8e7da8105b6253eafe696ce060b307`

Corrected baseline + unchanged 13 migrations passed an isolated empty-database rebuild.

Phase 3C local regression result:

`PHASE3C_REGRESSION_SUITE=SUCCESS`

Production was not changed.

Production broad default privileges were intentionally not copied into the baseline.

Phase 4 must use the final committed Phase 3C `dev` HEAD as its source.
