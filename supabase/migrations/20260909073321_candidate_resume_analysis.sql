create schema if not exists private;

create function private.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
	new.updated_at = timezone('utc', now());
	return new;
end;
$$;

revoke all on function private.set_updated_at() from public;

create table public.profiles (
	id uuid primary key references auth.users (id) on delete cascade,
	email text not null,
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now())
);

create table public.organizations (
	id uuid primary key default gen_random_uuid(),
	owner_id uuid not null references auth.users (id) on delete cascade,
	name text not null check (char_length(trim(name)) between 1 and 120),
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now())
);

create table public.jobs (
	id uuid primary key default gen_random_uuid(),
	organization_id uuid not null references public.organizations (id) on delete cascade,
	owner_id uuid not null references auth.users (id) on delete cascade,
	company_name text not null default '',
	title text not null default '',
	description text not null default '',
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now())
);

create table public.resumes (
	id uuid primary key default gen_random_uuid(),
	organization_id uuid not null references public.organizations (id) on delete cascade,
	owner_id uuid not null references auth.users (id) on delete cascade,
	display_name text not null check (char_length(trim(display_name)) between 1 and 255),
	status text not null default 'active' check (status in ('active', 'deleted')),
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now())
);

create table public.resume_versions (
	id uuid primary key default gen_random_uuid(),
	resume_id uuid not null references public.resumes (id) on delete cascade,
	organization_id uuid not null references public.organizations (id) on delete cascade,
	owner_id uuid not null references auth.users (id) on delete cascade,
	storage_key text not null unique,
	checksum text not null check (char_length(checksum) = 64),
	bytes integer not null check (bytes > 0 and bytes <= 10485760),
	media_type text not null check (media_type = 'application/pdf'),
	page_count integer,
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now()),
	unique (resume_id, checksum)
);

create table public.analyses (
	id uuid primary key default gen_random_uuid(),
	resume_version_id uuid not null references public.resume_versions (id) on delete cascade,
	job_id uuid references public.jobs (id) on delete set null,
	organization_id uuid not null references public.organizations (id) on delete cascade,
	owner_id uuid not null references auth.users (id) on delete cascade,
	status text not null default 'queued' check (status in ('queued', 'running', 'partial', 'completed', 'failed', 'cancelled', 'rejected')),
	idempotency_key uuid not null unique,
	requested_at timestamptz not null default timezone('utc', now()),
	completed_at timestamptz,
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now())
);

create table public.analysis_results (
	analysis_id uuid primary key references public.analyses (id) on delete cascade,
	organization_id uuid not null references public.organizations (id) on delete cascade,
	owner_id uuid not null references auth.users (id) on delete cascade,
	feedback jsonb not null,
	parse_view jsonb not null,
	rule_trace jsonb not null,
	keyword_coverage jsonb not null,
	parser_version text not null,
	ruleset_version text not null,
	normalizer_version text not null,
	prompt_version text not null,
	schema_version text not null,
	model_id text not null,
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now())
);

create table public.writer_drafts (
	id uuid primary key default gen_random_uuid(),
	analysis_id uuid not null references public.analyses (id) on delete cascade,
	organization_id uuid not null references public.organizations (id) on delete cascade,
	owner_id uuid not null references auth.users (id) on delete cascade,
	kind text not null check (kind in ('summary', 'bullets')),
	draft jsonb not null,
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now()),
	unique (analysis_id, kind)
);

create index organizations_owner_id_idx on public.organizations (owner_id);
create index jobs_owner_id_created_at_idx on public.jobs (owner_id, created_at desc);
create index resumes_owner_id_created_at_idx on public.resumes (owner_id, created_at desc);
create index resume_versions_owner_id_idx on public.resume_versions (owner_id);
create index analyses_owner_id_created_at_idx on public.analyses (owner_id, created_at desc);
create index analyses_status_created_at_idx on public.analyses (status, created_at);
create index analysis_results_owner_id_idx on public.analysis_results (owner_id);
create index writer_drafts_owner_id_idx on public.writer_drafts (owner_id);

create trigger profiles_set_updated_at before update on public.profiles for each row execute function private.set_updated_at();
create trigger organizations_set_updated_at before update on public.organizations for each row execute function private.set_updated_at();
create trigger jobs_set_updated_at before update on public.jobs for each row execute function private.set_updated_at();
create trigger resumes_set_updated_at before update on public.resumes for each row execute function private.set_updated_at();
create trigger resume_versions_set_updated_at before update on public.resume_versions for each row execute function private.set_updated_at();
create trigger analyses_set_updated_at before update on public.analyses for each row execute function private.set_updated_at();
create trigger analysis_results_set_updated_at before update on public.analysis_results for each row execute function private.set_updated_at();
create trigger writer_drafts_set_updated_at before update on public.writer_drafts for each row execute function private.set_updated_at();

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.jobs enable row level security;
alter table public.resumes enable row level security;
alter table public.resume_versions enable row level security;
alter table public.analyses enable row level security;
alter table public.analysis_results enable row level security;
alter table public.writer_drafts enable row level security;

revoke all on public.profiles, public.organizations, public.jobs, public.resumes, public.resume_versions, public.analyses, public.analysis_results, public.writer_drafts from anon, authenticated;
grant select on public.profiles, public.organizations, public.jobs, public.resumes, public.resume_versions, public.analyses, public.analysis_results, public.writer_drafts to authenticated;

create policy "users read own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "users read own organizations" on public.organizations for select to authenticated using ((select auth.uid()) = owner_id);
create policy "users read own jobs" on public.jobs for select to authenticated using ((select auth.uid()) = owner_id);
create policy "users read own resumes" on public.resumes for select to authenticated using ((select auth.uid()) = owner_id);
create policy "users read own resume versions" on public.resume_versions for select to authenticated using ((select auth.uid()) = owner_id);
create policy "users read own analyses" on public.analyses for select to authenticated using ((select auth.uid()) = owner_id);
create policy "users read own analysis results" on public.analysis_results for select to authenticated using ((select auth.uid()) = owner_id);
create policy "users read own writer drafts" on public.writer_drafts for select to authenticated using ((select auth.uid()) = owner_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resumes', 'resumes', false, 10485760, array['application/pdf'])
on conflict (id) do update
set public = excluded.public,
		file_size_limit = excluded.file_size_limit,
		allowed_mime_types = excluded.allowed_mime_types;
