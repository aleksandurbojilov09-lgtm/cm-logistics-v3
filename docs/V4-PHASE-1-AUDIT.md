# K3 Logistics V4 — Phase 1 Technical Audit

Generated: 2026-08-18

## Scope

Phase 1 protects the working V3 production baseline and audits the current repository and Supabase architecture.

No V4 business flow, relation tables, dispatcher UI, RBAC changes, production schema changes, or production behavior changes are allowed in this phase.

---

## Block 1A — GitHub verification and V3 freeze

Status: **COMPLETE**

### Verified GitHub baseline

- Repository: `aleksandurbojilov09-lgtm/cm-logistics-v3`
- Production branch: `main`
- Development branch: `dev`
- Verified `main` SHA:
  `4fb51dd0fb207e1642325ad60a83ca3bfd51e103`
- Verified `dev` SHA before Phase 1 documentation:
  `4fb51dd0fb207e1642325ad60a83ca3bfd51e103`
- Commit message:
  `Fix password reset for active clients`
- `main` and `dev` were identical at the V3 freeze point.

### Stable V3 rollback point

Annotated tag created and pushed:

`v3.0.0-stable`

Verified target SHA:

`4fb51dd0fb207e1642325ad60a83ca3bfd51e103`

GitHub comparison between `v3.0.0-stable` and `main` returned:

- status: `identical`
- ahead_by: `0`
- behind_by: `0`

This tag is the verified rollback marker for the working V3 production baseline.

### Verified production workflows

All relevant GitHub Actions runs were verified against exact commit:

`4fb51dd0fb207e1642325ad60a83ca3bfd51e103`

| Workflow | Run ID | Status | Conclusion |
|---|---:|---|---|
| Build K3 Logistics V3 | 32098559704 | completed | success |
| Supabase Database | 32098559716 | completed | success |
| Supabase Edge Functions | 32098559668 | completed | success |
| Deploy K3 Logistics to Cloudflare | 32098559774 | completed | success |
| Deploy K3 Logistics V3 to Pages | 32098559677 | completed | success |

All five runs reported the exact production SHA above.

### Freeze result

The V3 baseline is protected by a verified stable tag.

No merge from `dev` to `main` was performed.

No production application code, database schema, business data, roles, permissions, or runtime behavior was changed by Block 1A.

The only repository-side production operation in Block 1A was creation and push of the stable Git tag.

---

## Phase 1 progress

- 1A — GitHub verification and V3 freeze: **COMPLETE**
- 1B — Repository and workflow audit: **COMPLETE**
- 1C — Supabase schema and migration audit: **COMPLETE**
- 1D — Current business flow mapping: **COMPLETE**
- 1E — V4 gap analysis and Phase 2 inputs: **COMPLETE**

---

## Verified facts vs proposals

Everything documented in Block 1A above is a verified fact.

No V4 architectural proposal is treated as implemented or final by this section.

---

## Block 1B — Repository and workflow audit

Status: **COMPLETE**

Audit base:

`3e5bbf1eaa4d13b1387c2b29145814db778703f7`

### Application architecture

The active application is a Vite + TypeScript + vanilla HTML/CSS/TypeScript SPA.

Relevant root configuration:

- `package.json`
- `tsconfig.json`
- `wrangler.jsonc`
- `.github/workflows/*`
- `supabase/config.toml`

There is no repository-level Vite config file. Current Vite defaults are used.

`package.json` currently defines:

- `vite` 8.2.0
- `typescript` 7.0.2
- `@supabase/supabase-js`
- `npm run build`
- `npm run k3:check`

`tsconfig.json` uses strict TypeScript, ES2022/ESNext and Bundler module resolution.

Cloudflare serves `./dist` as a single-page application and includes the `k3logistic.com` custom-domain route.

### Active source structure

Active application code is under:

- `src/app`
- `src/entities`
- `src/features`
- `src/pages`
- `src/shared`

Relevant operational features:

- `src/features/orders`
- `src/features/trips`
- `src/features/fleet`

Relevant operational pages:

- `src/pages/admin`
- `src/pages/dispatcher`
- `src/pages/driver`
- `src/pages/client`

### Routing and operational portal model

`src/app/router.ts` defines these application routes:

- `login`
- `admin`
- `dispatcher`
- `driver`
- `client`

Authenticated routing is based on the user's primary role.

`src/features/auth/get-current-role.ts` resolves the role through:

`get_my_primary_role`

The authenticated role maps directly to the corresponding portal route.

`src/pages/dispatcher/dispatcher-page.ts` does not implement an independent dispatcher workspace.

It delegates directly to:

- `renderOperationsPage("dispatcher")`
- `initializeOperationsPage("dispatcher")`

from:

`src/pages/admin/admin-page.ts`

Therefore current V3 Admin and Dispatcher share the same operational page architecture.

The current dispatcher UI hides the `system` section while the other operational sections are shared.

The saved active view is stored only as a UI preference in `sessionStorage`; it is not business state.

Backend authorization remains the required security boundary.

### Relevant repository map

#### Orders

`src/features/orders/client-orders-service.ts`

Responsibilities:

- client portal context
- client order reads
- create client order
- update client order

RPC callers:

- `orders_create_client`
- `orders_update_client`

Direct table reads include:

- `profiles`
- `client_users`
- `client_companies`
- `client_sites`
- `orders`
- nested `order_assignments`

`src/features/orders/admin-orders-service.ts`

Responsibilities:

- operational orders workspace
- remaining load calculations
- ready fleet composition calculations
- loading-warning lookup
- assignment/cancellation operations

RPC callers:

- `orders_assign_location_load`
- `orders_cancel_assignment`

Direct table reads include:

- `orders`
- `order_assignments`
- `trip_stops`
- `discrepancies`

`src/pages/admin/sections/orders-section.ts`

Responsibilities:

- current dispatcher-style orders workspace
- active truck selection
- order/location selection
- assignment UI
- operational map integration

`src/pages/admin/sections/orders-location-grouping.ts`

Responsibilities:

- physical location grouping
- assignable order ordering
- remaining quantity aggregation

Verified location identity:

`company_id + site_id`

Fallback for invalid legacy rows:

`order:<order_id>`

Verified allocation ordering:

1. `created_at`
2. `id`

`src/pages/admin/sections/orders-map.ts`

Responsibilities:

- current operational order map
- grouped location markers
- truck route markers
- quick assignment actions
- reuse of the same location-grouping module

### Capacity rule

Frontend planning constant:

`MAX_TRUCK_TONS = 24`

Database assignment RPC:

`orders_assign_location_load`

uses:

`24000 kg`

The DB function locks the selected truck and relevant open orders and allocates oldest-first.

Capacity protection therefore already has a DB-side boundary and is not only a frontend calculation.

### Current order assignment boundary

The frontend does not directly insert `order_assignments`.

`assignLocationLoad()` calls:

`orders_assign_location_load`

