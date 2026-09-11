create index jobs_organization_id_idx on public.jobs (organization_id);
create index resumes_organization_id_idx on public.resumes (organization_id);
create index resume_versions_organization_id_idx on public.resume_versions (organization_id);
create index analyses_resume_version_id_idx on public.analyses (resume_version_id);
create index analyses_job_id_idx on public.analyses (job_id);
create index analyses_organization_id_idx on public.analyses (organization_id);
create index analysis_results_organization_id_idx on public.analysis_results (organization_id);
create index writer_drafts_organization_id_idx on public.writer_drafts (organization_id);
