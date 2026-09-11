-- Phase 7: recoverable privacy operations and retention cleanup.
-- Secrets, raw resume text, and storage objects stay outside operational logs.

alter table public.data_requests
  add column if not exists attempt_count integer not null default 0,
  add column if not exists next_attempt_at timestamptz not null default timezone('utc', now()),
  add column if not exists lease_owner text,
  add column if not exists lease_expires_at timestamptz,
  add column if not exists last_error_code text,
  add column if not exists result_manifest jsonb,
  add column if not exists completed_at timestamptz;

alter table public.data_requests
  drop constraint if exists data_requests_attempt_count_check;
alter table public.data_requests
  add constraint data_requests_attempt_count_check check (attempt_count >= 0);

create table public.privacy_request_steps (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.data_requests (id) on delete cascade,
  step_key text not null check (step_key in ('export_manifest', 'database', 'objects', 'backup_expiry')),
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error_code text,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (request_id, step_key)
);

create index privacy_request_steps_request_idx
on public.privacy_request_steps (request_id, step_key);

create trigger privacy_request_steps_set_updated_at
before update on public.privacy_request_steps
for each row execute function private.set_updated_at();

alter table public.privacy_request_steps enable row level security;
revoke all on public.privacy_request_steps from public, anon, authenticated;
create policy "clients cannot access privacy processing steps"
on public.privacy_request_steps for all to anon, authenticated
using (false)
with check (false);

create or replace function private.initialize_privacy_request_steps()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kind = 'export' then
    insert into public.privacy_request_steps (request_id, step_key)
    values (new.id, 'export_manifest');
  else
    insert into public.privacy_request_steps (request_id, step_key)
    values
      (new.id, 'database'),
      (new.id, 'objects'),
      (new.id, 'backup_expiry');
  end if;
  return new;
end;
$$;

revoke all on function private.initialize_privacy_request_steps() from public;
drop trigger if exists initialize_privacy_request_steps on public.data_requests;
create trigger initialize_privacy_request_steps
after insert on public.data_requests
for each row execute function private.initialize_privacy_request_steps();

create or replace function public.claim_privacy_request(
  p_worker_id text,
  p_lease_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_row public.data_requests%rowtype;
begin
  if p_worker_id is null or btrim(p_worker_id) = ''
     or p_lease_seconds < 30 or p_lease_seconds > 3600 then
    raise exception 'invalid privacy lease parameters' using errcode = '22023';
  end if;

  select * into request_row
  from public.data_requests
  where attempt_count < 3
    and next_attempt_at <= timezone('utc', now())
    and (
      status = 'queued'
      or (status = 'processing' and lease_expires_at <= timezone('utc', now()))
    )
  order by created_at asc
  for update skip locked
  limit 1;

  if not found then return null; end if;

  update public.data_requests
  set status = 'processing',
      attempt_count = attempt_count + 1,
      lease_owner = p_worker_id,
      lease_expires_at = timezone('utc', now()) + make_interval(secs => p_lease_seconds),
      last_error_code = null
  where id = request_row.id;

  return jsonb_build_object(
    'id', request_row.id,
    'kind', request_row.kind,
    'userId', request_row.user_id,
    'organizationId', request_row.organization_id,
    'attempt', request_row.attempt_count + 1
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
  return true;
end;
$$;

create or replace function public.fail_privacy_request(
  p_request_id uuid,
  p_worker_id text,
  p_error_code text,
  p_max_attempts integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_status text;
begin
  if p_error_code is null or btrim(p_error_code) = ''
     or p_max_attempts < 1 or p_max_attempts > 10 then
    return false;
  end if;
  next_status := case when (
    select attempt_count from public.data_requests
    where id = p_request_id and lease_owner = p_worker_id
  ) >= p_max_attempts then 'failed' else 'queued' end;

  update public.data_requests
  set status = next_status,
      next_attempt_at = case when next_status = 'queued'
        then timezone('utc', now()) + make_interval(secs => least(300, 10 * greatest(attempt_count, 1)))
        else next_attempt_at end,
      lease_owner = null,
      lease_expires_at = null,
      last_error_code = p_error_code
  where id = p_request_id
    and status = 'processing'
    and lease_owner = p_worker_id;
  if not found then return false; end if;

  update public.privacy_request_steps
  set status = case when next_status = 'failed' then 'failed' else 'queued' end,
      last_error_code = p_error_code,
      attempt_count = attempt_count + 1
  where request_id = p_request_id
    and status <> 'completed';
  return true;
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

  select coalesce(jsonb_agg(jsonb_build_object(
    'storageKey', storage_key,
    'checksum', checksum,
    'bytes', bytes
  )), '[]'::jsonb)
  into storage_objects
  from public.resume_versions
  where owner_id = request_row.user_id;

  -- Active candidate data is removed in one transaction. Storage objects are
  -- returned first and deleted by the worker, then the request is completed.
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

create table private.retention_items (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  storage_key text not null unique,
  status text not null default 'queued' check (status in ('queued', 'deleted', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error_code text,
  created_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz
);

revoke all on private.retention_items from public, anon, authenticated;

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
    insert into private.retention_items (resume_id, owner_id, storage_key, status, attempt_count)
    select resume_id, owner_id, storage_key, 'queued', 1 from candidates
    on conflict (storage_key) do update
      set status = 'queued', attempt_count = private.retention_items.attempt_count + 1,
          last_error_code = null
    returning id, resume_id, storage_key
  )
  update public.resumes r
  set status = 'deleted', updated_at = timezone('utc', now())
  from inserted
  where r.id = inserted.resume_id
  returning inserted.id, inserted.resume_id, inserted.storage_key;
end;
$$;

create or replace function public.complete_retention_item(p_item_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  item_row private.retention_items%rowtype;
begin
  update private.retention_items
  set status = 'deleted', completed_at = timezone('utc', now()), last_error_code = null
  where id = p_item_id
  returning * into item_row;
  if not found then return false; end if;

  delete from public.resumes r
  where r.id = item_row.resume_id
    and not exists (
      select 1 from private.retention_items ri
      where ri.resume_id = r.id and ri.status <> 'deleted'
    );
  return true;
end;
$$;

create or replace function public.fail_retention_item(p_item_id uuid, p_error_code text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_error_code is null or btrim(p_error_code) = '' then return false; end if;
  update private.retention_items
  set status = 'failed', last_error_code = p_error_code
  where id = p_item_id;
  return found;
end;
$$;

revoke all on function public.claim_privacy_request(text, integer) from public, anon, authenticated;
revoke all on function public.complete_privacy_request(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.fail_privacy_request(uuid, text, text, integer) from public, anon, authenticated;
revoke all on function public.prepare_deletion_request(uuid, text) from public, anon, authenticated;
revoke all on function public.claim_expired_resume_objects(timestamptz, integer) from public, anon, authenticated;
revoke all on function public.complete_retention_item(uuid) from public, anon, authenticated;
revoke all on function public.fail_retention_item(uuid, text) from public, anon, authenticated;

grant execute on function public.claim_privacy_request(text, integer) to service_role;
grant execute on function public.complete_privacy_request(uuid, text, jsonb) to service_role;
grant execute on function public.fail_privacy_request(uuid, text, text, integer) to service_role;
grant execute on function public.prepare_deletion_request(uuid, text) to service_role;
grant execute on function public.claim_expired_resume_objects(timestamptz, integer) to service_role;
grant execute on function public.complete_retention_item(uuid) to service_role;
grant execute on function public.fail_retention_item(uuid, text) to service_role;