That RPC resolves the physical location, locks relevant records, enforces remaining capacity and oldest-first allocation, and delegates each per-order slice to:

`orders_assign_load`

The exact underlying definition of the older `orders_assign_load` RPC must be verified against the real database during Block 1C.

### Trips

`src/features/trips/admin-trip-service.ts`

Current RPC callers:

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

`src/features/trips/driver-trip-service.ts`

Current RPC callers:

- `trips_get_driver_state`
- `trips_start_driver`
- `trips_mark_stop_loaded`
- `trips_finish_driver`

`trips_finish_driver` is called with end odometer plus mandatory official BIOEXIS kilograms.

`src/features/trips/driver-handoff-service.ts`

Current RPC callers:

- `trips_get_driver_handoff_state`
- `trips_list_driver_handoff_candidates`
- `trips_request_driver_handoff`
- `trips_cancel_driver_handoff`
- `trips_reject_driver_handoff`
- `trips_accept_driver_handoff`

`src/features/trips/driver-interaction-service.ts`

Current RPC callers:

- `trips_get_driver_interactions`
- `trips_send_eta_before_start`
- `trips_send_eta_current`
- `trips_report_discrepancy`

`src/features/trips/driver-truck-change-service.ts`

Current RPC callers:

- `trips_get_driver_truck_change`
- `trips_driver_confirm_truck_change`

`src/features/trips/admin-archive-service.ts`

RPC caller:

- `trips_admin_get_driver_archive`

`src/features/trips/driver-archive-service.ts`

RPC caller:

- `trips_get_driver_archive`

`src/features/trips/admin-bioexis-report-service.ts`

RPC caller:

- `trips_admin_get_bioexis_report`

### Trip lifecycle creation boundary

The frontend does not directly create:

- `trips`
- `trip_stops`
- `trip_segments`

Those mutations are delegated to PostgreSQL RPC lifecycle operations.

The frontend trip-start boundary is:

`trips_start_driver`

Administrative mutation of existing/future stops is also RPC-based.

Driver handoff and truck-change flows are RPC-based and may close/create segment and vehicle-assignment history.

The exact INSERT/UPDATE statements, transaction boundaries and DB locks for these lifecycle operations are intentionally deferred to Block 1C, where the real database functions must be inspected rather than inferred.

### Fleet

`src/features/fleet/fleet-service.ts`

Current RPC callers:

- `fleet_get_snapshot`
- `fleet_create_truck`
- `fleet_create_trailer`
- `fleet_set_permanent_composition`
- `fleet_release_truck`

The frontend fleet model recognizes:

- `permanent`
- `temporary_for_trip`

The fleet snapshot includes:

- trucks
- trailers
- drivers
- home trucks
- active vehicle assignments
- locked truck IDs

### Relevant current UI modules for future V4 integration

Likely integration points for later phases:

- `src/pages/admin/admin-page.ts`
- `src/pages/dispatcher/dispatcher-page.ts`
- `src/pages/admin/sections/orders-section.ts`
- `src/pages/admin/sections/orders-map.ts`
- `src/pages/admin/sections/orders-location-grouping.ts`
- `src/features/orders/admin-orders-service.ts`
- `src/features/trips/admin-trip-service.ts`
- `src/features/fleet/fleet-service.ts`

These are findings only.

No refactor or V4 implementation is authorized in Phase 1.

### Large or mixed modules

Several current UI modules are large and/or contain multiple responsibilities, including operational order, trip, fleet, archive and report sections.

They are candidates for later extraction only where V4 requires a clean reusable boundary.

They must not be refactored merely for cleanup during Phase 1.

In particular:

- do not refactor `orders-section.ts`
- do not refactor `orders-map.ts`

### Legacy repository artifact

The repository contains a path outside the active source tree:

`GITHUB → src/pages/admin/sections/trips-editing.css`

The active application source remains under normal `src/`.

This duplicate/legacy-looking artifact must not be treated as authoritative application code and must not be deleted during Phase 1.

### Workflow map

`.github/workflows/build.yml`

- push: `main`, `dev`
- pull request: `main`
- installs with `npm ci`
- builds with `npm run build`

`.github/workflows/supabase-db.yml`

Triggered by relevant migration/config changes.

- `dev`: linked DB migration dry-run
- `main`: real linked DB migration deployment

`.github/workflows/deploy-supabase-functions.yml`

Triggered by Edge Function/config changes.

- `dev`: Deno check
- `main`: Deno check plus Edge Function deployment

`.github/workflows/cloudflare.yml`

- `main` only
- builds and deploys to Cloudflare

`.github/workflows/pages.yml`

- `main` only
- builds and deploys GitHub Pages

### Modules explicitly protected from Phase 1 change

Do not change current behavior in:

- client portal
- driver portal
- archives
- BIOEXIS
- password recovery
- discrepancies
- registrations
- fleet business behavior
- current order assignment behavior

### Block 1B unresolved items transferred to Block 1C

The repository proves the frontend caller boundaries but does not by itself prove the complete live SQL implementation of every older core RPC.

Block 1C must therefore verify against the real Supabase database:

- exact core RPC definitions
- exact creation points for `order_assignments`, `trips`, `trip_stops`, `trip_segments`
- locking behavior
- grants
- RLS
- constraints
- whether all required historical/core migrations exist in the repository

No assumption from the old handoff is accepted as proof.

---

## Block 1C — Supabase schema and migration audit

Status: **COMPLETE**

Live project verified:

- Supabase project name: `cm-logistics-v3`
- Project ref: `bqrwcgortfmjjdywqzqu`
- Status during audit: `ACTIVE_HEALTHY`
- Region: `eu-central-1`

All live-database inspection performed in this block was read-only.

No migration, DDL, DML, role change, grant change or production data change was executed.

### Migration history

Repository contains exactly 13 migration files:

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

The live `supabase_migrations.schema_migrations` table contains the exact same 13 versions and names.

### Migration baseline status

**INCOMPLETE**

The live production database contains the complete core V3 schema, RBAC model, fleet model and core order/trip RPCs, but the repository migration history begins only at:

`20260815162400_create_fixed_locations`

The migrations that originally created the following core objects are not present in the repository:

- core profiles/RBAC schema
- client companies/sites/users
- orders
- order assignments
- drivers
- trucks
- trailers
- driver home trucks
- vehicle assignments
- trips
- trip stops
- trip segments
- many core helper functions
- many core lifecycle RPCs
- original indexes, constraints, RLS and grants

Therefore an empty Supabase database **cannot be reconstructed from the current repository migrations alone**.

This is a reproducibility gap, not evidence that the current production schema is missing or broken.

A reproducible baseline must be created safely in a later phase. No baseline migration is created in Phase 1.

### Relevant live tables

All required relevant tables exist in `public` and have RLS enabled:

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
- `trips`
- `trip_stops`
- `trip_segments`
- `drivers`
- `trucks`
- `trailers`
- `driver_home_trucks`
- `vehicle_assignments`

