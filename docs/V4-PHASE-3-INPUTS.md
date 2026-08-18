# K3 Logistics V4 — Phase 3 Inputs

Status: **READY AFTER PHASE 2 HANDOFF SHA VERIFICATION**
Generated: **2026-08-18**
Repository: `aleksandurbojilov09-lgtm/cm-logistics-v3`

---

## 1. Exact GitHub starting point rule

Phase 2 repository start was:

- `main`: `4fb51dd0fb207e1642325ad60a83ca3bfd51e103`
- `dev`: `bec697b966eb1a3877003b93c64caadb07a5ace7`

**Phase 3 exact starting SHA is the `final_dev_sha` from the returned `K3_V4_PHASE_2_COMPLETION` handoff.**

This file is itself part of the Phase 2 final commit, so embedding that commit's own SHA inside its own contents is cryptographically circular. Therefore the authoritative exact SHA is intentionally carried in the Phase 2 completion handoff and must be re-read from GitHub before the first Phase 3 write.

Phase 3 must stop if `dev` is not exactly at that handoff SHA or if unexplained commits/working changes exist after it.

`main` must remain at the verified production baseline until a later explicit production rollout approval.

---

## 2. Authoritative architecture source

Phase 3 must implement only what is approved in:

`docs/V4-PHASE-2-ARCHITECTURE.md`

Source priority remains:

1. current GitHub `dev` at the verified Phase 2 completion SHA;
2. live Supabase catalog/function/grant/constraint state;
3. repository migrations/workflows;
4. Phase 2 architecture document;
5. this Phase 3 input document;
6. V2 Clean only as functional/visual reference.

If live DB or code differs from the Phase 2 assumptions before implementation, stop and document the exact difference rather than silently adapting business rules.

---

## 3. Approved schema objects

New planning objects:

- `public.relations`
- `public.relations_relation_number_seq`
- `public.relation_stops`
- `public.relation_order_allocations` (same-Relation Stop composite FK is `DEFERRABLE INITIALLY IMMEDIATE` for atomic move/swap)
- `public.relation_events`
- `public.user_permissions`

Approved integration columns:

- `public.trips.relation_id uuid NULL UNIQUE`
- `public.trip_stops.relation_stop_id uuid NULL`
- `public.order_assignments.relation_allocation_id uuid NULL UNIQUE`

Approved extension dependency:

- `btree_gist` for resource/date exclusion constraints, created only in the reviewed future migration if still absent.

Approved DB invariant guards in addition to normal row constraints:

- deferrable Relation allocation total guard: `SUM(allocated_kg) <= 24000`;
- deferrable contiguous Relation Stop numbering guard;
- Relation status transition guard;
- immutable Relation event guard;
- allocation Order-to-physical-Stop identity guard.

Approved non-overlap resources:

- `planned_truck_id`
- `planned_driver_id`
- `planned_trailer_id`

Inclusive range:

`daterange(planned_load_date, expected_return_date, '[]')`

Protected statuses:

`assigned`, `in_progress`.

---

## 4. Approved status machine

Statuses:

- `draft`
- `sent`
- `assigned`
- `in_progress`
- `completed`
- `cancelled`

Allowed transitions:

- `draft -> draft` Planner save;
- `draft -> sent` Planner send/reserve;
- `draft -> cancelled` Planner soft cancel;
- `sent -> draft` Planner withdraw/release reservation, only no Fleet/no Trip;
- `sent -> sent` Fleet reorder/move/swap;
- `sent -> assigned` Fleet assign;
- `assigned -> assigned` Fleet reorder/move/swap/date/fleet replacement pre-start;
- `assigned -> sent` Fleet unassign pre-start;
- `assigned -> in_progress` assigned Driver materialization;
- `in_progress -> completed` protected Trip completion.

No reopen of completed/cancelled. No planning mutation after linked Trip exists.

Every Planner/Fleet mutation uses `expected_revision`, row lock and one revision increment per affected Relation.

---

## 5. Approved reservation model

Exact available quantity:

```text
available_kg =
  orders.requested_kg
  - SUM(non-cancelled order_assignments.assigned_kg)
  - SUM(relation allocations whose Relation status is sent or assigned)
```

- draft does not reserve;
- sent reserves;
- assigned holds;
- sent withdrawal releases;
- Relation start atomically transfers ownership to operational `order_assignments`;
- in_progress is not counted as planning reservation;
- Order locks are mandatory for reservation-changing paths.

Legacy capacity guards must become Relation-aware before V4 Send is enabled in production.

---

## 6. Approved permissions

New permission codes:

- `relations.plan`
- `relations.dispatch`

User-scoped mapping:

`public.user_permissions(user_id, permission_id, granted_by, created_at)`

Primary role remains `dispatcher`. Do not create Planner/Fleet auth roles.

Admin retains wildcard compatibility but uses the same Planner/Fleet operational RPCs.

Only primary Admin can grant/revoke the two Relation permissions.

Do not use generic `users.manage` as Relation authorization.

---

## 7. Approved RPC names/signatures

