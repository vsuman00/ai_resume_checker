create table public.analysis_ai_runs (
  id uuid primary key,
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  provider text not null,
  model_id text not null,
  prompt_version text not null,
  input_hash text not null check (char_length(input_hash) = 64),
  input_tokens integer not null check (input_tokens >= 0),
  output_tokens integer not null check (output_tokens >= 0),
  output jsonb not null,
  completed_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index analysis_ai_runs_analysis_id_idx
on public.analysis_ai_runs (analysis_id, created_at desc);
create index analysis_ai_runs_organization_created_idx
on public.analysis_ai_runs (organization_id, created_at desc);
create index analysis_ai_runs_owner_id_idx
on public.analysis_ai_runs (owner_id);

alter table public.analysis_ai_runs enable row level security;
revoke all on public.analysis_ai_runs from public, anon, authenticated;
create policy "clients cannot access internal AI runs"
on public.analysis_ai_runs for all to anon, authenticated
using (false)
with check (false);

create function public.get_organization_ai_tokens_used(
  p_organization_id uuid,
  p_since timestamptz
)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(input_tokens + output_tokens), 0)::bigint
  from public.analysis_ai_runs
  where organization_id = p_organization_id
    and created_at >= p_since;
$$;

revoke all on function public.get_organization_ai_tokens_used(uuid, timestamptz)
from public, anon, authenticated;
grant execute on function public.get_organization_ai_tokens_used(uuid, timestamptz)
to service_role;

create function public.persist_qualitative_analysis(
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
    prompt_version, schema_version, model_id
  ) values (
    p_analysis_id, analysis_row.organization_id, analysis_row.owner_id,
    p_feedback, deterministic_row.parse_view, deterministic_row.rule_trace,
    deterministic_row.keyword_coverage, deterministic_row.parser_version,
    deterministic_row.ruleset_version, deterministic_row.normalizer_version,
    p_prompt_version, 'analysis-result-v1', p_model_id
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

revoke all on function public.persist_qualitative_analysis(
  uuid, jsonb, text, integer, text, jsonb, integer, text, text, text, text,
  uuid, jsonb
) from public, anon, authenticated;
grant execute on function public.persist_qualitative_analysis(
  uuid, jsonb, text, integer, text, jsonb, integer, text, text, text, text,
  uuid, jsonb
) to service_role;
