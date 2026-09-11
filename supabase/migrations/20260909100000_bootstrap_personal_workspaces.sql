create function private.bootstrap_personal_workspace()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  workspace_name text;
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do update set email = excluded.email;

  workspace_name := left(
    coalesce(nullif(split_part(new.email, '@', 1), ''), 'My') || '''s workspace',
    120
  );
  insert into public.organizations (owner_id, name)
  select new.id, workspace_name
  where not exists (
    select 1 from public.organizations where owner_id = new.id
  );

  return new;
end;
$$;

revoke all on function private.bootstrap_personal_workspace() from public;

drop trigger if exists bootstrap_personal_workspace on auth.users;
create trigger bootstrap_personal_workspace
after insert on auth.users
for each row execute function private.bootstrap_personal_workspace();