create table public.analysis_extractions (
  analysis_id uuid primary key references public.analyses (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  page_count integer not null check (page_count between 1 and 20),
  extracted_text text not null check (char_length(extracted_text) between 1 and 200000),
  text_checksum text not null check (char_length(text_checksum) = 64),
  warnings jsonb not null default '[]'::jsonb check (jsonb_typeof(warnings) = 'array'),
  duration_ms integer not null check (duration_ms >= 0),
  extractor_version text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index analysis_extractions_organization_id_idx
on public.analysis_extractions (organization_id);
create index analysis_extractions_owner_id_idx
on public.analysis_extractions (owner_id);

alter table public.analysis_extractions enable row level security;
revoke all on public.analysis_extractions from public, anon, authenticated;
create policy "clients cannot access raw analysis extractions"
on public.analysis_extractions for all to anon, authenticated
using (false)
with check (false);

create function public.create_queued_analysis(
  p_analysis_id uuid,
  p_bytes integer,
  p_checksum text,
  p_display_name text,
  p_idempotency_key uuid,
  p_job_description text,
  p_job_id uuid,
  p_job_title text,
  p_organization_id uuid,
  p_request_id text,
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
    media_type
  ) values (
    p_version_id, p_resume_id, p_organization_id, p_user_id, p_storage_key,
    p_checksum, p_bytes, 'application/pdf'
  );
  insert into public.analyses (
    id, resume_version_id, job_id, organization_id, owner_id, status,
    idempotency_key, request_id
  ) values (
    p_analysis_id, p_version_id, p_job_id, p_organization_id, p_user_id,
    'quarantined', p_idempotency_key, p_request_id
  );
  insert into public.analysis_jobs (analysis_id)
  values (p_analysis_id);

  return jsonb_build_object(
    'analysisId', p_analysis_id,
    'resumeId', p_resume_id,
    'created', true
  );
end;
$$;

create function public.persist_analysis_extraction(
  p_analysis_id uuid,
  p_duration_ms integer,
  p_extracted_text text,
  p_extractor_version text,
  p_page_count integer,
  p_process_id text,
  p_request_id text,
  p_text_checksum text,
  p_warnings jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  analysis_row public.analyses%rowtype;
  transitioned boolean;
begin
  select * into analysis_row
  from public.analyses
  where id = p_analysis_id
  for update;

  if not found or analysis_row.status <> 'extracting' then
    return false;
  end if;

  insert into public.analysis_extractions (
    analysis_id, organization_id, owner_id, page_count, extracted_text,
    text_checksum, warnings, duration_ms, extractor_version
  ) values (
    p_analysis_id, analysis_row.organization_id, analysis_row.owner_id,
    p_page_count, p_extracted_text, p_text_checksum, p_warnings,
    p_duration_ms, p_extractor_version
  )
  on conflict (analysis_id) do nothing;

  update public.resume_versions
  set page_count = p_page_count
  where id = analysis_row.resume_version_id;

  transitioned := public.transition_analysis(
    p_analysis_id,
    'extracting',
    'scoring',
    null,
    p_process_id,
    p_request_id
  );
  return transitioned;
end;
$$;

create function public.complete_analysis_job(
  p_analysis_id uuid,
  p_worker_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_worker_id is null or btrim(p_worker_id) = '' then
    return false;
  end if;

  delete from public.analysis_jobs
  where analysis_id = p_analysis_id
    and lease_owner = p_worker_id
    and lease_expires_at > timezone('utc', now());
  return found;
end;
$$;

revoke all on function public.create_queued_analysis(
  uuid, integer, text, text, uuid, text, uuid, text, uuid, text, uuid, text,
  uuid, uuid
) from public, anon, authenticated;
revoke all on function public.persist_analysis_extraction(
  uuid, integer, text, text, integer, text, text, text, jsonb
) from public, anon, authenticated;
revoke all on function public.complete_analysis_job(uuid, text)
from public, anon, authenticated;

grant execute on function public.create_queued_analysis(
  uuid, integer, text, text, uuid, text, uuid, text, uuid, text, uuid, text,
  uuid, uuid
) to service_role;
grant execute on function public.persist_analysis_extraction(
  uuid, integer, text, text, integer, text, text, text, jsonb
) to service_role;
grant execute on function public.complete_analysis_job(uuid, text)
to service_role;
