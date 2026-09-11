create function public.persist_completed_analysis(
  p_analysis_id uuid,
  p_bytes integer,
  p_checksum text,
  p_display_name text,
  p_idempotency_key uuid,
  p_job_description text,
  p_job_id uuid,
  p_job_title text,
  p_model_id text,
  p_organization_id uuid,
  p_result jsonb,
  p_resume_id uuid,
  p_storage_key text,
  p_user_id uuid,
  p_version_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_analysis public.analyses%rowtype;
begin
  if not exists (
    select 1 from public.memberships
    where organization_id = p_organization_id
      and user_id = p_user_id
      and role in ('owner', 'admin', 'member')
  ) then
    raise exception 'organization access denied' using errcode = '42501';
  end if;

  select * into existing_analysis
  from public.analyses
  where idempotency_key = p_idempotency_key;
  if found then
    if existing_analysis.owner_id <> p_user_id then
      raise exception 'idempotency ownership mismatch' using errcode = '42501';
    end if;
    return jsonb_build_object(
      'analysisId', existing_analysis.id,
      'resumeId', (
        select resume_id from public.resume_versions
        where id = existing_analysis.resume_version_id
      ),
      'created', false
    );
  end if;

  insert into public.jobs (id, organization_id, owner_id, title, description)
  values (p_job_id, p_organization_id, p_user_id, p_job_title, p_job_description);
  insert into public.resumes (id, organization_id, owner_id, display_name)
  values (p_resume_id, p_organization_id, p_user_id, p_display_name);
  insert into public.resume_versions (
    id, resume_id, organization_id, owner_id, storage_key, checksum, bytes,
    media_type, page_count
  ) values (
    p_version_id, p_resume_id, p_organization_id, p_user_id, p_storage_key,
    p_checksum, p_bytes, 'application/pdf', (p_result #>> '{parseView,totalPages}')::integer
  );
  insert into public.analyses (
    id, resume_version_id, job_id, organization_id, owner_id, status,
    idempotency_key, completed_at
  ) values (
    p_analysis_id, p_version_id, p_job_id, p_organization_id, p_user_id,
    'completed', p_idempotency_key, timezone('utc', now())
  );
  insert into public.writer_drafts (
    analysis_id, organization_id, owner_id, kind, draft
  ) values (
    p_analysis_id, p_organization_id, p_user_id, 'summary', p_result->'writer'
  );
  insert into public.analysis_results (
    analysis_id, organization_id, owner_id, feedback, parse_view, rule_trace,
    keyword_coverage, parser_version, ruleset_version, normalizer_version,
    prompt_version, schema_version, model_id
  ) values (
    p_analysis_id, p_organization_id, p_user_id, p_result->'feedback',
    p_result->'parseView', p_result->'ruleTrace',
    jsonb_build_object(
      'job', p_result->'jdKeywords',
      'matched', p_result->'matchedKeywords',
      'missing', p_result->'missingKeywords'
    ),
    'parse-sim-v1', 'ats-rules-v1', 'normalizer-v1', 'qualitative-v1',
    'analysis-result-v1', p_model_id
  );

  return jsonb_build_object(
    'analysisId', p_analysis_id,
    'resumeId', p_resume_id,
    'created', true
  );
end;
$$;

revoke all on function public.persist_completed_analysis(
  uuid, integer, text, text, uuid, text, uuid, text, text, uuid, jsonb, uuid,
  text, uuid, uuid
) from public, anon, authenticated;
grant execute on function public.persist_completed_analysis(
  uuid, integer, text, text, uuid, text, uuid, text, text, uuid, jsonb, uuid,
  text, uuid, uuid
) to service_role;