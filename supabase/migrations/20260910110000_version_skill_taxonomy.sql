-- T052 forward migration: persist the skill-taxonomy version beside every
-- deterministic and assembled analysis result. Existing rows predate a
-- versioned taxonomy and are labeled honestly rather than attributed to v1.
--
-- Compatibility: application code and this migration must ship together because
-- persist_deterministic_analysis gains one required named argument.
-- Recovery: restore the prior RPC definition before dropping these columns; a
-- column rollback discards taxonomy provenance and is therefore data-lossy.

alter table public.analysis_deterministic_results
add column taxonomy_version text;

update public.analysis_deterministic_results
set taxonomy_version = coalesce(
  nullif(btrim(keyword_coverage->>'taxonomyVersion'), ''),
  'legacy-unversioned'
);

alter table public.analysis_deterministic_results
alter column taxonomy_version set not null;

alter table public.analysis_deterministic_results
add constraint analysis_deterministic_results_taxonomy_version_present
check (btrim(taxonomy_version) <> '');

alter table public.analysis_results
add column taxonomy_version text;

update public.analysis_results
set taxonomy_version = coalesce(
  nullif(btrim(keyword_coverage->>'taxonomyVersion'), ''),
  'legacy-unversioned'
);

alter table public.analysis_results
alter column taxonomy_version set not null;

alter table public.analysis_results
add constraint analysis_results_taxonomy_version_present
check (btrim(taxonomy_version) <> '');

drop function public.persist_deterministic_analysis(
  uuid, text, jsonb, text, jsonb, text, text, text, text, jsonb, text, integer
);

create function public.persist_deterministic_analysis(
  p_analysis_id uuid,
  p_input_text_checksum text,
  p_keyword_coverage jsonb,
  p_normalizer_version text,
  p_parse_view jsonb,
  p_parser_version text,
  p_process_id text,
  p_request_id text,
  p_result_checksum text,
  p_rule_trace jsonb,
  p_ruleset_version text,
  p_score integer,
  p_taxonomy_version text
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
  if p_taxonomy_version is null
     or btrim(p_taxonomy_version) = ''
     or p_keyword_coverage->>'taxonomyVersion' is distinct from p_taxonomy_version then
    raise exception 'invalid taxonomy version' using errcode = '22023';
  end if;

  select * into analysis_row
  from public.analyses
  where id = p_analysis_id
  for update;

  if not found or analysis_row.status <> 'scoring' then
    return false;
  end if;

  insert into public.analysis_deterministic_results (
    analysis_id, organization_id, owner_id, score, parse_view, rule_trace,
    keyword_coverage, input_text_checksum, result_checksum, parser_version,
    ruleset_version, normalizer_version, taxonomy_version
  ) values (
    p_analysis_id, analysis_row.organization_id, analysis_row.owner_id,
    p_score, p_parse_view, p_rule_trace, p_keyword_coverage,
    p_input_text_checksum, p_result_checksum, p_parser_version,
    p_ruleset_version, p_normalizer_version, p_taxonomy_version
  );

  transitioned := public.transition_analysis(
    p_analysis_id,
    'scoring',
    'qualitative_review',
    null,
    p_process_id,
    p_request_id
  );
  return transitioned;
end;
$$;

revoke all on function public.persist_deterministic_analysis(
  uuid, text, jsonb, text, jsonb, text, text, text, text, jsonb, text, integer, text
) from public, anon, authenticated;
grant execute on function public.persist_deterministic_analysis(
  uuid, text, jsonb, text, jsonb, text, text, text, text, jsonb, text, integer, text
) to service_role;

create or replace function public.persist_qualitative_analysis(
  p_analysis_id uuid,
  p_feedback jsonb,
  p_input_hash text,
  p_input_tokens integer,
  p_model_id text,
  p_output jsonb,
  p_output_tokens integer,
  p_process_id text,
  p_prompt_version text,
  p_provider text,
  p_request_id text,
  p_run_id uuid,
  p_writer jsonb
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
  select * into analysis_row
  from public.analyses
  where id = p_analysis_id
  for update;
  if not found or analysis_row.status <> 'qualitative_review' then
    return false;
  end if;

  select * into deterministic_row
  from public.analysis_deterministic_results
  where analysis_id = p_analysis_id;
  if not found then
    raise exception 'deterministic result missing' using errcode = '23503';
  end if;

  insert into public.analysis_ai_runs (
    id, analysis_id, organization_id, owner_id, provider, model_id,
    prompt_version, input_hash, input_tokens, output_tokens, output
  ) values (
    p_run_id, p_analysis_id, analysis_row.organization_id,
    analysis_row.owner_id, p_provider, p_model_id, p_prompt_version,
    p_input_hash, p_input_tokens, p_output_tokens, p_output
  );

  insert into public.analysis_results (
    analysis_id, organization_id, owner_id, feedback, parse_view, rule_trace,
    keyword_coverage, parser_version, ruleset_version, normalizer_version,
    taxonomy_version, prompt_version, schema_version, model_id
  ) values (
    p_analysis_id, analysis_row.organization_id, analysis_row.owner_id,
    p_feedback, deterministic_row.parse_view, deterministic_row.rule_trace,
    deterministic_row.keyword_coverage, deterministic_row.parser_version,
    deterministic_row.ruleset_version, deterministic_row.normalizer_version,
    deterministic_row.taxonomy_version, p_prompt_version, 'analysis-result-v1',
    p_model_id
  );

  insert into public.writer_drafts (
    analysis_id, organization_id, owner_id, kind, draft
  ) values (
    p_analysis_id, analysis_row.organization_id, analysis_row.owner_id,
    'summary', p_writer
  );

  transitioned := public.transition_analysis(
    p_analysis_id,
    'qualitative_review',
    'completed',
    null,
    p_process_id,
    p_request_id
  );
  return transitioned;
end;
$$;

create or replace function public.persist_partial_analysis(
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
    taxonomy_version, prompt_version, schema_version, model_id
  ) values (
    p_analysis_id, analysis_row.organization_id, analysis_row.owner_id,
    p_feedback, deterministic_row.parse_view, deterministic_row.rule_trace,
    deterministic_row.keyword_coverage, deterministic_row.parser_version,
    deterministic_row.ruleset_version, deterministic_row.normalizer_version,
    deterministic_row.taxonomy_version, 'qualitative-unavailable-v1',
    'analysis-result-v1', 'unavailable'
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
