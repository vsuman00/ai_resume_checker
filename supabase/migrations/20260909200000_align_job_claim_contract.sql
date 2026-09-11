drop function public.claim_analysis_job(text, integer);

create function public.claim_analysis_job(
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
  where analysis_id = claimed_id
  returning attempt_count into claimed_attempt;

  return jsonb_build_object(
    'analysisId', claimed_id,
    'attempt', claimed_attempt
  );
end;
$$;

revoke all on function public.claim_analysis_job(text, integer)
from public, anon, authenticated;
grant execute on function public.claim_analysis_job(text, integer)
to service_role;
