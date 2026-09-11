-- Keep the external-storage deletion plan durable across worker retries.
-- This data is service-only because storage keys must not be exposed to clients.

create table private.privacy_deletion_plans (
  request_id uuid primary key references public.data_requests (id) on delete cascade,
  storage_objects jsonb not null check (jsonb_typeof(storage_objects) = 'array'),
  created_at timestamptz not null default timezone('utc', now())
);

revoke all on private.privacy_deletion_plans from public, anon, authenticated;
alter table private.analysis_rate_limit_buckets enable row level security;
alter table private.retention_items enable row level security;
alter table private.privacy_deletion_plans enable row level security;

create or replace function public.claim_expired_resume_objects(
  p_before timestamptz,
  p_limit integer
)
returns table(item_id uuid, resume_id uuid, storage_key text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_limit < 1 or p_limit > 1000 then
    raise exception 'invalid retention batch size' using errcode = '22023';
  end if;

  return query
  with candidates as (
    select rv.resume_id, rv.owner_id, rv.storage_key
    from public.resume_versions rv
    join public.resumes r on r.id = rv.resume_id
    where (
      (r.status = 'active' and r.created_at < p_before)
      or (r.status = 'deleted' and exists (
        select 1 from private.retention_items failed_item
        where failed_item.resume_id = r.id and failed_item.status = 'failed'
      ))
    )
      and not exists (
        select 1 from private.retention_items ri
        where ri.storage_key = rv.storage_key and ri.status = 'deleted'
      )
    order by r.created_at asc
    limit p_limit
    for update of rv, r skip locked
  ), inserted as (
    insert into private.retention_items as retention_item (
      resume_id, owner_id, storage_key, status, attempt_count
    )
    select
      candidate.resume_id,
      candidate.owner_id,
      candidate.storage_key,
      'queued',
      1
    from candidates candidate
    on conflict on constraint retention_items_storage_key_key do update
      set status = 'queued',
          attempt_count = retention_item.attempt_count + 1,
          last_error_code = null
    returning retention_item.id, retention_item.resume_id, retention_item.storage_key
  )
  update public.resumes r
  set status = 'deleted', updated_at = timezone('utc', now())
  from inserted
  where r.id = inserted.resume_id
  returning inserted.id, inserted.resume_id, inserted.storage_key;
end;
$$;

create or replace function public.prepare_deletion_request(
  p_request_id uuid,
  p_worker_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_row public.data_requests%rowtype;
  storage_objects jsonb;
begin
  select * into request_row
  from public.data_requests
  where id = p_request_id
    and kind = 'deletion'
    and status = 'processing'
    and lease_owner = p_worker_id
  for update;
  if not found then
    raise exception 'privacy deletion request is not owned' using errcode = '42501';
  end if;

  select plan.storage_objects into storage_objects
  from private.privacy_deletion_plans plan
  where plan.request_id = request_row.id;

  if not found then
    select coalesce(jsonb_agg(jsonb_build_object(
      'storageKey', storage_key,
      'checksum', checksum,
      'bytes', bytes
    )), '[]'::jsonb)
    into storage_objects
    from public.resume_versions
    where owner_id = request_row.user_id;

    insert into private.privacy_deletion_plans (request_id, storage_objects)
    values (request_row.id, storage_objects);
  end if;

  -- Candidate rows and the durable object plan commit atomically. A retry can
  -- therefore continue deleting the same objects after database rows are gone.
  delete from public.analyses where owner_id = request_row.user_id;
  delete from public.jobs where owner_id = request_row.user_id;
  delete from public.resumes where owner_id = request_row.user_id;
  delete from public.consents where user_id = request_row.user_id;
  delete from public.memberships where user_id = request_row.user_id;
  delete from public.profiles where id = request_row.user_id;

  update public.privacy_request_steps
  set status = 'completed', completed_at = timezone('utc', now())
  where request_id = request_row.id and step_key = 'database';

  return jsonb_build_object(
    'storageObjects', storage_objects,
    'databaseDeletedAt', timezone('utc', now())
  );
end;
$$;

create or replace function public.complete_privacy_request(
  p_request_id uuid,
  p_worker_id text,
  p_manifest jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.data_requests
  set status = 'completed',
      completed_at = timezone('utc', now()),
      result_manifest = p_manifest,
      lease_owner = null,
      lease_expires_at = null,
      last_error_code = null
  where id = p_request_id
    and status = 'processing'
    and lease_owner = p_worker_id;

  if not found then return false; end if;

  update public.privacy_request_steps
  set status = 'completed', completed_at = timezone('utc', now())
  where request_id = p_request_id;

  delete from private.privacy_deletion_plans
  where request_id = p_request_id;
  return true;
end;
$$;

revoke all on function public.prepare_deletion_request(uuid, text)
from public, anon, authenticated;
revoke all on function public.complete_privacy_request(uuid, text, jsonb)
from public, anon, authenticated;

grant execute on function public.prepare_deletion_request(uuid, text)
to service_role;
grant execute on function public.complete_privacy_request(uuid, text, jsonb)
to service_role;