### Planner

- `relations_planner_get_board(p_planned_load_date date DEFAULT NULL) RETURNS jsonb`
- `relations_planner_create_draft(p_planned_load_date date, p_expected_return_date date) RETURNS jsonb`
- `relations_planner_save_draft(p_relation_id uuid, p_expected_revision bigint, p_planned_load_date date, p_expected_return_date date, p_stops jsonb) RETURNS jsonb`
- `relations_planner_send(p_relation_id uuid, p_expected_revision bigint) RETURNS jsonb`
- `relations_planner_withdraw(p_relation_id uuid, p_expected_revision bigint) RETURNS jsonb`
- `relations_planner_cancel_draft(p_relation_id uuid, p_expected_revision bigint) RETURNS jsonb`

### Fleet

- `relations_fleet_get_queue(p_from_date date DEFAULT NULL, p_to_date date DEFAULT NULL) RETURNS jsonb`
- `relations_fleet_get_detail(p_relation_id uuid) RETURNS jsonb`
- `relations_fleet_reorder_stops(p_relation_id uuid, p_expected_revision bigint, p_ordered_stop_ids uuid[]) RETURNS jsonb`
- `relations_fleet_move_stop(p_stop_id uuid, p_from_relation_id uuid, p_from_expected_revision bigint, p_to_relation_id uuid, p_to_expected_revision bigint, p_to_position integer) RETURNS jsonb`
- `relations_fleet_swap_stops(p_left_stop_id uuid, p_left_relation_id uuid, p_left_expected_revision bigint, p_right_stop_id uuid, p_right_relation_id uuid, p_right_expected_revision bigint) RETURNS jsonb`
- `relations_fleet_assign(p_relation_id uuid, p_expected_revision bigint, p_truck_id uuid, p_driver_id uuid, p_trailer_id uuid) RETURNS jsonb`
- `relations_fleet_replace_assignment(p_relation_id uuid, p_expected_revision bigint, p_truck_id uuid, p_driver_id uuid, p_trailer_id uuid) RETURNS jsonb`
- `relations_fleet_change_dates(p_relation_id uuid, p_expected_revision bigint, p_planned_load_date date, p_expected_return_date date) RETURNS jsonb`
- `relations_fleet_unassign(p_relation_id uuid, p_expected_revision bigint) RETURNS jsonb`

### Execution

- `relations_driver_get_state() RETURNS jsonb`
- `relations_start_driver(p_relation_id uuid, p_expected_revision bigint, p_start_km bigint) RETURNS jsonb`
- `trips_mark_relation_stop_loaded(p_relation_stop_id uuid) RETURNS jsonb`
- retain existing `trips_finish_driver(p_end_km bigint, p_official_unloaded_kg bigint) RETURNS jsonb` as the public completion path, with V4 DB guard/synchronization.

### Admin capability

- `relations_admin_set_user_permission(p_user_id uuid, p_permission_code text, p_enabled boolean) RETURNS jsonb`

No implementation may rename these without returning to architecture review.

---

## 8. Approved canonical V4 lock order

Relative order:

1. Relation headers UUID ascending.
2. Relation Stops UUID ascending.
3. Relation allocations UUID ascending.
4. Trucks UUID ascending.
5. active vehicle assignments UUID ascending.
6. driver home-truck rows `(driver_id,truck_id)` when needed.
7. Drivers UUID ascending.
8. Trailers UUID ascending.
9. Orders UUID ascending.
10. operational order assignments UUID ascending.
11. Trips/segments/Trip Stops only when required, deterministic order.

Never reverse Truck -> Order when intersecting legacy V3 capacity flows.

Cross-Relation move/swap locks both headers by UUID before either revision check.

---

## 9. Approved Relation-to-Trip model

Exactly one Relation creates exactly one Trip.

Single link:

`trips.relation_id UNIQUE -> relations.id`

Allocation lineage:

`order_assignments.relation_allocation_id UNIQUE -> relation_order_allocations.id`

Physical group lineage:

`trip_stops.relation_stop_id -> relation_stops.id`

Trip start must:

- lock/verify assigned Relation + expected revision;
- lock planning rows/resources in canonical order;
- resolve/lock real current `vehicle_assignment`;
- require exact Truck/Driver/Trailer match;
- lock/revalidate Orders/reservations;
- reject active resource Trip at **start time** and legacy pending Truck ambiguity;
- note that Fleet planning may assign a future Relation while a previous actual Trip is still active; only start is blocked until actual resources are free and the live composition matches;
- set Relation in_progress in same transaction;
- create one operational assignment per allocation;
- create one Trip;
- create first active segment;
- create one Trip Stop per assignment;
- group Trip Stops through `relation_stop_id`;
- write trip-start event;
- rollback all on any failure.

Legacy `trips_start_driver` must remain during coexistence.

---

## 10. Approved grouped Stop model

Physical identity:

`company_id + site_id`

One Relation Stop = one Driver visit.

Several Orders may exist under it, but:

`1 order_assignment = 1 trip_stop`

