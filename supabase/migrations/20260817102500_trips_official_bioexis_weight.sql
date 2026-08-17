begin;


-- =========================================================
-- OFFICIAL BIOEXIS SCALE WEIGHT
-- =========================================================

alter table public.trips
add column if not exists
    official_unloaded_kg bigint;


comment on column
public.trips.official_unloaded_kg
is
'Exact official cargo weight in kilograms from the BIOEXIS scale ticket. This is the final cargo figure for a completed trip.';


alter table public.trips
drop constraint if exists
    trips_official_unloaded_kg_positive;


alter table public.trips
add constraint
    trips_official_unloaded_kg_positive
check (
    official_unloaded_kg is null
    or official_unloaded_kg > 0
);


/*
 * Existing completed development/test trips do not
 * have an official scale ticket.
 *
 * NOT VALID means:
 * - existing historical rows are not backfilled
 *   with invented values;
 * - all subsequent INSERT/UPDATE rows must obey
 *   the rule.
 */
alter table public.trips
drop constraint if exists
    trips_completed_requires_official_unloaded_kg;


alter table public.trips
add constraint
    trips_completed_requires_official_unloaded_kg
check (
    status <> 'completed'
    or official_unloaded_kg is not null
)
not valid;


-- =========================================================
-- DRIVER FINISH WITH MANDATORY OFFICIAL SCALE WEIGHT
-- =========================================================

