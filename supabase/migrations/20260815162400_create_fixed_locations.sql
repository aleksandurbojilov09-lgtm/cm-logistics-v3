create table if not exists public.fixed_locations (
    id uuid primary key default gen_random_uuid(),

    code text not null unique,
    name text not null,
    address text,

    latitude double precision not null,
    longitude double precision not null,

    is_active boolean not null default true,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint fixed_locations_code_valid
        check (
            code = upper(btrim(code))
            and code ~ '^[A-Z0-9_]+$'
        ),

    constraint fixed_locations_name_valid
        check (
            btrim(name) <> ''
        ),

    constraint fixed_locations_latitude_valid
        check (
            latitude >= -90
            and latitude <= 90
        ),

    constraint fixed_locations_longitude_valid
        check (
            longitude >= -180
            and longitude <= 180
        )
);


alter table public.fixed_locations
enable row level security;


revoke all
on table public.fixed_locations
from public, anon, authenticated;


grant select
on table public.fixed_locations
to authenticated;


grant all
on table public.fixed_locations
to service_role;


drop policy if exists
fixed_locations_authenticated_read
on public.fixed_locations;


create policy
fixed_locations_authenticated_read
on public.fixed_locations
for select
to authenticated
using (
    is_active = true
);


insert into public.fixed_locations (
    code,
    name,
    address,
    latitude,
    longitude,
    is_active
)
values
    (
        'TRUCK_BASE',
        'База на камионите',
        null,
        42.2559657,
        23.0992072,
        true
    ),
    (
        'BIOEXIS',
        'BIOEXIS',
        null,
        40.2800948,
        21.4362486,
        true
    )
on conflict (code)
do update set
    name = excluded.name,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    is_active = excluded.is_active,
    updated_at = now();
