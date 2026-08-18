# K3 Logistics V4 — Phase 2 Inputs

Generated: 2026-08-18

## Purpose

This file is an input for a separate Phase 2 planning process.

It does not authorize Phase 2 implementation.

## Verified V3 rollback baseline

Stable tag:

`v3.0.0-stable`

Target production SHA:

`4fb51dd0fb207e1642325ad60a83ca3bfd51e103`

Production behavior was not changed by Phase 1.

## Migration baseline

Status:

`INCOMPLETE`

Repository and live migration history contain the same 13 recorded migrations, but the core V3 schema/RPC/RBAC objects predate the first repository migration.

An empty database cannot currently be rebuilt from repository migrations alone.

## Verified existing core tables

- `profiles`
- `roles`
- `permissions`
- `user_roles`
- `role_permissions`
- `client_companies`
- `client_sites`
- `client_users`
- `orders`
- `order_assignments`
- `drivers`
- `trucks`
- `trailers`
- `driver_home_trucks`
- `vehicle_assignments`
- `trips`
- `trip_stops`
- `trip_segments`

## Verified critical RPC names

Client/Orders:

- `orders_create_client`
- `orders_update_client`
- `orders_assign_load`
- `orders_assign_location_load`
- `orders_cancel_assignment`

Fleet:

- `fleet_get_snapshot`
- `fleet_create_truck`
- `fleet_create_trailer`
- `fleet_set_permanent_composition`
- `fleet_release_truck`

Trip lifecycle:

- `trips_start_driver`
- `trips_mark_stop_loaded`
- `trips_finish_driver`

Admin Trip operations:

- `trips_admin_get_active`
- `trips_admin_get_available_orders`
- `trips_admin_move_future_stop`
- `trips_admin_update_stop_load`
- `trips_admin_remove_future_stop`
- `trips_admin_add_order`
- `trips_admin_get_truck_change_options`
- `trips_admin_request_truck_change`
- `trips_admin_cancel_truck_change`
- `trips_admin_get_pending_truck_change`
- `trips_admin_get_pending_truck_changes`

Driver handoff:

- `trips_get_driver_handoff_state`
- `trips_list_driver_handoff_candidates`
- `trips_request_driver_handoff`
- `trips_cancel_driver_handoff`
- `trips_reject_driver_handoff`
- `trips_accept_driver_handoff`

Truck change:

- `trips_get_driver_truck_change`
- `trips_driver_confirm_truck_change`

Archive/BIOEXIS:

- `trips_admin_get_driver_archive`
- `trips_get_driver_archive`
- `trips_admin_get_bioexis_report`

RBAC:

- `get_my_primary_role`
- `has_my_permission`

## Phase 2 planning target

Produce an implementation-ready design for a persistent Relation planning layer.

Planner Dispatcher requirements:

- waiting Client Orders
- map of physical locations
- ordered Relation Stops
- maximum 24,000 integer kg
- planned load date
- expected return date
- draft
- send
- safe withdrawal

Fleet Dispatcher requirements:

- sent Relations
- numbered Stop list/map
- atomic reorder
- atomic move
- atomic swap
- exact Truck + Driver + Trailer assignment
- assigned Relation editing before Trip start

## Concepts Phase 2 must finalize

Exact schema names/columns/statuses for:

- Relation header
- ordered Relation Stop
- Relation Order Allocation
- Relation audit event
- user-scoped Dispatcher capability

## Recommended Relation-to-Trip boundary

Before start:

Relation is planning truth.

After start, existing V3 objects remain operational/history truth:

- `order_assignments`
- `trips`
- `trip_stops`
- `trip_segments`

Recommended invariant:

`1 started Relation = 1 Trip`

## Reservation recommendation

Recommended:

- draft = no hard reservation
- sent = reserved
- assigned = reserved
- withdrawal = releases
- start = converts reservation atomically into operational assignments

Availability must include both legacy operational allocations and active Relation reservations.

## Quantity rules

Canonical unit:

integer kg.

Relation maximum:

`24000 kg`

Oldest-first:

1. `orders.created_at`
2. `orders.id`

