create index audit_events_actor_id_idx
on public.audit_events (actor_id);

create index data_requests_organization_id_idx
on public.data_requests (organization_id);
