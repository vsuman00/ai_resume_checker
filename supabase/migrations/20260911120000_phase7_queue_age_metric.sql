-- Phase 7: expose the scheduled queue time to the worker for queue-age metrics.
-- The value is operational metadata only; it contains no tenant or resume data.

create or replace function public.claim_analysis_job(
  p_worker_id text,
  p_lease_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed_id uuid;
  claimed_attempt integer;
  claimed_run_after timestamptz;
  expired_job record;
begin
  if p_worker_id is null or btrim(p_worker_id) = ''
     or p_lease_seconds < 1 or p_lease_seconds > 3600 then
    raise exception 'invalid lease parameters' using errcode = '22023';
  end if;

  for expired_job in
    select j.analysis_id, a.status, a.request_id
    from public.analysis_jobs j
    join public.analyses a on a.id = j.analysis_id
    where j.dead_lettered_at is null
      and j.attempt_count >= 3
      and j.lease_expires_at <= timezone('utc', now())
      and a.status in ('quarantined', 'queued', 'extracting', 'needs_ocr', 'scoring', 'qualitative_review')
    for update of j, a
  loop
    update public.analysis_jobs
    set lease_owner = null,
        lease_expires_at = null,
        last_error_code = 'LEASE_EXPIRED',
        dead_lettered_at = timezone('utc', now())
    where analysis_id = expired_job.analysis_id;
    perform public.transition_analysis(
      expired_job.analysis_id, expired_job.status, 'failed', null, p_worker_id,
      coalesce(expired_job.request_id, 'worker-dead-letter')
    );
  end loop;

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
      attempt_count = attempt_count + 1,
      last_error_code = case
        when lease_expires_at is not null and lease_expires_at <= timezone('utc', now())
          then 'LEASE_EXPIRED'
        else last_error_code
      end
  where analysis_id = claimed_id
  returning attempt_count, run_after into claimed_attempt, claimed_run_after;

  return jsonb_build_object(
    'analysisId', claimed_id,
    'attempt', claimed_attempt,
    'runAfter', claimed_run_after
  );
end;
$$;

revoke all on function public.claim_analysis_job(text, integer)
from public, anon, authenticated;
grant execute on function public.claim_analysis_job(text, integer)
to service_role;
