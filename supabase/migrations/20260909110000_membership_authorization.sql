create table public.memberships (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member', 'viewer')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (organization_id, user_id)
);

create index memberships_user_id_organization_id_idx
on public.memberships (user_id, organization_id);

create trigger memberships_set_updated_at
before update on public.memberships
for each row execute function private.set_updated_at();

insert into public.memberships (organization_id, user_id, role)
select id, owner_id, 'owner' from public.organizations
on conflict (organization_id, user_id) do update set role = excluded.role;

create or replace function private.has_organization_role(
  p_organization_id uuid,
  p_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships
    where organization_id = p_organization_id
      and user_id = (select auth.uid())
      and role = any(p_roles)
  );
$$;

revoke all on function private.has_organization_role(uuid, text[]) from public;
grant execute on function private.has_organization_role(uuid, text[]) to authenticated;

create or replace function private.bootstrap_personal_workspace()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  workspace_id uuid;
  workspace_name text;
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do update set email = excluded.email;

  select id into workspace_id
  from public.organizations
  where owner_id = new.id
  order by created_at asc
  limit 1;

  if workspace_id is null then
    workspace_name := left(
      coalesce(nullif(split_part(new.email, '@', 1), ''), 'My') || '''s workspace',
      120
    );
    insert into public.organizations (owner_id, name)
    values (new.id, workspace_name)
    returning id into workspace_id;
  end if;

  insert into public.memberships (organization_id, user_id, role)
  values (workspace_id, new.id, 'owner')
  on conflict (organization_id, user_id) do update set role = excluded.role;

  return new;
end;
$$;

alter table public.memberships enable row level security;
revoke all on public.memberships from anon, authenticated;
grant select on public.memberships to authenticated;

create policy "users read own memberships"
on public.memberships for select to authenticated
using ((select auth.uid()) = user_id);

drop policy "users read own organizations" on public.organizations;
drop policy "users read own jobs" on public.jobs;
drop policy "users read own resumes" on public.resumes;
drop policy "users read own resume versions" on public.resume_versions;
drop policy "users read own analyses" on public.analyses;
drop policy "users read own analysis results" on public.analysis_results;
drop policy "users read own writer drafts" on public.writer_drafts;

create policy "members read organizations" on public.organizations for select to authenticated
using ((select private.has_organization_role(id, array['owner', 'admin', 'member', 'viewer'])));
create policy "members read jobs" on public.jobs for select to authenticated
using ((select private.has_organization_role(organization_id, array['owner', 'admin', 'member', 'viewer'])));
create policy "members read resumes" on public.resumes for select to authenticated
using ((select private.has_organization_role(organization_id, array['owner', 'admin', 'member', 'viewer'])));
create policy "members read resume versions" on public.resume_versions for select to authenticated
using ((select private.has_organization_role(organization_id, array['owner', 'admin', 'member', 'viewer'])));
create policy "members read analyses" on public.analyses for select to authenticated
using ((select private.has_organization_role(organization_id, array['owner', 'admin', 'member', 'viewer'])));
create policy "members read analysis results" on public.analysis_results for select to authenticated
using ((select private.has_organization_role(organization_id, array['owner', 'admin', 'member', 'viewer'])));
create policy "members read writer drafts" on public.writer_drafts for select to authenticated
using ((select private.has_organization_role(organization_id, array['owner', 'admin', 'member', 'viewer'])));