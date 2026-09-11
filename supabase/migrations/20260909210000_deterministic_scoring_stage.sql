create table public.analysis_deterministic_results (
  analysis_id uuid primary key references public.analyses (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  score integer not null check (score between 0 and 100),
  parse_view jsonb not null,
  rule_trace jsonb not null check (jsonb_typeof(rule_trace) = 'array'),
  keyword_coverage jsonb not null,
  input_text_checksum text not null check (char_length(input_text_checksum) = 64),
  result_checksum text not null check (char_length(result_checksum) = 64),
  parser_version text not null,
  ruleset_version text not null,
  normalizer_version text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index analysis_deterministic_results_organization_id_idx
on public.analysis_deterministic_results (organization_id);
create index analysis_deterministic_results_owner_id_idx
on public.analysis_deterministic_results (owner_id);

alter table public.analysis_deterministic_results enable row level security;
revoke all on public.analysis_deterministic_results from public, anon, authenticated;
create policy "clients cannot access internal deterministic results"
on public.analysis_deterministic_results for all to anon, authenticated
using (false)
with check (false);

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
  p_score integer
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

  if not found or analysis_row.status <> 'scoring' then
    return false;
  end if;

  insert into public.analysis_deterministic_results (
    analysis_id, organization_id, owner_id, score, parse_view, rule_trace,
    keyword_coverage, input_text_checksum, result_checksum, parser_version,
    ruleset_version, normalizer_version
  ) values (
    p_analysis_id, analysis_row.organization_id, analysis_row.owner_id,
    p_score, p_parse_view, p_rule_trace, p_keyword_coverage,
    p_input_text_checksum, p_result_checksum, p_parser_version,
    p_ruleset_version, p_normalizer_version
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
  uuid, text, jsonb, text, jsonb, text, text, text, text, jsonb, text, integer
) from public, anon, authenticated;
grant execute on function public.persist_deterministic_analysis(
  uuid, text, jsonb, text, jsonb, text, text, text, text, jsonb, text, integer
) to service_role;