New grouped execution RPC atomically marks every underlying Trip Stop/assignment of that physical group loaded and advances the next physical group together.

Legacy single-stop load RPC remains for legacy Trips during rollout.

---

## 11. Approved minimum-date rule

Planning:

`expected_return_date > planned_load_date`

V4 operational completion:

```text
(started_at AT TIME ZONE 'Europe/Sofia')::date
<
(completed_at AT TIME ZONE 'Europe/Sofia')::date
```

Not a 48-hour rule.

During coexistence, apply the DB completion guard to Relation-linked Trips (`relation_id IS NOT NULL`) so legacy active Trips are not retroactively broken.

---

## 12. Approved migration sequence

No V4 Relation migration starts until core baseline proof is green.

1. Reviewed `20260815000000_v3_core_baseline.sql`.
2. Rebuild empty isolated DB from baseline.
3. Apply existing 13 migrations unchanged.
4. Schema/RPC/RLS/grant comparison.
5. V3 regression suite.
6. Explicit approval checkpoint.
7. Deliberate production migration-history repair marking baseline already applied; **never execute baseline DDL against populated production**.
8. Relation foundation migration.
9. Relation RPC migration.
10. RBAC/grants migration.
11. Trip integration migration.
12. Two-date guard migration.
13. Separate later legacy/security cleanup migrations.

Do not run production `supabase db pull` as a shortcut for the missing baseline.

---

## 13. Staging approval checkpoint

Phase 2 created no staging resource.

Verified 2026-08-18 cost check for connected Supabase organization:

- independent project: `$10/month`;
- branch quoted compute: `$0.01344/hour`.

Approved recommendation for first baseline proof:

**independent empty Supabase project**, only after explicit cost approval.

Reason: it proves rebuild independence while production migration history is incomplete.

After baseline repair, branches are preferred candidates for normal preview/testing workflows.

---

## 14. Phase 3 test gates

Before any production Relation enablement, Phase 3 must have automated coverage for:

- empty DB baseline + 13 migrations;
- RLS and explicit grants;
- Planner/Fleet/Admin/Driver permission isolation;
- concurrent Send for the same Order;
- stale revisions;
- 24000 accepted / 24001 rejected;
- inclusive Truck/Driver/Trailer range conflicts;
- sent withdrawal reservation release;
- cross-Relation move/swap full rollback;
- stale Fleet composition at Trip start;
- overdue actual active Trip block;
- exactly one Relation -> one Trip;
- exactly one allocation -> one order_assignment;
- exactly one order_assignment -> one trip_stop;
- grouped physical Stop completion;
- same-Europe/Sofia-date V4 completion rejection;
- valid cross-date completion;
- Driver handoff regression;
- Truck-change/Fleet restore regression;
- no cargo double-count;
- no km double-count;
- archive/BIOEXIS compatibility;
- legacy V3 coexistence.

---

## 15. Exact Phase 3 scope

Phase 3 may begin only after the main chat verifies the `K3_V4_PHASE_2_COMPLETION` handoff and produces a dedicated Phase 3 master prompt.

Recommended Phase 3 scope is **foundation-first implementation**, not the entire V4 UI at once:

1. solve/prove reproducible V3 baseline in an approved isolated environment;
2. create and test Relation foundation schema migration;
3. create and test RBAC/user-scoped permissions/grants;
4. create and test reservation helpers and Planner/Fleet RPC foundations;
5. create Trip integration/grouping/two-date migrations only after preceding gates are green;
6. then add frontend services/workspaces in controlled blocks.

Every implementation block must keep V3 production behavior working.

---

## 16. Explicit Phase 3 forbidden work unless separately approved

- no merge to `main` merely because staging tests pass;
- no baseline DDL execution against populated production;
- no production migration-history repair before isolated rebuild + V3 regression + explicit approval;
- no paid staging resource creation before cost approval;
- no unrelated handoff grant cleanup mixed into Relation migrations;
- no silent broad grant changes;
- no removal of legacy V3 start/load/finish path before coexistence retirement gate;
- no direct frontend table mutation for protected Relation business operations;
- no trusting frontend-provided Fleet composition or reservation truth;
- no hard deletion of sent/assigned/completed Relation history;
- no change to the confirmed business status machine without architecture review.

---

## 17. Security findings carried forward

Keep as separate future security block:

- six verified anon Driver-handoff function grants;
- broad legacy grant/default privilege review;
- Supabase leaked-password protection disabled.

Do not silently fix them inside Relation foundation work.

---

## 18. Remaining approval checkpoints

1. Verify exact final Phase 2 `dev` SHA from `K3_V4_PHASE_2_COMPLETION`.
2. Approve staging cost/resource choice before creation.
3. Approve the reviewed V3 core baseline after empty rebuild evidence.
4. Approve production migration-history repair separately.
5. Approve any later merge/deployment to `main` separately.
6. Approve legacy/security cleanup separately after Relation rollout stability.

There are no remaining **business-architecture** blockers for Relation implementation. The remaining checkpoints are environment, migration-history and production-rollout safety gates.