### Verified status values

`orders.status`:

- `pending`
- `partial`
- `assigned`
- `in_progress`
- `completed`
- `cancelled`

`order_assignments.status`:

- `assigned`
- `accepted`
- `en_route`
- `arrived`
- `loaded`
- `completed`
- `cancelled`

`trips.status`:

- `planned`
- `active`
- `completed`
- `cancelled`

`trip_stops.status`:

- `waiting`
- `en_route`
- `loaded`

`trip_segments.status`:

- `active`
- `completed`

`vehicle_assignments.assignment_mode`:

- `permanent`
- `temporary_for_trip`

`roles.code`:

- `admin`
- `dispatcher`
- `driver`
- `client`

### Orders — verified database invariants

`orders` contains both canonical integer kilograms and compatibility/display tons.

Important columns include:

- `id`
- `order_number`
- `company_id`
- `site_id`
- `requested_kg`
- `requested_tons`
- `note`
- `status`
- company/site snapshots
- coordinates snapshots
- `loading_ramp_snapshot`
- `created_by`
- `completed_at`
- `cancelled_at`
- `created_at`
- `updated_at`

DB constraints verify:

- `requested_kg > 0`
- `order_number` is unique
- company and site must match through composite FK:
  `(company_id, site_id) -> client_sites(company_id, id)`
- required snapshots cannot be blank
- coordinate snapshots must be both null or both present
- terminal timestamps must match terminal status
- exact status list is DB-enforced

### Order assignments — verified database invariants

Important columns include:

- `order_id`
- `vehicle_assignment_id`
- `driver_id`
- `truck_id`
- `trailer_id`
- nullable `trip_id`
- `assigned_kg`
- `loaded_kg`
- `status`
- composition snapshots
- `assigned_by`
- `assigned_at`
- `completed_at`
- `cancelled_at`
- `cancelled_by`

DB constraints verify:

- `assigned_kg > 0`
- `loaded_kg` cannot be negative
- started assignment states require `trip_id`
- terminal timestamps must match status
- composition references are real FKs

Critical DB triggers:

`cm_private.enforce_order_assignment_capacity()`

- locks the Order
- blocks moving an existing assignment to another Order
- prevents total non-cancelled assignment kg from exceeding requested kg

`cm_private.enforce_truck_assignment_capacity()`

- locks the Truck
- blocks rewriting the historical composition of an existing assignment
- validates a new assignment against a real active `vehicle_assignment`
- enforces maximum operational truck load of exactly `24000 kg`

`cm_private.enforce_order_requested_capacity()`

- blocks reducing `requested_kg` below already allocated non-cancelled kg

`cm_private.sync_order_allocation_status()`

- locks the Order
- derives current Order status from its assignments
- produces `pending`, `partial`, `assigned`, `in_progress`, or `completed`
- keeps terminal timestamps synchronized

`cm_private.guard_loading_ramp_assignment()`

- loading-ramp cargo cannot be introduced after ordinary addresses
- two different loading-ramp sites cannot coexist on the same operational Truck
- loading-ramp cargo cannot be newly inserted into an already-started Trip
- more cargo from the already-established same ramp remains allowed

Therefore capacity and allocation integrity are not frontend-only rules.

### Current allocation RPCs

`orders_assign_load(uuid, uuid, bigint) -> uuid`

Verified behavior:

- `SECURITY DEFINER`
- empty `search_path`
- requires `orders.manage`
- locks Truck first
- rejects Truck already in an active Trip
- locks/revalidates active composition
- requires permanent ready composition
- locks Order
- enforces Order remaining quantity
- enforces Truck 24,000 kg capacity
- inserts `order_assignments` with composition snapshots

`orders_assign_location_load(uuid, uuid, bigint) -> jsonb`

Verified behavior:

- `SECURITY DEFINER`
- requires `orders.manage`
- physical location identity is `company_id + site_id`
- locks Truck and relevant Orders
- allocation order is `created_at`, then `id`
- maximum Truck capacity is 24,000 kg
- delegates each oldest-first Order slice to `orders_assign_load`

`orders_cancel_assignment(uuid) -> jsonb`

Verified behavior:

- requires `orders.manage`
- locks Truck before assignment
- can cancel only before Trip start:
  `trip_id IS NULL` and status `assigned`
- cancellation preserves history; it does not delete the assignment
- DB trigger recalculates Order status

### Trip table

Important columns:

- `id`
- `trip_number`
- `primary_driver_id`
- `status`
- `note`
- `created_by`
- `started_at`
- `completed_at`
- `cancelled_at`
- `official_unloaded_kg`
- timestamps

DB lifecycle constraints verify:

- `planned`: no started/completed/cancelled timestamps
- `active`: primary driver and `started_at` required
- `completed`: primary driver, started and completed timestamps required
- `cancelled`: `cancelled_at` required
- completed/cancelled timestamps cannot coexist

`official_unloaded_kg`:

- positive when present
- maximum `99999`
- completed trips require an official value for new/updated rows

The completed-weight requirement is currently `NOT VALID`, intentionally preserving older historical rows without invented values.

### Trip stops

Important verified invariants:

- `UNIQUE(order_assignment_id)`
- `UNIQUE(trip_id, stop_number)`
- `stop_number >= 1`
- assigned kg snapshot must be positive
- latitude/longitude ranges are DB checked
- waiting/en-route stops have no `loaded_at`
- loaded stops require `loaded_at`

The unique assignment constraint is DB proof of:

**1 `order_assignment` = 1 `trip_stop`**

### Trip segments

Important verified invariants:

- `UNIQUE(trip_id, segment_number)`
- segment number >= 1
- `start_km >= 0`
- `end_km >= start_km` when present
- active segment:
  - `end_km IS NULL`
  - `ended_at IS NULL`
- completed segment:
  - `end_km IS NOT NULL`
  - `ended_at IS NOT NULL`

Partial unique indexes enforce at most one active segment per:

- Trip
- Driver
- Truck
- Trailer
- Vehicle Assignment

This confirms the historical-multiple / one-active-segment model at DB level.

### Vehicle assignment model

`vehicle_assignments` includes:

- nullable `driver_id`
- `truck_id`
- nullable `trailer_id`
- `assignment_mode`
- nullable `temporary_trip_id`
- nullable `previous_assignment_id`
- `started_at`
- nullable `ended_at`
- `ended_reason`
- timestamps

DB constraints enforce:

- modes are only `permanent` / `temporary_for_trip`
- temporary assignment requires a Driver
- permanent assignment has no `temporary_trip_id`
- temporary assignment requires a `temporary_trip_id`
- end time cannot precede start time

Partial unique indexes enforce only one active assignment for each:

- Driver
- Truck
- Trailer

`driver_home_trucks` independently preserves permanent home ownership:

