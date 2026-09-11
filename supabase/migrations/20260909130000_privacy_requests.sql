create table public.consents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  purpose text not null check (purpose in ('qualitative_ai')),
  policy_version text not null,
  captured_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, purpose, policy_version)
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  actor_id uuid not null references auth.users (id) on delete cascade,
  action text not null,
  target_type text not null,
  target_id uuid,
  outcome text not null check (outcome in ('success', 'denied', 'failed')),
  request_id text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.data_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('export', 'deletion')),
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger consents_set_updated_at before update on public.consents
for each row execute function private.set_updated_at();
create trigger audit_events_set_updated_at before update on public.audit_events
for each row execute function private.set_updated_at();
create trigger data_requests_set_updated_at before update on public.data_requests
for each row execute function private.set_updated_at();

create index consents_organization_user_idx on public.consents (organization_id, user_id);
create index audit_events_organization_created_idx on public.audit_events (organization_id, created_at desc);
create index data_requests_user_created_idx on public.data_requests (user_id, created_at desc);

alter table public.consents enable row level security;
alter table public.audit_events enable row level security;
alter table public.data_requests enable row level security;
revoke all on public.consents, public.audit_events, public.data_requests from anon, authenticated;
grant select on public.consents, public.audit_events, public.data_requests to authenticated;

create policy "users read own consents" on public.consents for select to authenticated
using ((select auth.uid()) = user_id);
create policy "users read own audit events" on public.audit_events for select to authenticated
using ((select auth.uid()) = actor_id);
create policy "users read own data requests" on public.data_requests for select to authenticated
using ((select auth.uid()) = user_id);