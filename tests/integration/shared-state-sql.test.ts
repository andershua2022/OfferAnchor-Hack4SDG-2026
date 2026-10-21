import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import test from 'node:test';

const path=new URL('../../supabase/migrations/20261018_runtime_state.sql',import.meta.url);
function migration(){
 assert.ok(existsSync(path),'The deployment-safe shared-state SQL migration must exist');
 return readFileSync(path,'utf8').replace(/--[^\n]*/g,'');
}
function rpc(){const sql=migration();const match=sql.match(/as\s+\$runtime_state\$([\s\S]*?)\$runtime_state\$/i);assert.ok(match,'A bounded RPC body must exist');return match[1];}
function operation(name:string){const source=rpc(),body=source.slice(source.indexOf('perform pg_catalog.pg_advisory_xact_lock')); const start=body.indexOf("if p_operation = '"+name+"' then");assert.ok(start>=0,name+' must be an explicit finite operation');const tail=body.slice(start+1);const end=tail.search(/\n  if p_operation = '/);return end<0?body.slice(start):body.slice(start,start+1+end);}

// These inspect the shipped SQL contract only; no database connection or SQL execution occurs.
test('SQL RPC is restricted to the service role with an empty definer search path',()=>{
 const sql=migration();assert.match(sql,/create\s+function\s+public\.offeranchor_runtime_state\s*\(\s*p_operation\s+(?:pg_catalog\.)?text\s*,\s*p_input\s+(?:pg_catalog\.)?jsonb/i);
 assert.match(sql,/returns\s+(?:pg_catalog\.)?jsonb\s+language\s+plpgsql\s+security\s+definer\s+set\s+search_path\s*=\s*''/i);
 assert.match(sql,/revoke\s+all\s+on\s+function\s+public\.offeranchor_runtime_state\(text,\s*jsonb\)\s+from\s+public,\s*anon,\s*authenticated/i);
 assert.match(sql,/grant\s+execute\s+on\s+function\s+public\.offeranchor_runtime_state\(text,\s*jsonb\)\s+to\s+service_role/i);
 assert.doesNotMatch(sql,/grant\s+(?:all|execute|usage|select|insert|update|delete)[^;]*\bto\s+(?:public|anon|authenticated)\b/i);
 assert.match(sql,/revoke\s+all\s+on\s+schema\s+offeranchor_private\s+from\s+public,\s*anon,\s*authenticated,\s*service_role/i);
});

test('SQL tables are private, bounded transient state without evidence or tokens',()=>{
 const sql=migration();const tables=[...sql.matchAll(/create\s+table\s+(offeranchor_private\.\w+)\s*\(([\s\S]*?)\n\);/gi)];
 assert.deepEqual(tables.map(t=>t[1]).sort(),['offeranchor_private.auth_events','offeranchor_private.challenges','offeranchor_private.paid_leases','offeranchor_private.paid_windows']);
 for(const [_,table,columns] of tables){assert.match(sql,new RegExp('alter\\s+table\\s+'+table.replace('.','\\.')+'\\s+enable\\s+row\\s+level\\s+security','i'));assert.doesNotMatch(columns,/\b(?:evidence|otp|token|session_token|code|payload|request_body|provider_response)\s+(?:pg_catalog\.)?\w+/i);}
 assert.match(sql,/revoke\s+all\s+on\s+table[\s\S]*?offeranchor_private\.paid_leases[\s\S]*?from\s+public,\s*anon,\s*authenticated,\s*service_role/i);
 assert.match(tables.find(t=>t[1].endsWith('.auth_events'))![2],/subject\s+(?:pg_catalog\.)?text[\s\S]*\^\[a-f0-9\]\{64\}\$/i);
 assert.match(tables.find(t=>t[1].endsWith('.paid_leases'))![2],/primary\s+key\s*\(scope,\s*id\)/i);
});

test('SQL rejects unknown operations, extra keys and malformed identifiers before mutation',()=>{
 const body=rpc();const names=['auth_start','challenge_create','challenge_revoke','challenge_claim','challenge_check','challenge_finish','demo_login','paid_reserve','paid_release'];
 for(const name of names){assert.match(body,new RegExp("when '"+name+"' then array\\["));operation(name);}
 assert.match(body,/jsonb_typeof\(p_input\)\s+is\s+distinct\s+from\s+'object'/i);
 assert.match(body,/jsonb_object_keys\(p_input\)/i);assert.match(body,/p_input\s*\?&\s*v_keys/i);
 assert.match(body,/\^\[a-f0-9\]\{64\}\$/);assert.match(body,/\^\[A-Za-z0-9_-\]\{43\}\$/);assert.match(body,/\[0-9a-fA-F\]\{8\}-\[0-9a-fA-F\]\{4\}/);
 assert.match(body,/message\s*=\s*'invalid runtime state input'/i);assert.doesNotMatch(body,/\b(?:execute|raise\s+(?:log|notice|info|warning)|notify)\b/i);
 const writes=[...body.matchAll(/(?:insert\s+into|update|delete\s+from)\s+([\w.]+)/gi)];assert.ok(writes.length>0);assert.ok(writes.every(w=>w[1].startsWith('offeranchor_private.')));
});

test('SQL serializes state transitions with database time and indexed bounded cleanup',()=>{
 const body=rpc(),sql=migration();assert.match(body,/pg_catalog\.pg_advisory_xact_lock\(\d+\)/);assert.match(body,/v_now\s*:=\s*pg_catalog\.clock_timestamp\(\)/);
 assert.ok(body.indexOf('pg_advisory_xact_lock')<body.indexOf('pg_catalog.clock_timestamp'));
 for(const table of ['challenges','auth_events','paid_leases','paid_windows'])assert.match(sql,new RegExp('create\\s+index[^;]+on\\s+offeranchor_private\\.'+table+'\\s*\\((?:expires|created_at|started)\\)','i'));
 assert.match(body,/auth_events\s+where\s+created_at\s*<=\s*v_now\s*-\s*interval\s+'1 hour'/i);
 assert.match(body,/paid_leases\s+where\s+expires\s*<=\s*v_now\s*-\s*interval\s+'1 day'/i);
 assert.match(body,/paid_windows\s+where\s+started\s*<=\s*v_now\s*-\s*interval\s+'2 days'/i);
});

test('SQL email cooldown precedes shared auth limits and attempted sends are counted',()=>{
 const start=operation('auth_start');assert.ok(start.indexOf("'email_send_wait'")<start.indexOf("'rate_limited'"));
 assert.match(start,/interval\s+'60 seconds'/i);assert.match(start,/v_public_email\s+then\s+20\s+else\s+2/i);assert.match(start,/interval\s+'1 hour'/i);assert.match(start,/v_limit\s*:=\s*20/i);
 assert.match(start,/insert\s+into\s+offeranchor_private\.auth_events/i);assert.match(start,/v_count\s*>=\s*100/i);assert.match(start,/v_previous_id/i);
});

test('SQL challenge claims bind a sixty-second claim and preserve the fifth successful attempt',()=>{
 const create=operation('challenge_create'),claim=operation('challenge_claim'),check=operation('challenge_check'),finish=operation('challenge_finish');
 assert.match(create,/interval\s+'10 minutes'/i);assert.match(create,/v_count\s*>=\s*100/i);assert.doesNotMatch(create,/on\s+conflict/i);
 assert.match(claim,/v_challenge\.attempts\s*>=\s*5/i);assert.match(claim,/v_count\s*>=\s*30/i);assert.match(claim,/interval\s+'10 minutes'/i);assert.match(claim,/interval\s+'60 seconds'/i);assert.match(claim,/attempts\s*=\s*attempts\s*\+\s*1/i);
 assert.ok(claim.indexOf("'code_expired'")<claim.indexOf('offeranchor_private.auth_events'));
 for(const part of [check,finish]){assert.match(part,/claim_id\s*=\s*v_claim_id/i);assert.match(part,/claim_expires\s*>\s*v_now/i);assert.match(part,/expires\s*>\s*v_now/i);}
 assert.ok(finish.indexOf('if v_consume then')<finish.indexOf('v_challenge.attempts >= 5'));
 assert.match(finish,/claim_id\s*=\s*null,\s*claim_expires\s*=\s*null/i);
});

test('SQL demo-login uses ten attempts per anchored sixty-second window',()=>{
 const login=operation('demo_login');assert.match(login,/'demo-login'/);assert.match(login,/interval\s+'60 seconds'/i);assert.match(login,/v_window\.calls\s*>=\s*10/i);assert.match(login,/calls\s*=\s*calls\s*\+\s*1/i);
});

test('SQL paid reserve keeps fixed-window cost independent of active leases and refuses replay',()=>{
 const body=rpc(),paid=operation('paid_reserve'),release=operation('paid_release');
 for(const pattern of [/v_weight\s+not\s+in\s*\(1,\s*2\)/i,/v_session_limit\s+not\s+between\s+1\s+and\s+5/i,/v_global_limit\s+not\s+between\s+1\s+and\s+30/i,/v_session_window\s+not\s+between\s+600\s+and\s+86400/i,/v_global_window\s+not\s+between\s+3600\s+and\s+86400/i,/v_session_concurrent\s*<>\s*1/i,/v_global_concurrent\s+not\s+between\s+1\s+and\s+2/i])assert.match(body,pattern);
 assert.match(paid,/v_lease\.cohort\s*<>\s*v_cohort\s+or\s+v_lease\.weight\s*<>\s*v_weight/i);assert.match(paid,/not\s+v_lease\.released\s+and\s+v_lease\.expires\s*>\s*v_now/i);
 assert.ok(paid.indexOf('v_lease.cohort')<paid.indexOf('insert into offeranchor_private.paid_windows'));
 assert.match(paid,/started\s*=\s*v_now,\s*calls\s*=\s*0/i);assert.doesNotMatch(paid,/date_trunc|extract\s*\(\s*epoch[^)]*\/\s*v_/i);
 assert.match(paid,/not\s+released\s+and\s+expires\s*>\s*v_now/i);assert.match(paid,/calls\s*=\s*calls\s*\+\s*v_weight/i);assert.match(paid,/interval\s+'60 seconds'/i);
 assert.match(release,/set\s+released\s*=\s*true/i);assert.doesNotMatch(release,/calls\s*=|delete\s+from\s+offeranchor_private\.paid_leases/i);
});