- primary key: `driver_id`
- unique: `truck_id`

### Fleet RPC locking

`fleet_set_permanent_composition`

- requires `fleet.manage`
- locks Truck, current assignment, home relation, relevant Driver and Trailer
- blocks composition change during active Trip
- blocks normal garage editing of a temporary composition
- protects Home relations when Driver is temporarily away
- validates Driver/Trailer conflicts
- ends previous assignment as history
- writes a new permanent `vehicle_assignment`

`fleet_release_truck`

- requires `fleet.manage`
- locks Truck, Home relation and current assignment
- blocks release while Truck is in active Trip
- blocks release while Home Driver is away in a temporary active Trip
- blocks normal release of temporary composition
- ends current assignment and removes Home relation

### Trip start boundary

`trips_start_driver(bigint) -> jsonb`

Verified live behavior:

- requires authenticated active primary Driver
- rejects second active Trip
- resolves the real active permanent composition
- locks Truck
- locks and revalidates `vehicle_assignment`
- locks all Orders used by the pending cargo in deterministic order
- checks active Driver/Truck/Trailer/Assignment conflicts
- rejects stale cargo assigned to an old composition
- validates active Client/Site and GPS coordinates

Then, in the same PostgreSQL transaction, it:

1. creates `trips`
2. creates the first `trip_segment`
3. creates `trip_stops`
4. links existing `order_assignments` to the new Trip

Current stop ordering at Trip start is:

1. `loading_ramp_snapshot DESC`
2. `order_assignment.assigned_at`
3. `order_assignment.id`

The first stop becomes `en_route`; remaining stops become `waiting`.

Important current V3 boundary:

Although `trips.status` supports `planned`, the normal current flow does **not** create a persistent planned Trip during dispatch assignment.

The actual Trip is created when the Driver presses Start.

### Stop progression

`trips_mark_stop_loaded`

uses an authenticated wrapper and protected internal implementation.

The internal operation:

- locks active Trip/current stop
- locks the next waiting stop
- locks affected Orders in stable order
- changes current stop and assignment to loaded
- changes next stop and assignment to en-route

### Trip completion and official BIOEXIS weight

Authenticated frontend uses:

`trips_finish_driver(bigint, bigint)`

The second parameter is exact official unloaded kg.

The wrapper:

- locks active Trip
- writes official weight
- invokes the existing finish lifecycle inside the same transaction

The old one-argument function is no longer executable by `authenticated`.

Completion lifecycle:

- requires all Trip Stops loaded
- locks active Trip
- locks active Segment
- locks all Orders belonging to the Trip
- closes active Segment with final odometer
- completes non-cancelled assignments
- restores temporary fleet state where required
- marks Trip completed

Trip total km is calculated as the sum of:

`segment.end_km - segment.start_km`

for completed segments.

### Driver handoff lifecycle

`trips_request_driver_handoff`

- locks active Trip and active Segment
- validates handoff km
- validates receiving Driver
- rejects conflicting active Trip/Segment/request
- locks relevant fleet state
- captures restore snapshot
- creates a pending handoff request

`trips_accept_driver_handoff`

- locks request
- locks Trip and outgoing active Segment
- locks/revalidates receiving Driver
- locks relevant active vehicle assignments
- verifies current fleet snapshot still equals captured snapshot
- ends current operational fleet assignments
- creates a new `temporary_for_trip` vehicle assignment on the same Truck/Trailer
- closes Driver 1 Segment at handoff km
- starts Driver 2 Segment at the same handoff km
- moves only waiting/en-route assignment ownership to Driver 2
- preserves loaded historical ownership
- changes `trips.primary_driver_id` to Driver 2

The shared handoff km is an exact boundary and does not duplicate payable distance when segment deltas are summed.

### Truck-change lifecycle

Public truck-change RPCs are authorization/interaction wrappers around restricted internal `_unchecked` functions.

Request flow:

- requires `trips.manage`
- permanent change additionally requires `fleet.manage`
- locks active Trip and Segment
- locks both Trucks in stable order
- locks relevant fleet assignments
- validates operational-load and active-trip conflicts
- captures a fleet snapshot
- creates `pending_driver_km` request

Driver confirmation:

- locks request
- locks Trip and source Segment
- locks both Trucks
- locks relevant Orders
- locks Trip Stops
- locks relevant Vehicle Assignments
- rejects stale snapshot

It then:

- closes old vehicle assignment
- creates replacement vehicle assignment
- closes old Segment
- creates new active Segment
- for waiting/en-route stops:
  - cancels old `order_assignment`
  - creates a replacement assignment on the new Truck
  - rewires the existing `trip_stop`
- leaves loaded Stops and their historical assignments untouched

### Temporary fleet restoration

A live trigger:

`trips_restore_temporary_fleet_before_completion`

calls:

`cm_private.restore_temporary_fleet_before_trip_completion()`

When a Trip transitions from active to completed, the helper restores pending temporary fleet state before completion is finalized.

### RBAC — verified live model

`cm_private.is_active_user()`

requires an active `profiles` row for `auth.uid()`.

`cm_private.has_permission(code)`

requires:

- active user
- requested permission code exists

Then authorization succeeds if either:

- user has any `admin` role, or
- one of the user's roles has that permission in `role_permissions`

This means Admin is a wildcard over all defined permission codes even though Admin currently has no explicit `role_permissions` rows.

`get_my_primary_role()`

returns the user's `is_primary = true` role only when the profile is active.

### Current role/permission matrix

Admin:

- implicit access to every existing permission code through `has_permission`

Dispatcher explicit permissions:

- `clients.manage`
- `clients.read`
- `discrepancies.manage`
- `discrepancies.read`
- `drivers.manage`
- `fleet.manage`
- `fleet.read`
- `orders.manage`
- `orders.read`
- `trips.manage`
- `trips.read`
- `users.read`

Driver:

- no explicit role-permission rows

Client:

- no explicit role-permission rows

The proposed future codes:

- `relations.plan`
- `relations.dispatch`

do not exist and were not created in Phase 1.

### RLS

All relevant tables have RLS enabled.

Important SELECT policies:

- Clients: `clients.read` or membership in own company
- Orders: `cm_private.can_read_order`
- Order assignments: inherited through `can_read_order(order_id)`
- Trips/Stops/Segments: `cm_private.can_read_trip`
- Fleet: own Driver/Home/active composition or `fleet.read`
- Profiles: self or `users.read`

`can_read_order` allows:

- `orders.read`
- client membership of Order company
- Driver with a non-cancelled assignment to the Order

`can_read_trip` allows:

- `trips.read`
- active Driver who is primary Driver
- active Driver who has a Segment in the Trip

Some older overlapping SELECT policies remain on `trips` and `trip_segments`.
They are an audit/hygiene finding, not changed in Phase 1.

### Grants and SECURITY DEFINER findings

Core public RPCs are normally:

