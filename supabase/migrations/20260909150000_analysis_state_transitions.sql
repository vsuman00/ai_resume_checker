alter table public.analyses
drop constraint analyses_status_check;

alter table public.analyses
add constraint analyses_status_check check (status in (
  'created', 'uploading', 'quarantined', 'queued', 'extracting', 'needs_ocr',
  'scoring', 'qualitative_review', 'partial', 'completed', 'failed',
  'cancelled', 'rejected'
));

alter table public.analyses
add column request_id text,
add column current_attempt integer not null default 0 check (current_attempt >= 0),
add column stage_updated_at timestamptz not null default timezone('utc', now());

create table public.analysis_transitions (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  from_status text not null,
  to_status text not null,
  actor_id uuid references auth.users (id) on delete set null,
  process_id text,
  request_id text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index analysis_transitions_analysis_created_idx
on public.analysis_transitions (analysis_id, created_at asc);
create index analysis_transitions_actor_id_idx
on public.analysis_transitions (actor_id);

alter table public.analysis_transitions enable row level security;
revoke all on public.analysis_transitions from anon, authenticated;
grant select on public.analysis_transitions to authenticated;

create policy "members read analysis transitions"
on public.analysis_transitions for select to authenticated
using (
  exists (
    select 1
    from public.analyses
    where analyses.id = analysis_transitions.analysis_id
      and (select private.has_organization_role(
        analyses.organization_id,
        array['owner', 'admin', 'member', 'viewer']
      ))
  )
);

create function public.transition_analysis(
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
    ('quarantined', 'queued'), ('quarantined', 'rejected'),
    ('queued', 'extracting'), ('queued', 'cancelled'),
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
  where id = p_analysis_id
    and status = p_expected_status;

  if not found then return false; end if;

  insert into public.analysis_transitions (
    analysis_id, from_status, to_status, actor_id, process_id, request_id
  ) values (
    p_analysis_id, p_expected_status, p_next_status, p_actor_id, p_process_id, p_request_id
  );
  return true;
end;
$$;

revoke all on function public.transition_analysis(uuid, text, text, uuid, text, text)
from public, anon, authenticated;
grant execute on function public.transition_analysis(uuid, text, text, uuid, text, text)
to service_role;