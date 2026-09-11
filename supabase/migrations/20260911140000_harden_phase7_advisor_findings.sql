-- CREATE OR REPLACE in the taxonomy migration reintroduced default execute
-- privileges. Keep worker-only mutation RPCs inaccessible to API clients.
revoke all on function public.persist_partial_analysis(uuid, jsonb, text, text)
from public, anon, authenticated;
grant execute on function public.persist_partial_analysis(uuid, jsonb, text, text)
to service_role;

create index retention_items_owner_id_idx
on private.retention_items (owner_id);
