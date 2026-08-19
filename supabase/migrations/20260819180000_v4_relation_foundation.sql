-- K3 Logistics V4 Phase 5 — Relation foundation dark launch.
-- Staging-only validation in Phase 5. Production deployment is not authorized.

create extension if not exists btree_gist with schema extensions;

create sequence public.relations_relation_number_seq
    as bigint
    start with 1
    increment by 1
    minvalue 1
    no maxvalue
    cache 1;

create table public.relations (
    id uuid primary key default gen_random_uuid(),
    relation_number bigint not null default nextval('public.relations_relation_number_seq'::regclass),
    status text not null default 'draft',
    planned_load_date date not null,
    expected_return_date date not null,
    revision bigint not null default 1,
    planned_truck_id uuid null,
    planned_driver_id uuid null,
    planned_trailer_id uuid null,
    created_by uuid not null,
    sent_at timestamptz null,
    assigned_at timestamptz null,
    cancelled_at timestamptz null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint relations_relation_number_key unique (relation_number),
    constraint relations_status_check check (
        status in ('draft', 'sent', 'assigned', 'in_progress', 'completed', 'cancelled')
    ),
    constraint relations_planned_dates_check check (
        expected_return_date > planned_load_date
    ),
    constraint relations_revision_positive check (revision >= 1),
    constraint relations_lifecycle_check check (
        (
            status = 'draft'
            and planned_truck_id is null
            and planned_driver_id is null
            and planned_trailer_id is null
            and sent_at is null
            and assigned_at is null
            and cancelled_at is null
        )
        or
        (
            status = 'sent'
            and planned_truck_id is null
            and planned_driver_id is null
            and planned_trailer_id is null
            and sent_at is not null
            and assigned_at is null
            and cancelled_at is null
        )
        or
        (
            status in ('assigned', 'in_progress', 'completed')
            and planned_truck_id is not null
            and planned_driver_id is not null
            and planned_trailer_id is not null
            and sent_at is not null
            and assigned_at is not null
            and cancelled_at is null
        )
        or
        (
            status = 'cancelled'
            and planned_truck_id is null
            and planned_driver_id is null
            and planned_trailer_id is null
            and sent_at is null
            and assigned_at is null
            and cancelled_at is not null
        )
    ),
    constraint relations_planned_truck_id_fkey
        foreign key (planned_truck_id) references public.trucks(id) on delete restrict,
    constraint relations_planned_driver_id_fkey
        foreign key (planned_driver_id) references public.drivers(id) on delete restrict,
    constraint relations_planned_trailer_id_fkey
        foreign key (planned_trailer_id) references public.trailers(id) on delete restrict,
    constraint relations_created_by_fkey
        foreign key (created_by) references auth.users(id) on delete restrict
);

alter sequence public.relations_relation_number_seq
    owned by public.relations.relation_number;

create table public.relation_stops (
    id uuid primary key default gen_random_uuid(),
    relation_id uuid not null,
    stop_number integer not null,
    company_id uuid not null,
    site_id uuid not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint relation_stops_stop_number_positive check (stop_number > 0),
    constraint relation_stops_relation_stop_number_key unique (relation_id, stop_number),
    constraint relation_stops_relation_location_key unique (relation_id, company_id, site_id),
    constraint relation_stops_relation_id_id_key unique (relation_id, id),
    constraint relation_stops_relation_id_fkey
        foreign key (relation_id) references public.relations(id) on delete restrict,
    constraint relation_stops_company_site_fkey
        foreign key (company_id, site_id)
        references public.client_sites(company_id, id)
        on delete restrict
);

create table public.relation_order_allocations (
    id uuid primary key default gen_random_uuid(),
    relation_id uuid not null,
    relation_stop_id uuid not null,
    order_id uuid not null,
    allocated_kg bigint not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint relation_order_allocations_allocated_kg_positive check (allocated_kg > 0),
    constraint relation_order_allocations_relation_order_key unique (relation_id, order_id),
    constraint relation_order_allocations_relation_id_fkey
        foreign key (relation_id) references public.relations(id) on delete restrict,
    constraint relation_order_allocations_order_id_fkey
        foreign key (order_id) references public.orders(id) on delete restrict,
    constraint relation_order_allocations_relation_stop_fkey
        foreign key (relation_id, relation_stop_id)
        references public.relation_stops(relation_id, id)
        on delete restrict
        deferrable initially immediate
);

create table public.relation_events (
    id uuid primary key default gen_random_uuid(),
    relation_id uuid not null,
    event_type text not null,
    actor_user_id uuid not null,
    from_status text null,
    to_status text null,
    relation_revision bigint not null,
    payload jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),

    constraint relation_events_relation_id_fkey
        foreign key (relation_id) references public.relations(id) on delete restrict,
    constraint relation_events_actor_user_id_fkey
        foreign key (actor_user_id) references auth.users(id) on delete restrict,
    constraint relation_events_relation_revision_positive check (relation_revision > 0),
    constraint relation_events_payload_object check (jsonb_typeof(payload) = 'object'),
    constraint relation_events_from_status_check check (
        from_status is null
        or from_status in ('draft', 'sent', 'assigned', 'in_progress', 'completed', 'cancelled')
    ),
    constraint relation_events_to_status_check check (
        to_status is null
        or to_status in ('draft', 'sent', 'assigned', 'in_progress', 'completed', 'cancelled')
    ),
    constraint relation_events_event_type_check check (
        event_type in (
            'draft_created',
            'draft_saved',
            'sent',
            'withdrawn_to_draft',
            'draft_cancelled',
            'stops_reordered',
            'stop_moved_out',
            'stop_moved_in',
            'stops_swapped',
            'fleet_assigned',
            'fleet_replaced',
            'dates_changed',
            'fleet_unassigned',
            'trip_started',
            'physical_stop_loaded',
            'trip_completed'
        )
    )
);

