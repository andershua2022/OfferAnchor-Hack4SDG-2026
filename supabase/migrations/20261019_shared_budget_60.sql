-- Owner-authorized shared request budget: support up to 60, default remains 30.
-- Preserve all account lifetime totals, existing windows, leases and privileges.
begin;
select pg_catalog.pg_advisory_xact_lock(2026101801);
do $budget$
declare
  current_definition pg_catalog.text;
  old_guard constant pg_catalog.text := 'v_global_limit not between 1 and 30';
  new_guard constant pg_catalog.text := 'v_global_limit not between 1 and 60';
begin
  select pg_catalog.pg_get_functiondef('public.offeranchor_runtime_state(text,jsonb)'::pg_catalog.regprocedure)
    into current_definition;
  if position('v_session_limit not between 1 and 5' in current_definition) = 0
    or position('trial_exhausted' in current_definition) = 0 then
    raise exception 'Expected five-lifetime-account trial implementation';
  end if;
  if position(old_guard in current_definition) > 0 then
    if (pg_catalog.length(current_definition) - pg_catalog.length(pg_catalog.replace(current_definition, old_guard, ''))) <> pg_catalog.length(old_guard) then
      raise exception 'Shared guard must occur exactly once';
    end if;
    execute pg_catalog.replace(current_definition, old_guard, new_guard);
  elsif position(new_guard in current_definition) = 0 then
    raise exception 'Unexpected shared budget implementation';
  end if;
end;
$budget$;
alter table offeranchor_private.paid_windows drop constraint if exists paid_windows_calls_check;
alter table offeranchor_private.paid_windows add constraint paid_windows_calls_check check (calls between 0 and 60);
commit;
