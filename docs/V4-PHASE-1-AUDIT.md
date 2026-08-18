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
- 1C — Supabase schema and migration audit: **PENDING**
- 1D — Current business flow mapping: **PENDING**
- 1E — V4 gap analysis and Phase 2 inputs: **PENDING**

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
