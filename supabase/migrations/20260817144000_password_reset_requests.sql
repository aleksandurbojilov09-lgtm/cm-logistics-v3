begin;

create table if not exists public.password_reset_requests (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references public.profiles(id)
        on delete cascade,

    login_id_snapshot text not null,

    status text not null
        default 'pending'
        check (
            status in (
                'pending',
                'processing',
                'completed',
                'rejected'
            )
        ),

    requested_at timestamptz
        not null
        default now(),

    reviewed_by uuid null
        references public.profiles(id)
        on delete set null,

    reviewed_at timestamptz null,
    completed_at timestamptz null,

    created_at timestamptz
        not null
        default now(),

    updated_at timestamptz
        not null
        default now()
);

create unique index if not exists
password_reset_requests_one_open_per_user_idx
on public.password_reset_requests (user_id)
where status in ('pending', 'processing');

create index if not exists
password_reset_requests_status_requested_idx
on public.password_reset_requests (
    status,
    requested_at
);

alter table
public.password_reset_requests
enable row level security;

revoke all
on table public.password_reset_requests
from public, anon, authenticated;

grant all
on table public.password_reset_requests
to service_role;

commit;
