create function public.cancel_queued_analysis(
  p_analysis_id uuid,
  p_user_id uuid,
  p_request_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  analysis_row public.analyses%rowtype;
begin
  select * into analysis_row
  from public.analyses
  where id = p_analysis_id
    and owner_id = p_user_id
  for update;

  if not found or analysis_row.status not in ('quarantined', 'queued') then
    return false;
  end if;

  update public.analyses
  set status = 'cancelled',
      request_id = p_request_id,
      stage_updated_at = timezone('utc', now()),
      completed_at = timezone('utc', now())
  where id = p_analysis_id
    and status = analysis_row.status;
  if not found then return false; end if;

  delete from public.analysis_jobs where analysis_id = p_analysis_id;
  insert into public.analysis_transitions (
    analysis_id, from_status, to_status, actor_id, process_id, request_id
  ) values (
    p_analysis_id, analysis_row.status, 'cancelled', p_user_id, 'web', p_request_id
  );
  return true;
end;
$$;

revoke all on function public.cancel_queued_analysis(uuid, uuid, text)
from public, anon, authenticated;
grant execute on function public.cancel_queued_analysis(uuid, uuid, text)
to service_role;