Physical location:

`company_id + site_id`

## Stop/history rule

Several Orders may belong to one Relation physical Stop.

Underlying Order records remain separate.

Existing invariant remains:

`1 order_assignment = 1 trip_stop`

Phase 2 must decide Driver UI behavior for multiple underlying Trip Stops at one physical location.

## Concurrency requirements

Critical Relation mutations should use:

- PostgreSQL RPC transactions
- `SELECT ... FOR UPDATE`
- deterministic lock ordering
- Relation `revision`
- caller `expected_revision`

Frontend-only checks are insufficient.

## Fleet conflict decision

Phase 2 must choose:

A. one future assigned Relation per Truck

or

B. several future Relations allowed when planned ranges do not overlap.

If B, design DB-level range conflict protection.

## Minimum Trip duration

Completed Trip must span at least two distinct:

`Europe/Sofia`

calendar dates.

Recommended condition:

local completion date > local start date.

This is not a 24-hour rule.

Segment km must not be split or double-counted by day.

## Capability strategy

Keep routing role:

`dispatcher`

Recommended future user-scoped capability separation.

Candidate codes:

- `relations.plan`
- `relations.dispatch`

These do not currently exist and are not final.

## Reproducible baseline strategy

Before substantial V4 DB work:

1. create reviewed V3 core baseline
2. version before the current first migration
3. rebuild isolated empty staging
4. apply all current migrations
5. compare schema
6. run V3 regression
7. only after proof, deliberately repair production migration history

Never execute core baseline DDL against the populated production schema.

## Staging recommendation

Use an isolated empty Supabase staging project after baseline preparation.

Primary purpose:

prove clean reconstruction before V4 feature migration work.

Do not create paid resources without explicit approval.

## UI reuse

Strong candidates:

- current auth/routing
- shared Supabase wrapper
- shared Leaflet loader
- HTML utilities
- physical-location grouping concept
- oldest-first logic

`orders-location-grouping.ts` is a strong extraction/reference candidate.

Do not copy `orders-map.ts` wholesale because it is coupled to current Order Assignment/Truck state.

List and map must share one authoritative Stop-number source.

## Migration families Phase 2 must plan

No migration is implemented here.

Plan:

- V3 reproducible core baseline
- Relation schema
- Relation constraints/indexes
- reservations
- audit events
- Relation RLS
- Dispatcher capabilities
- Relation RPC grants
- Relation-to-Trip link
- Trip-start integration
- minimum two-date completion guard
- legacy/V4 coexistence guards
- separately scoped security-grant cleanup

## Test families

Plan tests for:

- clean DB rebuild
- current V3 regression
- Relation capacity
- oldest-first
- concurrent reservations
- over-allocation
- withdrawal
- revision conflicts
- reorder
- move
- swap
- Fleet conflicts
- assigned edits
- one Relation -> one Trip
- one Assignment -> one Trip Stop
- Trip-start rollback
- two-date completion
- handoff
- Truck change
- temporary Fleet restoration
- archive
- BIOEXIS
- no cargo double-count
- no km double-count
- RLS
- Planner/Fleet capability isolation
- Admin wildcard compatibility

## Risks and prerequisites

Major prerequisites:

- repair migration reproducibility
- preserve existing V3 operational lifecycle
- DB-protect Relation reservations
- DB-protect Fleet scheduling conflicts
- define legacy/V4 coexistence
- explicitly test permission/grant changes
- stage before production rollout

## Business decisions required

1. Can one Truck hold several future assigned Relations when date ranges do not overlap?
2. Does reservation begin on draft or send?
3. How does Driver progress several underlying Orders grouped at one physical Stop?
4. Does date change after Fleet assignment require Fleet reconfirmation?
5. Can Fleet change Driver/Trailer before start while keeping Relation assigned?

## Required Phase 2 output before implementation

Phase 2 should first produce and obtain approval for:

- final data model
- final state machine
- exact RPC contracts
- exact lock order
- exact RLS/grants
- migration order
- staging/baseline sequence
- automated regression plan
- rollout strategy
- rollback strategy

Only after review should implementation begin.
