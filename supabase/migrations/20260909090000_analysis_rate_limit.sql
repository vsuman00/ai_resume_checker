create table private.analysis_rate_limit_buckets (
  bucket_key text primary key check (char_length(bucket_key) between 1 and 128),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count >= 0),
  updated_at timestamptz not null default timezone('utc', now())
);

revoke all on private.analysis_rate_limit_buckets from public, anon, authenticated;

create or replace function public.consume_analysis_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  now_at timestamptz := pg_catalog.clock_timestamp();
  allowed boolean;
begin
  if p_key is null or char_length(p_key) = 0 or char_length(p_key) > 128
     or p_limit < 1 or p_window_seconds < 1 then
    return false;
  end if;

  insert into private.analysis_rate_limit_buckets (
    bucket_key,
    window_started_at,
    request_count,
    updated_at
  )
  values (p_key, now_at, 1, now_at)
  on conflict (bucket_key) do update
  set window_started_at = case
        when private.analysis_rate_limit_buckets.window_started_at
          + pg_catalog.make_interval(secs => p_window_seconds) <= now_at
        then now_at
        else private.analysis_rate_limit_buckets.window_started_at
      end,
      request_count = case
        when private.analysis_rate_limit_buckets.window_started_at
          + pg_catalog.make_interval(secs => p_window_seconds) <= now_at
        then 1
        else private.analysis_rate_limit_buckets.request_count + 1
      end,
      updated_at = now_at
  returning request_count <= p_limit into allowed;

  return allowed;
end;
$$;

revoke all on function public.consume_analysis_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_analysis_rate_limit(text, integer, integer)
  to service_role;
