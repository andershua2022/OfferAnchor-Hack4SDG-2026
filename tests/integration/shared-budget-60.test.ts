import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {createWorkspaceApi} from '../../lib/server/workspace-api.ts';
const env={OFFERANCHOR_MODE:'simulation',APP_ORIGIN:'http://127.0.0.1:3000'};
test('shared global configuration accepts an explicit bounded sixty-call budget without changing five-account policy',async()=>{
 for(const limit of ['30','60']){const api=createWorkspaceApi({environment:()=>({...env,GLOBAL_CALL_LIMIT:limit})});const r=await api.status(new Request(env.APP_ORIGIN+'/api/session'));const v=await r.json();assert.equal(v.ready,true,limit);}
 const invalid=createWorkspaceApi({environment:()=>({...env,GLOBAL_CALL_LIMIT:'61'})});assert.equal((await(await invalid.status(new Request(env.APP_ORIGIN+'/api/session'))).json()).ready,false);
 for(const setting of [{DEMO_CALL_LIMIT:'6'},{ACCOUNT_TRIAL_ENABLED:'true',DEMO_CALL_LIMIT:'6'}]){const api=createWorkspaceApi({environment:()=>({...env,...setting})});assert.equal((await(await api.status(new Request(env.APP_ORIGIN+'/api/session'))).json()).ready,false);}
});
test('the additive shared-budget migration preserves trial rows and changes only the global bounded range',()=>{
 const sql=readFileSync('supabase/migrations/20261019_shared_budget_60.sql','utf8');assert.match(sql,/calls between 0 and 60/i);assert.match(sql,/v_global_limit not between 1 and 60/);assert.match(sql,/pg_get_functiondef/);assert.doesNotMatch(sql,/(?:delete from|truncate|drop table|set used\s*=|set calls\s*=)/i);assert.doesNotMatch(sql,/used between 0 and 60|v_session_limit not between 1 and 60/i);
});
