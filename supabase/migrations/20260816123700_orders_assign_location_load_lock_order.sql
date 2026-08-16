create or replace function public.orders_assign_location_load(
    p_anchor_order_id uuid,
    p_truck_id uuid,
    p_assigned_kg bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$

declare

    v_company_id uuid;
    v_site_id uuid;

    v_locked_company_id uuid;
    v_locked_site_id uuid;
    v_anchor_status text;

    v_total_remaining_kg bigint;

    v_truck_load_kg bigint;
    v_truck_free_kg bigint;

    v_allowed_kg bigint;

    v_remaining_to_assign_kg bigint;
    v_slice_kg bigint;

    v_assignment_id uuid;

    v_assignment_ids uuid[] =
        '{}'::uuid[];

    v_orders_used integer =
        0;

    v_order record;

begin

    if not cm_private.has_permission(
        'orders.manage'
    )
    then
        raise exception
            'Нямате право да зачислявате заявки.';
    end if;


    if p_anchor_order_id is null
    then
        raise exception
            'Заявката не е избрана.';
    end if;


    if p_truck_id is null
    then
        raise exception
            'Камионът не е избран.';
    end if;


    if p_assigned_kg is null
       or p_assigned_kg <= 0
    then
        raise exception
            'Въведете валидно количество.';
    end if;


    /*
     * Един и същ truck винаги се заключва
     * преди order rows.
     */
    perform 1

    from public.trucks as t

    where t.id =
            p_truck_id

      and t.is_active =
            true

    for update;


    if not found
    then
        raise exception
            'Камионът не е намерен или е неактивен.';
    end if;


    /*
     * Вземаме identity на location БЕЗ
     * предварително да заключваме отделния
     * anchor order.
     *
     * Ако първо заключим различни anchor rows,
     * два transaction-а за една location могат
     * после да се блокират взаимно.
     */
    select
        o.company_id,
        o.site_id

    into
        v_company_id,
        v_site_id

    from public.orders as o

    where o.id =
        p_anchor_order_id;


    if not found
    then
        raise exception
            'Заявката не е намерена.';
    end if;


    if v_company_id is null
       or v_site_id is null
    then
        raise exception
            'Заявката няма валидна фирма или обект.';
    end if;


    /*
     * КРИТИЧНО:
     *
     * Всички конкурентни операции за еднакви
     * company_id + site_id заключват order rows
     * в ЕДИН И СЪЩ deterministic ред.
     *
     * Anchor-ът е включен независимо от текущия
     * му status, за да можем след заключването
     * безопасно да валидираме състоянието му.
     */
    perform 1

    from public.orders as o

    where o.company_id =
            v_company_id

      and o.site_id =
            v_site_id

      and (
            o.id =
                p_anchor_order_id

            or o.status in (
                'pending',
                'partial',
                'assigned'
            )
      )

    order by
        o.created_at,
        o.id

    for update;


    /*
     * След заключването четем anchor-а отново.
     * Така не разчитаме на snapshot отпреди
     * deterministic lock-а.
     */
    select
        o.company_id,
        o.site_id,
        o.status

    into
        v_locked_company_id,
        v_locked_site_id,
        v_anchor_status

    from public.orders as o

    where o.id =
        p_anchor_order_id;


    if not found
    then
        raise exception
            'Заявката не е намерена.';
    end if;


    if v_locked_company_id is distinct from
            v_company_id

       or v_locked_site_id is distinct from
            v_site_id
    then
        raise exception
            'Заявката беше променена. Опитайте отново.';
    end if;


    if v_anchor_status not in (
        'pending',
        'partial',
        'assigned'
    )
    then
        raise exception
            'Към този адрес вече не може да се добавя ново зачисляване.';
    end if;


    select
        coalesce(
            sum(
                greatest(
                    o.requested_kg -
                    coalesce(
                        assigned.assigned_kg,
                        0
                    ),
                    0
                )
            ),
            0
        )::bigint

    into
        v_total_remaining_kg

    from public.orders as o

    left join lateral (

        select
            coalesce(
                sum(
                    oa.assigned_kg
                ),
                0
            )::bigint
                as assigned_kg

        from public.order_assignments
            as oa

        where oa.order_id =
                o.id

          and oa.status <>
                'cancelled'

    ) as assigned
        on true

    where o.company_id =
            v_company_id

      and o.site_id =
            v_site_id

      and o.status in (
            'pending',
            'partial',
            'assigned'
      );


    if v_total_remaining_kg <= 0
    then
        raise exception
            'На този адрес няма оставащо количество.';
    end if;


    select
        coalesce(
            sum(
                oa.assigned_kg
            ),
            0
        )::bigint

    into
        v_truck_load_kg

    from public.order_assignments
        as oa

    where oa.truck_id =
            p_truck_id

      and oa.status not in (
            'completed',
            'cancelled'
      );


    v_truck_free_kg =
        greatest(
            24000 -
            v_truck_load_kg,
            0
        );


    v_allowed_kg =
        least(
            v_total_remaining_kg,
            v_truck_free_kg
        );


    if v_allowed_kg <= 0
    then
        raise exception
            'Камионът няма свободен товарен капацитет.';
    end if;


    if p_assigned_kg >
        v_allowed_kg
    then
        raise exception
            'Може да се зачисли максимум % т.',
            round(
                v_allowed_kg::numeric /
                1000,
                3
            );
    end if;


    v_remaining_to_assign_kg =
        p_assigned_kg;


    for v_order in

        select
            o.id,

            greatest(
                o.requested_kg -
                coalesce(
                    assigned.assigned_kg,
                    0
                ),
                0
            )::bigint
                as remaining_kg

        from public.orders as o

        left join lateral (

            select
                coalesce(
                    sum(
                        oa.assigned_kg
                    ),
                    0
                )::bigint
                    as assigned_kg

            from public.order_assignments
                as oa

            where oa.order_id =
                    o.id

              and oa.status <>
                    'cancelled'

        ) as assigned
            on true

        where o.company_id =
                v_company_id

          and o.site_id =
                v_site_id

          and o.status in (
                'pending',
                'partial',
                'assigned'
          )

          and greatest(
                o.requested_kg -
                coalesce(
                    assigned.assigned_kg,
                    0
                ),
                0
          ) > 0

        order by
            o.created_at,
            o.id

    loop

        exit when
            v_remaining_to_assign_kg <= 0;


        v_slice_kg =
            least(
                v_order.remaining_kg,
                v_remaining_to_assign_kg
            );


        v_assignment_id =
            public.orders_assign_load(
                v_order.id,
                p_truck_id,
                v_slice_kg
            );


        v_assignment_ids =
            array_append(
                v_assignment_ids,
                v_assignment_id
            );


        v_orders_used =
            v_orders_used + 1;


        v_remaining_to_assign_kg =
            v_remaining_to_assign_kg -
            v_slice_kg;

    end loop;


    if v_remaining_to_assign_kg <> 0
    then
        raise exception
            'Зачисляването не можа да бъде разпределено изцяло.';
    end if;


    return jsonb_build_object(

        'assignment_ids',
        to_jsonb(
            v_assignment_ids
        ),

        'assigned_kg',
        p_assigned_kg,

        'assigned_tons',
        round(
            p_assigned_kg::numeric /
            1000,
            3
        ),

        'orders_used',
        v_orders_used,

        'company_id',
        v_company_id,

        'site_id',
        v_site_id

    );

end;

$function$;


revoke all
on function public.orders_assign_location_load(
    uuid,
    uuid,
    bigint
)
from public;


revoke all
on function public.orders_assign_location_load(
    uuid,
    uuid,
    bigint
)
from anon;


grant execute
on function public.orders_assign_location_load(
    uuid,
    uuid,
    bigint
)
to authenticated;


grant execute
on function public.orders_assign_location_load(
    uuid,
    uuid,
    bigint
)
to service_role;


comment on function
public.orders_assign_location_load(
    uuid,
    uuid,
    bigint
)
is
'Atomically assigns load across open orders for the same company/site, consuming oldest remaining quantities first with deterministic row locking.';