- not executable by `anon`
- executable by `authenticated`
- executable by `service_role`

Internal `_unchecked` trip mutation functions are restricted from `authenticated` and are executable by `service_role`.

However, six Driver handoff RPCs currently have `EXECUTE` for `anon`:

- `trips_request_driver_handoff`
- `trips_accept_driver_handoff`
- `trips_cancel_driver_handoff`
- `trips_reject_driver_handoff`
- `trips_get_driver_handoff_state`
- `trips_list_driver_handoff_candidates`

They are `SECURITY DEFINER`.

Supabase Security Advisor independently reports these as:

`Public Can Execute SECURITY DEFINER Function`

with severity `WARN`.

Their current bodies depend on `auth.uid()` and mutation paths reject missing/invalid authenticated identity, but the grants are broader than necessary.

Recommended future action:

- explicitly review and revoke unintended anon EXECUTE grants in a dedicated migration
- do not change them directly in production
- regression-test driver handoff after grant cleanup

This is a verified security-hygiene finding, not a Phase 1 production fix.

### Table-grant hygiene findings

Some older table-level grants are broader than the normal application requirement, including grants to `anon` on tables such as `roles`, `user_roles` and `trip_stops`.

RLS remains enabled and the relevant RLS policy boundaries prevent normal anonymous row access.

These grants should still be normalized as part of a later security/baseline cleanup after tests.

No grant was changed in Phase 1.

### Security Advisor

The live Supabase Security Advisor additionally reports informational tables with RLS enabled but no policies, including:

- `permissions`
- `role_permissions`
- `roles`
- `user_roles`

This is consistent with those tables being intentionally inaccessible through normal row-level API access and used behind SECURITY DEFINER helpers/service operations.

The advisor also reports leaked-password protection as disabled.

These findings are recorded only; Phase 1 does not alter Auth settings.

### Edge Functions — live vs repository

Live active Edge Functions:

- `admin-user-manage` — `verify_jwt = true`
- `admin-client-registration` — `verify_jwt = true`
- `client-register` — `verify_jwt = false`
- `admin-password-reset` — `verify_jwt = true`
- `password-reset-request` — `verify_jwt = false`

This matches `supabase/config.toml`.

No live Edge Function mismatch was found.

### Block 1C conclusion

The current production database schema is real and internally much more complete than the repository migration history.

Critical V3 invariants for:

- allocation
- truck capacity
- one active fleet resource
- trip-stop uniqueness
- trip-segment lifecycle
- one active segment
- fleet handoff/change
- official BIOEXIS weight
- completion history

are protected at database/RPC level.

The critical deficiency is **reproducibility**:

the repository does not contain the original core baseline migrations.

Block 1C is therefore complete, with:

`migration_baseline_status = INCOMPLETE`

It is not blocked because the live schema, constraints, indexes, triggers, RLS, grants and relevant RPC behavior were successfully verified.

---

## Block 1D — Current business flow mapping

Status: **COMPLETE**

This section describes the verified current V3 behavior.

It does not describe the proposed V4 relation workflow.

### Current order-to-trip lifecycle

| Stage | Primary data | Current operation | Result |
|---|---|---|---|
| Client creates request | `orders` | `orders_create_client` | New Order with status `pending` and trusted company/site snapshots |
| Client edits request | `orders` | `orders_update_client` | Quantity/note updated while business execution has not started |
| Dispatcher/Admin allocates cargo | `order_assignments` | `orders_assign_location_load` / `orders_assign_load` | Cargo allocated to current permanent Truck + Driver + Trailer composition |
| Partial allocation | `orders` + `order_assignments` | DB status trigger | Order becomes `partial` |
| Full pre-trip allocation | `orders` + `order_assignments` | DB status trigger | Order becomes `assigned` |
| Driver starts | `trips`, `trip_segments`, `trip_stops`, `order_assignments` | `trips_start_driver` | Real Trip is created atomically |
| Trip operational progress | `trip_stops`, `order_assignments` | `trips_mark_stop_loaded` and related interaction RPCs | Current stop becomes loaded and next stop becomes en-route |
| Driver/truck handoff | fleet + segments + assignments | handoff/truck-change RPCs | Composition history and segment history preserved |
| BIOEXIS finish | `trips`, `trip_segments`, assignments | `trips_finish_driver(end_km, official_unloaded_kg)` | Final segment and Trip completed atomically |
| Archive/reporting | completed Trips and Segments | archive/BIOEXIS RPCs | Trips, cargo and km reported from historical data |

### Client order creation

Current frontend caller:

`src/features/orders/client-orders-service.ts`

RPC:

`orders_create_client(site_id, requested_kg, note)`

Verified behavior:

- requires authenticated user
- validates requested kg > 0
- resolves Site and Company from live DB
- requires active Site and Company
- verifies the user is a member of that Company
- captures trusted snapshots:
  - company
  - site
  - address
  - contact
  - phone
  - coordinates
  - loading-ramp flag
  - creator name
- creates the Order with status `pending`

Physical location identity remains:

`company_id + site_id`

The client does not send free company identity or snapshot values.

### Client order editing

Current frontend caller:

`orders_update_client`

Editing is allowed only while the Order is:

- `pending`
- `partial`
- `assigned`

Editing is rejected after any assignment reaches:

- `accepted`
- `en_route`
- `arrived`
- `loaded`
- `completed`

The requested amount cannot be reduced below already allocated non-cancelled kg.

The function recalculates pre-trip Order status as:

- no allocation → `pending`
- partial allocation → `partial`
- fully allocated → `assigned`

### Current cancellation finding

`orders.status` supports:

`cancelled`

and the schema contains terminal timestamp protection for that state.

However, the current inspected V3 client/admin application flow does not expose a public RPC that cancels the entire Order.

The current public cancellation operation is:

`orders_cancel_assignment(assignment_id)`

It cancels an individual assignment only before Trip start.

That operation:

- preserves the assignment row as history
- sets assignment status to `cancelled`
- does not delete it
- triggers recalculation of the parent Order

Therefore the verified normal application path currently traced for Orders is allocation/completion rather than explicit whole-Order cancellation.

The existence of historical or privileged whole-Order cancellation data must not be interpreted as a current user-facing cancellation workflow without additional evidence.

### Current dispatcher allocation

Admin and Dispatcher currently use the same operational workspace.

Operational Orders include:

- `pending`
- `partial`
- `assigned`
- `in_progress`

Orders available for new allocation exclude:

- `in_progress`
- rows with zero remaining quantity

Current physical-location grouping uses:

`company_id + site_id`

Within a location, allocatable Orders are ordered oldest-first by:

1. `created_at`
2. `id`

### Current assignment boundary

The dispatcher does not directly create a Trip.

Current assignment creates:

`order_assignments`

against the exact current:

- `vehicle_assignment_id`
- Driver
- Truck
- Trailer

with immutable historical composition snapshots.

`orders_assign_load`:

