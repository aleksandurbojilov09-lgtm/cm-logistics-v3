# K3 Logistics V4 — Phase 3C Sequence ACL Correction

## Status

SUCCESS.

Phase 3C поправя липсващите права върху две V3 sequences.

## Correction

Original baseline SHA-256:

92537e68b5679bd1c869ad88d64c38b529c31c5bea32262c6c1327223cf6b299

Corrected baseline SHA-256:

eb2449ea9963902c6ab8181669abd1a28f8e7da8105b6253eafe696ce060b307

Corrected sequences:

- public.orders_order_number_seq
- public.trips_trip_number_seq

Required roles:

- anon
- authenticated
- service_role

Required privileges:

- USAGE
- SELECT
- UPDATE

## Proof

Corrected baseline + unchanged 13 migrations was rebuilt successfully on an empty isolated local Supabase database.

Migration count: 14.

Regression result:

PHASE3C_REGRESSION_SUITE=SUCCESS

All 18 checked synthetic-data groups had 0 rows after ROLLBACK.

Production was not changed.

Staging migration history remained unchanged.

Production broad default privileges were not copied into the baseline.

Phase 4 has not started.

## Regression history note

The exact original Phase 3 regression script with prefix `p3r1053` could not be recovered.

Therefore Phase 3C does **not** claim that the original 23 scenarios were rerun byte-for-byte.

Instead, Phase 3C ran a new independent regression suite with 15 logical sections against the corrected isolated rebuild.

The original 23-scenario Phase 3 result remains historical evidence, while the Phase 3C suite is the new correction-specific verification.
