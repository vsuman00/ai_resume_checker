-- Phase 6: retain page-level extraction evidence for the multi-page Parse View.
alter table public.data_requests
  drop constraint if exists data_requests_status_check;
alter table public.data_requests
  add constraint data_requests_status_check
  check (status in ('queued', 'processing', 'completed', 'failed', 'cancelled'));

alter table public.analysis_extractions
  add column page_texts jsonb not null default '[]'::jsonb
  check (jsonb_typeof(page_texts) = 'array');

drop function if exists public.persist_analysis_extraction(
  uuid, integer, text, text, integer, text, text, text, jsonb
);

create function public.persist_analysis_extraction(
  p_analysis_id uuid,
  p_duration_ms integer,
  p_extracted_text text,
  p_extractor_version text,
  p_page_count integer,
  p_page_texts jsonb,
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
    page_texts, text_checksum, warnings, duration_ms, extractor_version
  ) values (
    p_analysis_id, analysis_row.organization_id, analysis_row.owner_id,
    p_page_count, p_extracted_text, coalesce(p_page_texts, '[]'::jsonb),
    p_text_checksum, p_warnings, p_duration_ms, p_extractor_version
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

revoke all on function public.persist_analysis_extraction(
  uuid, integer, text, text, integer, jsonb, text, text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.persist_analysis_extraction(
  uuid, integer, text, text, integer, jsonb, text, text, text, jsonb
) to service_role;
