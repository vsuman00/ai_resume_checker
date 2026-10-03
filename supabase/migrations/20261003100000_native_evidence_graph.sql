-- Additive AA010 storage: legacy extractions remain readable. Deploy this
-- migration before the worker. Reverting the worker leaves this column unused.
-- Existing extraction RLS, owner-filtered exports, and deletion cascades apply.
alter table public.analysis_extractions
  add column evidence_graph jsonb
  check (evidence_graph is null or jsonb_typeof(evidence_graph) = 'object');

-- Keep the previous RPC signature available for older worker deployments.
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
  p_warnings jsonb,
  p_evidence_graph jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  page jsonb;
  span jsonb;
  assertion jsonb;
  source_span jsonb;
  source_page jsonb;
  reconstructed text;
  persisted boolean;
begin
  if p_evidence_graph is not null then
    if p_extractor_version <> 'unpdf-v1'
       or p_evidence_graph ->> 'schemaVersion' is distinct from 'native-evidence-v1'
       or p_evidence_graph ->> 'extractorVersion' is distinct from p_extractor_version
       or p_evidence_graph ->> 'offsetUnit' is distinct from 'unicode_code_point'
       or jsonb_typeof(p_evidence_graph -> 'pages') is distinct from 'array'
       or jsonb_typeof(p_evidence_graph -> 'spans') is distinct from 'array'
       or jsonb_typeof(p_evidence_graph -> 'assertions') is distinct from 'array' then
      raise exception 'Invalid native evidence contract';
    end if;
    if jsonb_array_length(p_evidence_graph -> 'pages') <> p_page_count
       or jsonb_array_length(p_page_texts) <> p_page_count then
      raise exception 'Invalid native evidence page count';
    end if;
    for page in select value from jsonb_array_elements(p_evidence_graph -> 'pages') loop
      if jsonb_typeof(page -> 'text') is distinct from 'string'
         or page ->> 'pageNumber' is null
         or page ->> 'method' is distinct from 'native_text'
         or page ->> 'confidence' is distinct from 'uncalibrated'
         or page ->> 'id' is distinct from ('page-' || (page ->> 'pageNumber'))
         or (page ->> 'pageNumber')::integer not between 1 and p_page_count
         or page ->> 'text' is distinct from p_page_texts ->> ((page ->> 'pageNumber')::integer - 1) then
        raise exception 'Invalid native evidence page';
      end if;
    end loop;
    if (select count(distinct value ->> 'id') from jsonb_array_elements(p_evidence_graph -> 'pages')) <> p_page_count then
      raise exception 'Duplicate native evidence page';
    end if;
    select string_agg(value ->> 'text', E'\n\n' order by (value ->> 'pageNumber')::integer)
      into reconstructed from jsonb_array_elements(p_evidence_graph -> 'pages');
    if reconstructed is distinct from p_extracted_text then
      raise exception 'Native evidence text mismatch';
    end if;
    if (select count(distinct value ->> 'id') from jsonb_array_elements(p_evidence_graph -> 'spans'))
       <> jsonb_array_length(p_evidence_graph -> 'spans') then
      raise exception 'Duplicate native evidence span';
    end if;
    for span in select value from jsonb_array_elements(p_evidence_graph -> 'spans') loop
      select value into source_page from jsonb_array_elements(p_evidence_graph -> 'pages')
        where value ->> 'id' = span ->> 'pageId';
      if source_page is null or span ->> 'id' is null
         or jsonb_typeof(span -> 'text') is distinct from 'string'
         or span ->> 'start' is null or span ->> 'end' is null
         or (span ->> 'start')::integer < 0
         or (span ->> 'end')::integer < (span ->> 'start')::integer
         or (span ->> 'end')::integer > char_length(source_page ->> 'text')
         or span ->> 'text' is distinct from substring(source_page ->> 'text'
           from (span ->> 'start')::integer + 1
           for (span ->> 'end')::integer - (span ->> 'start')::integer) then
        raise exception 'Native evidence span mismatch';
      end if;
    end loop;
    for page in select value from jsonb_array_elements(p_evidence_graph -> 'pages') loop
      select string_agg(value ->> 'text', E'\n' order by (value ->> 'start')::integer)
        into reconstructed from jsonb_array_elements(p_evidence_graph -> 'spans')
        where value ->> 'pageId' = page ->> 'id';
      if reconstructed is distinct from page ->> 'text' then
        raise exception 'Native spans do not cover their page';
      end if;
    end loop;
    if jsonb_array_length(p_evidence_graph -> 'assertions') <> 3
       or (select count(distinct value ->> 'field') from jsonb_array_elements(p_evidence_graph -> 'assertions')
           where value ->> 'field' in ('name', 'email', 'phone')) <> 3 then
      raise exception 'Invalid native evidence assertion fields';
    end if;
    for assertion in select value from jsonb_array_elements(p_evidence_graph -> 'assertions') loop
      if assertion ->> 'confidence' is distinct from 'uncalibrated' then
        raise exception 'Native confidence is not calibrated';
      end if;
      if assertion ->> 'state' = 'not_evaluated' then
        if assertion ->> 'value' is not null or assertion ->> 'evidence' is not null then
          raise exception 'Unevaluated assertion has a value';
        end if;
      elsif assertion ->> 'state' = 'review_required' then
        select value into source_span from jsonb_array_elements(p_evidence_graph -> 'spans')
          where value ->> 'id' = assertion -> 'evidence' ->> 'spanId';
        if source_span is null or assertion ->> 'value' is null
           or assertion -> 'evidence' ->> 'start' is null
           or assertion -> 'evidence' ->> 'end' is null
           or (assertion -> 'evidence' ->> 'start')::integer < 0
           or (assertion -> 'evidence' ->> 'end')::integer <= (assertion -> 'evidence' ->> 'start')::integer
           or (assertion -> 'evidence' ->> 'end')::integer > char_length(source_span ->> 'text')
           or assertion ->> 'value' is distinct from substring(source_span ->> 'text'
             from (assertion -> 'evidence' ->> 'start')::integer + 1
             for (assertion -> 'evidence' ->> 'end')::integer - (assertion -> 'evidence' ->> 'start')::integer) then
          raise exception 'Native assertion is not grounded';
        end if;
      else
        raise exception 'Invalid native assertion state';
      end if;
    end loop;
  end if;

  persisted := public.persist_analysis_extraction(
    p_analysis_id, p_duration_ms, p_extracted_text, p_extractor_version,
    p_page_count, p_page_texts, p_process_id, p_request_id, p_text_checksum, p_warnings
  );
  if persisted then
    update public.analysis_extractions set evidence_graph = p_evidence_graph
    where analysis_id = p_analysis_id;
  end if;
  return persisted;
end;
$$;

revoke all on function public.persist_analysis_extraction(
  uuid, integer, text, text, integer, jsonb, text, text, text, jsonb, jsonb
) from public, anon, authenticated;
grant execute on function public.persist_analysis_extraction(
  uuid, integer, text, text, integer, jsonb, text, text, text, jsonb, jsonb
) to service_role;
