-- Durable server-only account trial counts; no email, code, session token, or evidence.
-- Apply after 20261018_runtime_state.sql through the authorized migration workflow.
begin;

revoke all on schema offeranchor_private from public, anon, authenticated, service_role;

create table offeranchor_private.trial_account_quotas (
  scope pg_catalog.text not null check (scope ~ '^[a-f0-9]{64}$'),
  account_hash pg_catalog.text not null check (account_hash ~ '^[A-Za-z0-9_-]{43}$'),
  used pg_catalog.int2 not null default 0 check (used between 0 and 5),
  primary key (scope, account_hash)
);
alter table offeranchor_private.trial_account_quotas enable row level security;
revoke all on table offeranchor_private.trial_account_quotas
  from public, anon, authenticated, service_role;

-- Nullable metadata lets pre-migration leases retain their original full-weight charge.
alter table offeranchor_private.paid_leases
  add column session_weight pg_catalog.int2 check (session_weight between 1 and weight),
  add column trial_account pg_catalog.text check (trial_account ~ '^[A-Za-z0-9_-]{43}$');

create or replace function public.offeranchor_runtime_state(p_operation pg_catalog.text, p_input pg_catalog.jsonb)
returns pg_catalog.jsonb
language plpgsql
security definer
set search_path = ''
as $runtime_state$
declare
  v_keys pg_catalog.text[];
  v_allowed_keys pg_catalog.text[];
  v_key pg_catalog.text;
  v_scope pg_catalog.text;
  v_id pg_catalog.uuid;
  v_previous_id pg_catalog.uuid;
  v_claim_id pg_catalog.uuid;
  v_method pg_catalog.text;
  v_email pg_catalog.text;
  v_email_key pg_catalog.text;
  v_public_email pg_catalog.bool;
  v_consume pg_catalog.bool;
  v_cohort pg_catalog.text;
  v_weight pg_catalog.int4;
  v_session_weight pg_catalog.int4;
  v_trial_account pg_catalog.text;
  v_trial_used pg_catalog.int4;
  v_session_limit pg_catalog.int4;
  v_session_window pg_catalog.int4;
  v_session_concurrent pg_catalog.int4;
  v_global_limit pg_catalog.int4;
  v_global_window pg_catalog.int4;
  v_global_concurrent pg_catalog.int4;
  v_now pg_catalog.timestamptz;
  v_first pg_catalog.timestamptz;
  v_last pg_catalog.timestamptz;
  v_period pg_catalog.interval;
  v_limit pg_catalog.int4;
  v_count pg_catalog.int8;
  v_retry pg_catalog.int4;
  v_local_calls pg_catalog.int4;
  v_global_calls pg_catalog.int4;
  v_local_started pg_catalog.timestamptz;
  v_global_started pg_catalog.timestamptz;
  v_local_inflight pg_catalog.int8;
  v_global_inflight pg_catalog.int8;
  v_challenge offeranchor_private.challenges%rowtype;
  v_lease offeranchor_private.paid_leases%rowtype;
  v_window offeranchor_private.paid_windows%rowtype;
