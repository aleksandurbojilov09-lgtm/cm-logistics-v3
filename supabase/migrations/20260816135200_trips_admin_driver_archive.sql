create or replace function
public.trips_admin_get_driver_archive(
    p_month date
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

    v_can_read_discrepancies boolean;

    v_result jsonb;

begin

    if not cm_private.has_permission(
        'trips.read'
    )
    then
        raise exception
            'Нямате право да преглеждате архива.';
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
     * Business timezone:
     * K3 Logistics calendar is Bulgarian.
     *
     * We convert the local month boundaries
     * to timestamptz once and then use normal
     * indexed timestamp comparisons.
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


    v_can_read_discrepancies =
        cm_private.has_permission(
            'discrepancies.read'
        );


    with month_segments as (

        select
            s.id,
            s.trip_id,
            s.segment_number,
            s.driver_id,

            s.driver_name_snapshot,
            s.truck_number_snapshot,
            s.trailer_number_snapshot,

            s.start_km,
            s.end_km,

            greatest(
                s.end_km -
                s.start_km,
                0
            )::bigint
                as total_km,

            s.started_at,
            s.ended_at,
            s.end_reason,

            (
                s.ended_at
                    at time zone
                    'Europe/Sofia'
            )::date
                as work_date

        from public.trip_segments
            as s

        where s.status =
                'completed'

          and s.end_km
                is not null

          and s.ended_at >=
                v_range_start

          and s.ended_at <
                v_range_end
    ),


    trip_loads as (

        select
            oa.trip_id,

            coalesce(
                sum(
                    coalesce(
                        oa.loaded_kg,
                        0
                    )
                ),
                0
            )::bigint
                as loaded_kg

        from public.order_assignments
            as oa

        where oa.trip_id
                is not null

          and oa.status <>
                'cancelled'

        group by
            oa.trip_id
    ),


    trip_discrepancies as (

        select
            d.trip_id,

            count(*)::integer
                as discrepancy_count

        from public.discrepancies
            as d

        group by
            d.trip_id
    )


    select
        jsonb_build_object(

            'month',
                v_month_start,

            'timezone',
                'Europe/Sofia',

            'canReadDiscrepancies',
                v_can_read_discrepancies,


            'summary',
                jsonb_build_object(

                    /*
                     * Operational monthly trip count:
                     * trip belongs to the month in which
                     * it was finally completed.
                     */
                    'completedTrips',
                        (
                            select
                                count(*)::integer

                            from public.trips
                                as t

                            where t.status =
                                    'completed'

                              and t.completed_at >=
                                    v_range_start

                              and t.completed_at <
                                    v_range_end
                        ),


                    /*
                     * Every completed segment kilometre
                     * is payable.
                     *
                     * This intentionally does NOT use
                     * trips.primary_driver_id.
                     */
                    'payableKm',
                        coalesce(
                            (
                                select
                                    sum(
                                        ms.total_km
                                    )::bigint

                                from month_segments
                                    as ms
                            ),
                            0
                        ),


                    /*
                     * Cargo is counted once through
                     * order_assignments for trips
                     * completed in this month.
                     *
                     * loaded_kg contains actual loaded
                     * quantity after discrepancies.
                     */
                    'loadedTons',
                        round(
                            coalesce(
                                (
                                    select
                                        sum(
                                            coalesce(
                                                oa.loaded_kg,
                                                oa.assigned_kg
                                            )
                                        )

                                    from public.order_assignments
                                        as oa

                                    join public.trips
                                        as t

                                      on t.id =
                                            oa.trip_id

                                    where t.status =
                                            'completed'

                                      and t.completed_at >=
                                            v_range_start

                                      and t.completed_at <
                                            v_range_end

                                      and oa.status <>
                                            'cancelled'
                                ),
                                0
                            )::numeric /
                            1000,
                            3
                        ),


                    'discrepancies',
                        case
                            when
                                v_can_read_discrepancies
                            then
                                (
                                    select
                                        count(*)::integer

                                    from public.discrepancies
                                        as d

                                    join public.trips
                                        as t

                                      on t.id =
                                            d.trip_id

                                    where t.status =
                                            'completed'

                                      and t.completed_at >=
                                            v_range_start

                                      and t.completed_at <
                                            v_range_end
                                )

                            else
                                null
                        end
                ),


            /*
             * Flat segment records are intentional.
             *
             * Frontend groups these by:
             * driver -> local work day -> trip.
             *
             * This keeps the DB function simple
             * and preserves every historical segment.
             */
            'segments',
                coalesce(
                    (
                        select
                            jsonb_agg(

                                jsonb_build_object(

                                    'id',
                                        ms.id,

                                    'tripId',
                                        ms.trip_id,

                                    'tripNumber',
                                        t.trip_number,

                                    'tripStatus',
                                        t.status,

                                    'tripCompletedAt',
                                        t.completed_at,


                                    'driverId',
                                        ms.driver_id,

                                    'driverName',
                                        ms.driver_name_snapshot,


                                    'segmentNumber',
                                        ms.segment_number,

                                    'truckNumber',
                                        ms.truck_number_snapshot,

                                    'trailerNumber',
                                        ms.trailer_number_snapshot,


                                    'startKm',
                                        ms.start_km,

                                    'endKm',
                                        ms.end_km,

                                    'totalKm',
                                        ms.total_km,


                                    'startedAt',
                                        ms.started_at,

                                    'endedAt',
                                        ms.ended_at,

                                    'workDate',
                                        ms.work_date,

                                    'endReason',
                                        ms.end_reason,


                                    'tripLoadedTons',
                                        round(
                                            coalesce(
                                                tl.loaded_kg,
                                                0
                                            )::numeric /
                                            1000,
                                            3
                                        ),


                                    'tripDiscrepancyCount',
                                        case
                                            when
                                                v_can_read_discrepancies
                                            then
                                                coalesce(
                                                    td.discrepancy_count,
                                                    0
                                                )

                                            else
                                                null
                                        end
                                )

                                order by
                                    ms.ended_at desc,
                                    t.trip_number desc,
                                    ms.segment_number desc
                            )

                        from month_segments
                            as ms

                        join public.trips
                            as t

                          on t.id =
                                ms.trip_id

                        left join trip_loads
                            as tl

                          on tl.trip_id =
                                ms.trip_id

                        left join trip_discrepancies
                            as td

                          on td.trip_id =
                                ms.trip_id
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
public.trips_admin_get_driver_archive(
    date
)
from public;


revoke all
on function
public.trips_admin_get_driver_archive(
    date
)
from anon;


grant execute
on function
public.trips_admin_get_driver_archive(
    date
)
to authenticated;


grant execute
on function
public.trips_admin_get_driver_archive(
    date
)
to service_role;


comment on function
public.trips_admin_get_driver_archive(
    date
)
is
'Returns the K3 admin driver archive for one Europe/Sofia business month. Payable kilometres are calculated from completed trip segments by segment ended_at; completed trip totals use trip completed_at.';
