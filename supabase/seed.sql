-- Synthetic fixture data for migration and restore verification only.
-- It must never contain real candidate or account data.
insert into auth.users (
	instance_id,
	id,
	aud,
	role,
	email,
	email_confirmed_at,
	raw_app_meta_data,
	raw_user_meta_data,
	created_at,
	updated_at
)
values (
	'00000000-0000-0000-0000-000000000000',
	'11111111-1111-1111-1111-111111111111',
	'authenticated',
	'authenticated',
	'migration-fixture@example.test',
	timezone('utc', now()),
	'{"provider":"email","providers":["email"]}',
	'{}',
	timezone('utc', now()),
	timezone('utc', now())
)
on conflict (id) do nothing;

insert into public.profiles (id, email)
values ('11111111-1111-1111-1111-111111111111', 'migration-fixture@example.test')
on conflict (id) do nothing;

delete from public.organizations
where owner_id = '11111111-1111-1111-1111-111111111111';

insert into public.organizations (id, owner_id, name)
values (
	'22222222-2222-2222-2222-222222222222',
	'11111111-1111-1111-1111-111111111111',
	'Migration Fixture'
)
on conflict (id) do nothing;

insert into public.memberships (organization_id, user_id, role)
values (
	'22222222-2222-2222-2222-222222222222',
	'11111111-1111-1111-1111-111111111111',
	'owner'
)
on conflict (organization_id, user_id) do update set role = excluded.role;

insert into public.resumes (id, organization_id, owner_id, display_name)
values (
	'33333333-3333-3333-3333-333333333333',
	'22222222-2222-2222-2222-222222222222',
	'11111111-1111-1111-1111-111111111111',
	'migration-fixture.pdf'
)
on conflict (id) do nothing;

insert into public.resume_versions (
	id,
	resume_id,
	organization_id,
	owner_id,
	storage_key,
	checksum,
	bytes,
	media_type,
	page_count
)
values (
	'44444444-4444-4444-4444-444444444444',
	'33333333-3333-3333-3333-333333333333',
	'22222222-2222-2222-2222-222222222222',
	'11111111-1111-1111-1111-111111111111',
	'organizations/22222222-2222-2222-2222-222222222222/resumes/33333333-3333-3333-3333-333333333333/44444444-4444-4444-4444-444444444444.pdf',
	'0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
	1024,
	'application/pdf',
	1
)
on conflict (id) do nothing;