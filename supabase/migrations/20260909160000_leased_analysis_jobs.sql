create table public.analysis_jobs (
  analysis_id uuid primary key references public.analyses (id) on delete cascade,
  run_after timestamptz not null default timezone('utc', now()),
  lease_owner text,
  lease_expires_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count >= 0 and attempt_count <= 3),
  last_error_code text,
  dead_lettered_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index analysis_jobs_claim_idx
on public.analysis_jobs (run_after asc)
where dead_lettered_at is null;

alter table public.analysis_jobs enable row level security;
revoke all on public.analysis_jobs from public, anon, authenticated;
create policy "clients cannot access analysis jobs"
on public.analysis_jobs for all to anon, authenticated
using (false)
with check (false);

create trigger analysis_jobs_set_updated_at before update on public.analysis_jobs
for each row execute function private.set_updated_at();

create function public.enqueue_analysis_job(p_analysis_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  with inserted as (
    insert into public.analysis_jobs (analysis_id)
    values (p_analysis_id)
    on conflict (analysis_id) do nothing
    returning analysis_id
  )
  select exists (select 1 from inserted);
$$;

create function public.claim_analysis_job(p_worker_id text, p_lease_seconds integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed_id uuid;
begin
  if p_worker_id is null or btrim(p_worker_id) = ''
     or p_lease_seconds < 1 or p_lease_seconds > 3600 then
    raise exception 'invalid lease parameters' using errcode = '22023';
  end if;

  update public.analysis_jobs
  set lease_owner = null,
      lease_expires_at = null,
      last_error_code = 'LEASE_EXPIRED',
      dead_lettered_at = timezone('utc', now())
  where dead_lettered_at is null
    and attempt_count >= 3
    and lease_expires_at <= timezone('utc', now());

  select analysis_id into claimed_id
  from public.analysis_jobs
  where run_after <= timezone('utc', now())
    and dead_lettered_at is null
    and attempt_count < 3
    and (lease_expires_at is null or lease_expires_at <= timezone('utc', now()))
  order by run_after asc
  for update skip locked
  limit 1;
  if claimed_id is null then return null; end if;

  update public.analysis_jobs
  set lease_owner = p_worker_id,
      lease_expires_at = timezone('utc', now()) + make_interval(secs => p_lease_seconds),
      attempt_count = attempt_count + 1
  where analysis_id = claimed_id;
  return (
    select jsonb_build_object('analysisId', analysis_id, 'attempt', attempt_count)
    from public.analysis_jobs where analysis_id = claimed_id
  );
end;
$$;

create function public.heartbeat_analysis_job(p_analysis_id uuid, p_worker_id text, p_lease_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_worker_id is null or btrim(p_worker_id) = ''
     or p_lease_seconds < 1 or p_lease_seconds > 3600 then
    return false;
  end if;

  update public.analysis_jobs
  set lease_expires_at = timezone('utc', now()) + make_interval(secs => p_lease_seconds)
  where analysis_id = p_analysis_id
    and lease_owner = p_worker_id
    and lease_expires_at > timezone('utc', now());
  return found;
end;
$$;

create function public.release_analysis_job(
  p_analysis_id uuid,
  p_worker_id text,
  p_retry_delay_seconds integer,
  p_error_code text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_worker_id is null or btrim(p_worker_id) = ''
     or p_retry_delay_seconds < 0 or p_retry_delay_seconds > 3600
     or p_error_code is null or btrim(p_error_code) = '' then
    return false;
  end if;

  update public.analysis_jobs
  set lease_owner = null,
      lease_expires_at = null,
      last_error_code = p_error_code,
      run_after = timezone('utc', now()) + make_interval(secs => p_retry_delay_seconds),
      dead_lettered_at = case when attempt_count >= 3 then timezone('utc', now()) else null end
  where analysis_id = p_analysis_id
    and lease_owner = p_worker_id;
  return found;
end;
$$;

revoke all on function public.enqueue_analysis_job(uuid) from public, anon, authenticated;
revoke all on function public.claim_analysis_job(text, integer) from public, anon, authenticated;
revoke all on function public.heartbeat_analysis_job(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.release_analysis_job(uuid, text, integer, text) from public, anon, authenticated;
grant execute on function public.enqueue_analysis_job(uuid) to service_role;
grant execute on function public.claim_analysis_job(text, integer) to service_role;
grant execute on function public.heartbeat_analysis_job(uuid, text, integer) to service_role;
grant execute on function public.release_analysis_job(uuid, text, integer, text) to service_role;