create index relations_status_load_date_number_idx
    on public.relations (status, planned_load_date, relation_number);

create index relations_load_date_status_idx
    on public.relations (planned_load_date, status);

create index relations_planned_truck_load_date_idx
    on public.relations (planned_truck_id, planned_load_date)
    where planned_truck_id is not null;

create index relations_planned_driver_load_date_idx
    on public.relations (planned_driver_id, planned_load_date)
    where planned_driver_id is not null;

create index relations_planned_trailer_load_date_idx
    on public.relations (planned_trailer_id, planned_load_date)
    where planned_trailer_id is not null;

create index relation_stops_company_site_idx
    on public.relation_stops (company_id, site_id);

create index relation_order_allocations_order_id_idx
    on public.relation_order_allocations (order_id);

create index relation_order_allocations_relation_stop_id_idx
    on public.relation_order_allocations (relation_stop_id);

create index relation_events_relation_created_id_idx
    on public.relation_events (relation_id, created_at, id);

create index relation_events_actor_created_idx
    on public.relation_events (actor_user_id, created_at);

alter table public.relations
    add constraint relations_planned_truck_no_overlap
    exclude using gist (
        planned_truck_id with =,
        daterange(planned_load_date, expected_return_date, '[]') with &&
    )
    where (status in ('assigned', 'in_progress'));

alter table public.relations
    add constraint relations_planned_driver_no_overlap
    exclude using gist (
        planned_driver_id with =,
        daterange(planned_load_date, expected_return_date, '[]') with &&
    )
    where (status in ('assigned', 'in_progress'));

alter table public.relations
    add constraint relations_planned_trailer_no_overlap
    exclude using gist (
        planned_trailer_id with =,
        daterange(planned_load_date, expected_return_date, '[]') with &&
    )
    where (status in ('assigned', 'in_progress'));

create or replace function cm_private.enforce_relation_allocation_stop_identity()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
    if not exists (
        select 1
        from public.relation_stops as rs
        join public.orders as o
          on o.id = new.order_id
         and o.company_id = rs.company_id
         and o.site_id = rs.site_id
        where rs.id = new.relation_stop_id
          and rs.relation_id = new.relation_id
    ) then
        raise exception using
            errcode = '23514',
            message = 'RELATION_ALLOCATION_STOP_IDENTITY_MISMATCH';
    end if;

    return new;
end;
$function$;

revoke all on function cm_private.enforce_relation_allocation_stop_identity()
    from public, anon, authenticated, service_role;

create trigger relation_order_allocations_identity_guard
before insert or update of relation_id, relation_stop_id, order_id
on public.relation_order_allocations
for each row
execute function cm_private.enforce_relation_allocation_stop_identity();

create trigger relations_set_updated_at
before update on public.relations
for each row
execute function cm_private.set_updated_at();

create trigger relation_stops_set_updated_at
before update on public.relation_stops
for each row
execute function cm_private.set_updated_at();

create trigger relation_order_allocations_set_updated_at
before update on public.relation_order_allocations
for each row
execute function cm_private.set_updated_at();

alter table public.trips
    add column relation_id uuid null;

alter table public.trips
    add constraint trips_relation_id_key unique (relation_id),
    add constraint trips_relation_id_fkey
        foreign key (relation_id) references public.relations(id) on delete restrict;

alter table public.trip_stops
    add column relation_stop_id uuid null;

alter table public.trip_stops
    add constraint trip_stops_relation_stop_id_fkey
        foreign key (relation_stop_id) references public.relation_stops(id) on delete restrict;

create index trip_stops_relation_stop_id_idx
    on public.trip_stops (relation_stop_id)
    where relation_stop_id is not null;

alter table public.order_assignments
    add column relation_allocation_id uuid null;

alter table public.order_assignments
    add constraint order_assignments_relation_allocation_id_key unique (relation_allocation_id),
    add constraint order_assignments_relation_allocation_id_fkey
        foreign key (relation_allocation_id)
        references public.relation_order_allocations(id)
        on delete restrict;

alter table public.relations enable row level security;
alter table public.relation_stops enable row level security;
alter table public.relation_order_allocations enable row level security;
alter table public.relation_events enable row level security;

revoke all on table public.relations
    from public, anon, authenticated, service_role;
revoke all on table public.relation_stops
    from public, anon, authenticated, service_role;
revoke all on table public.relation_order_allocations
    from public, anon, authenticated, service_role;
revoke all on table public.relation_events
    from public, anon, authenticated, service_role;

revoke all on sequence public.relations_relation_number_seq
    from public, anon, authenticated, service_role;

grant select, insert, update, delete on table public.relations to service_role;
grant select, insert, update, delete on table public.relation_stops to service_role;
grant select, insert, update, delete on table public.relation_order_allocations to service_role;
grant select, insert on table public.relation_events to service_role;
grant usage, select on sequence public.relations_relation_number_seq to service_role;
