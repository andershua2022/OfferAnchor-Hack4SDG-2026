import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync, readFileSync} from 'node:fs';
import test from 'node:test';

const currentPath = new URL('../../supabase/migrations/20261019_account_trial_quota.sql', import.meta.url);
const previousPath = new URL('../../supabase/migrations/20261018_runtime_state.sql', import.meta.url);
function migration() {
  assert.ok(existsSync(currentPath), 'The separate account trial migration must exist');
  return readFileSync(currentPath, 'utf8').replace(/--[^\n]*/g, '');
}
function rpc(sql = migration()) {
  const match = sql.match(/as\s+\$runtime_state\$([\s\S]*?)\$runtime_state\$/i);
  assert.ok(match, 'The complete replacement RPC must be present');
  return match[1];
}
function operation(name: string, sql?: string) {
  const source = rpc(sql);
  const body = source.slice(source.indexOf('perform pg_catalog.pg_advisory_xact_lock'));
  const start = body.indexOf("if p_operation = '" + name + "' then");
  assert.ok(start >= 0, name + ' must remain an explicit operation');
  const end = body.slice(start + 1).search(/\n  if p_operation = '/);
  return end < 0 ? body.slice(start) : body.slice(start, start + 1 + end);
}

// These checks inspect the shipped SQL contract; they do not connect to or execute a database.
test('trial migration leaves the applied predecessor bytes and unrelated operations unchanged', () => {
  const previous = readFileSync(previousPath);
  assert.equal(createHash('sha256').update(previous).digest('hex'),
    '319f79b67145da23d9a62b2b88ccd57b6c28131db9767ebc8e7eb0d6e2b9c3c9');
  const sql = migration();
  assert.match(sql, /create\s+or\s+replace\s+function\s+public\.offeranchor_runtime_state\s*\(\s*p_operation\s+pg_catalog\.text,\s*p_input\s+pg_catalog\.jsonb\)/i);
  for (const name of ['auth_start', 'challenge_create', 'challenge_revoke', 'challenge_claim', 'challenge_check', 'challenge_finish', 'demo_login', 'paid_release']) {
    assert.equal(operation(name, sql).trim(), operation(name, previous.toString('utf8')).trim(), name + ' must preserve its behavior');
  }
});

test('durable trial state is private and keyed only by scope and an opaque account hash', () => {
  const sql = migration();
  const table = sql.match(/create\s+table\s+offeranchor_private\.trial_account_quotas\s*\(([\s\S]*?)\n\);/i);
  assert.ok(table);
  assert.match(table[1], /scope\s+pg_catalog\.text\s+not\s+null\s+check\s*\(scope\s*~\s*'\^\[a-f0-9\]\{64\}\$'\)/i);
  assert.match(table[1], /account_hash\s+pg_catalog\.text\s+not\s+null\s+check\s*\(account_hash\s*~\s*'\^\[A-Za-z0-9_-\]\{43\}\$'\)/i);
  assert.match(table[1], /used\s+pg_catalog\.int[24]\s+not\s+null\s+default\s+0\s+check\s*\(used\s+between\s+0\s+and\s+5\)/i);
  assert.match(table[1], /primary\s+key\s*\(scope,\s*account_hash\)/i);
  assert.doesNotMatch(table[1], /\b(?:email|token|code|payload|expires|created_at|updated_at)\s+pg_catalog\./i);
  assert.match(sql, /alter\s+table\s+offeranchor_private\.trial_account_quotas\s+enable\s+row\s+level\s+security/i);
  assert.match(sql, /revoke\s+all\s+on\s+table\s+offeranchor_private\.trial_account_quotas\s+from\s+public,\s*anon,\s*authenticated,\s*service_role/i);
  assert.match(sql, /revoke\s+all\s+on\s+schema\s+offeranchor_private\s+from\s+public,\s*anon,\s*authenticated,\s*service_role/i);
  assert.match(sql, /security\s+definer\s+set\s+search_path\s*=\s*''/i);
  assert.match(sql, /revoke\s+all\s+on\s+function\s+public\.offeranchor_runtime_state\(text,\s*jsonb\)\s+from\s+public,\s*anon,\s*authenticated/i);
  assert.match(sql, /grant\s+execute\s+on\s+function\s+public\.offeranchor_runtime_state\(text,\s*jsonb\)\s+to\s+service_role/i);
  assert.doesNotMatch(sql, /grant\s+(?:all|execute|usage|select|insert|update|delete)[^;]*\bto\s+(?:public|anon|authenticated)\b/i);
});

test('only paid reservations accept bounded optional trial fields and old clients keep the original weight', () => {
  const body = rpc();
  assert.match(body, /when 'paid_reserve' then array\['scope', 'id', 'cohort', 'weight', 'sessionLimit', 'sessionWindow', 'sessionConcurrent', 'globalLimit', 'globalWindow', 'globalConcurrent'\]/);
  assert.match(body, /p_input\s*\?&\s*v_keys/);
  assert.match(body, /v_allowed_keys\s*:=\s*v_keys;\s*if\s+p_operation\s*=\s*'paid_reserve'\s+then\s*v_allowed_keys\s*:=\s*v_keys\s*\|\|\s*array\['sessionWeight',\s*'trialAccount'\]/i);
  assert.match(body, /v_key\s*=\s*any\(v_allowed_keys\)/i);
  const validation = body.slice(0, body.indexOf('perform pg_catalog.pg_advisory_xact_lock'));
  assert.match(validation, /v_session_weight\s*:=\s*v_weight;/i);
  assert.match(validation, /if\s+p_input\s*\?\s*'sessionWeight'\s+then[\s\S]*jsonb_typeof\(p_input\s*->\s*'sessionWeight'\)\s+is\s+distinct\s+from\s+'number'[\s\S]*!~\s*'\^\[0-9\]\{1,5\}\$'/i);
  assert.match(validation, /v_session_weight\s+not\s+between\s+1\s+and\s+v_weight/i);
  assert.match(validation, /if\s+p_input\s*\?\s*'trialAccount'\s+then[\s\S]*jsonb_typeof\(p_input\s*->\s*'trialAccount'\)\s+is\s+distinct\s+from\s+'string'[\s\S]*v_trial_account\s*!~\s*'\^\[A-Za-z0-9_-\]\{43\}\$'/i);
});

test('trial exhaustion and every paid limit precede one lifetime increment under the transaction lock', () => {
  const body = rpc(), paid = operation('paid_reserve');
  assert.match(body, /pg_catalog\.pg_advisory_xact_lock\(2026101801\)/);
  const trialCheck = paid.indexOf('if v_trial_account is not null then');
  const trialWrite = paid.indexOf('insert into offeranchor_private.trial_account_quotas');
  const limitsCheck = paid.indexOf('if v_local_calls + v_session_weight');
  const localWrite = paid.indexOf('update offeranchor_private.paid_windows set calls = calls +');
  assert.ok(trialCheck >= 0 && trialCheck < limitsCheck && limitsCheck < localWrite && localWrite < trialWrite);
  const exhaustion = paid.slice(trialCheck, paid.indexOf('insert into offeranchor_private.paid_windows'));
  assert.match(exhaustion, /where\s+scope\s*=\s*v_scope\s+and\s+account_hash\s*=\s*v_trial_account/i);
  assert.match(exhaustion, /coalesce\(v_trial_used,\s*0\)\s*>=\s*5/i);
  assert.match(exhaustion, /return pg_catalog\.jsonb_build_object\('ok', false, 'reason', 'trial_exhausted'\);/);
  assert.doesNotMatch(exhaustion, /'retry'|insert\s+into|update\s+offeranchor_private/i);
  const limits = paid.slice(limitsCheck, localWrite);
  assert.match(limits, /v_global_calls\s*\+\s*v_weight\s*>\s*v_global_limit/i);
  assert.match(limits, /v_local_inflight\s*>=\s*v_session_concurrent\s+or\s+v_global_inflight\s*>=\s*v_global_concurrent/i);
  assert.match(limits, /return\s+pg_catalog\.jsonb_build_object\('ok',\s*false,\s*'retry',\s*v_retry\)/i);
  assert.match(paid.slice(trialWrite), /values\s*\(v_scope,\s*v_trial_account,\s*1\)\s+on\s+conflict\s*\(scope,\s*account_hash\)\s+do\s+update\s+set\s+used\s*=\s*offeranchor_private\.trial_account_quotas\.used\s*\+\s*1/i);
  assert.ok(trialWrite < paid.indexOf('insert into offeranchor_private.paid_leases'));
});

test('accepted reservations charge a local action and raw global requests without changing release or cleanup', () => {
  const body = rpc(), paid = operation('paid_reserve'), release = operation('paid_release');
  assert.match(paid, /calls\s*=\s*calls\s*\+\s*case\s+when\s+bucket\s*=\s*'global'\s+then\s+v_weight\s+else\s+v_session_weight\s+end/i);
  assert.doesNotMatch(body, /(?:delete\s+from|truncate(?:\s+table)?|drop\s+table)\s+offeranchor_private\.trial_account_quotas/i);
  assert.doesNotMatch(body, /set\s+used\s*=\s*(?:0|[^;]*-\s*1)/i);
  assert.doesNotMatch(release, /trial_account_quotas|calls\s*=/i);
  for (const table of ['challenges', 'auth_events', 'paid_leases', 'paid_windows']) {
    assert.match(body, new RegExp('delete\\s+from\\s+offeranchor_private\\.' + table + '\\s+where', 'i'));
  }
});

test('lease retries are bound to trial identity and local weight before any counter changes', () => {
  const sql = migration(), paid = operation('paid_reserve');
  assert.match(sql, /add\s+column\s+session_weight\s+pg_catalog\.int2[\s\S]*?check\s*\(session_weight\s+between\s+1\s+and\s+weight\)/i);
  assert.match(sql, /add\s+column\s+trial_account\s+pg_catalog\.text[\s\S]*?\^\[A-Za-z0-9_-\]\{43\}\$/i);
  const retry = paid.slice(0, paid.indexOf('if v_trial_account is not null then'));
  assert.match(retry, /coalesce\(v_lease\.session_weight,\s*v_lease\.weight\)\s*<>\s*v_session_weight/i);
  assert.match(retry, /v_lease\.trial_account\s+is\s+distinct\s+from\s+v_trial_account/i);
  assert.match(retry, /not\s+v_lease\.released\s+and\s+v_lease\.expires\s*>\s*v_now/i);
  assert.match(retry, /return\s+pg_catalog\.jsonb_build_object\('ok',\s*true,\s*'leaseId',\s*v_id\)/i);
  assert.doesNotMatch(retry, /insert\s+into|update\s+offeranchor_private/i);
  assert.match(paid, /paid_leases\(scope,\s*id,\s*cohort,\s*weight,\s*session_weight,\s*trial_account,\s*expires\)\s+values\s*\(v_scope,\s*v_id,\s*v_cohort,\s*v_weight,\s*v_session_weight,\s*v_trial_account,/i);
});