create or replace function
public.trips_finish_driver(
    p_end_km bigint,
    p_official_unloaded_kg bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$

declare

    v_driver_id uuid :=
        auth.uid();

    v_trip_id uuid;

    v_result jsonb;

begin

    if v_driver_id
        is null
    then
        raise exception
            'Невалидна потребителска сесия.';
    end if;


    if p_official_unloaded_kg
        is null
       or p_official_unloaded_kg <= 0
    then
        raise exception
            'Въведете точните килограми от кантарната бележка в BIOEXIS.';
    end if;


    /*
     * Lock the active trip before writing
     * the official scale result.
     *
     * The existing one-argument finish RPC
     * keeps all current segment, fleet restore,
     * order completion and handoff behaviour.
     */
    select
        t.id

    into
        v_trip_id

    from public.trips
        as t

    where t.primary_driver_id =
            v_driver_id

      and t.status =
            'active'

    for update;


    if not found
    then
        raise exception
            'Няма активен курс.';
    end if;


    update public.trips

    set
        official_unloaded_kg =
            p_official_unloaded_kg,

        updated_at =
            now()

    where id =
        v_trip_id;


    /*
     * Same database transaction.
     *
     * If the existing finish logic fails,
     * the official weight UPDATE above is
     * rolled back as well.
     */
    v_result =
        public.trips_finish_driver(
            p_end_km
        );


    return
        v_result ||
        jsonb_build_object(
            'officialUnloadedKg',
            p_official_unloaded_kg
        );

end;

$function$;


-- Old finish path must no longer be callable
-- directly by a logged-in frontend user.

revoke all
on function
public.trips_finish_driver(
    bigint
)
from public, anon, authenticated;


grant execute
on function
public.trips_finish_driver(
    bigint
)
to service_role;


-- New mandatory official-weight finish path.

revoke all
on function
public.trips_finish_driver(
    bigint,
    bigint
)
from public, anon;


grant execute
on function
public.trips_finish_driver(
    bigint,
    bigint
)
to authenticated, service_role;


comment on function
public.trips_finish_driver(
    bigint,
    bigint
)
is
'Completes the current driver trip atomically with end odometer and mandatory exact BIOEXIS scale weight in kilograms.';




create or replace function
public.trips_admin_get_bioexis_report(
    p_month date,
    p_trailer_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$

declare

    v_month_start date;
    v_month_end date;

    v_range_start timestamptz;
    v_range_end timestamptz;

    v_trailer_id uuid;

    v_result jsonb;

begin

    if not cm_private.has_permission(
        'trips.read'
    )
    then
        raise exception
            'Нямате право да преглеждате BIOEXIS отчета.';
    end if;


    if p_month is null
    then
        raise exception
            'Месецът не е избран.';
    end if;


    v_month_start =
        pg_catalog.date_trunc(
            'month',
            p_month::timestamp
        )::date;


    v_month_end =
        (
            v_month_start +
            interval '1 month'
        )::date;


    /*
     * Business calendar = Bulgaria.
     */
    v_range_start =
        pg_catalog.timezone(
            'Europe/Sofia',
            v_month_start::timestamp
        );


    v_range_end =
        pg_catalog.timezone(
            'Europe/Sofia',
            v_month_end::timestamp
        );


    /*
     * A null trailer means:
     * pick the first active trailer, then any
     * historical trailer as a fallback.
     */
    if p_trailer_id is null
    then

        select
            tr.id

        into
            v_trailer_id

        from public.trailers
            as tr

        order by
            tr.is_active desc,
            tr.registration_number,
            tr.id

        limit 1;

    else

        select
            tr.id

        into
            v_trailer_id

        from public.trailers
            as tr

        where tr.id =
            p_trailer_id;


        if v_trailer_id is null
        then
            raise exception
                'Избраното ремарке не съществува.';
        end if;

    end if;


    /*
     * Defensive integrity protection.
     *
     * One completed trip in the operational
     * BIOEXIS model must belong to one trailer.
     * If historical data ever violates that,
     * refuse to generate a misleading report.
     */
    if v_trailer_id is not null
       and exists (

            select 1

            from public.trips
                as t

            where t.status =
                    'completed'

              and t.completed_at >=
                    v_range_start

              and t.completed_at <
                    v_range_end

              and exists (

                    select 1

                    from public.order_assignments
                        as oa

                    where oa.trip_id =
                            t.id

                      and oa.status <>
                            'cancelled'

                      and oa.trailer_id =
                            v_trailer_id
              )

              and (

                    (
                        select count(
                            distinct oa2.trailer_id
                        )

                        from public.order_assignments
                            as oa2

                        where oa2.trip_id =
                                t.id

                          and oa2.status <>
                                'cancelled'
                    ) > 1

                    or

                    (
                        select count(
                            distinct ts2.trailer_id
                        )

                        from public.trip_segments
                            as ts2

                        where ts2.trip_id =
                                t.id

                          and ts2.status =
                                'completed'

                          and ts2.trailer_id
                                is not null
                    ) > 1
              )
       )
    then
        raise exception
            'Открит е приключен курс с повече от едно ремарке. BIOEXIS отчетът е спрян за проверка.';
    end if;


    with

    trailer_options as (

        select
            tr.id,
            tr.registration_number,
            tr.bioexis_permit_number,
            tr.is_active

        from public.trailers
            as tr
    ),


    month_trips as (

        select
            t.id,
            t.trip_number,
            t.completed_at,

            (
                t.completed_at
                    at time zone
                    'Europe/Sofia'
            )::date
                as completed_date

        from public.trips
            as t

        where t.status =
                'completed'

          and t.completed_at >=
                v_range_start

          and t.completed_at <
                v_range_end

          and v_trailer_id
                is not null

          and exists (

                select 1

                from public.order_assignments
                    as oa

                where oa.trip_id =
                        t.id

                  and oa.status <>
                        'cancelled'

                  and oa.trailer_id =
                        v_trailer_id
          )
    ),


    trip_loads as (

        /*
         * OFFICIAL cargo source:
         *
         * New completed trips use the exact
         * BIOEXIS scale weight stored on trips.
         *
         * Legacy test trips without an official
         * weight keep the historical loaded_kg
         * fallback so existing archive data is
         * not lost.
         */
        select
            mt.id
                as trip_id,

            coalesce(
                t.official_unloaded_kg,

                sum(
                    coalesce(
                        oa.loaded_kg,
                        0
                    )
                ),

                0
            )::bigint
                as loaded_kg

        from month_trips
            as mt

        join public.trips
            as t

          on t.id =
                mt.id

        left join public.order_assignments
            as oa

          on oa.trip_id =
                mt.id

         and oa.status <>
                'cancelled'

         and oa.trailer_id =
                v_trailer_id

        group by
            mt.id,
            t.official_unloaded_kg
    ),


    trip_companies as (

        select
            mt.id
                as trip_id,

            coalesce(
                string_agg(
                    x.company_name_snapshot,
                    ', '
                    order by
                        x.first_stop_number,
                        x.company_name_snapshot
                ),
                ''
            )
                as companies

        from month_trips
            as mt

        left join lateral (

            select
                ts.company_name_snapshot,

                min(
                    ts.stop_number
                )::integer
                    as first_stop_number

            from public.trip_stops
                as ts

            where ts.trip_id =
                    mt.id

            group by
                ts.company_name_snapshot

        ) as x
          on true

        group by
            mt.id
    ),


    report_segments as (

        select
            mt.id
                as trip_id,

            mt.trip_number,
            mt.completed_at,
            mt.completed_date,

            tc.companies,

            ts.id
                as segment_id,

            ts.segment_number,

            ts.driver_name_snapshot
                as driver_name,

            ts.truck_number_snapshot
                as truck_number,

            ts.trailer_number_snapshot
                as trailer_number,

            ts.position_number_snapshot
                as position_number,

            ts.start_km,
            ts.end_km,

            greatest(
                ts.end_km -
                ts.start_km,
                0
            )::bigint
                as segment_km,

            ts.started_at,
            ts.ended_at,
            ts.end_reason,

            tl.loaded_kg,

            row_number()
                over (
                    partition by
                        mt.id

                    order by
                        ts.segment_number,
                        ts.started_at,
                        ts.id
                )
                as trip_segment_row

        from month_trips
            as mt

        join public.trip_segments
            as ts

          on ts.trip_id =
                mt.id

         and ts.status =
                'completed'

         and ts.end_km
                is not null

        left join trip_loads
            as tl

          on tl.trip_id =
                mt.id

        left join trip_companies
            as tc

          on tc.trip_id =
                mt.id
    ),


    trip_totals as (

        select
            rs.trip_id,

            max(
                rs.trip_number
            )
                as trip_number,

            max(
                rs.completed_at
            )
                as completed_at,

            max(
                rs.completed_date
            )
                as completed_date,

            max(
                rs.companies
            )
                as companies,

            sum(
                rs.segment_km
            )::bigint
                as total_km,

            max(
                rs.loaded_kg
            )::bigint
                as loaded_kg

        from report_segments
            as rs

        group by
            rs.trip_id
    ),


    calendar_days as (

        select
            tt.completed_date
                as report_date,

            count(*)::integer
                as trip_count,

            sum(
                tt.total_km
            )::bigint
                as total_km,

            sum(
                tt.loaded_kg
            )::bigint
                as loaded_kg

        from trip_totals
            as tt

        group by
            tt.completed_date
    )


    select
        jsonb_build_object(

            'month',
                v_month_start,

            'timezone',
                'Europe/Sofia',


            'trailers',
                coalesce(
                    (
                        select
                            jsonb_agg(
                                jsonb_build_object(

                                    'id',
                                        tro.id,

                                    'registrationNumber',
                                        tro.registration_number,

                                    'bioexisPermitNumber',
                                        tro.bioexis_permit_number,

                                    'isActive',
                                        tro.is_active
                                )

                                order by
                                    tro.is_active desc,
                                    tro.registration_number,
                                    tro.id
                            )

                        from trailer_options
                            as tro
                    ),

                    '[]'::jsonb
                ),


            'selectedTrailer',
                (
                    select
                        jsonb_build_object(

                            'id',
                                tr.id,

                            'registrationNumber',
                                tr.registration_number,

                            'bioexisPermitNumber',
                                tr.bioexis_permit_number,

                            'isActive',
                                tr.is_active
                        )

                    from public.trailers
                        as tr

                    where tr.id =
                        v_trailer_id
                ),


            'summary',
                jsonb_build_object(

                    'tripCount',
                        (
                            select
                                count(*)::integer

                            from trip_totals
                        ),

                    'totalKm',
                        coalesce(
                            (
                                select
                                    sum(
                                        tt.total_km
                                    )::bigint

                                from trip_totals
                                    as tt
                            ),
                            0
                        ),

                    'loadedKg',
                        coalesce(
                            (
                                select
                                    sum(
                                        tt.loaded_kg
                                    )::bigint

                                from trip_totals
                                    as tt
                            ),
                            0
                        ),

                    'loadedTons',
                        coalesce(
                            (
                                select
                                    sum(
                                        tt.loaded_kg
                                    )::numeric /
                                    1000
                                from trip_totals
                                    as tt
                            ),
                            0
                        )
                ),


            /*
             * Structured trips are useful for
             * calendar/day details in the UI.
             */
            'trips',
                coalesce(
                    (
                        select
                            jsonb_agg(

                                jsonb_build_object(

                                    'tripId',
                                        tt.trip_id,

                                    'tripNumber',
                                        tt.trip_number,

                                    'completedAt',
                                        tt.completed_at,

                                    'completedDate',
                                        tt.completed_date,

                                    'companies',
                                        tt.companies,

                                    'totalKm',
                                        tt.total_km,

                                    'loadedKg',
                                        tt.loaded_kg,

                                    'loadedTons',
                                        tt.loaded_kg::numeric /
                                        1000
                                )

                                order by
                                    tt.completed_at,
                                    tt.trip_number
                            )

                        from trip_totals
                            as tt
                    ),

                    '[]'::jsonb
                ),


            /*
             * Flat report rows reproduce the V2
             * BIOEXIS report structure.
             *
             * Cargo appears ONLY on the first
             * segment row of each trip.
             */
            'rows',
                coalesce(
                    (
                        select
                            jsonb_agg(

                                jsonb_build_object(

                                    'tripId',
                                        rs.trip_id,

                                    'tripNumber',
                                        rs.trip_number,

                                    'completedAt',
                                        rs.completed_at,

                                    'completedDate',
                                        rs.completed_date,

                                    'companies',
                                        rs.companies,

                                    'segmentId',
                                        rs.segment_id,

                                    'segmentNumber',
                                        rs.segment_number,

                                    'driverName',
                                        rs.driver_name,

                                    'truckNumber',
                                        rs.truck_number,

                                    'trailerNumber',
                                        rs.trailer_number,

                                    'positionNumber',
                                        rs.position_number,

                                    'startKm',
                                        rs.start_km,

                                    'endKm',
                                        rs.end_km,

                                    'km',
                                        rs.segment_km,

                                    'startedAt',
                                        rs.started_at,

                                    'endedAt',
                                        rs.ended_at,

                                    'endReason',
                                        rs.end_reason,

                                    'loadedKg',
                                        case
                                            when rs.trip_segment_row = 1
                                            then rs.loaded_kg
                                            else null
                                        end,

                                    'loadedTons',
                                        case
                                            when rs.trip_segment_row = 1
                                            then (
                                                rs.loaded_kg::numeric /
                                                1000
                                            )
                                            else null
                                        end,

                                    'firstSegment',
                                        (
                                            rs.trip_segment_row = 1
                                        )
                                )

                                order by
                                    rs.completed_at,
                                    rs.trip_number,
                                    rs.segment_number
                            )

                        from report_segments
                            as rs
                    ),

                    '[]'::jsonb
                ),


            'calendar',
                coalesce(
                    (
                        select
                            jsonb_agg(

                                jsonb_build_object(

                                    'date',
                                        cd.report_date,

                                    'tripCount',
                                        cd.trip_count,

                                    'totalKm',
                                        cd.total_km,

                                    'loadedKg',
                                        cd.loaded_kg,

                                    'loadedTons',
                                        cd.loaded_kg::numeric /
                                        1000
                                )

                                order by
                                    cd.report_date
                            )

                        from calendar_days
                            as cd
                    ),

                    '[]'::jsonb
                )
        )

    into
        v_result;


    return
        v_result;

end;

$function$;


revoke all
on function
public.trips_admin_get_bioexis_report(
    date,
    uuid
)
from public;


revoke all
on function
public.trips_admin_get_bioexis_report(
    date,
    uuid
)
from anon;


grant execute
on function
public.trips_admin_get_bioexis_report(
    date,
    uuid
)
to authenticated;


grant execute
on function
public.trips_admin_get_bioexis_report(
    date,
    uuid
)
to service_role;


comment on function
public.trips_admin_get_bioexis_report(
    date,
    uuid
)
is
'Admin/Dispatcher BIOEXIS monthly trailer report. Completed trips belong to Europe/Sofia completion month. Kilometres are reported per completed segment. Official BIOEXIS scale cargo is counted exactly once per trip. Legacy completed trips without official scale weight use the historical loaded cargo fallback.';


commit;
