drop policy if exists "clients cannot access analysis jobs" on public.analysis_jobs;

create policy "clients cannot access analysis jobs"
on public.analysis_jobs for all to anon, authenticated
using (false)
with check (false);
