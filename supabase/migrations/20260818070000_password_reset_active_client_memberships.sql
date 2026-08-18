begin;


create or replace function
public.admin_list_password_reset_requests(
    p_actor_user_id uuid
)
returns table (
    request_id uuid,
    user_id uuid,
    request_status text,
    target_role text,
    login_id text,
    requested_at timestamptz,
    display_name text,
    profile_phone text,
    company_name text,
    contact_person text,
    company_phone text
)
language plpgsql
security definer
set search_path = ''
as $function$

begin

    if not (
        cm_private.can_manage_password_reset_target(
            p_actor_user_id,
            'client'
        )
        or
        cm_private.can_manage_password_reset_target(
            p_actor_user_id,
            'driver'
        )
    )
    then
        raise exception
            using
                errcode = '42501',
                message =
                    'Нямате право да преглеждате заявки за парола.';
    end if;


    return query

    select
        request.id,
        request.user_id,
        request.status,
        target_role.code,
        request.login_id_snapshot,
        request.requested_at,
        target_profile.display_name,
        target_profile.phone,
        company.company_name,
        company.contact_person,
        company.phone

    from public.password_reset_requests request

    join public.profiles target_profile
      on target_profile.id =
         request.user_id

    join public.user_roles target_user_role
      on target_user_role.user_id =
         target_profile.id
     and target_user_role.is_primary =
         true

    join public.roles target_role
      on target_role.id =
         target_user_role.role_id
     and target_role.code in (
         'client',
         'driver'
     )

    left join lateral (

        select
            client_user.company_id

        from public.client_users client_user

        join public.client_companies active_company
          on active_company.id =
             client_user.company_id
         and active_company.is_active =
             true

        where client_user.user_id =
              target_profile.id

        order by
            client_user.is_primary desc,
            client_user.company_id

        limit 1

    ) active_client_link
      on target_role.code =
         'client'

    left join public.client_companies company
      on company.id =
         active_client_link.company_id

    where target_profile.is_active =
          true

      and (
          request.status =
              'pending'

          or (
              request.status =
                  'processing'

              and (
                  request.reviewed_by =
                      p_actor_user_id

                  or request.updated_at <
                      now() -
                      interval '15 minutes'
              )
          )
      )

      and (
          target_role.code <>
              'client'

          or company.id is not null
      )

      and
          cm_private.can_manage_password_reset_target(
              p_actor_user_id,
              target_role.code
          )

    order by
        request.requested_at,
        request.id;

end;

$function$;


create or replace function
public.admin_claim_password_reset_request(
    p_request_id uuid,
    p_actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$

declare

    v_request
        public.password_reset_requests%rowtype;

    v_target_role text;

begin

    select *
    into v_request
    from public.password_reset_requests
    where id =
          p_request_id
    for update;


    if not found then
        raise exception
            using
                errcode = 'P0002',
                message =
                    'Заявката не е намерена.';
    end if;


    if v_request.status in (
        'completed',
        'rejected'
    )
    then
        raise exception
            using
                errcode = '55000',
                message =
                    'Заявката вече е обработена.';
    end if;


    if (
        v_request.status =
            'processing'

        and v_request.reviewed_by <>
            p_actor_user_id

        and v_request.updated_at >=
            now() -
            interval '15 minutes'
    )
    then
        raise exception
            using
                errcode = '55P03',
                message =
                    'Заявката вече се обработва.';
    end if;


    select role.code
    into v_target_role

    from public.profiles profile

    join public.user_roles user_role
      on user_role.user_id =
         profile.id
     and user_role.is_primary =
         true

    join public.roles role
      on role.id =
         user_role.role_id

    where profile.id =
          v_request.user_id

      and profile.is_active =
          true

      and role.code in (
          'client',
          'driver'
      );


    if not found then
        raise exception
            using
                errcode = '55000',
                message =
                    'Акаунтът няма право на това възстановяване.';
    end if;


    if (
        v_target_role =
            'client'

        and not exists (
            select 1
            from public.client_users client_user
            join public.client_companies company
              on company.id =
                 client_user.company_id
            where client_user.user_id =
                  v_request.user_id
              and company.is_active =
                  true
        )
    )
    then
        raise exception
            using
                errcode = '55000',
                message =
                    'Клиентската фирма не е активна.';
    end if;


    if not
        cm_private.can_manage_password_reset_target(
            p_actor_user_id,
            v_target_role
        )
    then
        raise exception
            using
                errcode = '42501',
                message =
                    'Нямате право да обработите тази заявка.';
    end if;


    update public.password_reset_requests

    set
        status =
            'processing',

        reviewed_by =
            p_actor_user_id,

        reviewed_at =
            case
                when v_request.status =
                     'processing'
                 and v_request.reviewed_by =
                     p_actor_user_id
                then v_request.reviewed_at
                else now()
            end,

        completed_at =
            null,

        updated_at =
            now()

    where id =
          p_request_id;


    return jsonb_build_object(
        'requestId',
            v_request.id,
        'userId',
            v_request.user_id,
        'roleCode',
            v_target_role
    );

end;

$function$;


commit;
