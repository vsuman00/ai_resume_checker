-- AA011 is additive. Old workers/RPCs and saved analyses remain supported.
-- Disable NATIVE_LAYOUT_ENABLED to roll back worker behavior, not stored data.
alter table public.analysis_extractions add column native_layout jsonb
  check (native_layout is null or jsonb_typeof(native_layout) = 'object');

create function public.persist_native_layout_extraction(
  p_analysis_id uuid, p_duration_ms integer, p_extracted_text text,
  p_extractor_version text, p_page_count integer, p_page_texts jsonb,
  p_process_id text, p_request_id text, p_text_checksum text, p_warnings jsonb,
  p_evidence_graph jsonb, p_native_layout jsonb
)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare
  page jsonb;
  block jsonb;
  box jsonb;
  warning jsonb;
  key text;
  page_index integer := 0;
  run_index integer;
  cursor_offset integer;
  start_offset integer;
  end_offset integer;
  source_text text;
  persisted boolean;
begin
  if p_native_layout is not null then
    if p_extractor_version is distinct from 'unpdf-v1' or p_evidence_graph is null
       or p_native_layout ->> 'schemaVersion' is distinct from 'native-layout-v1'
       or jsonb_typeof(p_native_layout -> 'pages') is distinct from 'array'
       or jsonb_typeof(p_page_texts) is distinct from 'array' then
      raise exception 'Invalid native layout contract';
    end if;
    if jsonb_array_length(p_native_layout -> 'pages') <> p_page_count
       or p_page_count not between 1 and 100 then
      raise exception 'Invalid native layout page count';
    end if;
    for page in select value from jsonb_array_elements(p_native_layout -> 'pages') loop
      page_index := page_index + 1;
      source_text := p_page_texts ->> (page_index - 1);
      if page ->> 'pageId' is distinct from ('page-' || page_index)
         or page -> 'pageNumber' is distinct from to_jsonb(page_index)
         or page ->> 'text' is distinct from source_text
         or page ->> 'coordinateSystem' is distinct from 'normalized_top_left'
         or page ->> 'readingOrder' is distinct from 'pdf_source_order'
         or jsonb_typeof(page -> 'blocks') is distinct from 'array'
         or jsonb_typeof(page -> 'warnings') is distinct from 'array' then
        raise exception 'Invalid native layout page';
      end if;
      foreach key in array array['width', 'height'] loop
        if jsonb_typeof(page -> key) is distinct from 'number'
           or (page ->> key)::numeric <= 0 or (page ->> key)::numeric > 100000 then
          raise exception 'Invalid native layout dimensions';
        end if;
      end loop;
      if jsonb_typeof(page -> 'rotation') is distinct from 'number'
         or (page ->> 'rotation')::numeric not between 0 and 359
         or trunc((page ->> 'rotation')::numeric) <> (page ->> 'rotation')::numeric
         or jsonb_array_length(page -> 'blocks') > 10000
         or jsonb_array_length(page -> 'warnings') > 5 then
        raise exception 'Invalid native layout bounds';
      end if;
      for warning in select value from jsonb_array_elements(page -> 'warnings') loop
        if warning #>> '{}' is null or warning #>> '{}' not in
          ('invalid_geometry', 'out_of_page_geometry', 'unsupported_reading_direction',
           'ambiguous_columns_or_table', 'source_order_not_top_to_bottom') then
          raise exception 'Invalid native layout warning';
        end if;
      end loop;
      if page ->> 'state' is distinct from (case when jsonb_array_length(page -> 'warnings') > 0 then 'review_required' else 'uncalibrated' end) then
        raise exception 'Invalid native layout review state';
      end if;
      cursor_offset := 0;
      run_index := 0;
      for block in select value from jsonb_array_elements(page -> 'blocks') loop
        run_index := run_index + 1;
        if block ->> 'id' is distinct from (page ->> 'pageId' || '-run-' || run_index)
           or block ->> 'pageId' is distinct from page ->> 'pageId'
           or block -> 'sourceOrder' is distinct from to_jsonb(run_index - 1)
           or block ->> 'geometry' is distinct from 'approximate_font_em'
           or jsonb_typeof(block -> 'text') is distinct from 'string'
           or jsonb_typeof(block -> 'start') is distinct from 'number'
           or jsonb_typeof(block -> 'end') is distinct from 'number'
           or trunc((block ->> 'start')::numeric) <> (block ->> 'start')::numeric
           or trunc((block ->> 'end')::numeric) <> (block ->> 'end')::numeric then
          raise exception 'Invalid native layout run';
        end if;
        start_offset := (block ->> 'start')::integer;
        end_offset := (block ->> 'end')::integer;
        if start_offset < cursor_offset or end_offset < start_offset or end_offset > char_length(source_text)
           or substring(source_text from cursor_offset + 1 for start_offset - cursor_offset) not in ('', E'\n')
           or block ->> 'text' is distinct from substring(source_text from start_offset + 1 for end_offset - start_offset) then
          raise exception 'Native layout run is not grounded';
        end if;
        cursor_offset := end_offset;
        box := block -> 'box';
        if box = 'null'::jsonb then
          if not (page -> 'warnings' ? 'invalid_geometry') then raise exception 'Missing geometry warning'; end if;
        elsif jsonb_typeof(box) = 'object' then
          foreach key in array array['x','y','width','height'] loop
            if jsonb_typeof(box -> key) is distinct from 'number'
               or abs((box ->> key)::numeric) > 100 then raise exception 'Invalid native layout box'; end if;
          end loop;
          if (box ->> 'width')::numeric < 0 or (box ->> 'height')::numeric < 0 then raise exception 'Invalid native layout box'; end if;
          if ((box ->> 'x')::numeric < 0 or (box ->> 'y')::numeric < 0
             or (box ->> 'x')::numeric + (box ->> 'width')::numeric > 1
             or (box ->> 'y')::numeric + (box ->> 'height')::numeric > 1)
             and not (page -> 'warnings' ? 'out_of_page_geometry') then raise exception 'Missing crop warning'; end if;
        else raise exception 'Invalid native layout box';
        end if;
      end loop;
      if substring(source_text from cursor_offset + 1) not in ('', E'\n') then raise exception 'Native layout does not cover its page'; end if;
    end loop;
  end if;
  persisted := public.persist_analysis_extraction(p_analysis_id, p_duration_ms, p_extracted_text,
    p_extractor_version, p_page_count, p_page_texts, p_process_id, p_request_id,
    p_text_checksum, p_warnings, p_evidence_graph);
  if persisted then
    update public.analysis_extractions set native_layout = p_native_layout where analysis_id = p_analysis_id;
  end if;
  return persisted;
end;
$$;
revoke all on function public.persist_native_layout_extraction(uuid,integer,text,text,integer,jsonb,text,text,text,jsonb,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.persist_native_layout_extraction(uuid,integer,text,text,integer,jsonb,text,text,text,jsonb,jsonb,jsonb) to service_role;