- locks Truck first
- rejects Truck already in active Trip
- requires a valid permanent composition
- locks the Order
- protects Order remaining quantity
- protects 24,000 kg Truck capacity

`orders_assign_location_load`:

- groups by physical location
- locks relevant Orders
- distributes requested kg oldest-first
- delegates each slice to `orders_assign_load`

### Order status transitions

Verified normal lifecycle:

| From | Trigger | To |
|---|---|---|
| new | `orders_create_client` | `pending` |
| `pending` | some but not all requested kg allocated | `partial` |
| `pending` / `partial` | all requested kg allocated | `assigned` |
| `assigned` / `partial` | operational assignment starts | `in_progress` |
| `in_progress` | all non-cancelled requested quantity completed | `completed` |
| `partial` / `assigned` | assignment cancelled before Trip start | recalculated `pending`, `partial` or `assigned` |

`cancelled` is a valid terminal Order status but no current whole-Order cancellation RPC was identified in the inspected application flow.

### Order-assignment status transitions

Verified statuses:

- `assigned`
- `accepted`
- `en_route`
- `arrived`
- `loaded`
- `completed`
- `cancelled`

Current normal Trip-start behavior converts:

- first Trip Stop assignment → `en_route`
- remaining Trip assignments → `accepted`

Loading progression converts:

- current → `loaded`
- next → `en_route`

Trip completion converts all non-cancelled Trip assignments to:

`completed`

Pre-start cancellation converts:

`assigned → cancelled`

### Trip creation

The current V3 dispatcher allocation does not create a persistent planned Trip.

Although `trips.status = planned` exists in the schema, normal current execution creates the Trip at Driver start.

RPC:

`trips_start_driver(start_km)`

This operation locks/revalidates the current composition and pending cargo and atomically creates:

1. one `trips` row
2. first `trip_segments` row
3. one `trip_stops` row for each relevant `order_assignment`
4. links those assignments to the Trip

Current Trip Stop order is:

1. loading-ramp Orders first
2. assignment `assigned_at`
3. assignment `id`

### Trip-stop ownership

DB constraint:

`UNIQUE(trip_stops.order_assignment_id)`

Current verified rule:

**1 order_assignment = 1 trip_stop**

A Trip can therefore contain multiple Orders for the same physical address, but each underlying assignment remains individually represented.

### Trip status lifecycle

Verified DB states:

| State | Required lifecycle timestamps |
|---|---|
| `planned` | no `started_at`, `completed_at`, `cancelled_at` |
| `active` | `primary_driver_id` + `started_at` |
| `completed` | `primary_driver_id` + `started_at` + `completed_at` |
| `cancelled` | `cancelled_at` |

Current normal Driver flow:

`Trip created directly as active → completed`

No current normal dispatcher-created planned Trip is used.

### Trip stop lifecycle

Verified states:

`waiting → en_route → loaded`

At Trip start:

- Stop 1 = `en_route`
- remaining Stops = `waiting`

`trips_mark_stop_loaded`:

- locks current Trip and Stop
- locks next Stop
- locks affected Orders
- marks current Stop loaded
- marks next Stop en-route

All Stops must be loaded before Trip completion.

### Trip segment lifecycle

Each Trip may contain many historical Segments but at most one active Segment.

Initial Trip start creates Segment 1.

A Driver handoff or Truck change:

- closes current Segment
- stores its final km
- creates the next Segment
- preserves composition snapshots

Completion closes the final active Segment.

Segment payable distance is:

`end_km - start_km`

Total Trip km is:

sum of all completed Segment distances.

### Driver handoff

Current handoff keeps the same Truck and Trailer but changes Driver.

Request:

- locks Trip + current Segment
- validates receiving Driver
- locks relevant fleet state
- captures restore snapshot

Acceptance:

- locks and revalidates the request
- ends outgoing operational fleet assignment
- creates temporary assignment for receiving Driver
- closes outgoing Segment at `handoff_km`
- opens receiving Segment at the same `handoff_km`
- changes only active/future Order assignment ownership
- preserves already-loaded historical ownership
- updates `trips.primary_driver_id`

Because one Segment ends at exactly the km where the next begins, distance is not double-counted.

### Truck change

Truck-change flow may be:

- `temporary_for_trip`
- `permanent`

The request validates and locks the involved operational resources.

Driver confirmation:

- closes current vehicle assignment
- closes old Segment
- creates new vehicle assignment
- creates new active Segment
- preserves already-loaded Stops/history
- replaces operational assignments only for waiting/en-route Stops

The existing `trip_stop` rows continue to represent the same operational Stops.

### Fleet assignment lifecycle

Permanent ownership and current operational state are separate.

`driver_home_trucks`

represents permanent Home relation.

`vehicle_assignments`

represents operational composition history.

Normal permanent composition lifecycle:

`no active assignment → permanent assignment → ended historical assignment → replacement permanent assignment`

Temporary Trip lifecycle:

`permanent state → temporary_for_trip state → Trip completion → automatic restoration`

Critical current protections include:

- one active Driver assignment
- one active Truck assignment
- one active Trailer assignment
- no garage composition change while Truck is in active Trip
- temporary assignment cannot be released through normal garage flow
- Home relation is protected while its Driver is temporarily away

### BIOEXIS completion

Frontend uses:

`trips_finish_driver(end_km, official_unloaded_kg)`

Official unloaded kg:

- is exact integer kilograms
- must be from 1 to 99,999
- is written on `trips`
- is written in the same transaction as Trip completion

If the downstream completion lifecycle fails, the weight update rolls back.

Completion then:

- requires all Stops loaded
- locks Trip
- locks final Segment
- locks Trip Orders
- closes Segment
- completes non-cancelled assignments
- restores temporary fleet state
- completes Trip

### Current data ownership

| Business value | Authoritative source |
|---|---|
| Client requested cargo | `orders.requested_kg` |
| Allocated cargo slice | `order_assignments.assigned_kg` |
| Operational loaded assignment qty | `order_assignments.loaded_kg` |
| Official BIOEXIS Trip cargo | `trips.official_unloaded_kg` |
| Stop historical cargo | `trip_stops.assigned_kg_snapshot` |
| Driver/Truck/Trailer history | `trip_segments` + assignment snapshots |
| Payable distance | completed `trip_segments` |
| Trip completion date | `trips.completed_at` |
| Permanent Driver↔Truck home | `driver_home_trucks` |
| Current/historical operational composition | `vehicle_assignments` |

### Archive model

Business timezone is:

`Europe/Sofia`

#### Admin/Dispatcher Driver archive

`trips_admin_get_driver_archive(month)`

Monthly completed Trip count:

- counts Trips whose `completed_at` falls in the selected Europe/Sofia month

Payable km:

- sums completed Segment km
- does not depend on current `trips.primary_driver_id`
- therefore historical Driver handoffs remain payable to their actual Segment Driver

Cargo:

