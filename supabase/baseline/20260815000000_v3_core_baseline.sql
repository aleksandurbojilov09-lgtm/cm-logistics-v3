-- K3 Logistics V3 core baseline
-- Historical core state immediately before 20260815162400_create_fixed_locations.sql.
-- Reconstructed from the Phase 3 proven staging core and the immutable 13-migration delta.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;
create schema if not exists cm_private;
grant usage on schema cm_private to authenticated;

create table public.client_companies (
  id uuid default gen_random_uuid() not null,
  company_name text not null,
  contact_person text,
  phone text,
  email text,
  registered_address text,
  is_active boolean default true not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.client_registration_requests (
  id uuid default gen_random_uuid() not null,
  auth_user_id uuid,
  login_id text not null,
  company_name text not null,
  contact_person text,
  phone text,
  email text,
  registered_address text,
  status text default 'pending'::text not null,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  review_note text,
  approved_company_id uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  loading_address text,
  latitude numeric,
  longitude numeric,
  loading_ramp boolean default false not null
);

create table public.client_sites (
  id uuid default gen_random_uuid() not null,
  company_id uuid not null,
  site_name text not null,
  address text not null,
  contact_person text,
  phone text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  is_active boolean default true not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  loading_ramp boolean default false not null
);

create table public.client_users (
  user_id uuid not null,
  company_id uuid not null,
  is_primary boolean default false not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.discrepancies (
  id uuid default gen_random_uuid() not null,
  trip_id uuid not null,
  trip_stop_id uuid not null,
  order_assignment_id uuid not null,
  order_id uuid not null,
  company_id uuid not null,
  reported_by uuid not null,
  company_name_snapshot text not null,
  driver_name_snapshot text not null,
  truck_number_snapshot text not null,
  assigned_kg_snapshot bigint not null,
  actual_loaded_kg bigint not null,
  assigned_tons_snapshot numeric(12,3) generated always as (((assigned_kg_snapshot)::numeric / (1000)::numeric)) stored,
  actual_loaded_tons numeric(12,3) generated always as (((actual_loaded_kg)::numeric / (1000)::numeric)) stored,
  difference_tons numeric(12,3) generated always as ((((actual_loaded_kg - assigned_kg_snapshot))::numeric / (1000)::numeric)) stored,
  note text,
  status text default 'reported'::text not null,
  resolved_by uuid,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.driver_home_trucks (
  driver_id uuid not null,
  truck_id uuid not null,
  assigned_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.drivers (
  id uuid not null,
  employee_code text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.notifications (
  id uuid default gen_random_uuid() not null,
  notification_type text not null,
  recipient_role text not null,
  company_id uuid not null,
  recipient_profile_id uuid,
  sent_by uuid,
  trip_id uuid,
  trip_stop_id uuid,
  order_assignment_id uuid not null,
  discrepancy_id uuid,
  title text not null,
  message text not null,
  requires_confirmation boolean default false not null,
  confirmed_by uuid,
  confirmed_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.order_assignments (
  id uuid default gen_random_uuid() not null,
  order_id uuid not null,
  vehicle_assignment_id uuid not null,
  driver_id uuid not null,
  truck_id uuid not null,
  trailer_id uuid not null,
  trip_id uuid,
  assigned_kg bigint not null,
  assigned_tons numeric(12,3) generated always as (((assigned_kg)::numeric / (1000)::numeric)) stored,
  loaded_kg bigint,
  loaded_tons numeric(12,3) generated always as (((loaded_kg)::numeric / (1000)::numeric)) stored,
  status text default 'assigned'::text not null,
  driver_name_snapshot text not null,
  truck_number_snapshot text not null,
  trailer_number_snapshot text not null,
  trailer_permit_snapshot text,
  assigned_by uuid,
  assigned_at timestamp with time zone default now() not null,
  completed_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  cancelled_by uuid
);

create table public.orders (
  id uuid default gen_random_uuid() not null,
  order_number bigint generated always as identity not null,
  company_id uuid not null,
  site_id uuid not null,
  requested_kg bigint not null,
  requested_tons numeric(12,3) generated always as (((requested_kg)::numeric / (1000)::numeric)) stored,
  note text,
  status text default 'pending'::text not null,
  created_by uuid,
  company_name_snapshot text not null,
  site_name_snapshot text not null,
  site_address_snapshot text not null,
  site_contact_person_snapshot text,
  site_phone_snapshot text,
  site_latitude_snapshot numeric(9,6),
  site_longitude_snapshot numeric(9,6),
  created_by_name_snapshot text,
  cancelled_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  loading_ramp_snapshot boolean default false not null
);

create table public.permissions (
  id uuid default gen_random_uuid() not null,
  code text not null,
  name text not null,
  created_at timestamp with time zone default now() not null
);

create table public.profiles (
  id uuid not null,
  login_id text not null,
  display_name text not null,
  phone text,
  is_active boolean default true not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.role_permissions (
  role_id uuid not null,
  permission_id uuid not null,
  created_at timestamp with time zone default now() not null
);

create table public.roles (
  id uuid default gen_random_uuid() not null,
  code text not null,
  name text not null,
  created_at timestamp with time zone default now() not null
);

create table public.trailers (
  id uuid default gen_random_uuid() not null,
  registration_number text not null,
  bioexis_permit_number text,
  is_active boolean default true not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.trip_driver_handoff_requests (
  id uuid default gen_random_uuid() not null,
  trip_id uuid not null,
  from_driver_id uuid not null,
  to_driver_id uuid not null,
  from_segment_id uuid not null,
  from_vehicle_assignment_id uuid not null,
  truck_id uuid not null,
  trailer_id uuid,
  from_driver_name_snapshot text not null,
  to_driver_name_snapshot text not null,
  truck_number_snapshot text not null,
  trailer_number_snapshot text,
  position_number_snapshot text,
  handoff_km bigint not null,
  status text default 'pending'::text not null,
  restore_snapshot jsonb not null,
  restore_status text default 'not_applicable'::text not null,
  requested_at timestamp with time zone default now() not null,
  accepted_at timestamp with time zone,
  rejected_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  completed_at timestamp with time zone,
  restored_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.trip_segments (
  id uuid default gen_random_uuid() not null,
  trip_id uuid not null,
  segment_number integer not null,
  vehicle_assignment_id uuid not null,
  driver_id uuid not null,
  truck_id uuid not null,
  trailer_id uuid,
  driver_name_snapshot text not null,
  truck_number_snapshot text not null,
  trailer_number_snapshot text,
  position_number_snapshot text,
  start_km bigint not null,
  end_km bigint,
  total_km bigint generated always as (
CASE
    WHEN (end_km IS NULL) THEN NULL::bigint
    ELSE (end_km - start_km)
END) stored,
  status text default 'active'::text not null,
  started_at timestamp with time zone default now() not null,
  ended_at timestamp with time zone,
  end_reason text,
  created_at timestamp with time zone default now() not null
);

create table public.trip_stops (
  id uuid default gen_random_uuid() not null,
  trip_id uuid not null,
  stop_number integer not null,
  order_assignment_id uuid not null,
  order_id uuid not null,
  company_id uuid not null,
  site_id uuid not null,
  order_number_snapshot bigint not null,
  company_name_snapshot text not null,
  site_name_snapshot text not null,
  site_address_snapshot text not null,
  site_contact_person_snapshot text,
  site_phone_snapshot text,
  latitude_snapshot numeric(9,6) not null,
  longitude_snapshot numeric(9,6) not null,
  assigned_kg_snapshot bigint not null,
  assigned_tons_snapshot numeric(12,3) generated always as (((assigned_kg_snapshot)::numeric / (1000)::numeric)) stored,
  order_note_snapshot text,
  status text default 'waiting'::text not null,
  eta_notified_at timestamp with time zone,
  loaded_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.trip_truck_change_requests (
  id uuid default gen_random_uuid() not null,
  trip_id uuid not null,
  driver_id uuid not null,
  status text default 'pending_driver_km'::text not null,
  change_mode text not null,
  requested_by uuid not null,
  requested_at timestamp with time zone default now() not null,
  from_segment_id uuid not null,
  from_vehicle_assignment_id uuid not null,
  from_truck_id uuid not null,
  to_truck_id uuid not null,
  trailer_id uuid,
  driver_name_snapshot text not null,
  from_truck_number_snapshot text not null,
  to_truck_number_snapshot text not null,
  trailer_number_snapshot text,
  trailer_permit_snapshot text,
  old_truck_end_km bigint,
  new_truck_start_km bigint,
  confirmed_by uuid,
  confirmed_at timestamp with time zone,
  completed_at timestamp with time zone,
  cancelled_by uuid,
  cancelled_at timestamp with time zone,
  new_vehicle_assignment_id uuid,
  new_segment_id uuid,
  restore_status text default 'not_applicable'::text not null,
  restore_snapshot jsonb default '{}'::jsonb not null,
  restored_at timestamp with time zone,
  superseded_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.trips (
  id uuid default gen_random_uuid() not null,
  trip_number bigint generated by default as identity not null,
  primary_driver_id uuid,
  status text default 'planned'::text not null,
  note text,
  created_by uuid not null,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.trucks (
  id uuid default gen_random_uuid() not null,
  registration_number text not null,
  is_active boolean default true not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.user_roles (
  user_id uuid not null,
  role_id uuid not null,
  is_primary boolean default false not null,
  created_at timestamp with time zone default now() not null
);

create table public.vehicle_assignments (
  id uuid default gen_random_uuid() not null,
  driver_id uuid,
  truck_id uuid not null,
  trailer_id uuid,
  assignment_mode text not null,
  temporary_trip_id uuid,
  previous_assignment_id uuid,
  started_at timestamp with time zone default now() not null,
  ended_at timestamp with time zone,
  ended_reason text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

alter table public.client_companies add constraint client_companies_pkey PRIMARY KEY (id);
alter table public.client_registration_requests add constraint client_registration_requests_pkey PRIMARY KEY (id);
alter table public.client_sites add constraint client_sites_pkey PRIMARY KEY (id);
alter table public.client_users add constraint client_users_pkey PRIMARY KEY (user_id, company_id);
alter table public.discrepancies add constraint discrepancies_pkey PRIMARY KEY (id);
alter table public.driver_home_trucks add constraint driver_home_trucks_pkey PRIMARY KEY (driver_id);
alter table public.drivers add constraint drivers_pkey PRIMARY KEY (id);
alter table public.notifications add constraint notifications_pkey PRIMARY KEY (id);
alter table public.order_assignments add constraint order_assignments_pkey PRIMARY KEY (id);
alter table public.orders add constraint orders_pkey PRIMARY KEY (id);
alter table public.permissions add constraint permissions_pkey PRIMARY KEY (id);
alter table public.profiles add constraint profiles_pkey PRIMARY KEY (id);
alter table public.role_permissions add constraint role_permissions_pkey PRIMARY KEY (role_id, permission_id);
alter table public.roles add constraint roles_pkey PRIMARY KEY (id);
alter table public.trailers add constraint trailers_pkey PRIMARY KEY (id);
alter table public.trip_driver_handoff_requests add constraint trip_driver_handoff_requests_pkey PRIMARY KEY (id);
alter table public.trip_segments add constraint trip_segments_pkey PRIMARY KEY (id);
alter table public.trip_stops add constraint trip_stops_pkey PRIMARY KEY (id);
alter table public.trip_truck_change_requests add constraint trip_truck_change_requests_pkey PRIMARY KEY (id);
alter table public.trips add constraint trips_pkey PRIMARY KEY (id);
alter table public.trucks add constraint trucks_pkey PRIMARY KEY (id);
alter table public.user_roles add constraint user_roles_pkey PRIMARY KEY (user_id, role_id);
alter table public.vehicle_assignments add constraint vehicle_assignments_pkey PRIMARY KEY (id);
alter table public.client_sites add constraint client_sites_company_id_id_unique UNIQUE (company_id, id);
alter table public.discrepancies add constraint discrepancies_assignment_unique UNIQUE (order_assignment_id);
alter table public.discrepancies add constraint discrepancies_stop_unique UNIQUE (trip_stop_id);
alter table public.driver_home_trucks add constraint driver_home_trucks_truck_id_key UNIQUE (truck_id);
alter table public.drivers add constraint drivers_employee_code_key UNIQUE (employee_code);
alter table public.orders add constraint orders_order_number_key UNIQUE (order_number);
alter table public.permissions add constraint permissions_code_key UNIQUE (code);
alter table public.roles add constraint roles_code_key UNIQUE (code);
alter table public.trailers add constraint trailers_registration_number_key UNIQUE (registration_number);
alter table public.trip_segments add constraint trip_segments_trip_number_unique UNIQUE (trip_id, segment_number);
alter table public.trip_stops add constraint trip_stops_assignment_unique UNIQUE (order_assignment_id);
alter table public.trip_stops add constraint trip_stops_trip_number_unique UNIQUE (trip_id, stop_number);
alter table public.trips add constraint trips_trip_number_key UNIQUE (trip_number);
alter table public.trucks add constraint trucks_registration_number_key UNIQUE (registration_number);
alter table public.client_companies add constraint client_companies_email_not_blank CHECK (email IS NULL OR btrim(email) <> ''::text);
alter table public.client_companies add constraint client_companies_name_not_blank CHECK (btrim(company_name) <> ''::text);
alter table public.client_registration_requests add constraint client_registration_company_not_blank CHECK (btrim(company_name) <> ''::text);
alter table public.client_registration_requests add constraint client_registration_contact_not_blank CHECK (contact_person IS NULL OR btrim(contact_person) <> ''::text);
alter table public.client_registration_requests add constraint client_registration_coordinates_pair CHECK (latitude IS NULL AND longitude IS NULL OR latitude IS NOT NULL AND longitude IS NOT NULL);
alter table public.client_registration_requests add constraint client_registration_latitude_range CHECK (latitude IS NULL OR latitude >= '-90'::integer::numeric AND latitude <= 90::numeric);
alter table public.client_registration_requests add constraint client_registration_lifecycle CHECK (status = 'pending'::text AND auth_user_id IS NOT NULL AND reviewed_at IS NULL AND approved_company_id IS NULL OR status = 'approved'::text AND reviewed_at IS NOT NULL AND approved_company_id IS NOT NULL OR status = 'rejected'::text AND reviewed_at IS NOT NULL AND approved_company_id IS NULL);
alter table public.client_registration_requests add constraint client_registration_loading_address_not_blank CHECK (loading_address IS NULL OR btrim(loading_address) <> ''::text);
alter table public.client_registration_requests add constraint client_registration_login_valid CHECK (login_id ~ '^[a-z0-9][a-z0-9._-]{2,31}$'::text);
alter table public.client_registration_requests add constraint client_registration_longitude_range CHECK (longitude IS NULL OR longitude >= '-180'::integer::numeric AND longitude <= 180::numeric);
alter table public.client_registration_requests add constraint client_registration_phone_not_blank CHECK (phone IS NULL OR btrim(phone) <> ''::text);
alter table public.client_registration_requests add constraint client_registration_status_valid CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]));
alter table public.client_sites add constraint client_sites_address_not_blank CHECK (btrim(address) <> ''::text);
alter table public.client_sites add constraint client_sites_coordinates_pair CHECK (latitude IS NULL AND longitude IS NULL OR latitude IS NOT NULL AND longitude IS NOT NULL);
alter table public.client_sites add constraint client_sites_latitude_range CHECK (latitude IS NULL OR latitude >= '-90'::integer::numeric AND latitude <= 90::numeric);
alter table public.client_sites add constraint client_sites_longitude_range CHECK (longitude IS NULL OR longitude >= '-180'::integer::numeric AND longitude <= 180::numeric);
alter table public.client_sites add constraint client_sites_name_not_blank CHECK (btrim(site_name) <> ''::text);
alter table public.discrepancies add constraint discrepancies_actual_nonnegative CHECK (actual_loaded_kg >= 0);
alter table public.discrepancies add constraint discrepancies_assigned_positive CHECK (assigned_kg_snapshot > 0);
alter table public.discrepancies add constraint discrepancies_review_state_check CHECK (status = 'reported'::text AND resolved_at IS NULL OR status = 'reviewed'::text AND resolved_at IS NOT NULL);
alter table public.discrepancies add constraint discrepancies_status_check CHECK (status = ANY (ARRAY['reported'::text, 'reviewed'::text]));
alter table public.notifications add constraint notifications_message_nonblank CHECK (btrim(message) <> ''::text);
alter table public.notifications add constraint notifications_recipient_role_check CHECK (recipient_role = ANY (ARRAY['client'::text, 'staff'::text]));
alter table public.notifications add constraint notifications_title_nonblank CHECK (btrim(title) <> ''::text);
alter table public.notifications add constraint notifications_type_nonblank CHECK (btrim(notification_type) <> ''::text);
alter table public.order_assignments add constraint order_assignments_assigned_kg_positive CHECK (assigned_kg > 0);
alter table public.order_assignments add constraint order_assignments_loaded_kg_nonnegative CHECK (loaded_kg IS NULL OR loaded_kg >= 0);
alter table public.order_assignments add constraint order_assignments_started_trip_check CHECK ((status = ANY (ARRAY['assigned'::text, 'cancelled'::text])) OR trip_id IS NOT NULL);
alter table public.order_assignments add constraint order_assignments_status_check CHECK (status = ANY (ARRAY['assigned'::text, 'accepted'::text, 'en_route'::text, 'arrived'::text, 'loaded'::text, 'completed'::text, 'cancelled'::text]));
alter table public.order_assignments add constraint order_assignments_terminal_state_check CHECK (status = 'completed'::text AND completed_at IS NOT NULL AND cancelled_at IS NULL OR status = 'cancelled'::text AND cancelled_at IS NOT NULL AND completed_at IS NULL OR (status = ANY (ARRAY['assigned'::text, 'accepted'::text, 'en_route'::text, 'arrived'::text, 'loaded'::text])) AND completed_at IS NULL AND cancelled_at IS NULL);
alter table public.orders add constraint orders_requested_kg_positive CHECK (requested_kg > 0);
alter table public.orders add constraint orders_snapshot_address_not_blank CHECK (btrim(site_address_snapshot) <> ''::text);
alter table public.orders add constraint orders_snapshot_company_not_blank CHECK (btrim(company_name_snapshot) <> ''::text);
alter table public.orders add constraint orders_snapshot_coordinates_pair CHECK (site_latitude_snapshot IS NULL AND site_longitude_snapshot IS NULL OR site_latitude_snapshot IS NOT NULL AND site_longitude_snapshot IS NOT NULL);
alter table public.orders add constraint orders_snapshot_site_not_blank CHECK (btrim(site_name_snapshot) <> ''::text);
alter table public.orders add constraint orders_status_check CHECK (status = ANY (ARRAY['pending'::text, 'partial'::text, 'assigned'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text]));
alter table public.orders add constraint orders_terminal_state_check CHECK (status = 'completed'::text AND completed_at IS NOT NULL AND cancelled_at IS NULL OR status = 'cancelled'::text AND cancelled_at IS NOT NULL AND completed_at IS NULL OR (status = ANY (ARRAY['pending'::text, 'partial'::text, 'assigned'::text, 'in_progress'::text])) AND completed_at IS NULL AND cancelled_at IS NULL);
alter table public.profiles add constraint profiles_login_id_format_check CHECK (login_id = lower(login_id) AND login_id ~ '^[a-z0-9][a-z0-9._-]{2,31}$'::text);
alter table public.roles add constraint roles_code_check CHECK (code = ANY (ARRAY['admin'::text, 'dispatcher'::text, 'driver'::text, 'client'::text]));
alter table public.trailers add constraint trailers_bioexis_permit_format_check CHECK (bioexis_permit_number IS NULL OR bioexis_permit_number ~ '^[0-9]{3,4}$'::text);
alter table public.trip_driver_handoff_requests add constraint trip_driver_handoff_different_drivers_check CHECK (from_driver_id <> to_driver_id);
alter table public.trip_driver_handoff_requests add constraint trip_driver_handoff_km_check CHECK (handoff_km >= 0);
alter table public.trip_driver_handoff_requests add constraint trip_driver_handoff_lifecycle_check CHECK (status = 'pending'::text AND accepted_at IS NULL AND rejected_at IS NULL AND cancelled_at IS NULL AND completed_at IS NULL AND restore_status = 'not_applicable'::text AND restored_at IS NULL OR status = 'accepted'::text AND accepted_at IS NOT NULL AND completed_at IS NOT NULL AND rejected_at IS NULL AND cancelled_at IS NULL AND (restore_status = ANY (ARRAY['pending'::text, 'restored'::text])) AND (restore_status = 'pending'::text AND restored_at IS NULL OR restore_status = 'restored'::text AND restored_at IS NOT NULL) OR status = 'rejected'::text AND accepted_at IS NULL AND rejected_at IS NOT NULL AND cancelled_at IS NULL AND completed_at IS NULL AND restore_status = 'not_applicable'::text AND restored_at IS NULL OR status = 'cancelled'::text AND accepted_at IS NULL AND rejected_at IS NULL AND cancelled_at IS NOT NULL AND completed_at IS NULL AND restore_status = 'not_applicable'::text AND restored_at IS NULL);
alter table public.trip_driver_handoff_requests add constraint trip_driver_handoff_restore_status_check CHECK (restore_status = ANY (ARRAY['not_applicable'::text, 'pending'::text, 'restored'::text]));
alter table public.trip_driver_handoff_requests add constraint trip_driver_handoff_status_check CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text, 'cancelled'::text]));
alter table public.trip_segments add constraint trip_segments_end_km_check CHECK (end_km IS NULL OR end_km >= start_km);
alter table public.trip_segments add constraint trip_segments_lifecycle_check CHECK (status = 'active'::text AND end_km IS NULL AND ended_at IS NULL OR status = 'completed'::text AND end_km IS NOT NULL AND ended_at IS NOT NULL);
alter table public.trip_segments add constraint trip_segments_number_check CHECK (segment_number >= 1);
alter table public.trip_segments add constraint trip_segments_start_km_check CHECK (start_km >= 0);
alter table public.trip_segments add constraint trip_segments_status_check CHECK (status = ANY (ARRAY['active'::text, 'completed'::text]));
alter table public.trip_stops add constraint trip_stops_assigned_kg_positive CHECK (assigned_kg_snapshot > 0);
alter table public.trip_stops add constraint trip_stops_latitude_check CHECK (latitude_snapshot >= '-90'::integer::numeric AND latitude_snapshot <= 90::numeric);
alter table public.trip_stops add constraint trip_stops_lifecycle_check CHECK ((status = ANY (ARRAY['waiting'::text, 'en_route'::text])) AND loaded_at IS NULL OR status = 'loaded'::text AND loaded_at IS NOT NULL);
alter table public.trip_stops add constraint trip_stops_longitude_check CHECK (longitude_snapshot >= '-180'::integer::numeric AND longitude_snapshot <= 180::numeric);
alter table public.trip_stops add constraint trip_stops_number_positive CHECK (stop_number >= 1);
alter table public.trip_stops add constraint trip_stops_status_check CHECK (status = ANY (ARRAY['waiting'::text, 'en_route'::text, 'loaded'::text]));
alter table public.trip_truck_change_requests add constraint trip_truck_change_requests_different_trucks CHECK (from_truck_id <> to_truck_id);
alter table public.trip_truck_change_requests add constraint trip_truck_change_requests_km_check CHECK (old_truck_end_km IS NULL OR old_truck_end_km >= 0);
alter table public.trip_truck_change_requests add constraint trip_truck_change_requests_mode_check CHECK (change_mode = ANY (ARRAY['temporary_for_trip'::text, 'permanent'::text]));
alter table public.trip_truck_change_requests add constraint trip_truck_change_requests_new_km_check CHECK (new_truck_start_km IS NULL OR new_truck_start_km >= 0);
alter table public.trip_truck_change_requests add constraint trip_truck_change_requests_restore_check CHECK (restore_status = ANY (ARRAY['not_applicable'::text, 'pending'::text, 'restored'::text, 'superseded'::text]));
alter table public.trip_truck_change_requests add constraint trip_truck_change_requests_status_check CHECK (status = ANY (ARRAY['pending_driver_km'::text, 'completed'::text, 'cancelled'::text]));
alter table public.trips add constraint trips_lifecycle_check_v3 CHECK (status = 'planned'::text AND started_at IS NULL AND completed_at IS NULL AND cancelled_at IS NULL OR status = 'active'::text AND primary_driver_id IS NOT NULL AND started_at IS NOT NULL AND completed_at IS NULL AND cancelled_at IS NULL OR status = 'completed'::text AND primary_driver_id IS NOT NULL AND started_at IS NOT NULL AND completed_at IS NOT NULL AND cancelled_at IS NULL OR status = 'cancelled'::text AND completed_at IS NULL AND cancelled_at IS NOT NULL);
alter table public.trips add constraint trips_status_check CHECK (status = ANY (ARRAY['planned'::text, 'active'::text, 'completed'::text, 'cancelled'::text]));
alter table public.trips add constraint trips_terminal_time_check CHECK (NOT (completed_at IS NOT NULL AND cancelled_at IS NOT NULL));
alter table public.vehicle_assignments add constraint vehicle_assignments_mode_check CHECK (assignment_mode = ANY (ARRAY['permanent'::text, 'temporary_for_trip'::text]));
alter table public.vehicle_assignments add constraint vehicle_assignments_temp_driver_check CHECK (assignment_mode <> 'temporary_for_trip'::text OR driver_id IS NOT NULL);
alter table public.vehicle_assignments add constraint vehicle_assignments_time_check CHECK (ended_at IS NULL OR ended_at >= started_at);
alter table public.vehicle_assignments add constraint vehicle_assignments_trip_mode_check CHECK (assignment_mode = 'permanent'::text AND temporary_trip_id IS NULL OR assignment_mode = 'temporary_for_trip'::text AND temporary_trip_id IS NOT NULL);

alter table public.client_registration_requests add constraint client_registration_requests_approved_company_id_fkey FOREIGN KEY (approved_company_id) REFERENCES public.client_companies(id) ON DELETE RESTRICT;
alter table public.client_registration_requests add constraint client_registration_requests_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public.client_registration_requests add constraint client_registration_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public.client_sites add constraint client_sites_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.client_companies(id) ON DELETE RESTRICT;
alter table public.client_users add constraint client_users_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.client_companies(id) ON DELETE RESTRICT;
alter table public.client_users add constraint client_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
alter table public.discrepancies add constraint discrepancies_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.client_companies(id) ON DELETE RESTRICT;
alter table public.discrepancies add constraint discrepancies_order_assignment_id_fkey FOREIGN KEY (order_assignment_id) REFERENCES public.order_assignments(id) ON DELETE RESTRICT;
alter table public.discrepancies add constraint discrepancies_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE RESTRICT;
alter table public.discrepancies add constraint discrepancies_reported_by_fkey FOREIGN KEY (reported_by) REFERENCES public.drivers(id) ON DELETE RESTRICT;
alter table public.discrepancies add constraint discrepancies_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public.discrepancies add constraint discrepancies_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE RESTRICT;
alter table public.discrepancies add constraint discrepancies_trip_stop_id_fkey FOREIGN KEY (trip_stop_id) REFERENCES public.trip_stops(id) ON DELETE RESTRICT;
alter table public.driver_home_trucks add constraint driver_home_trucks_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.drivers(id) ON DELETE CASCADE;
alter table public.driver_home_trucks add constraint driver_home_trucks_truck_id_fkey FOREIGN KEY (truck_id) REFERENCES public.trucks(id) ON DELETE CASCADE;
alter table public.drivers add constraint drivers_id_fkey FOREIGN KEY (id) REFERENCES public.profiles(id) ON DELETE CASCADE;
alter table public.notifications add constraint notifications_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.client_companies(id) ON DELETE RESTRICT;
alter table public.notifications add constraint notifications_confirmed_by_fkey FOREIGN KEY (confirmed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public.notifications add constraint notifications_discrepancy_id_fkey FOREIGN KEY (discrepancy_id) REFERENCES public.discrepancies(id) ON DELETE RESTRICT;
alter table public.notifications add constraint notifications_order_assignment_id_fkey FOREIGN KEY (order_assignment_id) REFERENCES public.order_assignments(id) ON DELETE RESTRICT;
alter table public.notifications add constraint notifications_recipient_profile_id_fkey FOREIGN KEY (recipient_profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
alter table public.notifications add constraint notifications_sent_by_fkey FOREIGN KEY (sent_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public.notifications add constraint notifications_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE RESTRICT;
alter table public.notifications add constraint notifications_trip_stop_id_fkey FOREIGN KEY (trip_stop_id) REFERENCES public.trip_stops(id) ON DELETE RESTRICT;
alter table public.order_assignments add constraint order_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public.order_assignments add constraint order_assignments_cancelled_by_fkey FOREIGN KEY (cancelled_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public.order_assignments add constraint order_assignments_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.drivers(id) ON DELETE RESTRICT;
alter table public.order_assignments add constraint order_assignments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE RESTRICT;
alter table public.order_assignments add constraint order_assignments_trailer_id_fkey FOREIGN KEY (trailer_id) REFERENCES public.trailers(id) ON DELETE RESTRICT;
alter table public.order_assignments add constraint order_assignments_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE RESTRICT;
alter table public.order_assignments add constraint order_assignments_truck_id_fkey FOREIGN KEY (truck_id) REFERENCES public.trucks(id) ON DELETE RESTRICT;
alter table public.order_assignments add constraint order_assignments_vehicle_assignment_id_fkey FOREIGN KEY (vehicle_assignment_id) REFERENCES public.vehicle_assignments(id) ON DELETE RESTRICT;
alter table public.orders add constraint orders_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.client_companies(id) ON DELETE RESTRICT;
alter table public.orders add constraint orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public.orders add constraint orders_site_company_fk FOREIGN KEY (company_id, site_id) REFERENCES public.client_sites(company_id, id) ON DELETE RESTRICT;
alter table public.profiles add constraint profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.role_permissions add constraint role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;
alter table public.role_permissions add constraint role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;
alter table public.trip_driver_handoff_requests add constraint trip_driver_handoff_requests_from_driver_id_fkey FOREIGN KEY (from_driver_id) REFERENCES public.drivers(id);
alter table public.trip_driver_handoff_requests add constraint trip_driver_handoff_requests_from_segment_id_fkey FOREIGN KEY (from_segment_id) REFERENCES public.trip_segments(id);
alter table public.trip_driver_handoff_requests add constraint trip_driver_handoff_requests_from_vehicle_assignment_id_fkey FOREIGN KEY (from_vehicle_assignment_id) REFERENCES public.vehicle_assignments(id);
alter table public.trip_driver_handoff_requests add constraint trip_driver_handoff_requests_to_driver_id_fkey FOREIGN KEY (to_driver_id) REFERENCES public.drivers(id);
alter table public.trip_driver_handoff_requests add constraint trip_driver_handoff_requests_trailer_id_fkey FOREIGN KEY (trailer_id) REFERENCES public.trailers(id);
alter table public.trip_driver_handoff_requests add constraint trip_driver_handoff_requests_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;
alter table public.trip_driver_handoff_requests add constraint trip_driver_handoff_requests_truck_id_fkey FOREIGN KEY (truck_id) REFERENCES public.trucks(id);
alter table public.trip_segments add constraint trip_segments_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.drivers(id) ON DELETE RESTRICT;
alter table public.trip_segments add constraint trip_segments_trailer_id_fkey FOREIGN KEY (trailer_id) REFERENCES public.trailers(id) ON DELETE RESTRICT;
alter table public.trip_segments add constraint trip_segments_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE RESTRICT;
alter table public.trip_segments add constraint trip_segments_truck_id_fkey FOREIGN KEY (truck_id) REFERENCES public.trucks(id) ON DELETE RESTRICT;
alter table public.trip_segments add constraint trip_segments_vehicle_assignment_id_fkey FOREIGN KEY (vehicle_assignment_id) REFERENCES public.vehicle_assignments(id) ON DELETE RESTRICT;
alter table public.trip_stops add constraint trip_stops_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.client_companies(id) ON DELETE RESTRICT;
alter table public.trip_stops add constraint trip_stops_order_assignment_id_fkey FOREIGN KEY (order_assignment_id) REFERENCES public.order_assignments(id) ON DELETE RESTRICT;
alter table public.trip_stops add constraint trip_stops_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE RESTRICT;
alter table public.trip_stops add constraint trip_stops_site_id_fkey FOREIGN KEY (site_id) REFERENCES public.client_sites(id) ON DELETE RESTRICT;
alter table public.trip_stops add constraint trip_stops_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE RESTRICT;
alter table public.trip_truck_change_requests add constraint trip_truck_change_requests_cancelled_by_fkey FOREIGN KEY (cancelled_by) REFERENCES auth.users(id) ON DELETE RESTRICT;
alter table public.trip_truck_change_requests add constraint trip_truck_change_requests_confirmed_by_fkey FOREIGN KEY (confirmed_by) REFERENCES auth.users(id) ON DELETE RESTRICT;
alter table public.trip_truck_change_requests add constraint trip_truck_change_requests_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.drivers(id) ON DELETE RESTRICT;
alter table public.trip_truck_change_requests add constraint trip_truck_change_requests_from_segment_id_fkey FOREIGN KEY (from_segment_id) REFERENCES public.trip_segments(id) ON DELETE RESTRICT;
alter table public.trip_truck_change_requests add constraint trip_truck_change_requests_from_truck_id_fkey FOREIGN KEY (from_truck_id) REFERENCES public.trucks(id) ON DELETE RESTRICT;
alter table public.trip_truck_change_requests add constraint trip_truck_change_requests_from_vehicle_assignment_id_fkey FOREIGN KEY (from_vehicle_assignment_id) REFERENCES public.vehicle_assignments(id) ON DELETE RESTRICT;
alter table public.trip_truck_change_requests add constraint trip_truck_change_requests_new_segment_id_fkey FOREIGN KEY (new_segment_id) REFERENCES public.trip_segments(id) ON DELETE RESTRICT;
alter table public.trip_truck_change_requests add constraint trip_truck_change_requests_new_vehicle_assignment_id_fkey FOREIGN KEY (new_vehicle_assignment_id) REFERENCES public.vehicle_assignments(id) ON DELETE RESTRICT;
alter table public.trip_truck_change_requests add constraint trip_truck_change_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES auth.users(id) ON DELETE RESTRICT;
alter table public.trip_truck_change_requests add constraint trip_truck_change_requests_to_truck_id_fkey FOREIGN KEY (to_truck_id) REFERENCES public.trucks(id) ON DELETE RESTRICT;
alter table public.trip_truck_change_requests add constraint trip_truck_change_requests_trailer_id_fkey FOREIGN KEY (trailer_id) REFERENCES public.trailers(id) ON DELETE RESTRICT;
alter table public.trip_truck_change_requests add constraint trip_truck_change_requests_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE RESTRICT;
alter table public.trips add constraint trips_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE RESTRICT;
alter table public.trips add constraint trips_primary_driver_id_fkey FOREIGN KEY (primary_driver_id) REFERENCES public.drivers(id) ON DELETE RESTRICT;
alter table public.user_roles add constraint user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE RESTRICT;
alter table public.user_roles add constraint user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.vehicle_assignments add constraint vehicle_assignments_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.drivers(id) ON DELETE RESTRICT;
alter table public.vehicle_assignments add constraint vehicle_assignments_previous_assignment_id_fkey FOREIGN KEY (previous_assignment_id) REFERENCES public.vehicle_assignments(id) ON DELETE SET NULL;
alter table public.vehicle_assignments add constraint vehicle_assignments_temporary_trip_id_fkey FOREIGN KEY (temporary_trip_id) REFERENCES public.trips(id) ON DELETE RESTRICT;
alter table public.vehicle_assignments add constraint vehicle_assignments_trailer_id_fkey FOREIGN KEY (trailer_id) REFERENCES public.trailers(id) ON DELETE RESTRICT;
alter table public.vehicle_assignments add constraint vehicle_assignments_truck_id_fkey FOREIGN KEY (truck_id) REFERENCES public.trucks(id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX client_companies_name_unique ON public.client_companies USING btree (lower(btrim(company_name)));
CREATE UNIQUE INDEX client_registration_active_login_unique ON public.client_registration_requests USING btree (lower(login_id)) WHERE (status = ANY (ARRAY['pending'::text, 'approved'::text]));
CREATE INDEX client_sites_company_idx ON public.client_sites USING btree (company_id);
CREATE UNIQUE INDEX client_sites_company_name_unique ON public.client_sites USING btree (company_id, lower(btrim(site_name)));
CREATE INDEX client_users_company_idx ON public.client_users USING btree (company_id);
CREATE UNIQUE INDEX client_users_one_primary_per_user ON public.client_users USING btree (user_id) WHERE (is_primary = true);
CREATE INDEX discrepancies_company_created_idx ON public.discrepancies USING btree (company_id, created_at DESC);
CREATE INDEX discrepancies_status_created_idx ON public.discrepancies USING btree (status, created_at DESC);
CREATE INDEX discrepancies_trip_idx ON public.discrepancies USING btree (trip_id);
CREATE INDEX notifications_company_created_idx ON public.notifications USING btree (company_id, created_at DESC);
CREATE UNIQUE INDEX notifications_one_discrepancy_notification ON public.notifications USING btree (discrepancy_id) WHERE (discrepancy_id IS NOT NULL);
CREATE UNIQUE INDEX notifications_one_driver_eta_per_assignment ON public.notifications USING btree (order_assignment_id) WHERE (notification_type = 'driver_eta'::text);
CREATE INDEX notifications_recipient_created_idx ON public.notifications USING btree (recipient_role, created_at DESC);
CREATE INDEX notifications_trip_idx ON public.notifications USING btree (trip_id) WHERE (trip_id IS NOT NULL);
CREATE INDEX order_assignments_driver_idx ON public.order_assignments USING btree (driver_id, status);
CREATE INDEX order_assignments_order_idx ON public.order_assignments USING btree (order_id);
CREATE INDEX order_assignments_trip_idx ON public.order_assignments USING btree (trip_id) WHERE (trip_id IS NOT NULL);
CREATE INDEX order_assignments_truck_idx ON public.order_assignments USING btree (truck_id, status);
CREATE INDEX order_assignments_vehicle_assignment_idx ON public.order_assignments USING btree (vehicle_assignment_id);
CREATE INDEX orders_company_created_idx ON public.orders USING btree (company_id, created_at DESC);
CREATE INDEX orders_company_status_idx ON public.orders USING btree (company_id, status, created_at DESC);
CREATE INDEX orders_site_idx ON public.orders USING btree (site_id, created_at DESC);
CREATE INDEX orders_status_idx ON public.orders USING btree (status, created_at);
CREATE UNIQUE INDEX profiles_login_id_unique ON public.profiles USING btree (lower(login_id));
CREATE UNIQUE INDEX trip_driver_handoff_one_pending_from_driver ON public.trip_driver_handoff_requests USING btree (from_driver_id) WHERE (status = 'pending'::text);
CREATE UNIQUE INDEX trip_driver_handoff_one_pending_per_trip ON public.trip_driver_handoff_requests USING btree (trip_id) WHERE (status = 'pending'::text);
CREATE UNIQUE INDEX trip_driver_handoff_one_pending_to_driver ON public.trip_driver_handoff_requests USING btree (to_driver_id) WHERE (status = 'pending'::text);
CREATE INDEX trip_driver_handoff_to_driver_idx ON public.trip_driver_handoff_requests USING btree (to_driver_id, status, requested_at);
CREATE INDEX trip_driver_handoff_trip_history_idx ON public.trip_driver_handoff_requests USING btree (trip_id, requested_at);
CREATE INDEX trip_segments_active_trailer_idx ON public.trip_segments USING btree (trailer_id) WHERE ((status = 'active'::text) AND (trailer_id IS NOT NULL));
CREATE INDEX trip_segments_active_truck_idx ON public.trip_segments USING btree (truck_id) WHERE (status = 'active'::text);
CREATE INDEX trip_segments_assignment_idx ON public.trip_segments USING btree (vehicle_assignment_id);
CREATE INDEX trip_segments_driver_idx ON public.trip_segments USING btree (driver_id);
CREATE UNIQUE INDEX trip_segments_one_active_per_assignment ON public.trip_segments USING btree (vehicle_assignment_id) WHERE (status = 'active'::text);
CREATE UNIQUE INDEX trip_segments_one_active_per_driver ON public.trip_segments USING btree (driver_id) WHERE (status = 'active'::text);
CREATE UNIQUE INDEX trip_segments_one_active_per_trailer ON public.trip_segments USING btree (trailer_id) WHERE ((status = 'active'::text) AND (trailer_id IS NOT NULL));
CREATE UNIQUE INDEX trip_segments_one_active_per_trip ON public.trip_segments USING btree (trip_id) WHERE (status = 'active'::text);
CREATE UNIQUE INDEX trip_segments_one_active_per_truck ON public.trip_segments USING btree (truck_id) WHERE (status = 'active'::text);
CREATE INDEX trip_stops_company_idx ON public.trip_stops USING btree (company_id);
CREATE INDEX trip_stops_order_idx ON public.trip_stops USING btree (order_id);
CREATE INDEX trip_stops_site_idx ON public.trip_stops USING btree (site_id);
CREATE INDEX trip_stops_trip_status_idx ON public.trip_stops USING btree (trip_id, status, stop_number);
CREATE INDEX trip_truck_change_driver_idx ON public.trip_truck_change_requests USING btree (driver_id, status);
CREATE UNIQUE INDEX trip_truck_change_one_pending_per_trip_idx ON public.trip_truck_change_requests USING btree (trip_id) WHERE (status = 'pending_driver_km'::text);
CREATE UNIQUE INDEX trip_truck_change_one_pending_target_idx ON public.trip_truck_change_requests USING btree (to_truck_id) WHERE (status = 'pending_driver_km'::text);
CREATE INDEX trip_truck_change_trip_history_idx ON public.trip_truck_change_requests USING btree (trip_id, requested_at DESC);
CREATE UNIQUE INDEX trips_one_active_per_primary_driver ON public.trips USING btree (primary_driver_id) WHERE ((status = 'active'::text) AND (primary_driver_id IS NOT NULL));
CREATE UNIQUE INDEX user_roles_one_primary_role_per_user ON public.user_roles USING btree (user_id) WHERE (is_primary = true);
CREATE UNIQUE INDEX vehicle_assignments_one_active_driver ON public.vehicle_assignments USING btree (driver_id) WHERE ((ended_at IS NULL) AND (driver_id IS NOT NULL));
CREATE UNIQUE INDEX vehicle_assignments_one_active_trailer ON public.vehicle_assignments USING btree (trailer_id) WHERE ((ended_at IS NULL) AND (trailer_id IS NOT NULL));
CREATE UNIQUE INDEX vehicle_assignments_one_active_truck ON public.vehicle_assignments USING btree (truck_id) WHERE (ended_at IS NULL);
CREATE INDEX vehicle_assignments_temporary_trip_idx ON public.vehicle_assignments USING btree (temporary_trip_id) WHERE (temporary_trip_id IS NOT NULL);

insert into public.roles(code,name) values
('admin','Администратор'),('dispatcher','Диспечер'),('driver','Шофьор'),('client','Клиент')
on conflict(code) do update set name=excluded.name;
insert into public.permissions(code,name) values
('users.read','Преглед на потребители'),('clients.read','Преглед на клиенти и обекти'),('clients.manage','Управление на клиенти и обекти'),('fleet.read','Преглед на автопарк'),('fleet.manage','Управление на автопарк'),('orders.read','Преглед на заявки'),('orders.manage','Управление на заявки'),('trips.read','Преглед на курсове'),('trips.manage','Управление на курсове'),('discrepancies.read','Преглед на несъответствия'),('discrepancies.manage','Управление на несъответствия')
on conflict(code) do update set name=excluded.name;
insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r cross join public.permissions p where r.code='dispatcher'
on conflict do nothing;

CREATE OR REPLACE FUNCTION cm_private.is_active_user()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
select exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_active=true);
$function$;

CREATE OR REPLACE FUNCTION cm_private.has_permission(p_permission_code text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
select cm_private.is_active_user() and exists(select 1 from public.permissions permission where permission.code=p_permission_code) and (exists(select 1 from public.user_roles ur join public.roles r on r.id=ur.role_id where ur.user_id=auth.uid() and r.code='admin') or exists(select 1 from public.user_roles ur join public.role_permissions rp on rp.role_id=ur.role_id join public.permissions permission on permission.id=rp.permission_id where ur.user_id=auth.uid() and permission.code=p_permission_code));
$function$;

CREATE OR REPLACE FUNCTION cm_private.client_member_of_company(p_company_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
select exists(select 1 from public.client_users cu join public.profiles p on p.id=cu.user_id join public.user_roles ur on ur.user_id=cu.user_id and ur.is_primary=true join public.roles r on r.id=ur.role_id where cu.user_id=auth.uid() and cu.company_id=p_company_id and p.is_active=true and r.code='client');
$function$;

CREATE OR REPLACE FUNCTION cm_private.can_read_order(p_order_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_company_id uuid; begin if cm_private.has_permission('orders.read') then return true; end if; select o.company_id into v_company_id from public.orders o where o.id=p_order_id; if v_company_id is null then return false; end if; if cm_private.client_member_of_company(v_company_id) then return true; end if; if exists(select 1 from public.order_assignments oa where oa.order_id=p_order_id and oa.driver_id=auth.uid() and oa.status<>'cancelled') then return true; end if; return false; end;
$function$;

CREATE OR REPLACE FUNCTION cm_private.can_read_trip(p_trip_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin if auth.uid() is null then return false; end if; if cm_private.has_permission('trips.read') then return true; end if; return exists(select 1 from public.trips t join public.profiles p on p.id=auth.uid() where t.id=p_trip_id and p.is_active=true and (t.primary_driver_id=auth.uid() or exists(select 1 from public.trip_segments s where s.trip_id=t.id and s.driver_id=auth.uid()))); end;
$function$;

CREATE OR REPLACE FUNCTION cm_private.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin new.updated_at=now(); return new; end;
$function$;

CREATE OR REPLACE FUNCTION cm_private.truck_operational_load_kg(p_truck_id uuid, p_exclude_assignment_id uuid)
 RETURNS bigint
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
select coalesce(sum(oa.assigned_kg),0)::bigint from public.order_assignments oa left join public.trip_stops ts on ts.order_assignment_id=oa.id where oa.status not in ('completed','cancelled') and (p_exclude_assignment_id is null or oa.id<>p_exclude_assignment_id) and coalesce(case when oa.status='loaded' and ts.status='loaded' and oa.trip_id is not null then (select s.truck_id from public.trip_segments s join public.trips t on t.id=s.trip_id where s.trip_id=oa.trip_id and s.status='active' and t.status='active' limit 1) else null end,oa.truck_id)=p_truck_id;
$function$;

CREATE OR REPLACE FUNCTION cm_private.enforce_order_assignment_capacity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_requested_kg bigint; v_other_assigned_kg bigint; v_final_assigned_kg bigint; begin if tg_op='UPDATE' and new.order_id is distinct from old.order_id then raise exception 'Зачисляване не може да бъде преместено към друга заявка.'; end if; select o.requested_kg into v_requested_kg from public.orders o where o.id=new.order_id for update; if v_requested_kg is null then raise exception 'Заявката не е намерена.'; end if; select coalesce(sum(oa.assigned_kg),0) into v_other_assigned_kg from public.order_assignments oa where oa.order_id=new.order_id and oa.status<>'cancelled' and oa.id<>new.id; v_final_assigned_kg=v_other_assigned_kg; if new.status<>'cancelled' then v_final_assigned_kg=v_final_assigned_kg+new.assigned_kg; end if; if v_final_assigned_kg>v_requested_kg then raise exception 'Не може да се зачисли повече от оставащото количество по заявката.'; end if; return new; end;
$function$;

CREATE OR REPLACE FUNCTION cm_private.enforce_order_requested_capacity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_assigned_kg bigint; begin if new.requested_kg=old.requested_kg then return new; end if; select coalesce(sum(oa.assigned_kg),0) into v_assigned_kg from public.order_assignments oa where oa.order_id=new.id and oa.status<>'cancelled'; if new.requested_kg<v_assigned_kg then raise exception 'Заявката не може да бъде намалена под вече зачисленото количество.'; end if; return new; end;
$function$;

CREATE OR REPLACE FUNCTION cm_private.enforce_truck_assignment_capacity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_other_load_kg bigint; v_final_load_kg bigint; begin if tg_op='UPDATE' then if new.truck_id is distinct from old.truck_id or new.driver_id is distinct from old.driver_id or new.trailer_id is distinct from old.trailer_id or new.vehicle_assignment_id is distinct from old.vehicle_assignment_id then raise exception 'Композицията на вече създадено зачисляване не може да бъде променяна.'; end if; end if; perform 1 from public.trucks t where t.id=new.truck_id for update; if not found then raise exception 'Камионът не е намерен.'; end if; if tg_op='INSERT' then if not exists(select 1 from public.vehicle_assignments va where va.id=new.vehicle_assignment_id and va.truck_id=new.truck_id and va.driver_id=new.driver_id and va.trailer_id is not distinct from new.trailer_id and va.ended_at is null) then raise exception 'Невалидна или вече приключила композиция.'; end if; end if; v_other_load_kg=cm_private.truck_operational_load_kg(new.truck_id,new.id); v_final_load_kg=v_other_load_kg; if new.status not in ('completed','cancelled') then v_final_load_kg=v_final_load_kg+new.assigned_kg; end if; if v_final_load_kg>24000 then raise exception 'Общият товар на камиона не може да надвишава 24 тона.'; end if; return new; end;
$function$;

CREATE OR REPLACE FUNCTION cm_private.guard_driver_handoff_against_pending_truck_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin if exists(select 1 from public.trip_truck_change_requests r where r.trip_id=new.trip_id and r.status='pending_driver_km') then raise exception 'Първо трябва да приключите или отмените чакащата смяна на камион.'; end if; return new; end;
$function$;

CREATE OR REPLACE FUNCTION cm_private.guard_loading_ramp_assignment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_site_id uuid; v_loading_ramp boolean; v_same_ramp_already_exists boolean; begin select o.site_id,o.loading_ramp_snapshot into v_site_id,v_loading_ramp from public.orders o where o.id=new.order_id; if not found then raise exception 'Заявката за зачисляване не е намерена.'; end if; if coalesce(v_loading_ramp,false) is not true then return new; end if; if new.trip_id is not null then raise exception 'Обект с „Товарене рампа“ не може да бъде добавян към вече започнал курс.'; end if; select exists(select 1 from public.order_assignments oa join public.orders o on o.id=oa.order_id where oa.truck_id=new.truck_id and oa.status not in ('completed','cancelled') and o.loading_ramp_snapshot=true and o.site_id=v_site_id) into v_same_ramp_already_exists; if exists(select 1 from public.order_assignments oa join public.orders o on o.id=oa.order_id where oa.truck_id=new.truck_id and oa.status not in ('completed','cancelled') and o.loading_ramp_snapshot=true and o.site_id<>v_site_id) then raise exception 'Камионът вече има друг обект с „Товарене рампа“.'; end if; if not v_same_ramp_already_exists and exists(select 1 from public.order_assignments oa where oa.truck_id=new.truck_id and oa.status not in ('completed','cancelled')) then raise exception '„Товарене рампа“ трябва да бъде зачислено първо. Камионът вече има други адреси.'; end if; return new; end;
$function$;

CREATE OR REPLACE FUNCTION cm_private.link_trip_stop_eta_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_notification_id uuid; v_created_at timestamptz; begin select n.id,n.created_at into v_notification_id,v_created_at from public.notifications n where n.notification_type='driver_eta' and n.order_assignment_id=new.order_assignment_id limit 1; if v_notification_id is null then return new; end if; update public.notifications set trip_id=new.trip_id,trip_stop_id=new.id where id=v_notification_id; update public.trip_stops set eta_notified_at=coalesce(eta_notified_at,v_created_at) where id=new.id; return new; end;
$function$;

CREATE OR REPLACE FUNCTION cm_private.trip_driver_handoff_capture_snapshot(p_from_driver_id uuid, p_to_driver_id uuid, p_truck_id uuid, p_trailer_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
select jsonb_build_object('activeAssignments',coalesce(jsonb_agg(jsonb_build_object('id',va.id,'driver_id',va.driver_id,'truck_id',va.truck_id,'trailer_id',va.trailer_id,'assignment_mode',va.assignment_mode,'temporary_trip_id',va.temporary_trip_id,'previous_assignment_id',va.previous_assignment_id) order by va.id::text),'[]'::jsonb)) from public.vehicle_assignments va where va.ended_at is null and (va.driver_id=p_from_driver_id or va.driver_id=p_to_driver_id or va.truck_id=p_truck_id or (p_trailer_id is not null and va.trailer_id=p_trailer_id));
$function$;

CREATE OR REPLACE FUNCTION cm_private.trip_has_pending_driver_handoff(p_trip_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
select exists(select 1 from public.trip_driver_handoff_requests r where r.trip_id=p_trip_id and r.status='pending');
$function$;

CREATE OR REPLACE FUNCTION cm_private.assert_no_pending_driver_handoff(p_trip_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin if exists(select 1 from public.trip_driver_handoff_requests r where r.trip_id=p_trip_id and r.status='pending') then raise exception 'Курсът чака решение за предаване към друг шофьор. Първо приемете, откажете или отменете заявката.'; end if; end;
$function$;

CREATE OR REPLACE FUNCTION cm_private.trip_restore_vehicle_snapshot(p_trip_id uuid, p_snapshot jsonb, p_driver_ids uuid[], p_truck_ids uuid[], p_trailer_ids uuid[], p_restored_at timestamp with time zone)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_desired record; v_driver_ids uuid[]:=coalesce(array_remove(p_driver_ids,null),'{}'::uuid[]); v_truck_ids uuid[]:=coalesce(array_remove(p_truck_ids,null),'{}'::uuid[]); v_trailer_ids uuid[]:=coalesce(array_remove(p_trailer_ids,null),'{}'::uuid[]); begin if exists(select 1 from public.vehicle_assignments current_va where current_va.ended_at is null and (current_va.driver_id=any(v_driver_ids) or current_va.truck_id=any(v_truck_ids) or (current_va.trailer_id is not null and current_va.trailer_id=any(v_trailer_ids))) and not (current_va.assignment_mode='temporary_for_trip' and current_va.temporary_trip_id=p_trip_id) and not exists(select 1 from jsonb_to_recordset(p_snapshot->'activeAssignments') as desired(id uuid,driver_id uuid,truck_id uuid,trailer_id uuid,assignment_mode text,temporary_trip_id uuid,previous_assignment_id uuid) where desired.driver_id is not distinct from current_va.driver_id and desired.truck_id=current_va.truck_id and desired.trailer_id is not distinct from current_va.trailer_id and desired.assignment_mode=current_va.assignment_mode and desired.temporary_trip_id is not distinct from current_va.temporary_trip_id)) then raise exception 'Fleet състоянието е променено извън курса. Автоматичното възстановяване е блокирано.'; end if; update public.vehicle_assignments set ended_at=p_restored_at,ended_reason='temporary_trip_restored',updated_at=p_restored_at where ended_at is null and assignment_mode='temporary_for_trip' and temporary_trip_id=p_trip_id and (driver_id=any(v_driver_ids) or truck_id=any(v_truck_ids) or (trailer_id is not null and trailer_id=any(v_trailer_ids))); for v_desired in select * from jsonb_to_recordset(p_snapshot->'activeAssignments') as desired(id uuid,driver_id uuid,truck_id uuid,trailer_id uuid,assignment_mode text,temporary_trip_id uuid,previous_assignment_id uuid) loop if exists(select 1 from public.vehicle_assignments va where va.ended_at is null and va.driver_id is not distinct from v_desired.driver_id and va.truck_id=v_desired.truck_id and va.trailer_id is not distinct from v_desired.trailer_id and va.assignment_mode=v_desired.assignment_mode and va.temporary_trip_id is not distinct from v_desired.temporary_trip_id) then continue; end if; if exists(select 1 from public.vehicle_assignments va where va.ended_at is null and (va.truck_id=v_desired.truck_id or (v_desired.driver_id is not null and va.driver_id=v_desired.driver_id) or (v_desired.trailer_id is not null and va.trailer_id=v_desired.trailer_id))) then raise exception 'Fleet ресурс вече е зает и snapshot-ът не може да бъде възстановен.'; end if; insert into public.vehicle_assignments(driver_id,truck_id,trailer_id,assignment_mode,temporary_trip_id,previous_assignment_id,started_at) values(v_desired.driver_id,v_desired.truck_id,v_desired.trailer_id,v_desired.assignment_mode,v_desired.temporary_trip_id,v_desired.id,p_restored_at); end loop; end;
$function$;

CREATE OR REPLACE FUNCTION cm_private.trip_restore_temporary_fleet(p_trip_id uuid, p_restored_at timestamp with time zone)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_event record; v_count integer:=0; begin for v_event in select * from (select 'truck_change'::text event_type,r.id event_id,r.completed_at event_at,r.restore_snapshot,array[r.driver_id]::uuid[] driver_ids,array[r.from_truck_id,r.to_truck_id]::uuid[] truck_ids,array[r.trailer_id]::uuid[] trailer_ids from public.trip_truck_change_requests r where r.trip_id=p_trip_id and r.change_mode='temporary_for_trip' and r.status='completed' and r.restore_status='pending' union all select 'driver_handoff'::text,r.id,r.completed_at,r.restore_snapshot,array[r.from_driver_id,r.to_driver_id]::uuid[],array[r.truck_id]::uuid[],array[r.trailer_id]::uuid[] from public.trip_driver_handoff_requests r where r.trip_id=p_trip_id and r.status='accepted' and r.restore_status='pending') events order by event_at desc,event_id desc loop perform cm_private.trip_restore_vehicle_snapshot(p_trip_id,v_event.restore_snapshot,v_event.driver_ids,v_event.truck_ids,v_event.trailer_ids,p_restored_at); if v_event.event_type='truck_change' then update public.trip_truck_change_requests set restore_status='restored',restored_at=p_restored_at,updated_at=p_restored_at where id=v_event.event_id; else update public.trip_driver_handoff_requests set restore_status='restored',restored_at=p_restored_at,updated_at=p_restored_at where id=v_event.event_id; end if; v_count=v_count+1; end loop; return v_count; end;
$function$;

CREATE OR REPLACE FUNCTION cm_private.trip_truck_change_restore_pending(p_trip_id uuid, p_restored_at timestamp with time zone)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin return cm_private.trip_restore_temporary_fleet(p_trip_id,p_restored_at); end;
$function$;

CREATE OR REPLACE FUNCTION cm_private.restore_temporary_fleet_before_trip_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin if old.status='active' and new.status='completed' then perform cm_private.trip_restore_temporary_fleet(new.id,coalesce(new.completed_at,now())); end if; return new; end;
$function$;

CREATE OR REPLACE FUNCTION cm_private.trip_stop_to_assignment_status(p_stop_status text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin case p_stop_status when 'loaded' then return 'loaded'; when 'en_route' then return 'en_route'; when 'waiting' then return 'accepted'; else raise exception 'Невалиден статус на спирка: %',p_stop_status; end case; end;
$function$;

CREATE OR REPLACE FUNCTION cm_private.trip_truck_change_capture_snapshot(p_driver_id uuid, p_source_truck_id uuid, p_target_truck_id uuid, p_trailer_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
select jsonb_build_object('activeAssignments',coalesce(jsonb_agg(jsonb_build_object('id',va.id,'driver_id',va.driver_id,'truck_id',va.truck_id,'trailer_id',va.trailer_id,'assignment_mode',va.assignment_mode,'temporary_trip_id',va.temporary_trip_id,'previous_assignment_id',va.previous_assignment_id) order by va.id::text),'[]'::jsonb)) from public.vehicle_assignments va where va.ended_at is null and (va.driver_id=p_driver_id or va.truck_id=p_source_truck_id or va.truck_id=p_target_truck_id or (p_trailer_id is not null and va.trailer_id=p_trailer_id));
$function$;

CREATE OR REPLACE FUNCTION cm_private.trip_truck_change_supersede_temporary(p_trip_id uuid, p_driver_id uuid, p_trailer_id uuid, p_new_target_truck_id uuid, p_now timestamp with time zone)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_request record; v_desired record; v_count integer:=0; begin for v_request in select r.* from public.trip_truck_change_requests r where r.trip_id=p_trip_id and r.change_mode='temporary_for_trip' and r.status='completed' and r.restore_status='pending' order by r.completed_at desc,r.id desc for update loop for v_desired in select * from jsonb_to_recordset(v_request.restore_snapshot->'activeAssignments') as desired(id uuid,driver_id uuid,truck_id uuid,trailer_id uuid,assignment_mode text,temporary_trip_id uuid,previous_assignment_id uuid) loop if v_desired.driver_id is not distinct from p_driver_id then continue; end if; if p_trailer_id is not null and v_desired.trailer_id is not distinct from p_trailer_id then continue; end if; if v_desired.truck_id=p_new_target_truck_id then continue; end if; if exists(select 1 from public.vehicle_assignments va where va.ended_at is null and va.driver_id is not distinct from v_desired.driver_id and va.truck_id=v_desired.truck_id and va.trailer_id is not distinct from v_desired.trailer_id and va.assignment_mode=v_desired.assignment_mode and va.temporary_trip_id is not distinct from v_desired.temporary_trip_id) then continue; end if; if exists(select 1 from public.vehicle_assignments va where va.ended_at is null and (va.truck_id=v_desired.truck_id or (v_desired.driver_id is not null and va.driver_id=v_desired.driver_id) or (v_desired.trailer_id is not null and va.trailer_id=v_desired.trailer_id))) then raise exception 'Предишно временно Fleet състояние не може да бъде финализирано безопасно.'; end if; insert into public.vehicle_assignments(driver_id,truck_id,trailer_id,assignment_mode,temporary_trip_id,previous_assignment_id,started_at) values(v_desired.driver_id,v_desired.truck_id,v_desired.trailer_id,v_desired.assignment_mode,v_desired.temporary_trip_id,v_desired.id,p_now); end loop; update public.trip_truck_change_requests set restore_status='superseded',superseded_at=p_now,updated_at=p_now where id=v_request.id; v_count=v_count+1; end loop; return v_count; end;
$function$;

CREATE OR REPLACE FUNCTION cm_private.sync_order_allocation_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_requested_kg bigint; v_current_status text; v_assigned_kg bigint; v_non_cancelled_count integer; v_incomplete_count integer; v_started_count integer; v_new_status text; v_completed_at timestamptz; begin select o.requested_kg,o.status,o.completed_at into v_requested_kg,v_current_status,v_completed_at from public.orders o where o.id=new.order_id for update; if not found then return new; end if; if v_current_status='cancelled' then return new; end if; select coalesce(sum(oa.assigned_kg) filter(where oa.status<>'cancelled'),0),count(*) filter(where oa.status<>'cancelled')::integer,count(*) filter(where oa.status<>'cancelled' and oa.status<>'completed')::integer,count(*) filter(where oa.status in ('accepted','en_route','arrived','loaded'))::integer into v_assigned_kg,v_non_cancelled_count,v_incomplete_count,v_started_count from public.order_assignments oa where oa.order_id=new.order_id; if v_started_count>0 then v_new_status='in_progress'; elsif v_non_cancelled_count>0 and v_incomplete_count=0 and v_assigned_kg>=v_requested_kg then v_new_status='completed'; elsif v_assigned_kg=0 then v_new_status='pending'; elsif v_assigned_kg<v_requested_kg then v_new_status='partial'; else v_new_status='assigned'; end if; update public.orders set status=v_new_status,completed_at=case when v_new_status='completed' then coalesce(v_completed_at,now()) else null end,cancelled_at=null where id=new.order_id; return new; end;
$function$;

CREATE OR REPLACE FUNCTION cm_private.send_driver_eta(p_order_assignment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_driver_id uuid:=auth.uid(); v_trip_id uuid; v_stop_id uuid; v_order_id uuid; v_company_id uuid; v_vehicle_assignment_id uuid; v_truck_id uuid; v_trailer_id uuid; v_status text; v_truck_number text; v_first_assignment_id uuid; v_notification_id uuid; v_created_at timestamptz; v_confirmed_at timestamptz; begin if v_driver_id is null then raise exception 'Невалидна потребителска сесия.'; end if; select oa.trip_id,oa.order_id,oa.vehicle_assignment_id,oa.truck_id,oa.trailer_id,oa.status,oa.truck_number_snapshot into v_trip_id,v_order_id,v_vehicle_assignment_id,v_truck_id,v_trailer_id,v_status,v_truck_number from public.order_assignments oa where oa.id=p_order_assignment_id and oa.driver_id=v_driver_id for update; if not found then raise exception 'Зачисляването не е намерено.'; end if; select o.company_id into v_company_id from public.orders o where o.id=v_order_id; if v_company_id is null then raise exception 'Клиентската фирма не е намерена.'; end if; if v_trip_id is null then if v_status<>'assigned' then raise exception 'Това зачисляване не може да бъде уведомено.'; end if; if not exists(select 1 from public.vehicle_assignments va where va.id=v_vehicle_assignment_id and va.driver_id=v_driver_id and va.truck_id=v_truck_id and va.trailer_id=v_trailer_id and va.ended_at is null and va.assignment_mode='permanent') then raise exception 'Композицията вече не е активна.'; end if; select oa.id into v_first_assignment_id from public.order_assignments oa where oa.driver_id=v_driver_id and oa.vehicle_assignment_id=v_vehicle_assignment_id and oa.trip_id is null and oa.status='assigned' order by oa.assigned_at,oa.id limit 1; if v_first_assignment_id is distinct from p_order_assignment_id then raise exception 'Преди старта може да бъде уведомена само първата фирма.'; end if; else if v_status<>'en_route' then raise exception 'Може да уведомите само текущата фирма.'; end if; select ts.id into v_stop_id from public.trip_stops ts join public.trips t on t.id=ts.trip_id where ts.order_assignment_id=p_order_assignment_id and ts.trip_id=v_trip_id and ts.status='en_route' and t.primary_driver_id=v_driver_id and t.status='active' for update of ts,t; if not found then raise exception 'Текущата активна спирка не е намерена.'; end if; end if; insert into public.notifications(notification_type,recipient_role,company_id,sent_by,trip_id,trip_stop_id,order_assignment_id,title,message,requires_confirmation) values('driver_eta','client',v_company_id,v_driver_id,v_trip_id,v_stop_id,p_order_assignment_id,'Шофьорът е на път','🚛 '||coalesce(v_truck_number,'Камион')||': Пристигам след около 1 час.',true) on conflict (order_assignment_id) where notification_type='driver_eta' do nothing returning id,created_at,confirmed_at into v_notification_id,v_created_at,v_confirmed_at; if v_notification_id is null then select n.id,n.created_at,n.confirmed_at into v_notification_id,v_created_at,v_confirmed_at from public.notifications n where n.notification_type='driver_eta' and n.order_assignment_id=p_order_assignment_id limit 1; end if; if v_stop_id is not null then update public.trip_stops set eta_notified_at=coalesce(eta_notified_at,v_created_at) where id=v_stop_id; end if; return jsonb_build_object('notificationId',v_notification_id,'sentAt',v_created_at,'confirmed',v_confirmed_at is not null,'confirmedAt',v_confirmed_at); end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_provision_app_user(p_user_id uuid, p_login_id text, p_display_name text, p_phone text, p_role_code text, p_employee_code text DEFAULT NULL::text, p_company_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_role_id uuid; v_login_id text:=lower(btrim(coalesce(p_login_id,''))); v_display_name text:=btrim(coalesce(p_display_name,'')); v_phone text:=nullif(btrim(coalesce(p_phone,'')),''); v_role_code text:=lower(btrim(coalesce(p_role_code,''))); v_employee_code text:=nullif(btrim(coalesce(p_employee_code,'')),''); begin if p_user_id is null then raise exception 'Липсва Auth потребител.'; end if; if v_login_id !~ '^[a-z0-9][a-z0-9._-]{2,31}$' then raise exception 'Невалидно потребителско ID.'; end if; if char_length(v_display_name)<2 then raise exception 'Въведете име.'; end if; if v_role_code not in ('admin','dispatcher','driver','client') then raise exception 'Невалидна роля.'; end if; if v_role_code='driver' and v_phone is null then raise exception 'Телефонът на шофьора е задължителен.'; end if; if v_role_code='client' and p_company_id is null then raise exception 'Клиентът трябва да има фирма.'; end if; if v_role_code<>'client' and p_company_id is not null then raise exception 'Фирма може да бъде зададена само на клиент.'; end if; if not exists(select 1 from auth.users where id=p_user_id) then raise exception 'Auth потребителят не съществува.'; end if; if v_role_code='client' and not exists(select 1 from public.client_companies where id=p_company_id and is_active=true) then raise exception 'Клиентската фирма не е намерена или е неактивна.'; end if; select id into v_role_id from public.roles where code=v_role_code limit 1; if v_role_id is null then raise exception 'Ролята не е намерена.'; end if; insert into public.profiles(id,login_id,display_name,phone,is_active) values(p_user_id,v_login_id,v_display_name,v_phone,true); insert into public.user_roles(user_id,role_id,is_primary) values(p_user_id,v_role_id,true); if v_role_code='driver' then insert into public.drivers(id,employee_code) values(p_user_id,v_employee_code); end if; if v_role_code='client' then insert into public.client_users(user_id,company_id,is_primary) values(p_user_id,p_company_id,true); end if; end;
$function$;

create or replace function public.admin_review_client_registration(p_request_id uuid,p_admin_user_id uuid,p_decision text,p_note text default null::text,p_loading_ramp boolean default false) returns jsonb language plpgsql security definer set search_path='' as $function$
declare v_request public.client_registration_requests%rowtype; v_company_id uuid; v_site_id uuid; v_decision text:=lower(btrim(coalesce(p_decision,''))); v_loading_ramp boolean:=coalesce(p_loading_ramp,false); begin if not exists(select 1 from public.profiles profile join public.user_roles ur on ur.user_id=profile.id join public.roles role on role.id=ur.role_id where profile.id=p_admin_user_id and profile.is_active=true and ur.is_primary=true and role.code='admin') then raise exception 'Нямате право да обработвате клиентски регистрации.'; end if; select * into v_request from public.client_registration_requests where id=p_request_id for update; if not found then raise exception 'Заявката не е намерена.'; end if; if v_request.status<>'pending' then raise exception 'Заявката вече е обработена.'; end if; if v_decision='reject' then update public.client_registration_requests set status='rejected',reviewed_by=p_admin_user_id,reviewed_at=now(),review_note=nullif(btrim(coalesce(p_note,'')),''),loading_ramp=v_loading_ramp where id=p_request_id; return jsonb_build_object('status','rejected'); end if; if v_decision<>'approve' then raise exception 'Невалидно решение.'; end if; if v_request.contact_person is null or btrim(v_request.contact_person)='' then raise exception 'Липсва лице за контакт.'; end if; if v_request.phone is null or btrim(v_request.phone)='' then raise exception 'Липсва телефон.'; end if; if v_request.loading_address is null or btrim(v_request.loading_address)='' then raise exception 'Липсва адрес за товарене.'; end if; if v_request.latitude is null or v_request.longitude is null then raise exception 'Липсва точна позиция за товарене.'; end if; if exists(select 1 from public.profiles where lower(login_id)=lower(v_request.login_id)) then raise exception 'Това потребителско ID вече съществува.'; end if; insert into public.client_companies(company_name,contact_person,phone,email,registered_address,is_active) values(v_request.company_name,v_request.contact_person,v_request.phone,v_request.email,v_request.registered_address,true) returning id into v_company_id; insert into public.client_sites(company_id,site_name,address,contact_person,phone,latitude,longitude,loading_ramp,is_active) values(v_company_id,'Основен обект',v_request.loading_address,v_request.contact_person,v_request.phone,v_request.latitude,v_request.longitude,v_loading_ramp,true) returning id into v_site_id; perform public.admin_provision_app_user(v_request.auth_user_id,v_request.login_id,v_request.contact_person,v_request.phone,'client',null,v_company_id); update public.client_registration_requests set status='approved',reviewed_by=p_admin_user_id,reviewed_at=now(),review_note=nullif(btrim(coalesce(p_note,'')),''),approved_company_id=v_company_id,loading_ramp=v_loading_ramp where id=p_request_id; return jsonb_build_object('status','approved','companyId',v_company_id,'siteId',v_site_id,'loadingRamp',v_loading_ramp); end;
$function$;
CREATE OR REPLACE FUNCTION public.discrepancies_mark_reviewed(p_discrepancy_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_status text; v_resolved_at timestamptz; begin if not cm_private.has_permission('discrepancies.manage') then raise exception 'Нямате право да управлявате несъответствия.'; end if; select d.status,d.resolved_at into v_status,v_resolved_at from public.discrepancies d where d.id=p_discrepancy_id for update; if not found then raise exception 'Несъответствието не е намерено.'; end if; if v_status='reviewed' then return jsonb_build_object('discrepancyId',p_discrepancy_id,'status','reviewed','resolvedAt',v_resolved_at); end if; v_resolved_at=now(); update public.discrepancies set status='reviewed',resolved_by=auth.uid(),resolved_at=v_resolved_at where id=p_discrepancy_id; return jsonb_build_object('discrepancyId',p_discrepancy_id,'status','reviewed','resolvedAt',v_resolved_at); end;
$function$;

CREATE OR REPLACE FUNCTION public.fleet_create_trailer(p_registration_number text, p_bioexis_permit_number text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_registration_number text; v_permit_number text; v_trailer_id uuid; begin if not cm_private.has_permission('fleet.manage') then raise exception 'Нямате право да управлявате автопарка.'; end if; v_registration_number=regexp_replace(upper(btrim(coalesce(p_registration_number,''))),'\s+',' ','g'); v_permit_number=btrim(coalesce(p_bioexis_permit_number,'')); if v_registration_number='' then raise exception 'Въведете регистрационен номер на ремаркето.'; end if; if v_permit_number !~ '^[0-9]{3,4}$' then raise exception 'Разрешителното трябва да бъде 3 или 4 цифри.'; end if; if exists(select 1 from public.trailers tr where upper(btrim(tr.registration_number))=v_registration_number) then raise exception 'Това ремарке вече съществува.'; end if; insert into public.trailers(registration_number,bioexis_permit_number,is_active) values(v_registration_number,v_permit_number,true) returning id into v_trailer_id; return v_trailer_id; exception when unique_violation then raise exception 'Това ремарке вече съществува.'; end;
$function$;

CREATE OR REPLACE FUNCTION public.fleet_create_truck(p_registration_number text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_registration_number text; v_truck_id uuid; begin if not cm_private.has_permission('fleet.manage') then raise exception 'Нямате право да управлявате автопарка.'; end if; v_registration_number=regexp_replace(upper(btrim(coalesce(p_registration_number,''))),'\s+',' ','g'); if v_registration_number='' then raise exception 'Въведете регистрационен номер на камиона.'; end if; if exists(select 1 from public.trucks t where upper(btrim(t.registration_number))=v_registration_number) then raise exception 'Този камион вече съществува.'; end if; insert into public.trucks(registration_number,is_active) values(v_registration_number,true) returning id into v_truck_id; return v_truck_id; exception when unique_violation then raise exception 'Този камион вече съществува.'; end;
$function$;

CREATE OR REPLACE FUNCTION public.fleet_get_snapshot()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare v_result jsonb; begin if not cm_private.has_permission('fleet.read') then raise exception 'Нямате право за преглед на автопарка.'; end if; select jsonb_build_object('trucks',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'registrationNumber',t.registration_number,'isActive',t.is_active) order by t.registration_number) from public.trucks t where t.is_active=true),'[]'::jsonb),'trailers',coalesce((select jsonb_agg(jsonb_build_object('id',tr.id,'registrationNumber',tr.registration_number,'permitNumber',tr.bioexis_permit_number,'isActive',tr.is_active) order by tr.registration_number) from public.trailers tr where tr.is_active=true),'[]'::jsonb),'drivers',coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'employeeCode',d.employee_code,'name',p.display_name,'isActive',p.is_active) order by p.display_name) from public.drivers d join public.profiles p on p.id=d.id where p.is_active=true),'[]'::jsonb),'homeTrucks',coalesce((select jsonb_agg(jsonb_build_object('driverId',h.driver_id,'truckId',h.truck_id)) from public.driver_home_trucks h),'[]'::jsonb),'activeAssignments',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'driverId',a.driver_id,'truckId',a.truck_id,'trailerId',a.trailer_id,'assignmentMode',a.assignment_mode,'temporaryTripId',a.temporary_trip_id,'startedAt',a.started_at) order by a.started_at) from public.vehicle_assignments a where a.ended_at is null),'[]'::jsonb),'lockedTruckIds',coalesce((select jsonb_agg(locked.truck_id) from (select distinct x.truck_id from (select s.truck_id from public.trip_segments s join public.trips t on t.id=s.trip_id where s.status='active' and t.status='active' union select h.truck_id from public.driver_home_trucks h join public.vehicle_assignments a on a.driver_id=h.driver_id join public.trips t on t.id=a.temporary_trip_id where a.ended_at is null and a.assignment_mode='temporary_for_trip' and t.status='active') x order by x.truck_id) locked),'[]'::jsonb)) into v_result; return v_result; end;
$function$;

CREATE OR REPLACE FUNCTION public.fleet_release_truck(p_truck_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_now timestamptz:=now(); v_current_id uuid; v_current_mode text; v_home_driver_id uuid; begin if not cm_private.has_permission('fleet.manage') then raise exception 'Нямате право да управлявате автопарка.'; end if; if p_truck_id is null then raise exception 'Камионът не е избран.'; end if; perform 1 from public.trucks t where t.id=p_truck_id and t.is_active=true for update; if not found then raise exception 'Камионът не е намерен или е неактивен.'; end if; if exists(select 1 from public.trip_segments s join public.trips t on t.id=s.trip_id where s.truck_id=p_truck_id and s.status='active' and t.status='active') then raise exception 'Камионът не може да бъде освободен, докато е в активен курс.'; end if; select h.driver_id into v_home_driver_id from public.driver_home_trucks h where h.truck_id=p_truck_id for update; if v_home_driver_id is not null and exists(select 1 from public.vehicle_assignments a join public.trips t on t.id=a.temporary_trip_id where a.driver_id=v_home_driver_id and a.ended_at is null and a.assignment_mode='temporary_for_trip' and t.status='active') then raise exception 'Камионът не може да бъде освободен, докато постоянният му шофьор е във временен активен курс.'; end if; select a.id,a.assignment_mode into v_current_id,v_current_mode from public.vehicle_assignments a where a.truck_id=p_truck_id and a.ended_at is null for update; if v_current_id is not null and v_current_mode='temporary_for_trip' then raise exception 'Временна композиция не може да бъде освободена през нормалното управление на гаража.'; end if; if v_current_id is not null then update public.vehicle_assignments set ended_at=v_now,ended_reason='released_by_staff',updated_at=v_now where id=v_current_id; end if; delete from public.driver_home_trucks where truck_id=p_truck_id; return true; end;
$function$;

CREATE OR REPLACE FUNCTION public.fleet_set_permanent_composition(p_truck_id uuid, p_driver_id uuid DEFAULT NULL::uuid, p_trailer_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_now timestamptz:=now(); v_current_id uuid; v_current_driver_id uuid; v_current_trailer_id uuid; v_current_mode text; v_existing_home_driver_id uuid; v_driver_home_truck_id uuid; v_other_assignment_truck_id uuid; v_other_trailer_truck_id uuid; v_new_assignment_id uuid; begin if not cm_private.has_permission('fleet.manage') then raise exception 'Нямате право да управлявате автопарка.'; end if; if p_truck_id is null then raise exception 'Камионът не е избран.'; end if; if p_driver_id is null and p_trailer_id is null then raise exception 'За пълно освобождаване използвайте „Разкачи всичко“.'; end if; perform 1 from public.trucks t where t.id=p_truck_id and t.is_active=true for update; if not found then raise exception 'Камионът не е намерен или е неактивен.'; end if; if exists(select 1 from public.trip_segments s join public.trips t on t.id=s.trip_id where s.truck_id=p_truck_id and s.status='active' and t.status='active') then raise exception 'Композицията не може да се променя, докато камионът е в активен курс.'; end if; select a.id,a.driver_id,a.trailer_id,a.assignment_mode into v_current_id,v_current_driver_id,v_current_trailer_id,v_current_mode from public.vehicle_assignments a where a.truck_id=p_truck_id and a.ended_at is null for update; if v_current_id is not null and v_current_mode='temporary_for_trip' then raise exception 'Временна композиция не може да се променя през нормалното управление на гаража.'; end if; select h.driver_id into v_existing_home_driver_id from public.driver_home_trucks h where h.truck_id=p_truck_id for update; if v_existing_home_driver_id is not null and v_existing_home_driver_id is distinct from p_driver_id and exists(select 1 from public.vehicle_assignments a join public.trips t on t.id=a.temporary_trip_id where a.driver_id=v_existing_home_driver_id and a.ended_at is null and a.assignment_mode='temporary_for_trip' and t.status='active') then raise exception 'Постоянният шофьор на този камион е във временен активен курс. Изчакайте курсът да приключи.'; end if; if p_driver_id is not null then perform 1 from public.drivers d where d.id=p_driver_id for update; if not found then raise exception 'Шофьорът не е намерен.'; end if; if not exists(select 1 from public.profiles p where p.id=p_driver_id and p.is_active=true) then raise exception 'Шофьорът е неактивен.'; end if; select h.truck_id into v_driver_home_truck_id from public.driver_home_trucks h where h.driver_id=p_driver_id for update; if v_driver_home_truck_id is not null and v_driver_home_truck_id<>p_truck_id then raise exception 'Шофьорът вече има друг постоянен камион. Първо освободете старото зачисляване.'; end if; select a.truck_id into v_other_assignment_truck_id from public.vehicle_assignments a where a.driver_id=p_driver_id and a.ended_at is null for update; if v_other_assignment_truck_id is not null and v_other_assignment_truck_id<>p_truck_id then raise exception 'Шофьорът в момента е към друг камион.'; end if; if exists(select 1 from public.trip_segments s join public.trips t on t.id=s.trip_id where s.driver_id=p_driver_id and s.truck_id<>p_truck_id and s.status='active' and t.status='active') then raise exception 'Шофьорът участва в друг активен курс.'; end if; end if; if p_trailer_id is not null then perform 1 from public.trailers tr where tr.id=p_trailer_id and tr.is_active=true for update; if not found then raise exception 'Ремаркето не е намерено или е неактивно.'; end if; select a.truck_id into v_other_trailer_truck_id from public.vehicle_assignments a where a.trailer_id=p_trailer_id and a.ended_at is null for update; if v_other_trailer_truck_id is not null and v_other_trailer_truck_id<>p_truck_id then raise exception 'Ремаркето вече е закачено към друг камион.'; end if; if exists(select 1 from public.trip_segments s join public.trips t on t.id=s.trip_id where s.trailer_id=p_trailer_id and s.truck_id<>p_truck_id and s.status='active' and t.status='active') then raise exception 'Ремаркето участва в друг активен курс.'; end if; end if; if v_current_id is not null and v_current_mode='permanent' and v_current_driver_id is not distinct from p_driver_id and v_current_trailer_id is not distinct from p_trailer_id then delete from public.driver_home_trucks where truck_id=p_truck_id and driver_id is distinct from p_driver_id; if p_driver_id is not null then insert into public.driver_home_trucks(driver_id,truck_id,assigned_at,updated_at) values(p_driver_id,p_truck_id,v_now,v_now) on conflict(driver_id) do update set truck_id=excluded.truck_id,updated_at=v_now; end if; return v_current_id; end if; if v_current_id is not null then update public.vehicle_assignments set ended_at=v_now,ended_reason='permanent_composition_changed',updated_at=v_now where id=v_current_id; end if; delete from public.driver_home_trucks where truck_id=p_truck_id; if p_driver_id is not null then insert into public.driver_home_trucks(driver_id,truck_id,assigned_at,updated_at) values(p_driver_id,p_truck_id,v_now,v_now); end if; insert into public.vehicle_assignments(driver_id,truck_id,trailer_id,assignment_mode,temporary_trip_id,previous_assignment_id,started_at) values(p_driver_id,p_truck_id,p_trailer_id,'permanent',null,v_current_id,v_now) returning id into v_new_assignment_id; return v_new_assignment_id; end;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_primary_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
select r.code from public.user_roles ur join public.roles r on r.id=ur.role_id join public.profiles p on p.id=ur.user_id where ur.user_id=auth.uid() and ur.is_primary=true and p.is_active=true limit 1;
$function$;

CREATE OR REPLACE FUNCTION public.notifications_confirm_driver_eta(p_notification_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_user_id uuid:=auth.uid(); v_company_id uuid; v_recipient_profile_id uuid; v_assignment_status text; v_confirmed_at timestamptz; begin if v_user_id is null then raise exception 'Невалидна потребителска сесия.'; end if; select n.company_id,n.recipient_profile_id,n.confirmed_at,oa.status into v_company_id,v_recipient_profile_id,v_confirmed_at,v_assignment_status from public.notifications n join public.order_assignments oa on oa.id=n.order_assignment_id where n.id=p_notification_id and n.notification_type='driver_eta' and n.recipient_role='client' and n.requires_confirmation=true for update of n; if not found then raise exception 'Известието не е намерено.'; end if; if not (v_recipient_profile_id=v_user_id or cm_private.client_member_of_company(v_company_id)) then raise exception 'Нямате право да потвърдите това известие.'; end if; if v_assignment_status in ('completed','cancelled') then raise exception 'Това известие вече не е активно.'; end if; if v_confirmed_at is null then v_confirmed_at=now(); update public.notifications set confirmed_by=v_user_id,confirmed_at=v_confirmed_at where id=p_notification_id; end if; return jsonb_build_object('notificationId',p_notification_id,'confirmed',true,'confirmedAt',v_confirmed_at); end;
$function$;

CREATE OR REPLACE FUNCTION public.notifications_get_client_active()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_user_id uuid:=auth.uid(); v_result jsonb; begin if v_user_id is null then raise exception 'Невалидна потребителска сесия.'; end if; select coalesce(jsonb_agg(jsonb_build_object('id',n.id,'type',n.notification_type,'companyId',n.company_id,'tripId',n.trip_id,'tripStopId',n.trip_stop_id,'orderAssignmentId',n.order_assignment_id,'title',n.title,'message',n.message,'requiresConfirmation',n.requires_confirmation,'confirmed',n.confirmed_at is not null,'confirmedAt',n.confirmed_at,'createdAt',n.created_at) order by n.created_at desc),'[]'::jsonb) into v_result from public.notifications n join public.order_assignments oa on oa.id=n.order_assignment_id where n.recipient_role='client' and n.notification_type='driver_eta' and (n.recipient_profile_id=v_user_id or cm_private.client_member_of_company(n.company_id)) and oa.status not in ('completed','cancelled'); return v_result; end;
$function$;

CREATE OR REPLACE FUNCTION public.orders_assign_load(p_order_id uuid, p_truck_id uuid, p_assigned_kg bigint)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_requested_kg bigint; v_order_status text; v_order_assigned_kg bigint; v_order_remaining_kg bigint; v_vehicle_assignment_id uuid; v_driver_id uuid; v_trailer_id uuid; v_assignment_mode text; v_driver_name text; v_truck_number text; v_trailer_number text; v_trailer_permit text; v_truck_load_kg bigint; v_truck_free_kg bigint; v_allowed_kg bigint; v_new_assignment_id uuid; begin if not cm_private.has_permission('orders.manage') then raise exception 'Нямате право да зачислявате заявки.'; end if; if p_order_id is null then raise exception 'Заявката не е избрана.'; end if; if p_truck_id is null then raise exception 'Камионът не е избран.'; end if; if p_assigned_kg is null or p_assigned_kg<=0 then raise exception 'Въведете валидно количество.'; end if; select t.registration_number into v_truck_number from public.trucks t where t.id=p_truck_id and t.is_active=true for update; if not found then raise exception 'Камионът не е намерен или е неактивен.'; end if; if exists(select 1 from public.trip_segments s join public.trips t on t.id=s.trip_id where s.truck_id=p_truck_id and s.status='active' and t.status='active') then raise exception 'Камионът вече е в активен курс. Нов товар се добавя от „Курсове“.'; end if; select va.id,va.driver_id,va.trailer_id,va.assignment_mode,tr.registration_number,tr.bioexis_permit_number into v_vehicle_assignment_id,v_driver_id,v_trailer_id,v_assignment_mode,v_trailer_number,v_trailer_permit from public.vehicle_assignments va join public.trailers tr on tr.id=va.trailer_id where va.truck_id=p_truck_id and va.ended_at is null and tr.is_active=true for update of va; if v_vehicle_assignment_id is null or v_driver_id is null or v_trailer_id is null then raise exception 'Камионът няма готова композиция.'; end if; if v_assignment_mode<>'permanent' then raise exception 'Временна композиция не може да получава нов товар от „Заявки“.'; end if; select o.requested_kg,o.status into v_requested_kg,v_order_status from public.orders o where o.id=p_order_id for update; if not found then raise exception 'Заявката не е намерена.'; end if; if v_order_status not in ('pending','partial','assigned') then raise exception 'Към тази заявка вече не може да се добавя ново зачисляване.'; end if; select p.display_name into v_driver_name from public.profiles p where p.id=v_driver_id and p.is_active=true; if v_driver_name is null then raise exception 'Шофьорът е неактивен или липсва.'; end if; select coalesce(sum(oa.assigned_kg),0) into v_order_assigned_kg from public.order_assignments oa where oa.order_id=p_order_id and oa.status<>'cancelled'; v_order_remaining_kg=greatest(v_requested_kg-v_order_assigned_kg,0); if v_order_remaining_kg<=0 then raise exception 'Цялото количество по заявката вече е зачислено.'; end if; select coalesce(sum(oa.assigned_kg),0) into v_truck_load_kg from public.order_assignments oa where oa.truck_id=p_truck_id and oa.status not in ('completed','cancelled'); v_truck_free_kg=greatest(24000-v_truck_load_kg,0); v_allowed_kg=least(v_order_remaining_kg,v_truck_free_kg); if v_allowed_kg<=0 then raise exception 'Камионът няма свободен товарен капацитет.'; end if; if p_assigned_kg>v_allowed_kg then raise exception 'Може да се зачисли максимум % т.',round(v_allowed_kg::numeric/1000,3); end if; insert into public.order_assignments(order_id,vehicle_assignment_id,driver_id,truck_id,trailer_id,assigned_kg,status,driver_name_snapshot,truck_number_snapshot,trailer_number_snapshot,trailer_permit_snapshot,assigned_by) values(p_order_id,v_vehicle_assignment_id,v_driver_id,p_truck_id,v_trailer_id,p_assigned_kg,'assigned',v_driver_name,v_truck_number,v_trailer_number,v_trailer_permit,auth.uid()) returning id into v_new_assignment_id; return v_new_assignment_id; end;
$function$;

CREATE OR REPLACE FUNCTION public.orders_cancel_assignment(p_assignment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_truck_id uuid; v_assignment public.order_assignments%rowtype; v_order_status text; v_now timestamptz:=now(); begin if not cm_private.has_permission('orders.manage') then raise exception 'Нямате право да отменяте зачислявания.'; end if; if p_assignment_id is null then raise exception 'Зачисляването не е избрано.'; end if; select oa.truck_id into v_truck_id from public.order_assignments oa where oa.id=p_assignment_id; if not found then raise exception 'Зачисляването не е намерено.'; end if; perform 1 from public.trucks t where t.id=v_truck_id for update; if not found then raise exception 'Камионът не е намерен.'; end if; select * into v_assignment from public.order_assignments oa where oa.id=p_assignment_id for update; if not found then raise exception 'Зачисляването не е намерено.'; end if; if v_assignment.status='cancelled' then select o.status into v_order_status from public.orders o where o.id=v_assignment.order_id; return jsonb_build_object('assignmentId',v_assignment.id,'orderId',v_assignment.order_id,'status','cancelled','orderStatus',v_order_status,'restoredKg',v_assignment.assigned_kg,'alreadyCancelled',true); end if; if v_assignment.trip_id is not null or v_assignment.status<>'assigned' then raise exception 'Зачисляването може да бъде отменено само преди стартиране на курса.'; end if; update public.order_assignments set status='cancelled',cancelled_at=v_now,cancelled_by=auth.uid(),completed_at=null where id=p_assignment_id; select o.status into v_order_status from public.orders o where o.id=v_assignment.order_id; return jsonb_build_object('assignmentId',v_assignment.id,'orderId',v_assignment.order_id,'truckId',v_assignment.truck_id,'truckNumber',v_assignment.truck_number_snapshot,'restoredKg',v_assignment.assigned_kg,'status','cancelled','orderStatus',v_order_status,'cancelledAt',v_now,'alreadyCancelled',false); end;
$function$;

CREATE OR REPLACE FUNCTION public.orders_create_client(p_site_id uuid, p_requested_kg bigint, p_note text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_company_id uuid; v_company_name text; v_site_name text; v_site_address text; v_site_contact_person text; v_site_phone text; v_site_latitude numeric(9,6); v_site_longitude numeric(9,6); v_loading_ramp boolean; v_creator_name text; v_note text:=nullif(btrim(coalesce(p_note,'')),''); v_order_id uuid; begin if auth.uid() is null then raise exception 'Невалидна потребителска сесия.'; end if; if p_site_id is null then raise exception 'Изберете обект.'; end if; if p_requested_kg is null or p_requested_kg<=0 then raise exception 'Въведете валидно количество.'; end if; select s.company_id,c.company_name,s.site_name,s.address,s.contact_person,s.phone,s.latitude,s.longitude,s.loading_ramp into v_company_id,v_company_name,v_site_name,v_site_address,v_site_contact_person,v_site_phone,v_site_latitude,v_site_longitude,v_loading_ramp from public.client_sites s join public.client_companies c on c.id=s.company_id where s.id=p_site_id and s.is_active=true and c.is_active=true; if v_company_id is null then raise exception 'Обектът не е намерен или е неактивен.'; end if; if not cm_private.client_member_of_company(v_company_id) then raise exception 'Нямате право да създавате заявка за тази фирма.'; end if; select p.display_name into v_creator_name from public.profiles p where p.id=auth.uid() and p.is_active=true; if v_creator_name is null then raise exception 'Потребителският профил е неактивен.'; end if; insert into public.orders(company_id,site_id,requested_kg,note,status,created_by,company_name_snapshot,site_name_snapshot,site_address_snapshot,site_contact_person_snapshot,site_phone_snapshot,site_latitude_snapshot,site_longitude_snapshot,loading_ramp_snapshot,created_by_name_snapshot) values(v_company_id,p_site_id,p_requested_kg,v_note,'pending',auth.uid(),v_company_name,v_site_name,v_site_address,v_site_contact_person,v_site_phone,v_site_latitude,v_site_longitude,coalesce(v_loading_ramp,false),v_creator_name) returning id into v_order_id; return v_order_id; end;
$function$;

CREATE OR REPLACE FUNCTION public.orders_update_client(p_order_id uuid, p_requested_kg bigint, p_note text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_company_id uuid; v_current_status text; v_assigned_kg bigint; v_new_status text; v_note text:=nullif(btrim(coalesce(p_note,'')),''); begin if auth.uid() is null then raise exception 'Невалидна потребителска сесия.'; end if; if p_requested_kg is null or p_requested_kg<=0 then raise exception 'Въведете валидно количество.'; end if; select o.company_id,o.status into v_company_id,v_current_status from public.orders o where o.id=p_order_id for update; if not found then raise exception 'Заявката не е намерена.'; end if; if not cm_private.client_member_of_company(v_company_id) then raise exception 'Нямате право да редактирате тази заявка.'; end if; if v_current_status not in ('pending','partial','assigned') then raise exception 'Тази заявка вече не може да бъде редактирана.'; end if; if exists(select 1 from public.order_assignments oa where oa.order_id=p_order_id and oa.status in ('accepted','en_route','arrived','loaded','completed')) then raise exception 'Курсът за тази заявка вече е започнал. Редакцията е блокирана.'; end if; select coalesce(sum(oa.assigned_kg),0) into v_assigned_kg from public.order_assignments oa where oa.order_id=p_order_id and oa.status<>'cancelled'; if p_requested_kg<v_assigned_kg then raise exception 'Заявката не може да бъде намалена под вече зачисленото количество.'; end if; if v_assigned_kg=0 then v_new_status='pending'; elsif v_assigned_kg<p_requested_kg then v_new_status='partial'; else v_new_status='assigned'; end if; update public.orders set requested_kg=p_requested_kg,note=v_note,status=v_new_status where id=p_order_id; end;
$function$;

CREATE OR REPLACE FUNCTION public.trips_admin_request_truck_change_unchecked(p_trip_id uuid, p_target_truck_id uuid, p_change_mode text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_now timestamptz:=now(); v_driver_id uuid; v_driver_name text; v_segment_id uuid; v_vehicle_assignment_id uuid; v_source_truck_id uuid; v_source_truck_number text; v_target_truck_number text; v_trailer_id uuid; v_trailer_number text; v_trailer_permit text; v_snapshot jsonb; v_request_id uuid; begin if not cm_private.has_permission('trips.manage') then raise exception 'Нямате право да управлявате активните курсове.'; end if; if p_change_mode not in ('temporary_for_trip','permanent') then raise exception 'Невалиден режим за смяна на камион.'; end if; if p_change_mode='permanent' and not cm_private.has_permission('fleet.manage') then raise exception 'Постоянната промяна изисква право за управление на автопарка.'; end if; if p_target_truck_id is null then raise exception 'Новият камион не е избран.'; end if; select t.primary_driver_id,s.id,s.vehicle_assignment_id,s.truck_id,s.trailer_id,s.truck_number_snapshot,s.trailer_number_snapshot,s.position_number_snapshot into v_driver_id,v_segment_id,v_vehicle_assignment_id,v_source_truck_id,v_trailer_id,v_source_truck_number,v_trailer_number,v_trailer_permit from public.trips t join public.trip_segments s on s.trip_id=t.id and s.status='active' where t.id=p_trip_id and t.status='active' for update of t,s; if not found then raise exception 'Активният курс или неговата активна отсечка не е намерена.'; end if; if p_target_truck_id=v_source_truck_id then raise exception 'Новият камион трябва да е различен от текущия.'; end if; if exists(select 1 from public.discrepancies d join public.trip_stops ts on ts.id=d.trip_stop_id where ts.trip_id=p_trip_id and ts.status<>'loaded') then raise exception 'Текущата спирка има отчетено несъответствие. Първо маркирайте товаренето като приключено и след това сменете камиона.'; end if; select p.display_name into v_driver_name from public.drivers d join public.profiles p on p.id=d.id where d.id=v_driver_id and p.is_active=true for update of d,p; if not found then raise exception 'Шофьорът не е намерен или е неактивен.'; end if; perform tr.id from public.trucks tr where tr.id in (v_source_truck_id,p_target_truck_id) order by tr.id for update; select tr.registration_number into v_target_truck_number from public.trucks tr where tr.id=p_target_truck_id and tr.is_active=true; if not found then raise exception 'Новият камион не е намерен или е неактивен.'; end if; if not exists(select 1 from public.vehicle_assignments va where va.id=v_vehicle_assignment_id and va.driver_id=v_driver_id and va.truck_id=v_source_truck_id and va.trailer_id is not distinct from v_trailer_id and va.ended_at is null) then raise exception 'Текущата композиция вече е променена.'; end if; if exists(select 1 from public.trips other_trip join public.trip_segments other_segment on other_segment.trip_id=other_trip.id and other_segment.status='active' where other_trip.status='active' and other_trip.id<>p_trip_id and other_segment.truck_id=p_target_truck_id) then raise exception 'Новият камион участва в друг активен курс.'; end if; if cm_private.truck_operational_load_kg(p_target_truck_id,null)>0 then raise exception 'Новият камион има активен или планиран товар.'; end if; if exists(select 1 from public.trip_truck_change_requests r where r.status='pending_driver_km' and (r.trip_id=p_trip_id or r.to_truck_id=p_target_truck_id)) then raise exception 'Вече има активна заявка за смяна.'; end if; if p_change_mode='temporary_for_trip' then if exists(select 1 from public.vehicle_assignments target_va where target_va.truck_id=p_target_truck_id and target_va.ended_at is null and target_va.assignment_mode='temporary_for_trip') then raise exception 'Избраният камион вече участва във временна композиция.'; end if; if exists(select 1 from public.driver_home_trucks h join public.vehicle_assignments away on away.driver_id=h.driver_id and away.ended_at is null and away.assignment_mode='temporary_for_trip' join public.trips away_trip on away_trip.id=away.temporary_trip_id and away_trip.status='active' where h.truck_id=p_target_truck_id) then raise exception 'Постоянният шофьор на този камион е във временен активен курс.'; end if; end if; if p_change_mode='permanent' then if exists(select 1 from public.driver_home_trucks h where h.truck_id=p_target_truck_id and h.driver_id<>v_driver_id) then raise exception 'Избраният камион има друг постоянен шофьор.'; end if; if exists(select 1 from public.vehicle_assignments target_va where target_va.truck_id=p_target_truck_id and target_va.ended_at is null and target_va.driver_id is not null and target_va.driver_id<>v_driver_id) then raise exception 'Избраният камион в момента е към друг шофьор.'; end if; end if; if v_trailer_id is not null then select tr.registration_number,tr.bioexis_permit_number into v_trailer_number,v_trailer_permit from public.trailers tr where tr.id=v_trailer_id and tr.is_active=true for update; if not found then raise exception 'Ремаркето не е намерено или е неактивно.'; end if; end if; perform va.id from public.vehicle_assignments va where va.ended_at is null and (va.driver_id=v_driver_id or va.truck_id in (v_source_truck_id,p_target_truck_id) or (v_trailer_id is not null and va.trailer_id=v_trailer_id)) order by va.id for update; v_snapshot=cm_private.trip_truck_change_capture_snapshot(v_driver_id,v_source_truck_id,p_target_truck_id,v_trailer_id); insert into public.trip_truck_change_requests(trip_id,driver_id,status,change_mode,requested_by,requested_at,from_segment_id,from_vehicle_assignment_id,from_truck_id,to_truck_id,trailer_id,driver_name_snapshot,from_truck_number_snapshot,to_truck_number_snapshot,trailer_number_snapshot,trailer_permit_snapshot,restore_status,restore_snapshot) values(p_trip_id,v_driver_id,'pending_driver_km',p_change_mode,auth.uid(),v_now,v_segment_id,v_vehicle_assignment_id,v_source_truck_id,p_target_truck_id,v_trailer_id,v_driver_name,v_source_truck_number,v_target_truck_number,v_trailer_number,v_trailer_permit,case when p_change_mode='temporary_for_trip' then 'pending' else 'not_applicable' end,v_snapshot) returning id into v_request_id; return v_request_id; end;
$function$;

CREATE OR REPLACE FUNCTION public.trips_admin_request_truck_change(p_trip_id uuid, p_target_truck_id uuid, p_change_mode text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin perform cm_private.assert_no_pending_driver_handoff(p_trip_id); return public.trips_admin_request_truck_change_unchecked(p_trip_id,p_target_truck_id,p_change_mode); end;
$function$;

CREATE OR REPLACE FUNCTION public.trips_admin_cancel_truck_change(p_request_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_now timestamptz:=now(); begin if not cm_private.has_permission('trips.manage') then raise exception 'Нямате право да управлявате активните курсове.'; end if; update public.trip_truck_change_requests set status='cancelled',cancelled_by=auth.uid(),cancelled_at=v_now,updated_at=v_now where id=p_request_id and status='pending_driver_km'; if not found then raise exception 'Заявката вече не е активна.'; end if; return true; end;
$function$;

CREATE OR REPLACE FUNCTION public.trips_admin_get_active()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_result jsonb; begin if not cm_private.has_permission('trips.read') then raise exception 'Нямате право да преглеждате курсовете.'; end if; select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'tripNumber',t.trip_number,'primaryDriverId',t.primary_driver_id,'status',t.status,'startedAt',t.started_at,'note',t.note,'activeSegment',(select jsonb_build_object('id',s.id,'segmentNumber',s.segment_number,'vehicleAssignmentId',s.vehicle_assignment_id,'driverId',s.driver_id,'truckId',s.truck_id,'trailerId',s.trailer_id,'driverName',s.driver_name_snapshot,'truckNumber',s.truck_number_snapshot,'trailerNumber',s.trailer_number_snapshot,'positionNumber',s.position_number_snapshot,'startKm',s.start_km,'startedAt',s.started_at) from public.trip_segments s where s.trip_id=t.id and s.status='active' limit 1),'stops',coalesce((select jsonb_agg(jsonb_build_object('id',ts.id,'stopNumber',ts.stop_number,'orderAssignmentId',ts.order_assignment_id,'orderId',ts.order_id,'companyId',ts.company_id,'siteId',ts.site_id,'orderNumber',ts.order_number_snapshot,'companyName',ts.company_name_snapshot,'siteName',ts.site_name_snapshot,'address',ts.site_address_snapshot,'contactPerson',ts.site_contact_person_snapshot,'phone',ts.site_phone_snapshot,'latitude',ts.latitude_snapshot,'longitude',ts.longitude_snapshot,'assignedTons',ts.assigned_tons_snapshot,'note',ts.order_note_snapshot,'status',ts.status,'etaNotifiedAt',ts.eta_notified_at,'loadedAt',ts.loaded_at) order by ts.stop_number) from public.trip_stops ts where ts.trip_id=t.id),'[]'::jsonb)) order by t.started_at desc,t.trip_number desc),'[]'::jsonb) into v_result from public.trips t where t.status='active'; return v_result; end;
$function$;

CREATE OR REPLACE FUNCTION public.trips_admin_get_available_orders(p_trip_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_result jsonb; begin if not cm_private.has_permission('trips.manage') then raise exception 'Нямате право да редактирате курсовете.'; end if; if not exists(select 1 from public.trips t where t.id=p_trip_id and t.status='active') then raise exception 'Активният курс не е намерен.'; end if; select coalesce(jsonb_agg(jsonb_build_object('id',available.id,'orderNumber',available.order_number,'companyId',available.company_id,'companyName',available.company_name,'siteId',available.site_id,'siteName',available.site_name,'address',available.address,'requestedTons',available.requested_kg::numeric/1000,'remainingTons',available.remaining_kg::numeric/1000,'note',available.note) order by available.created_at,available.order_number),'[]'::jsonb) into v_result from (select o.id,o.order_number,o.company_id,c.company_name,o.site_id,s.site_name,s.address,o.requested_kg,greatest(o.requested_kg-coalesce((select sum(oa.assigned_kg) from public.order_assignments oa where oa.order_id=o.id and oa.status<>'cancelled'),0),0) remaining_kg,o.note,o.created_at from public.orders o join public.client_companies c on c.id=o.company_id join public.client_sites s on s.id=o.site_id and s.company_id=o.company_id where o.status not in ('completed','cancelled') and c.is_active=true and s.is_active=true and s.latitude is not null and s.longitude is not null and not exists(select 1 from public.trip_stops ts where ts.trip_id=p_trip_id and ts.order_id=o.id)) available where available.remaining_kg>0; return v_result; end;
$function$;

CREATE OR REPLACE FUNCTION public.trips_admin_get_pending_truck_change(p_trip_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_result jsonb; begin if not cm_private.has_permission('trips.read') then raise exception 'Нямате право да преглеждате курсовете.'; end if; if p_trip_id is null then raise exception 'Курсът не е избран.'; end if; select jsonb_build_object('id',r.id,'tripId',r.trip_id,'status',r.status,'changeMode',r.change_mode,'requestedAt',r.requested_at,'driverId',r.driver_id,'driverName',r.driver_name_snapshot,'fromTruckId',r.from_truck_id,'fromTruckNumber',r.from_truck_number_snapshot,'toTruckId',r.to_truck_id,'toTruckNumber',r.to_truck_number_snapshot,'trailerId',r.trailer_id,'trailerNumber',r.trailer_number_snapshot,'trailerPermit',r.trailer_permit_snapshot) into v_result from public.trip_truck_change_requests r where r.trip_id=p_trip_id and r.status='pending_driver_km' order by r.requested_at desc limit 1; return v_result; end;
$function$;

CREATE OR REPLACE FUNCTION public.trips_admin_get_pending_truck_changes()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_result jsonb; begin if not cm_private.has_permission('trips.read') then raise exception 'Нямате право да преглеждате курсовете.'; end if; select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'tripId',r.trip_id,'status',r.status,'changeMode',r.change_mode,'requestedAt',r.requested_at,'driverId',r.driver_id,'driverName',r.driver_name_snapshot,'fromTruckId',r.from_truck_id,'fromTruckNumber',r.from_truck_number_snapshot,'toTruckId',r.to_truck_id,'toTruckNumber',r.to_truck_number_snapshot,'trailerId',r.trailer_id,'trailerNumber',r.trailer_number_snapshot,'trailerPermit',r.trailer_permit_snapshot) order by r.requested_at desc),'[]'::jsonb) into v_result from public.trip_truck_change_requests r join public.trips t on t.id=r.trip_id where r.status='pending_driver_km' and t.status='active'; return v_result; end;
$function$;

CREATE OR REPLACE FUNCTION public.trips_admin_get_truck_change_options(p_trip_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_source_truck_id uuid; v_driver_id uuid; v_result jsonb; begin if not cm_private.has_permission('trips.read') then raise exception 'Нямате право да преглеждате курсовете.'; end if; select s.truck_id,s.driver_id into v_source_truck_id,v_driver_id from public.trips t join public.trip_segments s on s.trip_id=t.id and s.status='active' where t.id=p_trip_id and t.status='active'; if not found then raise exception 'Активният курс не е намерен.'; end if; select coalesce(jsonb_agg(jsonb_build_object('id',data.id,'registrationNumber',data.registration_number,'currentDriverName',data.current_driver_name,'homeDriverName',data.home_driver_name,'canTemporary',data.can_temporary,'canPermanent',data.can_permanent) order by data.registration_number),'[]'::jsonb) into v_result from (select tr.id,tr.registration_number,active_profile.display_name current_driver_name,home_profile.display_name home_driver_name,(active_va.assignment_mode is distinct from 'temporary_for_trip' and not exists(select 1 from public.trips other_trip join public.trip_segments other_segment on other_segment.trip_id=other_trip.id and other_segment.status='active' where other_trip.status='active' and other_trip.id<>p_trip_id and other_segment.truck_id=tr.id) and not exists(select 1 from public.trip_truck_change_requests pending where pending.status='pending_driver_km' and pending.trip_id<>p_trip_id and pending.to_truck_id=tr.id) and cm_private.truck_operational_load_kg(tr.id,null)=0 and not exists(select 1 from public.driver_home_trucks home_check join public.vehicle_assignments temporary_check on temporary_check.driver_id=home_check.driver_id and temporary_check.ended_at is null and temporary_check.assignment_mode='temporary_for_trip' join public.trips temporary_trip on temporary_trip.id=temporary_check.temporary_trip_id and temporary_trip.status='active' where home_check.truck_id=tr.id)) can_temporary,(active_va.assignment_mode is distinct from 'temporary_for_trip' and active_va.driver_id is null and home.driver_id is null and not exists(select 1 from public.trips other_trip join public.trip_segments other_segment on other_segment.trip_id=other_trip.id and other_segment.status='active' where other_trip.status='active' and other_trip.id<>p_trip_id and other_segment.truck_id=tr.id) and not exists(select 1 from public.trip_truck_change_requests pending where pending.status='pending_driver_km' and pending.trip_id<>p_trip_id and pending.to_truck_id=tr.id) and cm_private.truck_operational_load_kg(tr.id,null)=0) can_permanent from public.trucks tr left join public.vehicle_assignments active_va on active_va.truck_id=tr.id and active_va.ended_at is null left join public.profiles active_profile on active_profile.id=active_va.driver_id left join public.driver_home_trucks home on home.truck_id=tr.id left join public.profiles home_profile on home_profile.id=home.driver_id where tr.is_active=true and tr.id<>v_source_truck_id) data where data.can_temporary=true or data.can_permanent=true; return v_result; end;
$function$;

CREATE OR REPLACE FUNCTION public.trips_admin_move_future_stop(p_stop_id uuid, p_direction text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_trip_id uuid; v_truck_id uuid; v_stop_number integer; v_target_stop_id uuid; v_target_number integer; v_temp_number integer; begin if not cm_private.has_permission('trips.manage') then raise exception 'Нямате право да редактирате курсовете.'; end if; if p_direction not in ('up','down') then raise exception 'Невалидна посока.'; end if; select ts.trip_id,seg.truck_id into v_trip_id,v_truck_id from public.trip_stops ts join public.trips t on t.id=ts.trip_id join public.trip_segments seg on seg.trip_id=t.id and seg.status='active' where ts.id=p_stop_id and t.status='active' limit 1; if v_trip_id is null then raise exception 'Активната спирка не е намерена.'; end if; perform 1 from public.trucks where id=v_truck_id for update; if not found then raise exception 'Камионът не е намерен.'; end if; perform 1 from public.trips t join public.trip_segments seg on seg.trip_id=t.id and seg.status='active' where t.id=v_trip_id and t.status='active' and seg.truck_id=v_truck_id for update of t,seg; if not found then raise exception 'Курсът или активната композиция са променени.'; end if; perform 1 from public.trip_stops where trip_id=v_trip_id order by stop_number for update; select ts.stop_number into v_stop_number from public.trip_stops ts where ts.id=p_stop_id and ts.trip_id=v_trip_id and ts.status='waiting'; if not found then raise exception 'Само бъдеща спирка може да бъде местена.'; end if; if p_direction='up' then v_target_number=v_stop_number-1; else v_target_number=v_stop_number+1; end if; select ts.id into v_target_stop_id from public.trip_stops ts where ts.trip_id=v_trip_id and ts.stop_number=v_target_number and ts.status='waiting'; if not found then if p_direction='up' then raise exception 'Спирката не може да бъде преместена пред текущата спирка.'; else raise exception 'Спирката вече е последната бъдеща спирка.'; end if; end if; select coalesce(max(stop_number),0)+1000000 into v_temp_number from public.trip_stops where trip_id=v_trip_id; update public.trip_stops set stop_number=v_temp_number where id=p_stop_id; update public.trip_stops set stop_number=v_stop_number where id=v_target_stop_id; update public.trip_stops set stop_number=v_target_number where id=p_stop_id; return jsonb_build_object('tripId',v_trip_id,'stopId',p_stop_id,'stopNumber',v_target_number,'direction',p_direction); end;
$function$;

CREATE OR REPLACE FUNCTION public.trips_admin_remove_future_stop(p_stop_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_trip_id uuid; v_truck_id uuid; v_assignment_id uuid; v_order_id uuid; v_company_name text; v_removed_number integer; v_offset constant integer:=1000000; begin if not cm_private.has_permission('trips.manage') then raise exception 'Нямате право да редактирате курсовете.'; end if; select ts.trip_id,seg.truck_id into v_trip_id,v_truck_id from public.trip_stops ts join public.trips t on t.id=ts.trip_id join public.trip_segments seg on seg.trip_id=t.id and seg.status='active' where ts.id=p_stop_id and t.status='active' limit 1; if v_trip_id is null then raise exception 'Активната спирка не е намерена.'; end if; perform 1 from public.trucks where id=v_truck_id for update; if not found then raise exception 'Камионът не е намерен.'; end if; perform 1 from public.trips t join public.trip_segments seg on seg.trip_id=t.id and seg.status='active' where t.id=v_trip_id and t.status='active' and seg.truck_id=v_truck_id for update of t,seg; if not found then raise exception 'Курсът или композицията са променени.'; end if; perform 1 from public.trip_stops where trip_id=v_trip_id order by stop_number for update; select ts.order_assignment_id,ts.order_id,ts.company_name_snapshot,ts.stop_number into v_assignment_id,v_order_id,v_company_name,v_removed_number from public.trip_stops ts where ts.id=p_stop_id and ts.trip_id=v_trip_id and ts.status='waiting'; if not found then raise exception 'Само бъдеща спирка може да бъде премахната.'; end if; perform 1 from public.order_assignments oa where oa.id=v_assignment_id and oa.order_id=v_order_id and oa.trip_id=v_trip_id and oa.status in ('assigned','accepted') for update; if not found then raise exception 'Бъдещото зачисляване вече е променено.'; end if; perform 1 from public.orders where id=v_order_id for update; if not found then raise exception 'Заявката не е намерена.'; end if; if exists(select 1 from public.notifications where order_assignment_id=v_assignment_id) then raise exception 'Спирката има история от известия и не може да бъде премахната.'; end if; if exists(select 1 from public.discrepancies where order_assignment_id=v_assignment_id) then raise exception 'Спирката има регистрирано несъответствие и не може да бъде премахната.'; end if; delete from public.trip_stops where id=p_stop_id; delete from public.order_assignments where id=v_assignment_id; update public.trip_stops set stop_number=stop_number+v_offset where trip_id=v_trip_id; update public.trip_stops set stop_number=(stop_number-v_offset)-case when (stop_number-v_offset)>v_removed_number then 1 else 0 end where trip_id=v_trip_id; return jsonb_build_object('tripId',v_trip_id,'removedStopId',p_stop_id,'removedAssignmentId',v_assignment_id,'companyName',v_company_name); end;
$function$;

CREATE OR REPLACE FUNCTION public.trips_admin_update_stop_load(p_stop_id uuid, p_assigned_kg bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_trip_id uuid; v_truck_id uuid; v_assignment_id uuid; v_order_id uuid; v_stop_status text; v_assignment_status text; v_old_assigned_kg bigint; v_order_requested_kg bigint; v_other_order_kg bigint; v_other_truck_kg bigint; v_order_maximum bigint; v_truck_maximum bigint; v_allowed bigint; begin if not cm_private.has_permission('trips.manage') then raise exception 'Нямате право да редактирате курсовете.'; end if; if p_assigned_kg is null or p_assigned_kg<=0 then raise exception 'Тонажът трябва да бъде по-голям от 0.'; end if; select ts.trip_id,seg.truck_id into v_trip_id,v_truck_id from public.trip_stops ts join public.trips t on t.id=ts.trip_id join public.trip_segments seg on seg.trip_id=t.id and seg.status='active' where ts.id=p_stop_id and t.status='active' limit 1; if v_trip_id is null then raise exception 'Активната спирка не е намерена.'; end if; perform 1 from public.trucks where id=v_truck_id for update; if not found then raise exception 'Камионът не е намерен.'; end if; perform 1 from public.trips t join public.trip_segments seg on seg.trip_id=t.id and seg.status='active' where t.id=v_trip_id and t.status='active' and seg.truck_id=v_truck_id for update of t,seg; if not found then raise exception 'Курсът или активната композиция са променени.'; end if; perform 1 from public.trip_stops where trip_id=v_trip_id order by stop_number for update; select ts.order_assignment_id,ts.order_id,ts.status,ts.assigned_kg_snapshot into v_assignment_id,v_order_id,v_stop_status,v_old_assigned_kg from public.trip_stops ts where ts.id=p_stop_id and ts.trip_id=v_trip_id; if not found then raise exception 'Спирката не е намерена.'; end if; if v_stop_status not in ('waiting','en_route') then raise exception 'Тонажът на натоварена спирка е заключен.'; end if; select oa.status into v_assignment_status from public.order_assignments oa where oa.id=v_assignment_id and oa.order_id=v_order_id and oa.trip_id=v_trip_id and oa.truck_id=v_truck_id for update; if not found then raise exception 'Свързаното зачисляване не е намерено.'; end if; if v_assignment_status in ('loaded','completed','cancelled') then raise exception 'Товарът вече е заключен.'; end if; select o.requested_kg into v_order_requested_kg from public.orders o where o.id=v_order_id for update; if not found then raise exception 'Заявката не е намерена.'; end if; select coalesce(sum(oa.assigned_kg),0) into v_other_order_kg from public.order_assignments oa where oa.order_id=v_order_id and oa.id<>v_assignment_id and oa.status<>'cancelled'; v_order_maximum=greatest(v_order_requested_kg-v_other_order_kg,0); select coalesce(sum(oa.assigned_kg),0) into v_other_truck_kg from public.order_assignments oa where oa.truck_id=v_truck_id and oa.id<>v_assignment_id and oa.status not in ('completed','cancelled'); v_truck_maximum=greatest(24000-v_other_truck_kg,0); v_allowed=least(v_order_maximum,v_truck_maximum); if p_assigned_kg>v_allowed then raise exception 'Максимално позволеният товар е % т.',round(v_allowed::numeric/1000,3); end if; update public.order_assignments set assigned_kg=p_assigned_kg where id=v_assignment_id; update public.trip_stops set assigned_kg_snapshot=p_assigned_kg where id=p_stop_id; update public.discrepancies set assigned_kg_snapshot=p_assigned_kg where order_assignment_id=v_assignment_id; return jsonb_build_object('tripId',v_trip_id,'stopId',p_stop_id,'assignmentId',v_assignment_id,'oldAssignedTons',round(v_old_assigned_kg::numeric/1000,3),'assignedTons',round(p_assigned_kg::numeric/1000,3)); end;
$function$;

CREATE OR REPLACE FUNCTION public.trips_driver_confirm_truck_change_unchecked(p_request_id uuid, p_old_truck_end_km bigint, p_new_truck_start_km bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_driver_id uuid:=auth.uid(); v_request public.trip_truck_change_requests%rowtype; v_segment_start_km bigint; v_now timestamptz:=now(); v_current_snapshot jsonb; v_new_vehicle_assignment_id uuid; v_new_segment_id uuid; v_new_segment_number integer; v_stop record; v_new_order_assignment_id uuid; v_driver_name text; v_target_truck_number text; v_trailer_number text; v_trailer_permit text; begin if v_driver_id is null then raise exception 'Невалидна потребителска сесия.'; end if; if p_old_truck_end_km is null or p_old_truck_end_km<0 then raise exception 'Въведете валиден краен километраж на стария камион.'; end if; if p_new_truck_start_km is null or p_new_truck_start_km<0 then raise exception 'Въведете валиден начален километраж на новия камион.'; end if; select r.* into v_request from public.trip_truck_change_requests r where r.id=p_request_id and r.driver_id=v_driver_id and r.status='pending_driver_km' for update; if not found then raise exception 'Заявката за смяна вече не е активна.'; end if; select s.start_km into v_segment_start_km from public.trips t join public.trip_segments s on s.trip_id=t.id where t.id=v_request.trip_id and t.primary_driver_id=v_driver_id and t.status='active' and s.id=v_request.from_segment_id and s.status='active' and s.vehicle_assignment_id=v_request.from_vehicle_assignment_id and s.truck_id=v_request.from_truck_id for update of t,s; if not found then raise exception 'Активната композиция вече е променена. Заявката е остаряла.'; end if; if p_old_truck_end_km<v_segment_start_km then raise exception 'Крайният километраж на стария камион не може да бъде по-малък от началния.'; end if; if exists(select 1 from public.discrepancies d join public.trip_stops ts on ts.id=d.trip_stop_id where ts.trip_id=v_request.trip_id and ts.status<>'loaded') then raise exception 'Текущата спирка има отчетено несъответствие. Първо натиснете „Натоварих“, след което потвърдете смяната на камиона.'; end if; perform tr.id from public.trucks tr where tr.id in (v_request.from_truck_id,v_request.to_truck_id) order by tr.id for update; if not exists(select 1 from public.trucks tr where tr.id=v_request.to_truck_id and tr.is_active=true) then raise exception 'Новият камион вече не е активен.'; end if; if exists(select 1 from public.trips other_trip join public.trip_segments other_segment on other_segment.trip_id=other_trip.id and other_segment.status='active' where other_trip.status='active' and other_trip.id<>v_request.trip_id and other_segment.truck_id=v_request.to_truck_id) then raise exception 'Новият камион вече участва в друг активен курс.'; end if; if cm_private.truck_operational_load_kg(v_request.to_truck_id,null)>0 then raise exception 'Новият камион вече има активен или планиран товар.'; end if; perform o.id from public.orders o where o.id in (select distinct oa.order_id from public.order_assignments oa join public.trip_stops ts on ts.order_assignment_id=oa.id where ts.trip_id=v_request.trip_id) order by o.id for update; perform ts.id from public.trip_stops ts where ts.trip_id=v_request.trip_id order by ts.stop_number for update; perform va.id from public.vehicle_assignments va where va.ended_at is null and (va.driver_id=v_driver_id or va.truck_id in (v_request.from_truck_id,v_request.to_truck_id) or (v_request.trailer_id is not null and va.trailer_id=v_request.trailer_id)) order by va.id for update; v_current_snapshot=cm_private.trip_truck_change_capture_snapshot(v_driver_id,v_request.from_truck_id,v_request.to_truck_id,v_request.trailer_id); if v_current_snapshot is distinct from v_request.restore_snapshot then raise exception 'Fleet състоянието е променено след изпращането на заявката. Администраторът трябва да създаде нова смяна.'; end if; select p.display_name into v_driver_name from public.profiles p where p.id=v_driver_id and p.is_active=true; if not found then raise exception 'Шофьорът е неактивен.'; end if; select t.registration_number into v_target_truck_number from public.trucks t where t.id=v_request.to_truck_id; if v_request.trailer_id is not null then select tr.registration_number,tr.bioexis_permit_number into v_trailer_number,v_trailer_permit from public.trailers tr where tr.id=v_request.trailer_id and tr.is_active=true; if not found then raise exception 'Ремаркето вече не е активно.'; end if; end if; if v_request.change_mode='permanent' then if exists(select 1 from public.driver_home_trucks h where h.truck_id=v_request.to_truck_id and h.driver_id<>v_driver_id) then raise exception 'Новият камион вече има друг постоянен шофьор.'; end if; if exists(select 1 from public.vehicle_assignments target_va where target_va.truck_id=v_request.to_truck_id and target_va.ended_at is null and target_va.driver_id is not null and target_va.driver_id<>v_driver_id) then raise exception 'Новият камион вече е към друг шофьор.'; end if; end if; update public.vehicle_assignments set ended_at=v_now,ended_reason=case when v_request.change_mode='temporary_for_trip' then 'temporary_trip_handoff' else 'permanent_trip_handoff' end,updated_at=v_now where ended_at is null and (driver_id=v_driver_id or truck_id in (v_request.from_truck_id,v_request.to_truck_id) or (v_request.trailer_id is not null and trailer_id=v_request.trailer_id)); if v_request.change_mode='permanent' then perform cm_private.trip_truck_change_supersede_temporary(v_request.trip_id,v_driver_id,v_request.trailer_id,v_request.to_truck_id,v_now); delete from public.driver_home_trucks where driver_id=v_driver_id or truck_id=v_request.to_truck_id; insert into public.driver_home_trucks(driver_id,truck_id,assigned_at,updated_at) values(v_driver_id,v_request.to_truck_id,v_now,v_now); end if; insert into public.vehicle_assignments(driver_id,truck_id,trailer_id,assignment_mode,temporary_trip_id,previous_assignment_id,started_at) values(v_driver_id,v_request.to_truck_id,v_request.trailer_id,v_request.change_mode,case when v_request.change_mode='temporary_for_trip' then v_request.trip_id else null end,v_request.from_vehicle_assignment_id,v_now) returning id into v_new_vehicle_assignment_id; update public.trip_segments set status='completed',end_km=p_old_truck_end_km,ended_at=v_now,end_reason='truck_change' where id=v_request.from_segment_id; select coalesce(max(s.segment_number),0)+1 into v_new_segment_number from public.trip_segments s where s.trip_id=v_request.trip_id; insert into public.trip_segments(trip_id,segment_number,vehicle_assignment_id,driver_id,truck_id,trailer_id,driver_name_snapshot,truck_number_snapshot,trailer_number_snapshot,position_number_snapshot,start_km,status,started_at) values(v_request.trip_id,v_new_segment_number,v_new_vehicle_assignment_id,v_driver_id,v_request.to_truck_id,v_request.trailer_id,v_driver_name,v_target_truck_number,v_trailer_number,v_trailer_permit,p_new_truck_start_km,'active',v_now) returning id into v_new_segment_id; for v_stop in select ts.id stop_id,ts.status stop_status,oa.id old_assignment_id,oa.order_id,oa.assigned_kg,oa.loaded_kg,oa.assigned_by old_assigned_by from public.trip_stops ts join public.order_assignments oa on oa.id=ts.order_assignment_id where ts.trip_id=v_request.trip_id and ts.status in ('waiting','en_route') and oa.status not in ('completed','cancelled') order by ts.stop_number for update of ts,oa loop update public.order_assignments set status='cancelled',cancelled_at=v_now,completed_at=null where id=v_stop.old_assignment_id; insert into public.order_assignments(order_id,vehicle_assignment_id,driver_id,truck_id,trailer_id,trip_id,assigned_kg,loaded_kg,status,driver_name_snapshot,truck_number_snapshot,trailer_number_snapshot,trailer_permit_snapshot,assigned_by,assigned_at) values(v_stop.order_id,v_new_vehicle_assignment_id,v_driver_id,v_request.to_truck_id,v_request.trailer_id,v_request.trip_id,v_stop.assigned_kg,v_stop.loaded_kg,cm_private.trip_stop_to_assignment_status(v_stop.stop_status),v_driver_name,v_target_truck_number,v_trailer_number,v_trailer_permit,coalesce(v_stop.old_assigned_by,auth.uid()),v_now) returning id into v_new_order_assignment_id; update public.notifications set order_assignment_id=v_new_order_assignment_id where order_assignment_id=v_stop.old_assignment_id and notification_type='driver_eta'; update public.trip_stops set order_assignment_id=v_new_order_assignment_id where id=v_stop.stop_id; end loop; update public.trip_truck_change_requests set status='completed',old_truck_end_km=p_old_truck_end_km,new_truck_start_km=p_new_truck_start_km,confirmed_by=v_driver_id,confirmed_at=v_now,completed_at=v_now,new_vehicle_assignment_id=v_new_vehicle_assignment_id,new_segment_id=v_new_segment_id,restore_status=case when change_mode='temporary_for_trip' then 'pending' else 'not_applicable' end,updated_at=v_now where id=v_request.id; return jsonb_build_object('requestId',v_request.id,'tripId',v_request.trip_id,'changeMode',v_request.change_mode,'fromTruckNumber',v_request.from_truck_number_snapshot,'toTruckNumber',v_target_truck_number,'oldTruckEndKm',p_old_truck_end_km,'newTruckStartKm',p_new_truck_start_km,'vehicleAssignmentId',v_new_vehicle_assignment_id,'segmentId',v_new_segment_id,'completedAt',v_now); end;
$function$;

CREATE OR REPLACE FUNCTION public.trips_driver_confirm_truck_change(p_request_id uuid, p_old_truck_end_km bigint, p_new_truck_start_km bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_trip_id uuid; begin select r.trip_id into v_trip_id from public.trip_truck_change_requests r where r.id=p_request_id; if v_trip_id is not null then perform cm_private.assert_no_pending_driver_handoff(v_trip_id); end if; return public.trips_driver_confirm_truck_change_unchecked(p_request_id,p_old_truck_end_km,p_new_truck_start_km); end;
$function$;

CREATE OR REPLACE FUNCTION public.trips_finish_driver_unchecked(p_end_km bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_driver_id uuid:=auth.uid(); v_trip_id uuid; v_trip_number bigint; v_segment_id uuid; v_segment_start_km bigint; v_vehicle_assignment_id uuid; v_assignment_mode text; v_total_km bigint; v_completed_at timestamptz:=now(); v_restored_changes integer:=0; begin if v_driver_id is null then raise exception 'Невалидна потребителска сесия.'; end if; if p_end_km is null or p_end_km<0 then raise exception 'Въведете валиден краен километраж.'; end if; select t.id,t.trip_number into v_trip_id,v_trip_number from public.trips t where t.primary_driver_id=v_driver_id and t.status='active' for update; if not found then raise exception 'Няма активен курс.'; end if; if exists(select 1 from public.trip_stops ts where ts.trip_id=v_trip_id and ts.status<>'loaded') then raise exception 'Първо трябва да приключите всички фирми.'; end if; select s.id,s.start_km,s.vehicle_assignment_id into v_segment_id,v_segment_start_km,v_vehicle_assignment_id from public.trip_segments s where s.trip_id=v_trip_id and s.status='active' for update; if not found then raise exception 'Активната километрова отсечка не е намерена.'; end if; if p_end_km<v_segment_start_km then raise exception 'Крайният километраж не може да бъде по-малък от началния.'; end if; select va.assignment_mode into v_assignment_mode from public.vehicle_assignments va where va.id=v_vehicle_assignment_id; if not found then raise exception 'Активната композиция не е намерена.'; end if; perform o.id from public.orders o where o.id in (select distinct oa.order_id from public.order_assignments oa where oa.trip_id=v_trip_id) order by o.id for update; update public.trip_segments set status='completed',end_km=p_end_km,ended_at=v_completed_at,end_reason='trip_completed' where id=v_segment_id; update public.order_assignments set status='completed',loaded_kg=coalesce(loaded_kg,assigned_kg),completed_at=v_completed_at,cancelled_at=null where trip_id=v_trip_id and status<>'cancelled'; if v_assignment_mode='temporary_for_trip' then v_restored_changes=cm_private.trip_truck_change_restore_pending(v_trip_id,v_completed_at); if v_restored_changes<=0 then raise exception 'Временната композиция няма валидни данни за автоматично възстановяване.'; end if; end if; update public.trips set status='completed',completed_at=v_completed_at,cancelled_at=null where id=v_trip_id; select coalesce(sum(s.end_km-s.start_km),0) into v_total_km from public.trip_segments s where s.trip_id=v_trip_id and s.status='completed'; return jsonb_build_object('tripId',v_trip_id,'tripNumber',v_trip_number,'endKm',p_end_km,'totalKm',v_total_km,'completedAt',v_completed_at,'temporaryChangesRestored',v_restored_changes); end;
$function$;

CREATE OR REPLACE FUNCTION public.trips_finish_driver(p_end_km bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_trip_id uuid; v_result jsonb; v_restored_count integer:=0; v_completed_at timestamptz; begin select t.id into v_trip_id from public.trips t where t.primary_driver_id=auth.uid() and t.status='active' limit 1; if v_trip_id is not null then perform cm_private.assert_no_pending_driver_handoff(v_trip_id); end if; v_result=public.trips_finish_driver_unchecked(p_end_km); v_completed_at=nullif(v_result->>'completedAt','')::timestamptz; if v_trip_id is not null and v_completed_at is not null then select count(*)::integer into v_restored_count from (select r.id from public.trip_truck_change_requests r where r.trip_id=v_trip_id and r.restore_status='restored' and r.restored_at=v_completed_at union all select r.id from public.trip_driver_handoff_requests r where r.trip_id=v_trip_id and r.restore_status='restored' and r.restored_at=v_completed_at) restored; end if; return jsonb_set(v_result,'{temporaryChangesRestored}',to_jsonb(v_restored_count),true); end;
$function$;

CREATE OR REPLACE FUNCTION public.trips_accept_driver_handoff(p_request_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_to_driver_id uuid:=auth.uid(); v_request public.trip_driver_handoff_requests%rowtype; v_segment_start_km bigint; v_to_driver_name text; v_current_snapshot jsonb; v_new_vehicle_assignment_id uuid; v_new_segment_id uuid; v_new_segment_number integer; v_now timestamptz:=now(); begin if v_to_driver_id is null then raise exception 'Невалидна потребителска сесия.'; end if; select r.* into v_request from public.trip_driver_handoff_requests r where r.id=p_request_id and r.to_driver_id=v_to_driver_id and r.status='pending' for update; if not found then raise exception 'Заявката за предаване вече не е активна.'; end if; select s.start_km into v_segment_start_km from public.trips t join public.trip_segments s on s.trip_id=t.id where t.id=v_request.trip_id and t.status='active' and t.primary_driver_id=v_request.from_driver_id and s.id=v_request.from_segment_id and s.status='active' and s.driver_id=v_request.from_driver_id and s.vehicle_assignment_id=v_request.from_vehicle_assignment_id and s.truck_id=v_request.truck_id and s.trailer_id is not distinct from v_request.trailer_id for update of t,s; if not found then raise exception 'Активният курс е променен. Заявката е остаряла.'; end if; if v_request.handoff_km<v_segment_start_km then raise exception 'Междинният километраж е по-малък от началния километраж на текущата отсечка.'; end if; select p.display_name into v_to_driver_name from public.profiles p join public.drivers d on d.id=p.id join public.user_roles ur on ur.user_id=p.id and ur.is_primary=true join public.roles role on role.id=ur.role_id where p.id=v_to_driver_id and p.is_active=true and role.code='driver' for update of d; if not found then raise exception 'Получаващият шофьор вече не е активен.'; end if; if exists(select 1 from public.trips other_trip where other_trip.primary_driver_id=v_to_driver_id and other_trip.status='active') then raise exception 'Получаващият шофьор вече има активен курс.'; end if; if exists(select 1 from public.trip_segments other_segment where other_segment.driver_id=v_to_driver_id and other_segment.status='active') then raise exception 'Получаващият шофьор вече участва в активен курс.'; end if; perform va.id from public.vehicle_assignments va where va.ended_at is null and (va.driver_id=v_request.from_driver_id or va.driver_id=v_request.to_driver_id or va.truck_id=v_request.truck_id or (v_request.trailer_id is not null and va.trailer_id=v_request.trailer_id)) order by va.id for update; v_current_snapshot=cm_private.trip_driver_handoff_capture_snapshot(v_request.from_driver_id,v_request.to_driver_id,v_request.truck_id,v_request.trailer_id); if v_current_snapshot is distinct from v_request.restore_snapshot then raise exception 'Fleet състоянието е променено след изпращането на заявката. Предаването трябва да бъде изпратено отново.'; end if; update public.vehicle_assignments set ended_at=v_now,ended_reason='driver_trip_handoff',updated_at=v_now where ended_at is null and (driver_id=v_request.from_driver_id or driver_id=v_request.to_driver_id or truck_id=v_request.truck_id or (v_request.trailer_id is not null and trailer_id=v_request.trailer_id)); insert into public.vehicle_assignments(driver_id,truck_id,trailer_id,assignment_mode,temporary_trip_id,previous_assignment_id,started_at) values(v_request.to_driver_id,v_request.truck_id,v_request.trailer_id,'temporary_for_trip',v_request.trip_id,v_request.from_vehicle_assignment_id,v_now) returning id into v_new_vehicle_assignment_id; update public.trip_segments set status='completed',end_km=v_request.handoff_km,ended_at=v_now,end_reason='driver_handoff' where id=v_request.from_segment_id; select coalesce(max(s.segment_number),0)+1 into v_new_segment_number from public.trip_segments s where s.trip_id=v_request.trip_id; insert into public.trip_segments(trip_id,segment_number,vehicle_assignment_id,driver_id,truck_id,trailer_id,driver_name_snapshot,truck_number_snapshot,trailer_number_snapshot,position_number_snapshot,start_km,status,started_at) values(v_request.trip_id,v_new_segment_number,v_new_vehicle_assignment_id,v_request.to_driver_id,v_request.truck_id,v_request.trailer_id,v_to_driver_name,v_request.truck_number_snapshot,v_request.trailer_number_snapshot,v_request.position_number_snapshot,v_request.handoff_km,'active',v_now) returning id into v_new_segment_id; update public.order_assignments oa set driver_id=v_request.to_driver_id,vehicle_assignment_id=v_new_vehicle_assignment_id,driver_name_snapshot=v_to_driver_name,updated_at=v_now from public.trip_stops ts where ts.trip_id=v_request.trip_id and ts.order_assignment_id=oa.id and ts.status in ('waiting','en_route') and oa.status not in ('completed','cancelled','loaded'); update public.trips set primary_driver_id=v_request.to_driver_id,updated_at=v_now where id=v_request.trip_id; update public.trip_driver_handoff_requests set status='accepted',accepted_at=v_now,completed_at=v_now,restore_status='pending',updated_at=v_now where id=v_request.id; return jsonb_build_object('requestId',v_request.id,'tripId',v_request.trip_id,'fromDriverId',v_request.from_driver_id,'toDriverId',v_request.to_driver_id,'toDriverName',v_to_driver_name,'truckNumber',v_request.truck_number_snapshot,'handoffKm',v_request.handoff_km,'oldSegmentId',v_request.from_segment_id,'newSegmentId',v_new_segment_id,'newSegmentNumber',v_new_segment_number,'vehicleAssignmentId',v_new_vehicle_assignment_id,'acceptedAt',v_now); end;
$function$;

CREATE OR REPLACE FUNCTION public.trips_cancel_driver_handoff(p_request_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_driver_id uuid:=auth.uid(); v_request public.trip_driver_handoff_requests%rowtype; v_now timestamptz:=now(); begin if v_driver_id is null then raise exception 'Невалидна потребителска сесия.'; end if; select r.* into v_request from public.trip_driver_handoff_requests r where r.id=p_request_id and r.from_driver_id=v_driver_id and r.status='pending' for update; if not found then raise exception 'Заявката вече не е активна.'; end if; update public.trip_driver_handoff_requests set status='cancelled',cancelled_at=v_now,updated_at=v_now where id=v_request.id; return jsonb_build_object('requestId',v_request.id,'status','cancelled','cancelledAt',v_now); end;
$function$;

CREATE OR REPLACE FUNCTION public.trips_reject_driver_handoff(p_request_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_driver_id uuid:=auth.uid(); v_request public.trip_driver_handoff_requests%rowtype; v_now timestamptz:=now(); begin if v_driver_id is null then raise exception 'Невалидна потребителска сесия.'; end if; select r.* into v_request from public.trip_driver_handoff_requests r where r.id=p_request_id and r.to_driver_id=v_driver_id and r.status='pending' for update; if not found then raise exception 'Заявката вече не е активна.'; end if; update public.trip_driver_handoff_requests set status='rejected',rejected_at=v_now,updated_at=v_now where id=v_request.id; return jsonb_build_object('requestId',v_request.id,'status','rejected','rejectedAt',v_now); end;
$function$;

CREATE OR REPLACE FUNCTION public.trips_get_driver_handoff_state()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_driver_id uuid:=auth.uid(); v_outgoing jsonb; v_incoming jsonb; begin if v_driver_id is null then raise exception 'Невалидна потребителска сесия.'; end if; select jsonb_build_object('requestId',r.id,'tripId',r.trip_id,'tripNumber',t.trip_number,'fromDriverId',r.from_driver_id,'fromDriverName',r.from_driver_name_snapshot,'toDriverId',r.to_driver_id,'toDriverName',r.to_driver_name_snapshot,'truckNumber',r.truck_number_snapshot,'trailerNumber',r.trailer_number_snapshot,'positionNumber',r.position_number_snapshot,'handoffKm',r.handoff_km,'status',r.status,'requestedAt',r.requested_at) into v_outgoing from public.trip_driver_handoff_requests r join public.trips t on t.id=r.trip_id where r.from_driver_id=v_driver_id and r.status='pending' order by r.requested_at desc limit 1; select jsonb_build_object('requestId',r.id,'tripId',r.trip_id,'tripNumber',t.trip_number,'fromDriverId',r.from_driver_id,'fromDriverName',r.from_driver_name_snapshot,'toDriverId',r.to_driver_id,'toDriverName',r.to_driver_name_snapshot,'truckNumber',r.truck_number_snapshot,'trailerNumber',r.trailer_number_snapshot,'positionNumber',r.position_number_snapshot,'handoffKm',r.handoff_km,'status',r.status,'requestedAt',r.requested_at) into v_incoming from public.trip_driver_handoff_requests r join public.trips t on t.id=r.trip_id where r.to_driver_id=v_driver_id and r.status='pending' order by r.requested_at desc limit 1; return jsonb_build_object('outgoing',v_outgoing,'incoming',v_incoming); end;
$function$;

CREATE OR REPLACE FUNCTION public.trips_list_driver_handoff_candidates()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_driver_id uuid:=auth.uid(); v_trip_id uuid; v_result jsonb; begin if v_driver_id is null then raise exception 'Невалидна потребителска сесия.'; end if; if not exists(select 1 from public.profiles p join public.drivers d on d.id=p.id where p.id=v_driver_id and p.is_active=true) then raise exception 'Активен шофьорски профил не е намерен.'; end if; select t.id into v_trip_id from public.trips t where t.primary_driver_id=v_driver_id and t.status='active' limit 1; if v_trip_id is null then return '[]'::jsonb; end if; select coalesce(jsonb_agg(jsonb_build_object('driverId',p.id,'driverName',p.display_name,'employeeCode',d.employee_code,'currentTruckNumber',current_fleet.truck_number) order by p.display_name,p.id),'[]'::jsonb) into v_result from public.profiles p join public.drivers d on d.id=p.id join public.user_roles ur on ur.user_id=p.id and ur.is_primary=true join public.roles role on role.id=ur.role_id and role.code='driver' left join lateral (select t.registration_number truck_number from public.vehicle_assignments va join public.trucks t on t.id=va.truck_id where va.driver_id=p.id and va.ended_at is null limit 1) current_fleet on true where p.is_active=true and p.id<>v_driver_id and not exists(select 1 from public.trips active_trip where active_trip.primary_driver_id=p.id and active_trip.status='active') and not exists(select 1 from public.trip_segments active_segment where active_segment.driver_id=p.id and active_segment.status='active') and not exists(select 1 from public.trip_driver_handoff_requests pending_request where pending_request.status='pending' and (pending_request.from_driver_id=p.id or pending_request.to_driver_id=p.id)); return v_result; end;
$function$;

CREATE OR REPLACE FUNCTION public.trips_request_driver_handoff(p_to_driver_id uuid, p_handoff_km bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_from_driver_id uuid:=auth.uid(); v_trip_id uuid; v_trip_number bigint; v_segment_id uuid; v_segment_start_km bigint; v_vehicle_assignment_id uuid; v_truck_id uuid; v_trailer_id uuid; v_from_driver_name text; v_to_driver_name text; v_truck_number text; v_trailer_number text; v_position_number text; v_restore_snapshot jsonb; v_request_id uuid; v_now timestamptz:=now(); begin if v_from_driver_id is null then raise exception 'Невалидна потребителска сесия.'; end if; if p_to_driver_id is null then raise exception 'Изберете шофьор.'; end if; if p_to_driver_id=v_from_driver_id then raise exception 'Не можете да предадете курса на себе си.'; end if; if p_handoff_km is null or p_handoff_km<0 then raise exception 'Въведете валиден междинен километраж.'; end if; select t.id,t.trip_number,s.id,s.start_km,s.vehicle_assignment_id,s.truck_id,s.trailer_id,s.driver_name_snapshot,s.truck_number_snapshot,s.trailer_number_snapshot,s.position_number_snapshot into v_trip_id,v_trip_number,v_segment_id,v_segment_start_km,v_vehicle_assignment_id,v_truck_id,v_trailer_id,v_from_driver_name,v_truck_number,v_trailer_number,v_position_number from public.trips t join public.trip_segments s on s.trip_id=t.id and s.status='active' where t.primary_driver_id=v_from_driver_id and t.status='active' and s.driver_id=v_from_driver_id for update of t,s; if not found then raise exception 'Няма активен курс за предаване.'; end if; if p_handoff_km<v_segment_start_km then raise exception 'Междинният километраж не може да бъде по-малък от началния километраж на текущата отсечка.'; end if; if exists(select 1 from public.trip_driver_handoff_requests r where r.status='pending' and (r.trip_id=v_trip_id or r.from_driver_id=v_from_driver_id)) then raise exception 'Вече има активна заявка за предаване на този курс.'; end if; select p.display_name into v_to_driver_name from public.profiles p join public.drivers d on d.id=p.id join public.user_roles ur on ur.user_id=p.id and ur.is_primary=true join public.roles role on role.id=ur.role_id where p.id=p_to_driver_id and p.is_active=true and role.code='driver' for update of d; if not found then raise exception 'Избраният шофьор не е активен.'; end if; if exists(select 1 from public.trips t where t.primary_driver_id=p_to_driver_id and t.status='active') then raise exception 'Избраният шофьор вече има активен курс.'; end if; if exists(select 1 from public.trip_segments s where s.driver_id=p_to_driver_id and s.status='active') then raise exception 'Избраният шофьор вече участва в активен курс.'; end if; if exists(select 1 from public.trip_driver_handoff_requests r where r.status='pending' and (r.from_driver_id=p_to_driver_id or r.to_driver_id=p_to_driver_id)) then raise exception 'Избраният шофьор вече има друга активна заявка за предаване.'; end if; perform va.id from public.vehicle_assignments va where va.ended_at is null and (va.driver_id=v_from_driver_id or va.driver_id=p_to_driver_id or va.truck_id=v_truck_id or (v_trailer_id is not null and va.trailer_id=v_trailer_id)) order by va.id for update; if not exists(select 1 from public.vehicle_assignments va where va.id=v_vehicle_assignment_id and va.driver_id=v_from_driver_id and va.truck_id=v_truck_id and va.trailer_id is not distinct from v_trailer_id and va.ended_at is null) then raise exception 'Активната композиция е променена. Обновете курса и опитайте отново.'; end if; v_restore_snapshot=cm_private.trip_driver_handoff_capture_snapshot(v_from_driver_id,p_to_driver_id,v_truck_id,v_trailer_id); insert into public.trip_driver_handoff_requests(trip_id,from_driver_id,to_driver_id,from_segment_id,from_vehicle_assignment_id,truck_id,trailer_id,from_driver_name_snapshot,to_driver_name_snapshot,truck_number_snapshot,trailer_number_snapshot,position_number_snapshot,handoff_km,status,restore_snapshot,restore_status,requested_at,created_at,updated_at) values(v_trip_id,v_from_driver_id,p_to_driver_id,v_segment_id,v_vehicle_assignment_id,v_truck_id,v_trailer_id,v_from_driver_name,v_to_driver_name,v_truck_number,v_trailer_number,v_position_number,p_handoff_km,'pending',v_restore_snapshot,'not_applicable',v_now,v_now,v_now) returning id into v_request_id; return jsonb_build_object('requestId',v_request_id,'tripId',v_trip_id,'tripNumber',v_trip_number,'fromDriverId',v_from_driver_id,'fromDriverName',v_from_driver_name,'toDriverId',p_to_driver_id,'toDriverName',v_to_driver_name,'truckNumber',v_truck_number,'trailerNumber',v_trailer_number,'positionNumber',v_position_number,'handoffKm',p_handoff_km,'status','pending','requestedAt',v_now); end;
$function$;

CREATE OR REPLACE FUNCTION public.trips_mark_stop_loaded_unchecked(p_stop_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_driver_id uuid:=auth.uid(); v_trip_id uuid; v_current_assignment_id uuid; v_current_order_id uuid; v_current_company_name text; v_current_stop_number integer; v_next_stop_id uuid; v_next_assignment_id uuid; v_next_order_id uuid; v_next_company_name text; v_next_stop_number integer; v_loaded_at timestamptz:=now(); begin if v_driver_id is null then raise exception 'Невалидна потребителска сесия.'; end if; select ts.trip_id,ts.order_assignment_id,ts.order_id,ts.company_name_snapshot,ts.stop_number into v_trip_id,v_current_assignment_id,v_current_order_id,v_current_company_name,v_current_stop_number from public.trip_stops ts join public.trips t on t.id=ts.trip_id where ts.id=p_stop_id and ts.status='en_route' and t.primary_driver_id=v_driver_id and t.status='active' for update of t,ts; if not found then raise exception 'Това не е текущата активна спирка.'; end if; select ts.id,ts.order_assignment_id,ts.order_id,ts.company_name_snapshot,ts.stop_number into v_next_stop_id,v_next_assignment_id,v_next_order_id,v_next_company_name,v_next_stop_number from public.trip_stops ts where ts.trip_id=v_trip_id and ts.status='waiting' and ts.stop_number>v_current_stop_number order by ts.stop_number limit 1 for update; perform o.id from public.orders o where o.id=v_current_order_id or (v_next_order_id is not null and o.id=v_next_order_id) order by o.id for update; update public.trip_stops set status='loaded',loaded_at=v_loaded_at where id=p_stop_id; update public.order_assignments set status='loaded',loaded_kg=coalesce(loaded_kg,assigned_kg) where id=v_current_assignment_id and trip_id=v_trip_id; if v_next_stop_id is not null then update public.trip_stops set status='en_route' where id=v_next_stop_id; update public.order_assignments set status='en_route' where id=v_next_assignment_id and trip_id=v_trip_id; end if; return jsonb_build_object('tripId',v_trip_id,'loadedStopId',p_stop_id,'loadedCompanyName',v_current_company_name,'loadedAt',v_loaded_at,'allClientsLoaded',v_next_stop_id is null,'nextStopId',v_next_stop_id,'nextStopNumber',v_next_stop_number,'nextCompanyName',v_next_company_name); end;
$function$;

CREATE OR REPLACE FUNCTION public.trips_mark_stop_loaded(p_stop_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_trip_id uuid; begin select ts.trip_id into v_trip_id from public.trip_stops ts join public.trips t on t.id=ts.trip_id where ts.id=p_stop_id and t.primary_driver_id=auth.uid() and t.status='active'; if v_trip_id is not null then perform cm_private.assert_no_pending_driver_handoff(v_trip_id); end if; return public.trips_mark_stop_loaded_unchecked(p_stop_id); end;
$function$;

CREATE OR REPLACE FUNCTION public.trips_report_discrepancy_unchecked(p_stop_id uuid, p_actual_loaded_kg bigint, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_driver_id uuid:=auth.uid(); v_trip_id uuid; v_assignment_id uuid; v_order_id uuid; v_company_id uuid; v_company_name text; v_driver_name text; v_truck_number text; v_assigned_kg bigint; v_existing_id uuid; v_discrepancy_id uuid; v_note text:=nullif(btrim(coalesce(p_note,'')),''); v_created_at timestamptz:=now(); begin if v_driver_id is null then raise exception 'Невалидна потребителска сесия.'; end if; if p_actual_loaded_kg is null or p_actual_loaded_kg<0 then raise exception 'Въведете валидно реално натоварено количество.'; end if; select ts.trip_id,ts.order_assignment_id,ts.order_id,ts.company_id,ts.company_name_snapshot,oa.driver_name_snapshot,oa.truck_number_snapshot,oa.assigned_kg into v_trip_id,v_assignment_id,v_order_id,v_company_id,v_company_name,v_driver_name,v_truck_number,v_assigned_kg from public.trip_stops ts join public.trips t on t.id=ts.trip_id join public.order_assignments oa on oa.id=ts.order_assignment_id where ts.id=p_stop_id and ts.status='en_route' and t.primary_driver_id=v_driver_id and t.status='active' and oa.trip_id=ts.trip_id and oa.driver_id=v_driver_id for update of t,ts,oa; if not found then raise exception 'Това не е текущата активна спирка.'; end if; select d.id into v_existing_id from public.discrepancies d where d.order_assignment_id=v_assignment_id limit 1; if v_existing_id is not null then return jsonb_build_object('discrepancyId',v_existing_id,'alreadyReported',true); end if; insert into public.discrepancies(trip_id,trip_stop_id,order_assignment_id,order_id,company_id,reported_by,company_name_snapshot,driver_name_snapshot,truck_number_snapshot,assigned_kg_snapshot,actual_loaded_kg,note,status) values(v_trip_id,p_stop_id,v_assignment_id,v_order_id,v_company_id,v_driver_id,v_company_name,v_driver_name,v_truck_number,v_assigned_kg,p_actual_loaded_kg,v_note,'reported') returning id into v_discrepancy_id; update public.order_assignments set loaded_kg=p_actual_loaded_kg where id=v_assignment_id; insert into public.notifications(notification_type,recipient_role,company_id,sent_by,trip_id,trip_stop_id,order_assignment_id,discrepancy_id,title,message,requires_confirmation) values('load_discrepancy','staff',v_company_id,v_driver_id,v_trip_id,p_stop_id,v_assignment_id,v_discrepancy_id,'Несъответствие при товарене','⚠️ '||v_company_name||': зачислени '||round(v_assigned_kg::numeric/1000,3)||' т., реално натоварени '||round(p_actual_loaded_kg::numeric/1000,3)||' т.',false); return jsonb_build_object('discrepancyId',v_discrepancy_id,'alreadyReported',false,'assignedTons',round(v_assigned_kg::numeric/1000,3),'actualLoadedTons',round(p_actual_loaded_kg::numeric/1000,3),'differenceTons',round((p_actual_loaded_kg-v_assigned_kg)::numeric/1000,3),'createdAt',v_created_at); end;
$function$;

CREATE OR REPLACE FUNCTION public.trips_report_discrepancy(p_stop_id uuid, p_actual_loaded_kg bigint, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_trip_id uuid; begin select ts.trip_id into v_trip_id from public.trip_stops ts join public.trips t on t.id=ts.trip_id where ts.id=p_stop_id and t.primary_driver_id=auth.uid() and t.status='active'; if v_trip_id is not null then perform cm_private.assert_no_pending_driver_handoff(v_trip_id); end if; return public.trips_report_discrepancy_unchecked(p_stop_id,p_actual_loaded_kg,p_note); end;
$function$;

CREATE OR REPLACE FUNCTION public.trips_send_eta_before_start(p_order_assignment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_trip_id uuid; begin select oa.trip_id into v_trip_id from public.order_assignments oa where oa.id=p_order_assignment_id and oa.driver_id=auth.uid(); if not found then raise exception 'Зачисляването не е намерено.'; end if; if v_trip_id is not null then raise exception 'Курсът вече е стартиран.'; end if; return cm_private.send_driver_eta(p_order_assignment_id); end;
$function$;

CREATE OR REPLACE FUNCTION public.trips_send_eta_current_unchecked(p_stop_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_assignment_id uuid; begin select ts.order_assignment_id into v_assignment_id from public.trip_stops ts join public.trips t on t.id=ts.trip_id where ts.id=p_stop_id and ts.status='en_route' and t.primary_driver_id=auth.uid() and t.status='active'; if not found then raise exception 'Това не е текущата активна спирка.'; end if; return cm_private.send_driver_eta(v_assignment_id); end;
$function$;

CREATE OR REPLACE FUNCTION public.trips_send_eta_current(p_stop_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_trip_id uuid; begin select ts.trip_id into v_trip_id from public.trip_stops ts join public.trips t on t.id=ts.trip_id where ts.id=p_stop_id and t.primary_driver_id=auth.uid() and t.status='active'; if v_trip_id is not null then perform cm_private.assert_no_pending_driver_handoff(v_trip_id); end if; return public.trips_send_eta_current_unchecked(p_stop_id); end;
$function$;

CREATE OR REPLACE FUNCTION public.trips_get_driver_truck_change()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_driver_id uuid:=auth.uid(); v_result jsonb; begin if v_driver_id is null then raise exception 'Невалидна потребителска сесия.'; end if; select jsonb_build_object('id',r.id,'tripId',r.trip_id,'status',r.status,'changeMode',r.change_mode,'driverName',r.driver_name_snapshot,'fromTruckId',r.from_truck_id,'fromTruckNumber',r.from_truck_number_snapshot,'toTruckId',r.to_truck_id,'toTruckNumber',r.to_truck_number_snapshot,'trailerId',r.trailer_id,'trailerNumber',r.trailer_number_snapshot,'positionNumber',r.trailer_permit_snapshot,'requestedAt',r.requested_at,'segmentStartKm',s.start_km) into v_result from public.trip_truck_change_requests r join public.trip_segments s on s.id=r.from_segment_id where r.driver_id=v_driver_id and r.status='pending_driver_km' order by r.requested_at desc limit 1; return v_result; end;
$function$;

CREATE OR REPLACE FUNCTION public.trips_get_driver_interactions()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_driver_id uuid:=auth.uid(); v_result jsonb; begin if v_driver_id is null then raise exception 'Невалидна потребителска сесия.'; end if; select coalesce(jsonb_agg(jsonb_build_object('assignmentId',oa.id,'stopId',ts.id,'notificationId',n.id,'etaSentAt',n.created_at,'etaConfirmed',n.confirmed_at is not null,'etaConfirmedAt',n.confirmed_at,'discrepancyId',d.id,'discrepancyStatus',d.status,'actualLoadedTons',d.actual_loaded_tons,'differenceTons',d.difference_tons) order by oa.assigned_at,oa.id),'[]'::jsonb) into v_result from public.order_assignments oa left join public.trip_stops ts on ts.order_assignment_id=oa.id left join public.notifications n on n.order_assignment_id=oa.id and n.notification_type='driver_eta' left join public.discrepancies d on d.order_assignment_id=oa.id where oa.driver_id=v_driver_id and ((oa.trip_id is null and oa.status='assigned') or (oa.trip_id is not null and oa.status not in ('completed','cancelled') and exists(select 1 from public.trips t where t.id=oa.trip_id and t.primary_driver_id=v_driver_id and t.status='active'))); return v_result; end;
$function$;

CREATE OR REPLACE FUNCTION public.trips_get_driver_state()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_driver_id uuid:=auth.uid(); v_driver_name text; v_trip_id uuid; v_trip jsonb; v_vehicle_assignment_id uuid; v_truck_id uuid; v_trailer_id uuid; v_truck_number text; v_trailer_number text; v_position_number text; v_assigned_stops jsonb; begin if v_driver_id is null then raise exception 'Невалидна потребителска сесия.'; end if; select p.display_name into v_driver_name from public.profiles p join public.drivers d on d.id=p.id where p.id=v_driver_id and p.is_active=true; if v_driver_name is null then raise exception 'Активен шофьорски профил не е намерен.'; end if; select t.id into v_trip_id from public.trips t where t.primary_driver_id=v_driver_id and t.status='active' limit 1; if v_trip_id is not null then select jsonb_build_object('id',t.id,'tripNumber',t.trip_number,'status',t.status,'startedAt',t.started_at,'activeSegment',(select jsonb_build_object('id',s.id,'segmentNumber',s.segment_number,'startKm',s.start_km,'startedAt',s.started_at,'driverName',s.driver_name_snapshot,'truckNumber',s.truck_number_snapshot,'trailerNumber',s.trailer_number_snapshot,'positionNumber',s.position_number_snapshot) from public.trip_segments s where s.trip_id=t.id and s.status='active' limit 1),'stops',coalesce((select jsonb_agg(jsonb_build_object('id',ts.id,'stopNumber',ts.stop_number,'orderId',ts.order_id,'orderNumber',ts.order_number_snapshot,'companyName',ts.company_name_snapshot,'siteName',ts.site_name_snapshot,'address',ts.site_address_snapshot,'contactPerson',ts.site_contact_person_snapshot,'phone',ts.site_phone_snapshot,'latitude',ts.latitude_snapshot,'longitude',ts.longitude_snapshot,'assignedTons',ts.assigned_tons_snapshot,'note',ts.order_note_snapshot,'status',ts.status,'etaNotifiedAt',ts.eta_notified_at,'loadedAt',ts.loaded_at) order by ts.stop_number) from public.trip_stops ts where ts.trip_id=t.id),'[]'::jsonb)) into v_trip from public.trips t where t.id=v_trip_id; return jsonb_build_object('driverId',v_driver_id,'driverName',v_driver_name,'hasActiveTrip',true,'trip',v_trip,'assignedStops','[]'::jsonb); end if; select va.id,va.truck_id,va.trailer_id,t.registration_number,tr.registration_number,nullif(btrim(tr.bioexis_permit_number),'') into v_vehicle_assignment_id,v_truck_id,v_trailer_id,v_truck_number,v_trailer_number,v_position_number from public.vehicle_assignments va join public.trucks t on t.id=va.truck_id join public.trailers tr on tr.id=va.trailer_id where va.driver_id=v_driver_id and va.ended_at is null and va.assignment_mode='permanent' and va.temporary_trip_id is null and t.is_active=true and tr.is_active=true limit 1; if v_vehicle_assignment_id is not null then select coalesce(jsonb_agg(jsonb_build_object('assignmentId',oa.id,'orderId',o.id,'orderNumber',o.order_number,'companyName',c.company_name,'siteName',s.site_name,'address',s.address,'contactPerson',coalesce(s.contact_person,c.contact_person),'phone',coalesce(s.phone,c.phone),'latitude',s.latitude,'longitude',s.longitude,'assignedTons',oa.assigned_tons,'note',o.note,'assignedAt',oa.assigned_at) order by o.loading_ramp_snapshot desc,oa.assigned_at,oa.id),'[]'::jsonb) into v_assigned_stops from public.order_assignments oa join public.orders o on o.id=oa.order_id join public.client_companies c on c.id=o.company_id join public.client_sites s on s.id=o.site_id and s.company_id=o.company_id where oa.driver_id=v_driver_id and oa.truck_id=v_truck_id and oa.trailer_id=v_trailer_id and oa.vehicle_assignment_id=v_vehicle_assignment_id and oa.trip_id is null and oa.status='assigned'; else v_assigned_stops='[]'::jsonb; end if; return jsonb_build_object('driverId',v_driver_id,'driverName',v_driver_name,'hasActiveTrip',false,'trip',null,'composition',case when v_vehicle_assignment_id is null then null else jsonb_build_object('vehicleAssignmentId',v_vehicle_assignment_id,'truckId',v_truck_id,'truckNumber',v_truck_number,'trailerId',v_trailer_id,'trailerNumber',v_trailer_number,'positionNumber',v_position_number) end,'assignedStops',v_assigned_stops); end;
$function$;

CREATE OR REPLACE FUNCTION public.trips_start_driver(p_start_km bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_driver_id uuid:=auth.uid(); v_driver_name text; v_vehicle_assignment_id uuid; v_truck_id uuid; v_trailer_id uuid; v_truck_number text; v_trailer_number text; v_position_number text; v_trip_id uuid; v_trip_number bigint; v_segment_id uuid; v_stop_count integer; v_bad_company_name text; v_bad_site_name text; v_started_at timestamptz:=now(); begin if v_driver_id is null then raise exception 'Невалидна потребителска сесия.'; end if; if p_start_km is null or p_start_km<0 then raise exception 'Въведете валиден начален километраж.'; end if; select p.display_name into v_driver_name from public.profiles p join public.drivers d on d.id=p.id join public.user_roles ur on ur.user_id=p.id and ur.is_primary=true join public.roles r on r.id=ur.role_id where p.id=v_driver_id and p.is_active=true and r.code='driver'; if v_driver_name is null then raise exception 'Активен шофьорски профил не е намерен.'; end if; if exists(select 1 from public.trips t where t.primary_driver_id=v_driver_id and t.status='active') then raise exception 'Вече имате активен курс.'; end if; select va.id,va.truck_id,va.trailer_id into v_vehicle_assignment_id,v_truck_id,v_trailer_id from public.vehicle_assignments va where va.driver_id=v_driver_id and va.ended_at is null and va.assignment_mode='permanent' and va.temporary_trip_id is null limit 1; if v_vehicle_assignment_id is null or v_truck_id is null or v_trailer_id is null then raise exception 'Нямате готова активна композиция.'; end if; select t.registration_number into v_truck_number from public.trucks t where t.id=v_truck_id and t.is_active=true for update; if not found then raise exception 'Текущият камион е неактивен или липсва.'; end if; select va.trailer_id,tr.registration_number,nullif(btrim(tr.bioexis_permit_number),'') into v_trailer_id,v_trailer_number,v_position_number from public.vehicle_assignments va join public.trailers tr on tr.id=va.trailer_id where va.id=v_vehicle_assignment_id and va.driver_id=v_driver_id and va.truck_id=v_truck_id and va.ended_at is null and va.assignment_mode='permanent' and va.temporary_trip_id is null and tr.is_active=true for update of va; if not found then raise exception 'Композицията е променена. Опитайте старта отново.'; end if; perform o.id from public.orders o where o.id in (select distinct oa.order_id from public.order_assignments oa where oa.driver_id=v_driver_id and oa.truck_id=v_truck_id and oa.trailer_id=v_trailer_id and oa.vehicle_assignment_id=v_vehicle_assignment_id and oa.trip_id is null and oa.status='assigned') order by o.id for update; if exists(select 1 from public.trip_segments s where s.status='active' and (s.driver_id=v_driver_id or s.truck_id=v_truck_id or s.trailer_id=v_trailer_id or s.vehicle_assignment_id=v_vehicle_assignment_id)) then raise exception 'Шофьорът или композицията вече участват в активен курс.'; end if; if exists(select 1 from public.order_assignments oa where oa.driver_id=v_driver_id and oa.status='assigned' and oa.trip_id is null and (oa.vehicle_assignment_id<>v_vehicle_assignment_id or oa.truck_id<>v_truck_id or oa.trailer_id<>v_trailer_id)) then raise exception 'Има зачислен товар към стара композиция. Администраторът трябва първо да коригира зачисляването.'; end if; select count(*)::integer into v_stop_count from public.order_assignments oa where oa.driver_id=v_driver_id and oa.truck_id=v_truck_id and oa.trailer_id=v_trailer_id and oa.vehicle_assignment_id=v_vehicle_assignment_id and oa.trip_id is null and oa.status='assigned'; if v_stop_count<=0 then raise exception 'Нямате зачислени товари за стартиране.'; end if; select c.company_name,s.site_name into v_bad_company_name,v_bad_site_name from public.order_assignments oa join public.orders o on o.id=oa.order_id join public.client_companies c on c.id=o.company_id join public.client_sites s on s.id=o.site_id and s.company_id=o.company_id where oa.driver_id=v_driver_id and oa.truck_id=v_truck_id and oa.trailer_id=v_trailer_id and oa.vehicle_assignment_id=v_vehicle_assignment_id and oa.trip_id is null and oa.status='assigned' and (c.is_active is not true or s.is_active is not true or s.latitude is null or s.longitude is null) order by o.loading_ramp_snapshot desc,oa.assigned_at,oa.id limit 1; if found then raise exception 'Обектът "%" на фирма "%" няма активни точни GPS координати.',coalesce(v_bad_site_name,'-'),coalesce(v_bad_company_name,'-'); end if; insert into public.trips(primary_driver_id,status,created_by,started_at) values(v_driver_id,'active',v_driver_id,v_started_at) returning id,trip_number into v_trip_id,v_trip_number; insert into public.trip_segments(trip_id,segment_number,vehicle_assignment_id,driver_id,truck_id,trailer_id,driver_name_snapshot,truck_number_snapshot,trailer_number_snapshot,position_number_snapshot,start_km,status,started_at) values(v_trip_id,1,v_vehicle_assignment_id,v_driver_id,v_truck_id,v_trailer_id,v_driver_name,v_truck_number,v_trailer_number,v_position_number,p_start_km,'active',v_started_at) returning id into v_segment_id; insert into public.trip_stops(trip_id,stop_number,order_assignment_id,order_id,company_id,site_id,order_number_snapshot,company_name_snapshot,site_name_snapshot,site_address_snapshot,site_contact_person_snapshot,site_phone_snapshot,latitude_snapshot,longitude_snapshot,assigned_kg_snapshot,order_note_snapshot,status) select v_trip_id,row_number() over(order by o.loading_ramp_snapshot desc,oa.assigned_at,oa.id)::integer,oa.id,o.id,o.company_id,o.site_id,o.order_number,c.company_name,s.site_name,s.address,coalesce(nullif(btrim(s.contact_person),''),nullif(btrim(c.contact_person),'')),coalesce(nullif(btrim(s.phone),''),nullif(btrim(c.phone),'')),s.latitude,s.longitude,oa.assigned_kg,o.note,case when row_number() over(order by o.loading_ramp_snapshot desc,oa.assigned_at,oa.id)=1 then 'en_route' else 'waiting' end from public.order_assignments oa join public.orders o on o.id=oa.order_id join public.client_companies c on c.id=o.company_id join public.client_sites s on s.id=o.site_id and s.company_id=o.company_id where oa.driver_id=v_driver_id and oa.truck_id=v_truck_id and oa.trailer_id=v_trailer_id and oa.vehicle_assignment_id=v_vehicle_assignment_id and oa.trip_id is null and oa.status='assigned' order by o.loading_ramp_snapshot desc,oa.assigned_at,oa.id; update public.order_assignments oa set trip_id=v_trip_id,status=case when ts.stop_number=1 then 'en_route' else 'accepted' end from public.trip_stops ts where ts.trip_id=v_trip_id and ts.order_assignment_id=oa.id; return jsonb_build_object('tripId',v_trip_id,'tripNumber',v_trip_number,'segmentId',v_segment_id,'driverId',v_driver_id,'driverName',v_driver_name,'truckId',v_truck_id,'truckNumber',v_truck_number,'trailerId',v_trailer_id,'trailerNumber',v_trailer_number,'positionNumber',v_position_number,'startKm',p_start_km,'stopCount',v_stop_count,'startedAt',v_started_at); end;
$function$;

CREATE OR REPLACE FUNCTION public.trips_admin_add_order(p_trip_id uuid, p_order_id uuid, p_assigned_kg bigint, p_insert_mode text DEFAULT 'next'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_truck_id uuid; v_segment_id uuid; v_vehicle_assignment_id uuid; v_driver_id uuid; v_trailer_id uuid; v_driver_name text; v_truck_number text; v_trailer_number text; v_trailer_permit text; v_order_number bigint; v_company_id uuid; v_site_id uuid; v_requested_kg bigint; v_order_note text; v_order_status text; v_company_name text; v_site_name text; v_site_address text; v_site_contact text; v_site_phone text; v_latitude numeric; v_longitude numeric; v_order_allocated_kg bigint; v_remaining_kg bigint; v_truck_used_kg bigint; v_truck_free_kg bigint; v_current_number integer; v_max_number integer; v_insert_number integer; v_has_current boolean; v_has_waiting boolean; v_assignment_status text; v_stop_status text; v_assignment_id uuid; v_stop_id uuid; v_offset constant integer:=1000000; begin if not cm_private.has_permission('trips.manage') then raise exception 'Нямате право да редактирате курсовете.'; end if; if p_assigned_kg is null or p_assigned_kg<=0 then raise exception 'Тонажът трябва да бъде по-голям от 0.'; end if; if p_insert_mode not in ('next','last') then raise exception 'Невалидна позиция за новата спирка.'; end if; select seg.truck_id into v_truck_id from public.trips t join public.trip_segments seg on seg.trip_id=t.id and seg.status='active' where t.id=p_trip_id and t.status='active' limit 1; if v_truck_id is null then raise exception 'Активният курс или сегмент не е намерен.'; end if; perform 1 from public.trucks where id=v_truck_id for update; if not found then raise exception 'Камионът не е намерен.'; end if; select seg.id,seg.vehicle_assignment_id,seg.driver_id,seg.truck_id,seg.trailer_id,seg.driver_name_snapshot,seg.truck_number_snapshot,seg.trailer_number_snapshot,seg.position_number_snapshot into v_segment_id,v_vehicle_assignment_id,v_driver_id,v_truck_id,v_trailer_id,v_driver_name,v_truck_number,v_trailer_number,v_trailer_permit from public.trips t join public.trip_segments seg on seg.trip_id=t.id and seg.status='active' where t.id=p_trip_id and t.status='active' for update of t,seg; if not found then raise exception 'Курсът или активната композиция са променени.'; end if; perform 1 from public.vehicle_assignments va where va.id=v_vehicle_assignment_id and va.driver_id=v_driver_id and va.truck_id=v_truck_id and va.trailer_id is not distinct from v_trailer_id and va.ended_at is null for update; if not found then raise exception 'Активното зачисляване на композицията вече не е валидно.'; end if; perform 1 from public.trip_stops where trip_id=p_trip_id order by stop_number for update; if exists(select 1 from public.trip_stops ts where ts.trip_id=p_trip_id and ts.order_id=p_order_id) then raise exception 'Тази заявка вече участва в маршрута.'; end if; select o.order_number,o.company_id,o.site_id,o.requested_kg,o.note,o.status into v_order_number,v_company_id,v_site_id,v_requested_kg,v_order_note,v_order_status from public.orders o where o.id=p_order_id for update; if not found then raise exception 'Заявката не е намерена.'; end if; if v_order_status in ('completed','cancelled') then raise exception 'Приключена или отказана заявка не може да бъде добавена.'; end if; select c.company_name,s.site_name,s.address,s.contact_person,s.phone,s.latitude,s.longitude into v_company_name,v_site_name,v_site_address,v_site_contact,v_site_phone,v_latitude,v_longitude from public.client_companies c join public.client_sites s on s.company_id=c.id where c.id=v_company_id and s.id=v_site_id and c.is_active=true and s.is_active=true; if not found then raise exception 'Фирмата или обектът вече не са активни.'; end if; if v_latitude is null or v_longitude is null then raise exception 'Обектът няма GPS координати.'; end if; select coalesce(sum(oa.assigned_kg),0) into v_order_allocated_kg from public.order_assignments oa where oa.order_id=p_order_id and oa.status<>'cancelled'; v_remaining_kg=greatest(v_requested_kg-v_order_allocated_kg,0); if v_remaining_kg<=0 then raise exception 'Заявката няма свободен остатък.'; end if; select coalesce(sum(oa.assigned_kg),0) into v_truck_used_kg from public.order_assignments oa where oa.truck_id=v_truck_id and oa.status not in ('completed','cancelled'); v_truck_free_kg=greatest(24000-v_truck_used_kg,0); if p_assigned_kg>least(v_remaining_kg,v_truck_free_kg) then raise exception 'Може да добавите максимум % т.',round(least(v_remaining_kg,v_truck_free_kg)::numeric/1000,3); end if; select exists(select 1 from public.trip_stops where trip_id=p_trip_id and status='en_route') into v_has_current; select exists(select 1 from public.trip_stops where trip_id=p_trip_id and status='waiting') into v_has_waiting; select stop_number into v_current_number from public.trip_stops where trip_id=p_trip_id and status='en_route' limit 1; select coalesce(max(stop_number),0) into v_max_number from public.trip_stops where trip_id=p_trip_id; if not v_has_current and v_has_waiting then raise exception 'Маршрутът е в невалидно състояние: има бъдещи спирки, но няма текуща.'; end if; if not v_has_current then v_stop_status='en_route'; v_assignment_status='en_route'; else v_stop_status='waiting'; v_assignment_status='accepted'; end if; if p_insert_mode='next' and v_has_current then v_insert_number=v_current_number+1; else v_insert_number=v_max_number+1; end if; if v_insert_number<=v_max_number then update public.trip_stops set stop_number=stop_number+v_offset where trip_id=p_trip_id; update public.trip_stops set stop_number=(stop_number-v_offset)+case when (stop_number-v_offset)>=v_insert_number then 1 else 0 end where trip_id=p_trip_id; end if; insert into public.order_assignments(order_id,vehicle_assignment_id,driver_id,truck_id,trailer_id,trip_id,assigned_kg,status,driver_name_snapshot,truck_number_snapshot,trailer_number_snapshot,trailer_permit_snapshot,assigned_by,assigned_at) values(p_order_id,v_vehicle_assignment_id,v_driver_id,v_truck_id,v_trailer_id,p_trip_id,p_assigned_kg,v_assignment_status,v_driver_name,v_truck_number,v_trailer_number,v_trailer_permit,auth.uid(),now()) returning id into v_assignment_id; insert into public.trip_stops(trip_id,stop_number,order_assignment_id,order_id,company_id,site_id,order_number_snapshot,company_name_snapshot,site_name_snapshot,site_address_snapshot,site_contact_person_snapshot,site_phone_snapshot,latitude_snapshot,longitude_snapshot,assigned_kg_snapshot,order_note_snapshot,status) values(p_trip_id,v_insert_number,v_assignment_id,p_order_id,v_company_id,v_site_id,v_order_number,v_company_name,v_site_name,v_site_address,v_site_contact,v_site_phone,v_latitude,v_longitude,p_assigned_kg,v_order_note,v_stop_status) returning id into v_stop_id; return jsonb_build_object('tripId',p_trip_id,'stopId',v_stop_id,'assignmentId',v_assignment_id,'stopNumber',v_insert_number,'stopStatus',v_stop_status,'companyName',v_company_name,'siteName',v_site_name,'assignedTons',round(p_assigned_kg::numeric/1000,3)); end;
$function$;


alter table public.client_companies enable row level security;
alter table public.client_registration_requests enable row level security;
alter table public.client_sites enable row level security;
alter table public.client_users enable row level security;
alter table public.discrepancies enable row level security;
alter table public.driver_home_trucks enable row level security;
alter table public.drivers enable row level security;
alter table public.notifications enable row level security;
alter table public.order_assignments enable row level security;
alter table public.orders enable row level security;
alter table public.permissions enable row level security;
alter table public.profiles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.roles enable row level security;
alter table public.trailers enable row level security;
alter table public.trip_driver_handoff_requests enable row level security;
alter table public.trip_segments enable row level security;
alter table public.trip_stops enable row level security;
alter table public.trip_truck_change_requests enable row level security;
alter table public.trips enable row level security;
alter table public.trucks enable row level security;
alter table public.user_roles enable row level security;
alter table public.vehicle_assignments enable row level security;

create policy client_companies_select_policy on public.client_companies as permissive for select to authenticated using ((cm_private.has_permission('clients.read'::text) OR cm_private.client_member_of_company(id)));
create policy client_sites_select_policy on public.client_sites as permissive for select to authenticated using ((cm_private.has_permission('clients.read'::text) OR cm_private.client_member_of_company(company_id)));
create policy client_users_select_policy on public.client_users as permissive for select to authenticated using ((cm_private.has_permission('clients.read'::text) OR (user_id = ( SELECT auth.uid() AS uid))));
create policy discrepancies_select_v3 on public.discrepancies as permissive for select to authenticated using ((cm_private.has_permission('discrepancies.read'::text) OR cm_private.client_member_of_company(company_id) OR (reported_by = auth.uid())));
create policy driver_home_trucks_select on public.driver_home_trucks as permissive for select to authenticated using ((cm_private.is_active_user() AND ((driver_id = auth.uid()) OR cm_private.has_permission('fleet.read'::text))));
create policy drivers_select_self_or_staff on public.drivers as permissive for select to authenticated using ((cm_private.is_active_user() AND ((id = auth.uid()) OR cm_private.has_permission('fleet.read'::text))));
create policy notifications_select_v3 on public.notifications as permissive for select to authenticated using (((sent_by = auth.uid()) OR ((recipient_role = 'client'::text) AND ((recipient_profile_id = auth.uid()) OR cm_private.client_member_of_company(company_id))) OR ((recipient_role = 'staff'::text) AND cm_private.has_permission('discrepancies.read'::text))));
create policy order_assignments_select_policy on public.order_assignments as permissive for select to authenticated using (cm_private.can_read_order(order_id));
create policy orders_select_policy on public.orders as permissive for select to authenticated using (cm_private.can_read_order(id));
create policy profiles_select_self_or_staff on public.profiles as permissive for select to authenticated using ((cm_private.is_active_user() AND ((id = auth.uid()) OR cm_private.has_permission('users.read'::text))));
create policy trailers_select on public.trailers as permissive for select to authenticated using ((cm_private.is_active_user() AND (cm_private.has_permission('fleet.read'::text) OR (EXISTS ( SELECT 1
   FROM public.vehicle_assignments assignment
  WHERE ((assignment.driver_id = auth.uid()) AND (assignment.trailer_id = trailers.id) AND (assignment.ended_at IS NULL)))))));
create policy trip_driver_handoff_select on public.trip_driver_handoff_requests as permissive for select to authenticated using ((cm_private.is_active_user() AND ((from_driver_id = auth.uid()) OR (to_driver_id = auth.uid()) OR cm_private.has_permission('trips.read'::text))));
create policy trip_segments_driver_or_staff_select_v3 on public.trip_segments as permissive for select to authenticated using (( SELECT cm_private.can_read_trip(trip_segments.trip_id) AS can_read_trip));
create policy trip_segments_select on public.trip_segments as permissive for select to authenticated using ((cm_private.is_active_user() AND ((driver_id = auth.uid()) OR cm_private.has_permission('trips.read'::text))));
create policy trip_stops_driver_or_staff_select_v3 on public.trip_stops as permissive for select to authenticated using (( SELECT cm_private.can_read_trip(trip_stops.trip_id) AS can_read_trip));
create policy trip_truck_change_requests_select on public.trip_truck_change_requests as permissive for select to authenticated using (((driver_id = auth.uid()) OR cm_private.has_permission('trips.read'::text)));
create policy trips_driver_or_staff_select_v3 on public.trips as permissive for select to authenticated using (( SELECT cm_private.can_read_trip(trips.id) AS can_read_trip));
create policy trips_select on public.trips as permissive for select to authenticated using ((cm_private.is_active_user() AND (cm_private.has_permission('trips.read'::text) OR (primary_driver_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.trip_segments segment
  WHERE ((segment.trip_id = trips.id) AND (segment.driver_id = auth.uid())))))));
create policy trucks_select on public.trucks as permissive for select to authenticated using ((cm_private.is_active_user() AND (cm_private.has_permission('fleet.read'::text) OR (EXISTS ( SELECT 1
   FROM public.driver_home_trucks home
  WHERE ((home.driver_id = auth.uid()) AND (home.truck_id = trucks.id)))) OR (EXISTS ( SELECT 1
   FROM public.vehicle_assignments assignment
  WHERE ((assignment.driver_id = auth.uid()) AND (assignment.truck_id = trucks.id) AND (assignment.ended_at IS NULL)))))));
create policy vehicle_assignments_select on public.vehicle_assignments as permissive for select to authenticated using ((cm_private.is_active_user() AND ((driver_id = auth.uid()) OR cm_private.has_permission('fleet.read'::text))));

CREATE TRIGGER client_companies_set_updated_at BEFORE UPDATE ON public.client_companies FOR EACH ROW EXECUTE FUNCTION cm_private.set_updated_at();
CREATE TRIGGER client_registration_requests_set_updated_at BEFORE UPDATE ON public.client_registration_requests FOR EACH ROW EXECUTE FUNCTION cm_private.set_updated_at();
CREATE TRIGGER client_sites_set_updated_at BEFORE UPDATE ON public.client_sites FOR EACH ROW EXECUTE FUNCTION cm_private.set_updated_at();
CREATE TRIGGER client_users_set_updated_at BEFORE UPDATE ON public.client_users FOR EACH ROW EXECUTE FUNCTION cm_private.set_updated_at();
CREATE TRIGGER discrepancies_set_updated_at BEFORE UPDATE ON public.discrepancies FOR EACH ROW EXECUTE FUNCTION cm_private.set_updated_at();
CREATE TRIGGER driver_home_trucks_set_updated_at BEFORE UPDATE ON public.driver_home_trucks FOR EACH ROW EXECUTE FUNCTION cm_private.set_updated_at();
CREATE TRIGGER drivers_set_updated_at BEFORE UPDATE ON public.drivers FOR EACH ROW EXECUTE FUNCTION cm_private.set_updated_at();
CREATE TRIGGER notifications_set_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION cm_private.set_updated_at();
CREATE TRIGGER a_order_assignments_truck_capacity_guard BEFORE INSERT OR UPDATE OF truck_id, driver_id, trailer_id, vehicle_assignment_id, assigned_kg, status ON public.order_assignments FOR EACH ROW EXECUTE FUNCTION cm_private.enforce_truck_assignment_capacity();
CREATE TRIGGER order_assignments_capacity_guard BEFORE INSERT OR UPDATE OF order_id, assigned_kg, status ON public.order_assignments FOR EACH ROW EXECUTE FUNCTION cm_private.enforce_order_assignment_capacity();
CREATE TRIGGER order_assignments_loading_ramp_guard BEFORE INSERT ON public.order_assignments FOR EACH ROW EXECUTE FUNCTION cm_private.guard_loading_ramp_assignment();
CREATE TRIGGER order_assignments_set_updated_at BEFORE UPDATE ON public.order_assignments FOR EACH ROW EXECUTE FUNCTION cm_private.set_updated_at();
CREATE TRIGGER order_assignments_sync_order_status AFTER INSERT OR UPDATE OF assigned_kg, status ON public.order_assignments FOR EACH ROW EXECUTE FUNCTION cm_private.sync_order_allocation_status();
CREATE TRIGGER orders_requested_capacity_guard BEFORE UPDATE OF requested_kg ON public.orders FOR EACH ROW EXECUTE FUNCTION cm_private.enforce_order_requested_capacity();
CREATE TRIGGER orders_set_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION cm_private.set_updated_at();
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION cm_private.set_updated_at();
CREATE TRIGGER trailers_set_updated_at BEFORE UPDATE ON public.trailers FOR EACH ROW EXECUTE FUNCTION cm_private.set_updated_at();
CREATE TRIGGER trip_driver_handoff_pending_truck_change_guard BEFORE INSERT ON public.trip_driver_handoff_requests FOR EACH ROW EXECUTE FUNCTION cm_private.guard_driver_handoff_against_pending_truck_change();
CREATE TRIGGER trip_stops_link_existing_eta AFTER INSERT ON public.trip_stops FOR EACH ROW EXECUTE FUNCTION cm_private.link_trip_stop_eta_notification();
CREATE TRIGGER trip_stops_set_updated_at BEFORE UPDATE ON public.trip_stops FOR EACH ROW EXECUTE FUNCTION cm_private.set_updated_at();
CREATE TRIGGER trips_restore_temporary_fleet_before_completion BEFORE UPDATE OF status ON public.trips FOR EACH ROW EXECUTE FUNCTION cm_private.restore_temporary_fleet_before_trip_completion();
CREATE TRIGGER trips_set_updated_at BEFORE UPDATE ON public.trips FOR EACH ROW EXECUTE FUNCTION cm_private.set_updated_at();
CREATE TRIGGER trucks_set_updated_at BEFORE UPDATE ON public.trucks FOR EACH ROW EXECUTE FUNCTION cm_private.set_updated_at();
CREATE TRIGGER vehicle_assignments_set_updated_at BEFORE UPDATE ON public.vehicle_assignments FOR EACH ROW EXECUTE FUNCTION cm_private.set_updated_at();


do $table_acl$
declare r record;
begin
  for r in
    select c.oid::regclass as relation_name
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r'
  loop
    execute format('revoke all on table %s from anon, authenticated', r.relation_name);
    execute format('grant all on table %s to service_role', r.relation_name);
  end loop;
end;
$table_acl$;

grant select on table public.client_companies, public.client_sites, public.client_users, public.order_assignments, public.orders, public.trip_driver_handoff_requests to authenticated;
grant select, references, trigger, truncate on table public.driver_home_trucks, public.drivers, public.profiles, public.trailers, public.trip_segments, public.trips, public.trucks, public.vehicle_assignments to authenticated;
grant select, references, trigger, truncate on table public.discrepancies, public.notifications, public.trip_stops, public.trip_truck_change_requests to anon, authenticated;
grant all on table public.roles, public.user_roles to anon;


do $function_acl$
declare r record;
begin
  for r in
    select p.oid::regprocedure as signature,n.nspname,p.proname
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where (n.nspname='cm_private' and p.proname in ('assert_no_pending_driver_handoff','can_read_order','can_read_trip','client_member_of_company','enforce_order_assignment_capacity','enforce_order_requested_capacity','enforce_truck_assignment_capacity','guard_driver_handoff_against_pending_truck_change','guard_loading_ramp_assignment','has_permission','is_active_user','link_trip_stop_eta_notification','restore_temporary_fleet_before_trip_completion','send_driver_eta','set_updated_at','sync_order_allocation_status','trip_driver_handoff_capture_snapshot','trip_has_pending_driver_handoff','trip_restore_temporary_fleet','trip_restore_vehicle_snapshot','trip_stop_to_assignment_status','trip_truck_change_capture_snapshot','trip_truck_change_restore_pending','trip_truck_change_supersede_temporary','truck_operational_load_kg'))
       or (n.nspname='public' and p.proname in ('admin_provision_app_user','admin_review_client_registration','discrepancies_mark_reviewed','fleet_create_trailer','fleet_create_truck','fleet_get_snapshot','fleet_release_truck','fleet_set_permanent_composition','get_my_primary_role','notifications_confirm_driver_eta','notifications_get_client_active','orders_assign_load','orders_cancel_assignment','orders_create_client','orders_update_client','trips_accept_driver_handoff','trips_admin_add_order','trips_admin_cancel_truck_change','trips_admin_get_active','trips_admin_get_available_orders','trips_admin_get_pending_truck_change','trips_admin_get_pending_truck_changes','trips_admin_get_truck_change_options','trips_admin_move_future_stop','trips_admin_remove_future_stop','trips_admin_request_truck_change','trips_admin_request_truck_change_unchecked','trips_admin_update_stop_load','trips_cancel_driver_handoff','trips_driver_confirm_truck_change','trips_driver_confirm_truck_change_unchecked','trips_finish_driver','trips_finish_driver_unchecked','trips_get_driver_handoff_state','trips_get_driver_interactions','trips_get_driver_state','trips_get_driver_truck_change','trips_list_driver_handoff_candidates','trips_mark_stop_loaded','trips_mark_stop_loaded_unchecked','trips_reject_driver_handoff','trips_report_discrepancy','trips_report_discrepancy_unchecked','trips_request_driver_handoff','trips_send_eta_before_start','trips_send_eta_current','trips_send_eta_current_unchecked','trips_start_driver'))
  loop
    execute format('revoke all on function %s from public, anon, authenticated, service_role',r.signature);
  end loop;
end;
$function_acl$;

grant execute on function cm_private.can_read_order(uuid),cm_private.can_read_trip(uuid),cm_private.client_member_of_company(uuid),cm_private.has_permission(text),cm_private.is_active_user() to authenticated;
grant execute on function cm_private.assert_no_pending_driver_handoff(uuid),cm_private.trip_driver_handoff_capture_snapshot(uuid,uuid,uuid,uuid),cm_private.trip_has_pending_driver_handoff(uuid),cm_private.trip_restore_temporary_fleet(uuid,timestamptz),cm_private.trip_restore_vehicle_snapshot(uuid,jsonb,uuid[],uuid[],uuid[],timestamptz) to service_role;

grant execute on function public.admin_provision_app_user(uuid,text,text,text,text,text,uuid),public.admin_review_client_registration(uuid,uuid,text,text,boolean) to anon,authenticated,service_role;
grant execute on function public.discrepancies_mark_reviewed(uuid),public.fleet_create_trailer(text,text),public.fleet_create_truck(text),public.fleet_get_snapshot(),public.fleet_release_truck(uuid),public.fleet_set_permanent_composition(uuid,uuid,uuid),public.get_my_primary_role(),public.notifications_confirm_driver_eta(uuid),public.notifications_get_client_active(),public.orders_assign_load(uuid,uuid,bigint),public.orders_cancel_assignment(uuid),public.orders_create_client(uuid,bigint,text),public.orders_update_client(uuid,bigint,text),public.trips_admin_add_order(uuid,uuid,bigint,text),public.trips_admin_cancel_truck_change(uuid),public.trips_admin_get_active(),public.trips_admin_get_available_orders(uuid),public.trips_admin_get_pending_truck_change(uuid),public.trips_admin_get_pending_truck_changes(),public.trips_admin_get_truck_change_options(uuid),public.trips_admin_move_future_stop(uuid,text),public.trips_admin_remove_future_stop(uuid),public.trips_admin_request_truck_change(uuid,uuid,text),public.trips_admin_update_stop_load(uuid,bigint),public.trips_driver_confirm_truck_change(uuid,bigint,bigint),public.trips_finish_driver(bigint),public.trips_get_driver_interactions(),public.trips_get_driver_state(),public.trips_get_driver_truck_change(),public.trips_mark_stop_loaded(uuid),public.trips_report_discrepancy(uuid,bigint,text),public.trips_send_eta_before_start(uuid),public.trips_send_eta_current(uuid),public.trips_start_driver(bigint) to authenticated,service_role;
grant execute on function public.trips_accept_driver_handoff(uuid),public.trips_cancel_driver_handoff(uuid),public.trips_get_driver_handoff_state(),public.trips_list_driver_handoff_candidates(),public.trips_reject_driver_handoff(uuid),public.trips_request_driver_handoff(uuid,bigint) to anon,authenticated,service_role;
grant execute on function public.trips_admin_request_truck_change_unchecked(uuid,uuid,text),public.trips_driver_confirm_truck_change_unchecked(uuid,bigint,bigint),public.trips_finish_driver_unchecked(bigint),public.trips_mark_stop_loaded_unchecked(uuid),public.trips_report_discrepancy_unchecked(uuid,bigint,text),public.trips_send_eta_current_unchecked(uuid) to service_role;

-- Four legacy helper functions intentionally retain PostgreSQL default PUBLIC EXECUTE.
grant execute on function cm_private.guard_driver_handoff_against_pending_truck_change() to public;
grant execute on function cm_private.guard_loading_ramp_assignment() to public;
grant execute on function cm_private.restore_temporary_fleet_before_trip_completion() to public;
grant execute on function cm_private.set_updated_at() to public;