begin
  if pg_catalog.jsonb_typeof(p_input) is distinct from 'object'
    or pg_catalog.pg_column_size(p_input) > 4096 then
    raise exception using errcode = '22023', message = 'invalid runtime state input';
  end if;
  v_keys := case p_operation
    when 'auth_start' then array['scope', 'method', 'emailKey', 'publicEmail', 'previousId']
    when 'challenge_create' then array['scope', 'id', 'previousId', 'email']
    when 'challenge_revoke' then array['scope', 'id']
    when 'challenge_claim' then array['scope', 'id', 'claimId']
    when 'challenge_check' then array['scope', 'id', 'claimId']
    when 'challenge_finish' then array['scope', 'id', 'claimId', 'consume']
    when 'demo_login' then array['scope']
    when 'paid_reserve' then array['scope', 'id', 'cohort', 'weight', 'sessionLimit', 'sessionWindow', 'sessionConcurrent', 'globalLimit', 'globalWindow', 'globalConcurrent']
    when 'paid_release' then array['scope', 'id']
    else null
  end;
  if v_keys is null or not (p_input ?& v_keys) then
    raise exception using errcode = '22023', message = 'invalid runtime state input';
  end if;
  v_allowed_keys := v_keys;
  if p_operation = 'paid_reserve' then
    v_allowed_keys := v_keys || array['sessionWeight', 'trialAccount'];
  end if;
  for v_key in select field from pg_catalog.jsonb_object_keys(p_input) as fields(field) loop
    if not (v_key = any(v_allowed_keys)) then
      raise exception using errcode = '22023', message = 'invalid runtime state input';
    end if;
  end loop;
  v_scope := p_input ->> 'scope';
  if pg_catalog.jsonb_typeof(p_input -> 'scope') is distinct from 'string'
    or v_scope !~ '^[a-f0-9]{64}$' then
    raise exception using errcode = '22023', message = 'invalid runtime state input';
  end if;
  foreach v_key in array array['id', 'previousId', 'claimId'] loop
    if p_input ? v_key then
      if v_key = 'previousId' and p_input -> v_key = 'null'::pg_catalog.jsonb then
        continue;
      end if;
      if pg_catalog.jsonb_typeof(p_input -> v_key) is distinct from 'string'
        or (p_input ->> v_key) !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
        raise exception using errcode = '22023', message = 'invalid runtime state input';
      end if;
    end if;
  end loop;
  v_id := (p_input ->> 'id')::pg_catalog.uuid;
  v_previous_id := (p_input ->> 'previousId')::pg_catalog.uuid;
  v_claim_id := (p_input ->> 'claimId')::pg_catalog.uuid;

  if p_operation = 'auth_start' then
    v_method := p_input ->> 'method';
    v_email_key := p_input ->> 'emailKey';
    if pg_catalog.jsonb_typeof(p_input -> 'method') is distinct from 'string'
      or v_method not in ('email', 'google')
      or pg_catalog.jsonb_typeof(p_input -> 'emailKey') is distinct from 'string'
      or (v_method = 'email' and v_email_key !~ '^[a-f0-9]{64}$')
      or (v_method = 'google' and v_email_key <> '')
      or pg_catalog.jsonb_typeof(p_input -> 'publicEmail') is distinct from 'boolean' then
      raise exception using errcode = '22023', message = 'invalid runtime state input';
    end if;
    v_public_email := (p_input ->> 'publicEmail')::pg_catalog.bool;
  end if;
  if p_operation = 'challenge_create' then
    v_email := p_input ->> 'email';
    if pg_catalog.jsonb_typeof(p_input -> 'email') is distinct from 'string'
      or pg_catalog.char_length(v_email) not between 1 and 254
      or v_email !~ '^[^[:space:]@<>]+@[^[:space:]@<>]+[.][^[:space:]@<>]+$' then
      raise exception using errcode = '22023', message = 'invalid runtime state input';
    end if;
  end if;
  if p_operation = 'challenge_finish' then
    if pg_catalog.jsonb_typeof(p_input -> 'consume') is distinct from 'boolean' then
      raise exception using errcode = '22023', message = 'invalid runtime state input';
    end if;
    v_consume := (p_input ->> 'consume')::pg_catalog.bool;
  end if;
  if p_operation = 'paid_reserve' then
    v_cohort := p_input ->> 'cohort';
    if pg_catalog.jsonb_typeof(p_input -> 'cohort') is distinct from 'string'
      or v_cohort !~ '^[A-Za-z0-9_-]{43}$' then
      raise exception using errcode = '22023', message = 'invalid runtime state input';
    end if;
    foreach v_key in array array['weight', 'sessionLimit', 'sessionWindow', 'sessionConcurrent', 'globalLimit', 'globalWindow', 'globalConcurrent'] loop
      if pg_catalog.jsonb_typeof(p_input -> v_key) is distinct from 'number'
        or (p_input ->> v_key) !~ '^[0-9]{1,5}$' then
        raise exception using errcode = '22023', message = 'invalid runtime state input';
      end if;
    end loop;
    v_weight := (p_input ->> 'weight')::pg_catalog.int4;
    v_session_weight := v_weight;
    if p_input ? 'sessionWeight' then
      if pg_catalog.jsonb_typeof(p_input -> 'sessionWeight') is distinct from 'number'
        or (p_input ->> 'sessionWeight') !~ '^[0-9]{1,5}$' then
        raise exception using errcode = '22023', message = 'invalid runtime state input';
      end if;
      v_session_weight := (p_input ->> 'sessionWeight')::pg_catalog.int4;
    end if;
    if p_input ? 'trialAccount' then
      v_trial_account := p_input ->> 'trialAccount';
      if pg_catalog.jsonb_typeof(p_input -> 'trialAccount') is distinct from 'string'
        or v_trial_account !~ '^[A-Za-z0-9_-]{43}$' then
        raise exception using errcode = '22023', message = 'invalid runtime state input';
      end if;
    end if;
    v_session_limit := (p_input ->> 'sessionLimit')::pg_catalog.int4;
    v_session_window := (p_input ->> 'sessionWindow')::pg_catalog.int4;
    v_session_concurrent := (p_input ->> 'sessionConcurrent')::pg_catalog.int4;
    v_global_limit := (p_input ->> 'globalLimit')::pg_catalog.int4;
    v_global_window := (p_input ->> 'globalWindow')::pg_catalog.int4;
    v_global_concurrent := (p_input ->> 'globalConcurrent')::pg_catalog.int4;
    if v_weight not in (1, 2) or v_session_limit not between 1 and 5
      or v_session_weight not between 1 and v_weight
      or v_session_window not between 600 and 86400 or v_session_concurrent <> 1
      or v_global_limit not between 1 and 30 or v_global_window not between 3600 and 86400
      or v_global_concurrent not between 1 and 2 then
      raise exception using errcode = '22023', message = 'invalid runtime state input';
    end if;
  end if;

  -- shortcut: one transaction lock fits this bounded pilot; partition locks before higher throughput.
  perform pg_catalog.pg_advisory_xact_lock(2026101801);
  v_now := pg_catalog.clock_timestamp();
  delete from offeranchor_private.challenges where expires <= v_now;
  delete from offeranchor_private.auth_events where created_at <= v_now - interval '1 hour';
  -- Keep released/expired ids for one extra day, so a retry cannot buy another paid call.
  delete from offeranchor_private.paid_leases where expires <= v_now - interval '1 day';
  delete from offeranchor_private.paid_windows where started <= v_now - interval '2 days';
  -- Account trial counts intentionally survive cleanup, releases, expiry, and configuration rotation.

  if p_operation = 'auth_start' then
    if v_method = 'email' then
      select pg_catalog.max(created_at) into v_last from offeranchor_private.auth_events
        where scope = v_scope and kind = 'email' and subject = v_email_key
          and created_at > v_now - interval '60 seconds';
      if v_last is not null then
        v_retry := least(3600, greatest(1, pg_catalog.ceil(pg_catalog.date_part('epoch', v_last + interval '60 seconds' - v_now))::pg_catalog.int4));
        return pg_catalog.jsonb_build_object('ok', false, 'reason', 'email_send_wait', 'retry', v_retry);
      end if;
      v_period := interval '1 hour';
      v_limit := case when v_public_email then 20 else 2 end;
    else
      v_period := interval '60 seconds';
      v_limit := 20;
    end if;
    select pg_catalog.count(*), pg_catalog.min(created_at) into v_count, v_first
      from offeranchor_private.auth_events
      where scope = v_scope and kind = v_method and created_at > v_now - v_period;
    if v_count >= v_limit then
      v_retry := least(3600, greatest(1, pg_catalog.ceil(pg_catalog.date_part('epoch', v_first + v_period - v_now))::pg_catalog.int4));
      return pg_catalog.jsonb_build_object('ok', false, 'reason', 'rate_limited', 'retry', v_retry);
    end if;
    insert into offeranchor_private.auth_events(scope, kind, subject, created_at)
      values (v_scope, v_method, case when v_method = 'email' then v_email_key else null end, v_now);
    if v_method = 'email' then
      select pg_catalog.count(*), pg_catalog.min(expires) into v_count, v_first
        from offeranchor_private.challenges where scope = v_scope;
      if v_count >= 100 and not exists (
        select 1 from offeranchor_private.challenges where scope = v_scope and id = v_previous_id
      ) then
        v_retry := greatest(1, pg_catalog.ceil(pg_catalog.date_part('epoch', v_first - v_now))::pg_catalog.int4);
        return pg_catalog.jsonb_build_object('ok', false, 'reason', 'rate_limited', 'retry', v_retry);
      end if;
    end if;
    return pg_catalog.jsonb_build_object('ok', true);
  end if;

  if p_operation = 'challenge_create' then
    if exists (select 1 from offeranchor_private.challenges where scope = v_scope and id = v_id) then
      raise exception using errcode = '22023', message = 'invalid runtime state input';
    end if;
    select pg_catalog.count(*), pg_catalog.min(expires) into v_count, v_first
      from offeranchor_private.challenges where scope = v_scope and id is distinct from v_previous_id;
    if v_count >= 100 then
      v_retry := greatest(1, pg_catalog.ceil(pg_catalog.date_part('epoch', v_first - v_now))::pg_catalog.int4);
      return pg_catalog.jsonb_build_object('ok', false, 'reason', 'rate_limited', 'retry', v_retry);
    end if;
    delete from offeranchor_private.challenges where scope = v_scope and id = v_previous_id;
    insert into offeranchor_private.challenges(scope, id, email, expires)
      values (v_scope, v_id, v_email, v_now + interval '10 minutes');
    return pg_catalog.jsonb_build_object('ok', true);
  end if;

  if p_operation = 'challenge_revoke' then
    delete from offeranchor_private.challenges where scope = v_scope and id = v_id;
    return pg_catalog.jsonb_build_object('ok', true);
  end if;

  if p_operation = 'challenge_claim' then
    select * into v_challenge from offeranchor_private.challenges where scope = v_scope and id = v_id;
    if not found or v_challenge.attempts >= 5 then
      return pg_catalog.jsonb_build_object('ok', false, 'reason', 'code_expired');
    end if;
    if v_challenge.claim_id is not null and v_challenge.claim_expires > v_now then
      return pg_catalog.jsonb_build_object('ok', false, 'reason', 'rate_limited');
    end if;
    select pg_catalog.count(*) into v_count from offeranchor_private.auth_events
      where scope = v_scope and kind = 'verify' and created_at > v_now - interval '10 minutes';
    if v_count >= 30 then
      return pg_catalog.jsonb_build_object('ok', false, 'reason', 'rate_limited');
    end if;
    update offeranchor_private.challenges set attempts = attempts + 1,
      claim_id = v_claim_id, claim_expires = v_now + interval '60 seconds'
      where scope = v_scope and id = v_id;
    insert into offeranchor_private.auth_events(scope, kind, subject, created_at)
      values (v_scope, 'verify', null, v_now);
    return pg_catalog.jsonb_build_object('ok', true, 'email', v_challenge.email);
  end if;

  if p_operation = 'challenge_check' then
    if exists (select 1 from offeranchor_private.challenges
      where scope = v_scope and id = v_id and expires > v_now
        and claim_id = v_claim_id and claim_expires > v_now) then
      return pg_catalog.jsonb_build_object('ok', true);
    end if;
    return pg_catalog.jsonb_build_object('ok', false, 'reason', 'code_expired');
  end if;

  if p_operation = 'challenge_finish' then
    select * into v_challenge from offeranchor_private.challenges
      where scope = v_scope and id = v_id and expires > v_now
        and claim_id = v_claim_id and claim_expires > v_now;
    if not found then
      return pg_catalog.jsonb_build_object('ok', false, 'reason', 'code_expired');
    end if;
    if v_consume then
      delete from offeranchor_private.challenges where scope = v_scope and id = v_id and claim_id = v_claim_id;
      return pg_catalog.jsonb_build_object('ok', true);
    end if;
    if v_challenge.attempts >= 5 then
      delete from offeranchor_private.challenges where scope = v_scope and id = v_id and claim_id = v_claim_id;
      return pg_catalog.jsonb_build_object('ok', false, 'reason', 'code_expired');
    end if;
    update offeranchor_private.challenges set claim_id = null, claim_expires = null
      where scope = v_scope and id = v_id and claim_id = v_claim_id;
    return pg_catalog.jsonb_build_object('ok', true);
  end if;

  if p_operation = 'demo_login' then
    insert into offeranchor_private.paid_windows(scope, bucket, started, calls)
      values (v_scope, 'demo-login', v_now, 0) on conflict (scope, bucket) do nothing;
    update offeranchor_private.paid_windows set started = v_now, calls = 0
      where scope = v_scope and bucket = 'demo-login' and started + interval '60 seconds' <= v_now;
    select * into v_window from offeranchor_private.paid_windows where scope = v_scope and bucket = 'demo-login';
    if v_window.calls >= 10 then
      v_retry := least(60, greatest(1, pg_catalog.ceil(pg_catalog.date_part('epoch', v_window.started + interval '60 seconds' - v_now))::pg_catalog.int4));
      return pg_catalog.jsonb_build_object('ok', false, 'reason', 'rate_limited', 'retry', v_retry);
    end if;
    update offeranchor_private.paid_windows set calls = calls + 1 where scope = v_scope and bucket = 'demo-login';
    return pg_catalog.jsonb_build_object('ok', true);
  end if;

  if p_operation = 'paid_reserve' then
    select * into v_lease from offeranchor_private.paid_leases where scope = v_scope and id = v_id;
    if found then
      if v_lease.cohort <> v_cohort or v_lease.weight <> v_weight
        or coalesce(v_lease.session_weight, v_lease.weight) <> v_session_weight
        or v_lease.trial_account is distinct from v_trial_account then
        raise exception using errcode = '22023', message = 'invalid runtime state input';
      end if;
      if not v_lease.released and v_lease.expires > v_now then
        return pg_catalog.jsonb_build_object('ok', true, 'leaseId', v_id);
      end if;
      return pg_catalog.jsonb_build_object('ok', false, 'retry', 1);
    end if;
    if v_trial_account is not null then
      select used into v_trial_used from offeranchor_private.trial_account_quotas
        where scope = v_scope and account_hash = v_trial_account;
      if coalesce(v_trial_used, 0) >= 5 then
        return pg_catalog.jsonb_build_object('ok', false, 'reason', 'trial_exhausted');
      end if;
    end if;
    insert into offeranchor_private.paid_windows(scope, bucket, started, calls)
      values (v_scope, 'global', v_now, 0), (v_scope, 'cohort:' || v_cohort, v_now, 0)
      on conflict (scope, bucket) do nothing;
    update offeranchor_private.paid_windows set started = v_now, calls = 0 where scope = v_scope and (
      (bucket = 'global' and started + pg_catalog.make_interval(secs => v_global_window) <= v_now)
      or (bucket = 'cohort:' || v_cohort and started + pg_catalog.make_interval(secs => v_session_window) <= v_now)
    );
    select calls, started into v_local_calls, v_local_started from offeranchor_private.paid_windows
      where scope = v_scope and bucket = 'cohort:' || v_cohort;
    select calls, started into v_global_calls, v_global_started from offeranchor_private.paid_windows
      where scope = v_scope and bucket = 'global';
    select pg_catalog.count(*) filter (where cohort = v_cohort), pg_catalog.count(*)
      into v_local_inflight, v_global_inflight from offeranchor_private.paid_leases
      where scope = v_scope and not released and expires > v_now;
    if v_local_calls + v_session_weight > v_session_limit or v_global_calls + v_weight > v_global_limit
      or v_local_inflight >= v_session_concurrent or v_global_inflight >= v_global_concurrent then
      v_retry := least(86400, greatest(1,
        pg_catalog.ceil(pg_catalog.date_part('epoch', v_local_started + pg_catalog.make_interval(secs => v_session_window) - v_now))::pg_catalog.int4,
        pg_catalog.ceil(pg_catalog.date_part('epoch', v_global_started + pg_catalog.make_interval(secs => v_global_window) - v_now))::pg_catalog.int4));
      return pg_catalog.jsonb_build_object('ok', false, 'retry', v_retry);
    end if;
    update offeranchor_private.paid_windows set calls = calls + case when bucket = 'global' then v_weight else v_session_weight end
      where scope = v_scope and bucket in ('global', 'cohort:' || v_cohort);
    if v_trial_account is not null then
      insert into offeranchor_private.trial_account_quotas(scope, account_hash, used)
        values (v_scope, v_trial_account, 1)
        on conflict (scope, account_hash) do update set used = offeranchor_private.trial_account_quotas.used + 1;
    end if;
    insert into offeranchor_private.paid_leases(scope, id, cohort, weight, session_weight, trial_account, expires)
      values (v_scope, v_id, v_cohort, v_weight, v_session_weight, v_trial_account, v_now + interval '60 seconds');
    return pg_catalog.jsonb_build_object('ok', true, 'leaseId', v_id);
  end if;

  if p_operation = 'paid_release' then
    update offeranchor_private.paid_leases set released = true where scope = v_scope and id = v_id and not released;
    return pg_catalog.jsonb_build_object('ok', true);
  end if;
  raise exception using errcode = '22023', message = 'invalid runtime state input';
end;
$runtime_state$;

revoke all on function public.offeranchor_runtime_state(text, jsonb) from public, anon, authenticated;
grant execute on function public.offeranchor_runtime_state(text, jsonb) to service_role;
commit;