- counted once per completed Trip
- authoritative source is `official_unloaded_kg`
- legacy Trips without official value use historical loaded-assignment fallback

#### Driver self archive

`trips_get_driver_archive(month)`

Returns only that Driver's completed Segments.

Summary contains:

- payable km
- distinct Trip count
- distinct work-day count

Cargo is intentionally not part of the Driver self archive.

#### BIOEXIS archive/report

`trips_admin_get_bioexis_report`

uses completed Trips for the selected Trailer.

For each Trip:

- cargo is counted once
- official unloaded kg is preferred
- legacy fallback uses loaded assignment kg
- Trip km is the sum of completed Segment km

Flat BIOEXIS rows may contain multiple Segment rows for one Trip.

Cargo is emitted only on the first Segment row to prevent double-counting.

### Multi-day archive behavior

The Admin archive frontend contains explicit multi-day span presentation state:

- `spanningSegments`
- `spanStartsHere`
- `spanEndsHere`

Database archive calculations do not split odometer distance into synthetic per-day kilometre slices.

A completed Segment remains one distance record.

Its archive work date is based on Segment `ended_at` in `Europe/Sofia`.

Trip operational monthly count is based on Trip `completed_at` in `Europe/Sofia`.

Therefore current V3 keeps:

- Trip counting
- cargo counting
- Segment payable km

as separate ownership concepts.

### Current RBAC matrix

| Capability | Admin | Dispatcher | Driver | Client |
|---|---|---|---|---|
| Existing defined permission codes | wildcard via `has_permission` | explicit role permissions | no generic operational grants | no generic operational grants |
| `orders.read` | yes | yes | contextual RLS only | own-company contextual RLS |
| `orders.manage` | yes | yes | no | own RPCs only |
| `trips.read` | yes | yes | own Trip/Segment context | no generic Trip access |
| `trips.manage` | yes | yes | Driver lifecycle RPCs only | no |
| `fleet.read` | yes | yes | own/current fleet context | no |
| `fleet.manage` | yes | yes | no | no |
| `discrepancies.read/manage` | yes | yes | Driver report operation only | no |
| `relations.plan` | does not exist | does not exist | does not exist | does not exist |
| `relations.dispatch` | does not exist | does not exist | does not exist | does not exist |

Admin wildcard behavior applies only to permission codes that actually exist in `permissions`.

### Current concurrency / transaction boundaries

Critical mutations are PostgreSQL RPC calls.

Each RPC invocation executes in one database transaction.

Verified lock patterns include:

- assignment: Truck → composition → Order
- assignment cancellation: Truck → assignment
- Trip start: Truck → composition → involved Orders
- stop progression: Trip/current Stop → next Stop → Orders
- Driver handoff: request/Trip/Segment → receiving Driver → relevant fleet assignments
- Truck change: request/Trip/Segment → Trucks in stable order → Orders → Stops → vehicle assignments
- Trip finish: Trip → Segment → Orders

DB trigger guards provide an additional concurrency boundary for:

- Order over-allocation
- Truck 24,000 kg capacity
- immutable historical composition
- assignment/status synchronization

### Block 1D conclusion

Current V3 has a clear operational boundary:

**Dispatcher allocation creates cargo assignments, not Trips.**

The real Trip and its ordered Stops become historical/operational entities only when the Driver starts.

This is the most important current-flow fact for the V4 relation-to-Trip integration design in Block 1E.

---

## Block 1E — V4 gap analysis and Phase 2 inputs

Status: **COMPLETE**

This section separates verified V3 facts from proposed V4 architecture.

No recommendation in this section was implemented during Phase 1.

### Verified V3 gaps

The current production schema contains no dedicated Relation/Route/Planning tables.

Current `trips` contains no:

- `relation_id`
- planned load date
- expected return date
- planning revision

Current permission codes do not include:

- `relations.plan`
- `relations.dispatch`

The current V3 dispatch boundary is:

`Order -> order_assignment -> Driver start -> Trip`

A current `order_assignment` already requires an operational Truck/Driver/Trailer composition.

Therefore current `order_assignments` are not suitable as Planner-stage reservation records.

### Recommended V4 boundary

**Proposal: Relation owns planning; Trip owns execution and history.**

The new planning layer should exist before the current Trip boundary.

Before Trip start, Relation should own:

- ordered operational locations
- underlying Order allocations
- planned load date
- expected return date
- Planner/Fleet workflow state
- intended Fleet composition
- revision/concurrency state
- planning audit history

After Trip start, existing V3 operational/history ownership should remain:

- `order_assignments`
- `trips`
- `trip_stops`
- `trip_segments`
- odometer history
- composition history
- official BIOEXIS kilograms
- archives

### Recommended future concepts

Phase 2 should design, but not assume final names for:

1. Relation header
2. ordered Relation Stop
3. Relation Order Allocation
4. Relation audit event
5. user-scoped Dispatcher capability

### Physical location and Order identity

Verified V3 physical location identity is:

`company_id + site_id`

Existing:

`orders-location-grouping.ts`

already implements this identity and oldest-first ordering.

Oldest-first is:

1. `orders.created_at`
2. `orders.id`

Several Orders at one physical address may be grouped visually and operationally, but underlying Order records must remain separate.

### Recommended Relation allocations

A future Relation allocation should reference the actual:

`orders.id`

and store integer kilograms.

One Relation physical Stop may contain several underlying Order allocations.

This preserves the existing historical invariant:

`1 order_assignment = 1 trip_stop`

when the Relation is later materialized into a real Trip.

### Reservation recommendation

Recommended default:

- `draft` does not hard-reserve Order quantity
- `sent` reserves quantity
- `assigned` keeps the reservation
- withdrawal `sent -> draft` releases reservation
- Trip start converts reservation to operational history

Reason:

An unfinished Planner draft should not indefinitely block valid Order quantity.

This remains a proposal requiring Phase 2 approval.

### Over-allocation protection

Future available quantity should account for both legacy operational allocations and V4 reservations.

Recommended formula:

`available_kg = requested_kg - operational_allocated_kg - active_relation_reserved_kg`

Every reservation-changing RPC should:

- lock affected Orders
- use deterministic lock ordering
- re-read current quantities after locking
- reject over-allocation
- commit the mutation atomically

### Relation capacity

Verified business requirement:

one Relation represents one Truck load.

Maximum:

`24000 integer kg`

The DB must enforce this.

Frontend tons remain display/input convenience only.

### Fleet assignment recommendation

Fleet Dispatcher assigns one intended:

- Truck
- Driver
- Trailer

Relation should store the selected planning identity and audit information.

At real Trip start the backend must re-resolve and lock the actual current `vehicle_assignment`.

The frontend must not be trusted to provide stale composition truth.

If the intended composition is no longer valid, start must fail safely.

### Truck conflicts

Future Fleet assignment must lock the selected Truck before validation.

It must reject conflicts including:

