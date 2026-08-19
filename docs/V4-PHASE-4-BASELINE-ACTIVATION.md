# K3 Logistics V4 — Phase 4 Baseline Activation

## Status

**SUCCESS — V3 historical baseline activated safely.**

Phase 4 does not implement V4 Relation objects, UI, RPCs or permissions.

## Repository starting state

- Repository: `aleksandurbojilov09-lgtm/cm-logistics-v3`
- Starting `main`: `4fb51dd0fb207e1642325ad60a83ca3bfd51e103`
- Starting `dev`: `6715c6da28ed8c96ba1629ffa8c618f793a8956e`
- Production Supabase: `bqrwcgortfmjjdywqzqu`
- Staging Supabase: `vgbubxgjbfjnlcywllwc`

`main` remained unchanged throughout Phase 4.

## Baseline repository activation

Historical baseline moved by Git rename:

- Old: `supabase/baseline/20260815000000_v3_core_baseline.sql`
- New: `supabase/migrations/20260815000000_v3_core_baseline.sql`

SHA-256 before and after:

`eb2449ea9963902c6ab8181669abd1a28f8e7da8105b6253eafe696ce060b307`

The SQL content was unchanged.

The original 13 post-baseline migrations remained byte-for-byte unchanged.

### Original migration SHA-256 manifest

- `20260815162400_create_fixed_locations.sql` — `7bd7857b3f4e8e33623b624923ef33afec9dbdacb91e5542335649a8bb605717`
- `20260816121500_orders_assign_location_load.sql` — `cc4d1f39d56a75e8f0e906f936074a521fae99be677afc5390e7e1bbbfbb5352`
- `20260816123700_orders_assign_location_load_lock_order.sql` — `470384b802435c25f3186105528602edb0619e7e61754c714242a2a4ef021038`
- `20260816135200_trips_admin_driver_archive.sql` — `0e6c238692fecf9172e9113e2dc51ea5ea72d262e87f3d7f2942180bd4ebe959`
- `20260816143500_trips_get_driver_archive.sql` — `f170d03e6912a7850bd5013cf06c4198c32def87a3687ced83343bccfc768497`
- `20260816154500_trips_admin_bioexis_report.sql` — `2bc66a4d87961356817f1ef22acc863c617b49d947ed2a7d8e36ebab1aedb122`
- `20260817042000_dispatcher_operations_authorization.sql` — `733b12e6ebd6a17b087ced0292f878f2b67851b1931b04b6e37bb29dd6eb0e23`
- `20260817080500_client_single_active_site.sql` — `3e4107b98db19bc8fcf9f4f5030c845d62c02a55aa969ccfe5c1e15df2307ee8`
- `20260817102500_trips_official_bioexis_weight.sql` — `706a72d55c6ebaed8e4259b1eae53220c70320fefc41c1d3ed0142fc0097f34d`
- `20260817104500_official_weight_kg_display_fix.sql` — `4822865b942ec4deeb6aff490af1f25dcca526132a6735511cf0ec8ebcfe7f9c`
- `20260817144000_password_reset_requests.sql` — `64c9c5874ecd7f65b89934982346eef53a7c7b7a3a25f2428a325dd6097eba62`
- `20260817162500_password_reset_admin_workflow.sql` — `1c16bb4decdf0c1ffbb5ab06524a5ea3792ea8f0f8834c00a1b9545dca922c1e`
- `20260818070000_password_reset_active_client_memberships.sql` — `69b07ff951e37cd87f2e508d8935517a4636632e9d1cb01cb18dea0cffb8db8b`

## Supabase CLI and repair method

Preflight CLI:

`Supabase CLI 2.115.0`

CLI help confirmed:

`supabase migration repair [flags] [<version...>]`

with:

`--status applied|reverted`

Executed production administrative operation:

`supabase migration repair 20260815000000 --status applied --linked`

The baseline SQL itself was never executed against populated production.

## Production migration history before

1. `20260815162400 create_fixed_locations`
2. `20260816121500 orders_assign_location_load`
3. `20260816123700 orders_assign_location_load_lock_order`
4. `20260816135200 trips_admin_driver_archive`
5. `20260816143500 trips_get_driver_archive`
6. `20260816154500 trips_admin_bioexis_report`
7. `20260817042000 dispatcher_operations_authorization`
8. `20260817080500 client_single_active_site`
9. `20260817102500 trips_official_bioexis_weight`
10. `20260817104500 official_weight_kg_display_fix`
11. `20260817144000 password_reset_requests`
12. `20260817162500 password_reset_admin_workflow`
13. `20260818070000 password_reset_active_client_memberships`

Baseline marker count before: `0`.

## Production migration history after

1. `20260815000000 v3_core_baseline`
2. `20260815162400 create_fixed_locations`
3. `20260816121500 orders_assign_location_load`
4. `20260816123700 orders_assign_location_load_lock_order`
5. `20260816135200 trips_admin_driver_archive`
6. `20260816143500 trips_get_driver_archive`
7. `20260816154500 trips_admin_bioexis_report`
8. `20260817042000 dispatcher_operations_authorization`
9. `20260817080500 client_single_active_site`
10. `20260817102500 trips_official_bioexis_weight`
11. `20260817104500 official_weight_kg_display_fix`
12. `20260817144000 password_reset_requests`
13. `20260817162500 password_reset_admin_workflow`
14. `20260818070000 password_reset_active_client_memberships`

