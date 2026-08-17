begin;


-- ============================================================
-- DISPATCHER: DRIVER MANAGEMENT PERMISSION
-- ============================================================

insert into public.permissions (
    code,
    name
)
select
    'drivers.manage',
    'Управление на шофьори'
where not exists (
    select 1
    from public.permissions
    where code = 'drivers.manage'
);


insert into public.role_permissions (
    role_id,
    permission_id
)
select
    r.id,
    p.id
from public.roles r
join public.permissions p
  on p.code = 'drivers.manage'
where r.code = 'dispatcher'
  and not exists (
      select 1
      from public.role_permissions rp
      where rp.role_id = r.id
        and rp.permission_id = p.id
  );


-- ============================================================
-- USER-SCOPED PERMISSION HELPER FOR EDGE FUNCTIONS
-- ============================================================

create or replace function
public.has_my_permission(
    p_permission_code text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$

    select
        cm_private.has_permission(
            p_permission_code
        );

$function$;


revoke all
on function public.has_my_permission(text)
from public;

revoke all
on function public.has_my_permission(text)
from anon;

grant execute
on function public.has_my_permission(text)
to authenticated;

grant execute
on function public.has_my_permission(text)
to service_role;


-- ============================================================
-- CLIENT REGISTRATION REVIEW
-- Admin OR clients.manage
-- ============================================================

create or replace function
public.admin_review_client_registration(
    p_request_id uuid,
    p_admin_user_id uuid,
    p_decision text,
    p_note text default null,
    p_loading_ramp boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$

declare

    v_request
        public.client_registration_requests%rowtype;

    v_company_id uuid;

    v_site_id uuid;

    v_decision text :=
        lower(
            btrim(
                coalesce(
                    p_decision,
                    ''
                )
            )
        );

    v_loading_ramp boolean :=
        coalesce(
            p_loading_ramp,
            false
        );

begin


    -- =====================================================
    -- ACTOR AUTHORIZATION
    -- =====================================================

    if not exists (

        select 1

        from public.profiles profile

        join public.user_roles ur
          on ur.user_id =
             profile.id

        join public.roles role
          on role.id =
             ur.role_id

        where profile.id =
              p_admin_user_id

          and profile.is_active =
              true

          and ur.is_primary =
              true

          and (
              role.code = 'admin'

              or exists (
                  select 1
                  from public.role_permissions rp
                  join public.permissions permission
                    on permission.id =
                       rp.permission_id

                  where rp.role_id =
                        ur.role_id

                    and permission.code =
                        'clients.manage'
              )
          )
    )
    then

        raise exception
            'Нямате право да обработвате клиентски регистрации.';

    end if;


    -- =====================================================
    -- LOCK REGISTRATION
    -- =====================================================

    select *

    into
        v_request

    from public.client_registration_requests

    where id =
        p_request_id

    for update;


    if not found then

        raise exception
            'Заявката не е намерена.';

    end if;


    if v_request.status <>
        'pending'
    then

        raise exception
            'Заявката вече е обработена.';

    end if;


    -- =====================================================
    -- REJECT
    -- =====================================================

    if v_decision =
        'reject'
    then

        update public.client_registration_requests

        set
            status =
                'rejected',

            reviewed_by =
                p_admin_user_id,

            reviewed_at =
                now(),

            review_note =
                nullif(
                    btrim(
                        coalesce(
                            p_note,
                            ''
                        )
                    ),
                    ''
                ),

            loading_ramp =
                v_loading_ramp

        where id =
            p_request_id;


        return
            jsonb_build_object(
                'status',
                'rejected'
            );

    end if;


    if v_decision <>
        'approve'
    then

        raise exception
            'Невалидно решение.';

    end if;


    -- =====================================================
    -- REQUEST VALIDATION
    -- =====================================================

    if v_request.contact_person is null
       or btrim(
            v_request.contact_person
       ) = ''
    then

        raise exception
            'Липсва лице за контакт.';

    end if;


    if v_request.phone is null
       or btrim(
            v_request.phone
       ) = ''
    then

        raise exception
            'Липсва телефон.';

    end if;


    if v_request.loading_address is null
       or btrim(
            v_request.loading_address
       ) = ''
    then

        raise exception
            'Липсва адрес за товарене.';

    end if;


    if v_request.latitude is null
       or v_request.longitude is null
    then

        raise exception
            'Липсва точна позиция за товарене.';

    end if;


    if exists (

        select 1

        from public.profiles

        where lower(login_id) =
            lower(
                v_request.login_id
            )
    )
    then

        raise exception
            'Това потребителско ID вече съществува.';

    end if;


    -- =====================================================
    -- COMPANY
    -- =====================================================

    insert into public.client_companies (

        company_name,

        contact_person,

        phone,

        email,

        registered_address,

        is_active
    )

    values (

        v_request.company_name,

        v_request.contact_person,

        v_request.phone,

        v_request.email,

        v_request.registered_address,

        true
    )

    returning id

    into
        v_company_id;


    -- =====================================================
    -- SITE
    -- =====================================================

    insert into public.client_sites (

        company_id,

        site_name,

        address,

        contact_person,

        phone,

        latitude,

        longitude,

        loading_ramp,

        is_active
    )

    values (

        v_company_id,

        'Основен обект',

        v_request.loading_address,

        v_request.contact_person,

        v_request.phone,

        v_request.latitude,

        v_request.longitude,

        v_loading_ramp,

        true
    )

    returning id

    into
        v_site_id;


    -- =====================================================
    -- APP USER
    -- =====================================================

    perform
        public.admin_provision_app_user(

            v_request.auth_user_id,

            v_request.login_id,

            v_request.contact_person,

            v_request.phone,

            'client',

            null,

            v_company_id
        );


    -- =====================================================
    -- COMPLETE REGISTRATION
    -- =====================================================

    update public.client_registration_requests

    set
        status =
            'approved',

        reviewed_by =
            p_admin_user_id,

        reviewed_at =
            now(),

        review_note =
            nullif(
                btrim(
                    coalesce(
                        p_note,
                        ''
                    )
                ),
                ''
            ),

        approved_company_id =
            v_company_id,

        loading_ramp =
            v_loading_ramp

    where id =
        p_request_id;


    return
        jsonb_build_object(

            'status',
                'approved',

            'companyId',
                v_company_id,

            'siteId',
                v_site_id,

            'loadingRamp',
                v_loading_ramp
        );


end;

$function$;


-- ============================================================
-- PRIVILEGED RPCs: SERVER ONLY
-- ============================================================

revoke all
on function public.admin_review_client_registration(
    uuid,
    uuid,
    text,
    text,
    boolean
)
from public;

revoke all
on function public.admin_review_client_registration(
    uuid,
    uuid,
    text,
    text,
    boolean
)
from anon;

revoke all
on function public.admin_review_client_registration(
    uuid,
    uuid,
    text,
    text,
    boolean
)
from authenticated;

grant execute
on function public.admin_review_client_registration(
    uuid,
    uuid,
    text,
    text,
    boolean
)
to service_role;


revoke all
on function public.admin_provision_app_user(
    uuid,
    text,
    text,
    text,
    text,
    text,
    uuid
)
from public;

revoke all
on function public.admin_provision_app_user(
    uuid,
    text,
    text,
    text,
    text,
    text,
    uuid
)
from anon;

revoke all
on function public.admin_provision_app_user(
    uuid,
    text,
    text,
    text,
    text,
    text,
    uuid
)
from authenticated;

grant execute
on function public.admin_provision_app_user(
    uuid,
    text,
    text,
    text,
    text,
    text,
    uuid
)
to service_role;


commit;
