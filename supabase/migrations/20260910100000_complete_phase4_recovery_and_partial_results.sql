-- Phase 4 provisional operating policy: each lease lasts at most 120 seconds,
-- a job receives at most three attempts, and retries use 10/20/40-second
-- delays. Dead-lettered jobs remain durable for manual owner review.
-- Gate A0 still requires human approval of these defaults before release.

create unique index analysis_ai_runs_analysis_input_key
on public.analysis_ai_runs (analysis_id, input_hash);

create or replace function public.transition_analysis(
  p_analysis_id uuid,
  p_expected_status text,
  p_next_status text,
  p_actor_id uuid,
  p_process_id text,
  p_request_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  transition_allowed boolean;
begin
  transition_allowed := (p_expected_status, p_next_status) in (
    ('created', 'uploading'), ('created', 'cancelled'),
    ('uploading', 'quarantined'), ('uploading', 'cancelled'),
    ('quarantined', 'queued'), ('quarantined', 'rejected'), ('quarantined', 'failed'),
    ('queued', 'extracting'), ('queued', 'cancelled'), ('queued', 'failed'),
    ('extracting', 'scoring'), ('extracting', 'needs_ocr'), ('extracting', 'failed'),
    ('needs_ocr', 'scoring'), ('needs_ocr', 'failed'),
    ('scoring', 'qualitative_review'), ('scoring', 'failed'),
    ('qualitative_review', 'completed'), ('qualitative_review', 'partial'), ('qualitative_review', 'failed')
  );
  if not transition_allowed then
    raise exception 'invalid analysis transition' using errcode = '22023';
  end if;

  update public.analyses
  set status = p_next_status,
      current_attempt = current_attempt + case when p_next_status = 'extracting' then 1 else 0 end,
      request_id = p_request_id,
      stage_updated_at = timezone('utc', now()),
      completed_at = case when p_next_status in ('completed', 'partial', 'failed', 'cancelled', 'rejected') then timezone('utc', now()) else completed_at end
  where id = p_analysis_id and status = p_expected_status;
  if not found then return false; end if;

  insert into public.analysis_transitions (
    analysis_id, from_status, to_status, actor_id, process_id, request_id
  ) values (
    p_analysis_id, p_expected_status, p_next_status, p_actor_id, p_process_id, p_request_id
  );
  return true;
end;
$$;

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
  returning attempt_count into claimed_attempt;

  return jsonb_build_object('analysisId', claimed_id, 'attempt', claimed_attempt);
end;
$$;

create or replace function public.release_analysis_job(
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
declare
  job_row public.analysis_jobs%rowtype;
  analysis_row public.analyses%rowtype;
begin
  if p_worker_id is null or btrim(p_worker_id) = ''
     or p_retry_delay_seconds < 0 or p_retry_delay_seconds > 3600
     or p_error_code is null or btrim(p_error_code) = '' then
    return false;
  end if;

  select * into job_row
  from public.analysis_jobs
  where analysis_id = p_analysis_id and lease_owner = p_worker_id
  for update;
  if not found then return false; end if;

  if job_row.attempt_count < 3 then
    update public.analysis_jobs
    set lease_owner = null,
        lease_expires_at = null,
        last_error_code = p_error_code,
        run_after = timezone('utc', now()) + make_interval(secs => p_retry_delay_seconds)
    where analysis_id = p_analysis_id;
    return true;
  end if;

  update public.analysis_jobs
  set lease_owner = null,
      lease_expires_at = null,
      last_error_code = p_error_code,
      dead_lettered_at = timezone('utc', now())
  where analysis_id = p_analysis_id;

  select * into analysis_row
  from public.analyses
  where id = p_analysis_id
  for update;
  if found and analysis_row.status in ('extracting', 'needs_ocr', 'scoring', 'qualitative_review') then
    update public.analyses
    set status = 'failed',
        stage_updated_at = timezone('utc', now()),
        completed_at = timezone('utc', now())
    where id = p_analysis_id and status = analysis_row.status;
    if found then
      insert into public.analysis_transitions (
        analysis_id, from_status, to_status, actor_id, process_id, request_id
      ) values (
        p_analysis_id, analysis_row.status, 'failed', null, p_worker_id,
        coalesce(analysis_row.request_id, 'worker-dead-letter')
      );
    end if;
  end if;
  return true;
end;
$$;

create function public.persist_partial_analysis(
  p_analysis_id uuid,
  p_feedback jsonb,
  p_process_id text,
  p_request_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  analysis_row public.analyses%rowtype;
  deterministic_row public.analysis_deterministic_results%rowtype;
  transitioned boolean;
begin
  select * into analysis_row from public.analyses
  where id = p_analysis_id for update;
  if not found or analysis_row.status <> 'qualitative_review' then return false; end if;

  select * into deterministic_row from public.analysis_deterministic_results
  where analysis_id = p_analysis_id;
  if not found then
    raise exception 'deterministic result missing' using errcode = '23503';
  end if;

  insert into public.analysis_results (
    analysis_id, organization_id, owner_id, feedback, parse_view, rule_trace,
    keyword_coverage, parser_version, ruleset_version, normalizer_version,
    prompt_version, schema_version, model_id
  ) values (
    p_analysis_id, analysis_row.organization_id, analysis_row.owner_id,
    p_feedback, deterministic_row.parse_view, deterministic_row.rule_trace,
    deterministic_row.keyword_coverage, deterministic_row.parser_version,
    deterministic_row.ruleset_version, deterministic_row.normalizer_version,
    'qualitative-unavailable-v1', 'analysis-result-v1', 'unavailable'
  ) on conflict (analysis_id) do nothing;

  insert into public.writer_drafts (
    analysis_id, organization_id, owner_id, kind, draft
  ) values (
    p_analysis_id, analysis_row.organization_id, analysis_row.owner_id,
    'summary', jsonb_build_object('summary', null, 'bullets', '[]'::jsonb)
  ) on conflict (analysis_id, kind) do nothing;

  transitioned := public.transition_analysis(
    p_analysis_id, 'qualitative_review', 'partial', null, p_process_id, p_request_id
  );
  return transitioned;
end;
$$;

create function public.cancel_analysis(
  p_analysis_id uuid,
  p_user_id uuid,
  p_request_id text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  analysis_row public.analyses%rowtype;
begin
  select * into analysis_row from public.analyses
  where id = p_analysis_id and owner_id = p_user_id for update;
  if not found then return 'not_found'; end if;
  if analysis_row.status = 'cancelled' then return 'already_cancelled'; end if;
  if analysis_row.status not in ('quarantined', 'queued') then return 'already_started'; end if;

  update public.analyses
  set status = 'cancelled', request_id = p_request_id,
      stage_updated_at = timezone('utc', now()), completed_at = timezone('utc', now())
  where id = p_analysis_id and status = analysis_row.status;
  if not found then return 'already_started'; end if;

  delete from public.analysis_jobs where analysis_id = p_analysis_id;
  insert into public.analysis_transitions (
    analysis_id, from_status, to_status, actor_id, process_id, request_id
  ) values (
    p_analysis_id, analysis_row.status, 'cancelled', p_user_id, 'web', p_request_id
  );
  return 'cancelled';
end;
$$;

revoke all on function public.persist_partial_analysis(uuid, jsonb, text, text)
from public, anon, authenticated;
revoke all on function public.cancel_analysis(uuid, uuid, text)
from public, anon, authenticated;
grant execute on function public.persist_partial_analysis(uuid, jsonb, text, text)
to service_role;
grant execute on function public.cancel_analysis(uuid, uuid, text)
to service_role;