Baseline marker count after: `1`.

## Production business row counts

Counts immediately before repair:

- roles: 4
- trips: 18
- orders: 11
- trucks: 2
- drivers: 2
- profiles: 10
- trailers: 2
- trip_stops: 29
- user_roles: 10
- permissions: 12
- client_sites: 5
- client_users: 5
- discrepancies: 2
- notifications: 7
- trip_segments: 25
- fixed_locations: 2
- client_companies: 5
- role_permissions: 12
- order_assignments: 44
- driver_home_trucks: 2
- vehicle_assignments: 21
- password_reset_requests: 2
- client_registration_requests: 6

Counts immediately after repair were identical.

## Schema/grant verification

Pre-write fingerprint snapshot:

- RLS: `e53a9ef00ee5fa08fae3cc74c12d6a79`
- Columns: `8ab1022dc2e1cea50d583da5f377eaba`
- Indexes: `4ad4a2930bcb94b3fffa564cf345d461`
- Policies: `553f7563b7c6b841c5bbc85c62eea47f`
- Triggers: `773d1bf0b5bc10de4eebc436da613cd0`
- Functions: `c5b70967a679c3729311f7e04fa06116`
- Constraints: `1315fde51e5463dfdd0c504a7cccafce`
- Table grants: `039774b108d0ced52a8c2f4eda6ceb17`
- Sequence grants: `cad5e2356252d32f2e00b7b7db16993c`
- Function execute grants: `8beb5ff5e5f9362c47ba811a8565be78`

Post-repair canonical fingerprint snapshot:

- RLS: `e53a9ef00ee5fa08fae3cc74c12d6a79`
- Columns: `e3f6efad5f79a4f942419d83acf51de0`
- Indexes: `2020cff0b17553f034e1184f8db7646b`
- Policies: `d8031b5fc0144dc45e71583ec7f0275d`
- Triggers: `773d1bf0b5bc10de4eebc436da613cd0`
- Functions: `f42aaaf47d3b26c98438535b6a50f785`
- Constraints: `1315fde51e5463dfdd0c504a7cccafce`
- Table grants: `039774b108d0ced52a8c2f4eda6ceb17`
- Sequence grants: `cad5e2356252d32f2e00b7b7db16993c`
- Function execute grants: `7367008deba1087b1bad6bc8e9ac6105`

The two snapshots used different serialization for several complex catalog
categories, so unlike hashes are not interpreted as schema differences.
Categories serialized identically match exactly: RLS, triggers, constraints,
table grants and sequence grants.

The administrative workflow itself proves that only migration history repair
was executed. Immediately afterward `supabase db push --linked --dry-run`
reported:

`Remote database is up to date.`

Business row counts were also unchanged.

Production public default ACL rows remain `6`; staging remains `0`. This is the
known Phase 3 security finding and was not modified in Phase 4.

## GitHub execution proof

### Phase 4A repository commit

`3659bbc72a5176a4bd65d5e8766c27478d250ba6`

Message:

`Activate V3 baseline history`

First guarded workflow run:

- Supabase Database run: `32262870152`
- Result: `FAILURE`
- Cause: CLI table output used backticks; parser rejected LOCAL values.
- Safety result: repair command was never reached; no production write occurred.

Guard correction commit:

`bb1002f8ab4d05cbe5b7ebffce1d57d929a9b334`

Message:

`Fix baseline repair guard`

Successful repair workflow:

- Supabase Database run: `32263784685`
- Job: `96103157905`
- Result: `SUCCESS`
- Production ref checked as `bqrwcgortfmjjdywqzqu`
- Log: `Baseline marker missing remotely. Recording historical marker only.`
- Log: `Repaired migration history: [20260815000000] => applied`
- Log: `PHASE4_HISTORY_ALIGNMENT=SUCCESS`
- Dry-run: `Remote database is up to date.`
- Main deployment step: skipped.

## Workflow cleanup

The temporary repair step was removed after successful verification.

`.github/workflows/supabase-db.yml` was restored byte-for-byte from starting
dev commit `6715c6da28ed8c96ba1629ffa8c618f793a8956e`.

## Staging and V4 safety

Staging project remained `ACTIVE_HEALTHY`.

Its migration history remains the original Phase 3 execution-timestamp history
and was not modified in Phase 4.

V4 Relation table count checked for:

- `relations`
- `relation_stops`
- `relation_order_allocations`
- `relation_events`

Result:

`0`

The same result is `0` in production.

No V4 Relation schema, RPC, permission or frontend implementation was started.

## Security findings carried forward

Unchanged and intentionally outside Phase 4:

- Six Driver handoff SECURITY DEFINER RPC functions retain broader `anon EXECUTE`.
- Legacy broad table grants/default privileges remain.
- Production `public` default ACL rows are `6`; staging are `0`.
- Supabase leaked-password protection remains disabled.

## Conclusion

Phase 4 safely activates the proven V3 core baseline in the repository migration
chain and records its missing historical marker in production without executing
baseline DDL and without changing production business data.

The exact final dev SHA and final workflow conclusions are recorded in the
Phase 4 completion handoff after this proof commit is pushed and CI completes.