- active Trip
- incompatible legacy pending load
- conflicting assigned Relation
- invalid Driver/Truck/Trailer composition

Open business decision:

Can a Truck hold more than one future assigned Relation when planned ranges do not overlap?

If no, use a simple single-active-future-assignment invariant.

If yes, Phase 2 should design DB-protected date-range conflict prevention.

### Recommended Relation-to-Trip transaction

Recommended Trip-start materialization:

1. lock Relation
2. verify Relation status and revision
3. lock selected Truck
4. resolve and lock real active Fleet composition
5. lock Relation allocations
6. lock underlying Orders in deterministic order
7. verify reservations
8. create operational `order_assignments`
9. create one Trip
10. create first `trip_segment`
11. create one `trip_stop` per assignment
12. link Relation and Trip
13. consume/release planning reservations
14. commit atomically

Failure at any step must roll back the entire operation.

### Relation-to-Trip cardinality

Recommended invariant:

**one started Relation -> exactly one Trip**

The one-to-one link should be DB protected.

After start, operational truth remains the existing Trip model.

### Withdrawal

Planner may perform:

`sent -> draft`

only when:

- no Fleet composition is assigned
- no Trip is linked

Withdrawal should release Relation reservations in the same transaction.

### Assigned Relation editing

Fleet Dispatcher may edit an assigned Relation only before real Trip start.

Recommended checks:

- no linked Trip
- correct expected revision
- rerun capacity validation
- rerun Order reservation validation
- rerun Fleet conflict validation

After Trip creation, Relation planning mutations must be rejected.

### Reorder, move and swap

Cross-Relation reorder/move/swap should be one PostgreSQL transaction.

Recommended deterministic lock sequence:

1. involved Relation headers ordered by ID
2. affected Stops ordered by ID
3. affected Orders ordered by ID
4. Fleet resources where necessary

### Optimistic concurrency

Recommended Relation field:

`revision bigint`

Planning mutations should require:

`expected_revision`

Use both:

- PostgreSQL row locks for correctness
- optimistic revision for stale-screen detection

Successful mutation increments the Relation revision.

### Audit events

Future Relation audit history should record important changes such as:

- created
- sent
- withdrawn
- Fleet assigned
- Fleet changed
- Stop reordered
- Stop moved
- Stops swapped
- allocation changed
- Trip started

Audit records must be server-side business data, never browser-local history.

### Dispatcher capabilities

Verified current primary role for both operational Dispatcher users is:

`dispatcher`

Recommended future direction:

keep role-based routing as `dispatcher`, but distinguish Planner and Fleet authority with user-scoped capabilities.

Candidate permission codes:

- `relations.plan`
- `relations.dispatch`

These codes are proposals only and were not created in Phase 1.

Admin wildcard semantics must remain compatible.

### UI reuse

Strong reuse/reference candidates:

- shared Supabase client
- shared Leaflet loader
- routing/auth foundation
- HTML utilities
- location identity logic
- oldest-first logic

`orders-location-grouping.ts` is a strong pure-logic reuse/extraction candidate.

`orders-map.ts` should be treated mainly as behavioral/visual reference because it is coupled to existing Order Assignment and selected-Truck state.

The V4 Relation list and map should share one authoritative Stop-number source.

### Minimum two-date Trip rule

Verified existing Trip timestamps are:

- `started_at timestamptz`
- `completed_at timestamptz`

Recommended V4 completed-Trip rule:

`(completed_at AT TIME ZONE 'Europe/Sofia')::date >
 (started_at AT TIME ZONE 'Europe/Sofia')::date`

This is a calendar-date rule, not a 24-hour duration rule.

Payable km must remain:

sum of completed Segment odometer deltas.

Do not split or duplicate km across calendar dates.

### Archive compatibility

Existing archive ownership should remain:

- Trip count -> `trips.completed_at`
- official cargo -> `trips.official_unloaded_kg`
- payable km -> completed `trip_segments`

Relation planning dates must not replace actual Trip timestamps in operational archives.

### Legacy coexistence

During V4 rollout, old V3 Order Assignment operations and new Relation reservations may coexist temporarily.

Phase 2 must explicitly prevent:

- one Order quantity being consumed by both models
- one Truck being committed to conflicting legacy/V4 work

This protection must exist in DB/RPC logic, not only in UI.

### Reproducible baseline prerequisite

Verified migration status remains:

`INCOMPLETE`

Recommended future baseline strategy:

1. create a reviewed schema-only V3 core baseline
2. version it before `20260815162400`
3. rebuild an isolated empty Supabase staging project
4. apply baseline plus the existing 13 migrations
5. compare resulting schema with production expectations
6. run V3 regression tests
7. only after proof, deliberately repair production migration history to mark the baseline as already applied
8. never execute baseline DDL against the already-populated production schema

### Staging recommendation

Do not create staging in Phase 1.

Recommended Phase 2 staging:

an isolated empty Supabase project in the same region, primarily to prove repository reproducibility before V4 feature migrations.

No paid service is authorized by this recommendation.

### Security findings carried forward

Future separately tested security cleanup should review:

- unintended `anon` EXECUTE on six Driver handoff SECURITY DEFINER RPCs
- broad legacy table grants
- Supabase Auth leaked-password protection setting

Do not silently bundle these changes into unrelated Relation behavior.

### Required Phase 2 test families

Phase 2 planning should include:

- empty DB rebuild
- V3 regression
- 24,000 kg Relation capacity
- oldest-first allocation
- concurrent Planner send
- over-allocation rejection
- withdrawal/release
- stale revision
- reorder
- cross-Relation move
- cross-Relation swap
- Fleet conflicts
- assigned edit before start
- rejection after start
- exactly one Relation -> one Trip
- exactly one Assignment -> one Trip Stop
- stale Fleet composition rollback
- two-Europe/Sofia-date completion
- Driver handoff continuity
- Truck-change continuity
- no cargo double-count
- no km double-count
- archive boundaries
- BIOEXIS official kilograms
- Planner/Fleet capability separation
- Admin compatibility

### Open business questions

Phase 2 requires explicit decisions on:

1. Can one Truck hold multiple future assigned Relations if planned date ranges do not overlap?
2. Should reservation begin at `draft`, or only when Planner sends the Relation? Audit recommendation: reservation begins on send.
3. When several Orders share one physical location, should the Driver perform one grouped physical confirmation or independently progress each underlying Trip Stop?
4. If planned dates change after Fleet assignment, must Fleet assignment be reconfirmed?
5. May Fleet Dispatcher replace Driver/Trailer on an assigned pre-start Relation without first returning it to `sent`?

### Block 1E conclusion

The existing V3 operational Trip/Segment/Fleet/Archive model can be preserved.

Recommended V4 architecture adds a transactional planning/reservation layer before the current Trip boundary.

No V4 schema, permission, UI or production behavior was implemented in Phase 1.
