# K3 Logistics V4 — Phase 5 Inputs

## Status

Phase 4 baseline activation: **SUCCESS**.

This file is input material only. It does not start Phase 5 and does not
authorize Relation implementation by itself.

## Repository baseline state

The first active repository migration is now:

`supabase/migrations/20260815000000_v3_core_baseline.sql`

SHA-256:

`eb2449ea9963902c6ab8181669abd1a28f8e7da8105b6253eafe696ce060b307`

It is followed by the original 13 unchanged V3 migrations.

Production migration history is aligned with that repository order.

## Production state

Production Supabase:

`bqrwcgortfmjjdywqzqu`

Phase 4 added only the historical marker:

`20260815000000 v3_core_baseline`

The baseline SQL was not executed on production.

Production business row counts did not change during the repair.

No V4 Relation objects exist.

## Staging state

Staging Supabase:

`vgbubxgjbfjnlcywllwc`

Staging remains `ACTIVE_HEALTHY`.

Its Phase 3 baseline + 13 migration proof history is unchanged.

Do not assume staging migration timestamps are repository filename timestamps;
they are connector execution timestamps.

## V3 safety foundation

Phase 3 and Phase 3C established:

- reproducible V3 core baseline;
- baseline + unchanged 13 migrations rebuild successfully on an empty isolated database;
- corrected sequence grants for:
  - `public.orders_order_number_seq`
  - `public.trips_trip_number_seq`
- roles:
  - `anon`
  - `authenticated`
  - `service_role`
- privileges:
  - `USAGE`
  - `SELECT`
  - `UPDATE`

Phase 4 then aligned repository and production migration history.

## Relation implementation is still absent

The following have not been created:

- `relations`
- `relation_stops`
- `relation_order_allocations`
- `relation_events`
- Relation RPC functions
- Relation permissions
- Relation Planner UI
- Dispatcher Relation UI
- Relation map/calendar
- Relation-to-Trip materialization

Any Phase 5 plan must begin from the current `dev` branch and inspect live
GitHub/Supabase state before changes.

## Existing architectural constraints to preserve

- `main` is production; development occurs on `dev`.
- Critical multi-table mutations belong in transactional PostgreSQL RPCs.
- Concurrency-sensitive operations use locks and DB constraints.
- Supabase/RLS is the source of authorization truth.
- No service-role secret belongs in frontend code.
- Existing V3 functions and behavior remain protected unless an approved Phase 5
  design explicitly changes them.
- Existing 13 migrations must remain immutable.
- The historical baseline must never be executed manually on populated production.

## Fleet / Trip constraints to preserve

- A ready composition is Driver + Truck + Trailer.
- Active assignment uniqueness remains DB-enforced.
- Composition cannot change while a truck has an active Trip.
- `trip_segments` keep history with maximum one active segment per Trip.
- Segment Driver/Truck/Trailer identity is derived backend-side from the locked
  active vehicle assignment.
- Active segment: no `end_km`, no `ended_at`.
- Completed segment: both `end_km` and `ended_at`.
- One `order_assignment` maps to one `trip_stop`.
- Official unloaded BIOEXIS weight remains mandatory on Trip finish.
- Driver archive/payable km remains segment-based.

## Security findings to carry forward separately

Do not silently mix security hardening into Relation implementation:

- Six Driver handoff SECURITY DEFINER RPCs have broader `anon EXECUTE`.
- Legacy broad table grants/default privileges remain.
- Production public default ACL rows are `6`; staging are `0`.
- Supabase leaked-password protection is disabled.

## Phase 5 planning gate

Before Phase 5 implementation:

1. Verify current `dev` and `main` SHAs.
2. Read `docs/V4-PHASE-3-BASELINE-PROOF.md`.
3. Read `docs/V4-PHASE-3C-SEQUENCE-ACL-CORRECTION.md`.
4. Read `docs/V4-PHASE-4-BASELINE-ACTIVATION.md`.
5. Inspect current migrations, schema and permissions.
6. Create a separate approved Phase 5 implementation plan.
7. Do not modify production or `main` before that plan is approved.
