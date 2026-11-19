create or replace function public.dashboard() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select private.dashboard() || pg_catalog.jsonb_build_object(
    'snapshot_at', pg_catalog.statement_timestamp()
  )
$$;
