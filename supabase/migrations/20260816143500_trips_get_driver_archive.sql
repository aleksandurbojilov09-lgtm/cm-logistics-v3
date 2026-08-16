create or replace function
public.trips_get_driver_archive(
    p_month date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$

declare

    v_driver_id uuid :=
        auth.uid();

    v_month_start date;
    v_month_end date;

    v_range_start timestamptz;
    v_range_end timestamptz;

    v_result jsonb;

begin

    if v_driver_id is null
       or not cm_private.is_active_user()
    then
        raise exception
            'Невалидна потребителска сесия.';
    end if;


    if not exists (

        select 1

        from public.drivers
            as d

        where d.id =
            v_driver_id
    )
    then
        raise exception
            'Нямате шофьорски профил.';
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
     *
     * The database stores timestamptz in UTC,
     * therefore local month boundaries are
     * converted to real timestamptz values.
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


    with month_segments as (

        select
            s.id,

            s.trip_id,

            t.trip_number,
            t.status
                as trip_status,

            t.completed_at
                as trip_completed_at,


            s.segment_number,

            s.truck_number_snapshot
                as truck_number,

            s.trailer_number_snapshot
                as trailer_number,


            s.start_km,
            s.end_km,

            greatest(
                coalesce(
                    s.total_km,
                    s.end_km -
                    s.start_km
                ),
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

        join public.trips
            as t

          on t.id =
                s.trip_id

        where s.driver_id =
                v_driver_id

          and s.status =
                'completed'

          and s.end_km
                is not null

          and s.ended_at >=
                v_range_start

          and s.ended_at <
                v_range_end
    )


    select
        jsonb_build_object(

            'month',
                v_month_start,

            'timezone',
                'Europe/Sofia',


            'summary',
                jsonb_build_object(

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


                    'tripCount',
                        (
                            select
                                count(
                                    distinct
                                    ms.trip_id
                                )::integer

                            from month_segments
                                as ms
                        ),


                    'workDays',
                        (
                            select
                                count(
                                    distinct
                                    ms.work_date
                                )::integer

                            from month_segments
                                as ms
                        )
                ),


            /*
             * IMPORTANT:
             *
             * Only this driver's completed segments
             * are returned.
             *
             * Cargo is intentionally NOT included.
             * Cargo belongs to the operational
             * Admin / Dispatcher monthly report.
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
                                        ms.trip_number,

                                    'tripStatus',
                                        ms.trip_status,

                                    'tripCompletedAt',
                                        ms.trip_completed_at,


                                    'segmentNumber',
                                        ms.segment_number,

                                    'truckNumber',
                                        ms.truck_number,

                                    'trailerNumber',
                                        ms.trailer_number,


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
                                        ms.end_reason
                                )

                                order by
                                    ms.ended_at desc,
                                    ms.trip_number desc,
                                    ms.segment_number desc
                            )

                        from month_segments
                            as ms
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
public.trips_get_driver_archive(
    date
)
from public;


revoke all
on function
public.trips_get_driver_archive(
    date
)
from anon;


grant execute
on function
public.trips_get_driver_archive(
    date
)
to authenticated;


grant execute
on function
public.trips_get_driver_archive(
    date
)
to service_role;


comment on function
public.trips_get_driver_archive(
    date
)
is
'Returns only the authenticated driver completed trip segments for one Europe/Sofia business month. Every completed segment kilometre is payable. Cargo is intentionally excluded.';
