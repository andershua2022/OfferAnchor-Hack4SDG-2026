import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createWorkspaceApi} from '../../lib/server/workspace-api.ts';
import {createSharedState,SharedStateUnavailable} from '../../lib/server/shared-state.ts';
import {loadReferenceLibrary} from '../../lib/knowledge/index.ts';
import {fixtures} from '../../app/fixture-preview';
import content from '../../knowledge/library.json';
import en from '../../locales/en-HK.json';
import zh from '../../locales/zh-Hant-HK.json';
const origin='http://localhost:3000',project='https://synthetic-project.supabase.co';
const ids=['6c97aa7e-4a3e-4a5a-b896-6785fc3c190a','6c97aa7e-4a3e-4a5a-b896-6785fc3c190b','6c97aa7e-4a3e-4a5a-b896-6785fc3c190c','6c97aa7e-4a3e-4a5a-b896-6785fc3c190d'];
const env=()=>({APP_ORIGIN:origin,SUPABASE_URL:project,SUPABASE_PUBLISHABLE_KEY:'sb_publishable_trial_synthetic_only',APP_SESSION_SECRET:'synthetic-stable-trial-secret-123456789012345',DEMO_ACCESS_CODE:'synthetic-demo-code',ACCOUNT_TRIAL_ENABLED:'true',OFFERANCHOR_MODE:'live',MODEL_CALLS_ENABLED:'true',MODEL_API_BASE_URL:'https://api.deepseek.com/v1',MODEL_API_KEY:'synthetic-trial-model-key',MODEL_ID:'synthetic',MODEL_REGION:'not_verified'});
const user=(id:string)=>({id,aud:'authenticated',role:'authenticated',email:'private-trial@example.invalid',app_metadata:{provider:'email'},user_metadata:{},created_at:'2026-10-01T00:00:00Z'});
const token=(id:string,expired=false)=>[{alg:'HS256',typ:'JWT'},{sub:id,aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+(expired?-100:3600)},'synthetic-signature'].map(v=>Buffer.from(typeof v==='string'?v:JSON.stringify(v)).toString('base64url')).join('.');
function cookie(id=ids[0],storedId=id,expired=false){const session={access_token:token(id,expired),refresh_token:'refresh-'+id,expires_in:3600,expires_at:Math.floor(Date.now()/1000)+(expired?-100:3600),token_type:'bearer',user:user(storedId)};return 'sb-synthetic-project-auth-token=base64-'+Buffer.from(JSON.stringify(session)).toString('base64url');}
function request(path='/api/analyze',body:unknown=structuredClone(fixtures[0].request),jar=cookie(),base=origin){return new Request(base+path,{method:body===undefined?'GET':'POST',headers:{Origin:base,'Content-Type':'application/json',Cookie:jar,'X-User-Id':ids[3]},...(body===undefined?{}:{body:JSON.stringify(body)})});}
function statusRequest(jar=cookie(),base=origin){return new Request(base+'/api/session',{headers:{Cookie:jar,'X-User-Id':ids[3]}});}
function approved(){const c=structuredClone(content);c.status='approved';for(const item of [...c.cards,...c.routes])Object.assign(item,{approvalStatus:'approved',humanReviewer:'Synthetic trial reviewer',localizedMeaningApproved:true});return loadReferenceLibrary(c,{'en-HK':en,'zh-Hant-HK':zh});}
class FakeBoundary{
 authCalls=0;modelCalls=0;time=Date.now();unavailable=false;rejectIdentity=false;badId=false;raw=0;trial=new Map<string,number>();reservations:any[]=[];
 fetch:typeof fetch=async(input,init)=>{
  const url=new URL(String(input));assert.equal(url.origin,project);
  if(url.pathname==='/auth/v1/token'){
   const id=JSON.parse(String(init?.body)).refresh_token.slice('refresh-'.length);return Response.json({access_token:token(id),refresh_token:'refresh-'+id,expires_in:3600,token_type:'bearer',user:user(id)});
  }
  if(url.pathname==='/auth/v1/user'){
   this.authCalls++;if(this.unavailable)throw Error('Synthetic private auth failure');if(this.rejectIdentity)return Response.json({message:'Invalid JWT',code:'bad_jwt'},{status:401});
   const bearer=new Headers(init?.headers).get('authorization')?.slice(7);let subject='';try{subject=JSON.parse(Buffer.from(bearer?.split('.')[1]??'','base64url').toString()).sub;}catch{}const id=ids.find(id=>id===subject);if(!id)return Response.json({message:'Invalid JWT'},{status:401});return Response.json(user(this.badId?'browser-forged-id':id));
  }
  assert.equal(url.pathname,'/rest/v1/rpc/offeranchor_runtime_state');const {p_operation:op,p_input:p}=JSON.parse(String(init?.body));
  if(op==='paid_release'||op==='demo_login')return Response.json({ok:true});assert.equal(op,'paid_reserve');this.reservations.push(p);
  if(p.trialAccount&&(this.trial.get(p.trialAccount)??0)>=5)return Response.json({ok:false,reason:'trial_exhausted'});
  if(this.raw+p.weight>30)return Response.json({ok:false,retry:3600});this.raw+=p.weight;
  if(p.trialAccount)this.trial.set(p.trialAccount,(this.trial.get(p.trialAccount)??0)+1);
  return Response.json({ok:true,leaseId:p.id});
 };
 api(overrides:Record<string,string|undefined>={},onCall:()=>Promise<void>=async()=>{}){return createWorkspaceApi({environment:()=>({...env(),...overrides}),fetch:this.fetch,now:()=>this.time,library:approved,providerFactory:()=>({modelId:'synthetic',region:'not_verified',maxRequestsPerExtraction:2,extract:async()=>{this.modelCalls++;await onCall();throw Error('Synthetic model failure after reservation');}})});}
}
async function aux(api:ReturnType<typeof createWorkspaceApi>,jar=cookie(),paid=true,base=origin){return api.auxiliary(request('/api/knowledge/ask',{question:'Synthetic source question'},jar,base),v=>v,async(_v,c)=>paid?c.runPaid(async()=>Response.json({ok:true})):Response.json({sourceOnly:true}));}

test('trial authorization uses verified Supabase UUID, not stored session user or forged headers; status reports total policy without remaining counts',async()=>{
 const b=new FakeBoundary(),api=b.api({DEMO_ACCESS_CODE:''});const response=await api.status(statusRequest(cookie(ids[0],ids[3]))),value=await response.json();
 assert.equal(value.authorized,true);assert.equal(value.accessRequired,false);assert.equal(value.ready,true);assert.deepEqual(value.trialPolicy,{limit:5,period:'lifetime',unit:'ai_action_attempt'});assert.equal(value.remaining,undefined);assert.equal(b.authCalls,1);
 assert.ok(!JSON.stringify(value).includes(ids[0]));assert.ok(!JSON.stringify(value).includes('private-trial'));
 assert.equal((await api.post(request('/api/analyze',fixtures[0].request,''))).status,403);assert.equal(b.modelCalls,0);
 b.rejectIdentity=true;assert.equal((await api.post(request())).status,403);assert.equal(b.modelCalls,0);
});

test('each verified account has five lifetime action attempts despite raw weight two; failures count and code rotation or elapsed windows cannot refill',async()=>{
 const b=new FakeBoundary();let code='synthetic-demo-code';const api=createWorkspaceApi({environment:()=>({...env(),DEMO_ACCESS_CODE:code}),fetch:b.fetch,now:()=>b.time,library:approved,providerFactory:()=>({modelId:'synthetic',region:'not_verified',maxRequestsPerExtraction:2,extract:async()=>{b.modelCalls++;throw Error('Synthetic charged failure');}})});
 for(let i=0;i<5;i++)assert.equal((await api.post(request())).status,502);const sixth=await api.post(request());assert.equal(sixth.status,429);assert.equal((await sixth.json()).retryable,false);assert.equal(sixth.headers.get('retry-after'),null);assert.equal(sixth.headers.get('x-offeranchor-trial-exhausted'),'1');assert.equal(b.modelCalls,5);
 b.time+=86400001;code='synthetic-rotated-demo-code';assert.equal((await api.post(request())).status,429);assert.equal((await api.post(request('/api/analyze',fixtures[0].request,cookie(ids[1])))).status,502);assert.equal(b.modelCalls,6);
});

test('paid auxiliary actions share the account lifetime allowance, source-only retrieval costs zero, and malformed input costs zero',async()=>{
 const b=new FakeBoundary(),api=b.api();for(let i=0;i<7;i++)assert.equal((await aux(api,cookie(),false)).status,200);
 assert.equal((await api.post(request('/api/analyze',{bad:true}))).status,400);assert.equal((await api.post(request())).status,502);
 for(let i=0;i<4;i++)assert.equal((await aux(api)).status,200);const denied=await aux(api);assert.equal(denied.status,429);assert.equal((await denied.json()).retryable,false);assert.equal(denied.headers.get('retry-after'),null);assert.equal((await aux(api,cookie(),false)).status,200);
});

test('shared replicas atomically account one trial action and two raw calls; durable counters do not refill across factory recreation',async()=>{
 const b=new FakeBoundary(),remote='https://product.example',overrides={APP_ORIGIN:remote,RUNTIME_STATE_MODE:'shared',SUPABASE_SERVER_KEY:'sb_secret_synthetic_trial_state_tests_only'},api=b.api(overrides);
 for(let i=0;i<5;i++)assert.equal((await api.post(request('/api/analyze',fixtures[0].request,cookie(),remote))).status,502);
 assert.equal(b.raw,10);assert.equal([...b.trial.values()][0],5);for(const p of b.reservations){assert.equal(p.weight,2);assert.equal(p.sessionWeight,1);assert.match(p.trialAccount,/^[A-Za-z0-9_-]{43}$/);assert.equal(p.trialAccount,p.cohort);assert.ok(!JSON.stringify(p).includes(ids[0]));}
 const recreated=b.api({...overrides,DEMO_ACCESS_CODE:'synthetic-rotated-demo-code'});const denied=await recreated.post(request('/api/analyze',fixtures[0].request,cookie(),remote));assert.equal(denied.status,429);assert.equal(denied.headers.get('retry-after'),null);assert.equal(b.raw,10);assert.equal(b.modelCalls,5);
});

test('global raw-call and concurrency ceilings remain unchanged while account trial weight stays one',async()=>{
 const b=new FakeBoundary(),api=b.api();for(const id of ids.slice(0,3))for(let i=0;i<5;i++)assert.equal((await api.post(request('/api/analyze',fixtures[0].request,cookie(id)))).status,502);
 assert.equal((await api.post(request('/api/analyze',fixtures[0].request,cookie(ids[3])))).status,429);assert.equal(b.modelCalls,15);b.time+=3600001;for(let i=0;i<5;i++)assert.equal((await api.post(request('/api/analyze',fixtures[0].request,cookie(ids[3])))).status,502);const exhausted=await api.post(request('/api/analyze',fixtures[0].request,cookie(ids[3])));assert.equal((await exhausted.json()).retryable,false);
 const c=new FakeBoundary(),releases:(()=>void)[]=[],held=c.api({},()=>new Promise<void>(resolve=>releases.push(resolve))),first=held.post(request()),second=held.post(request('/api/analyze',fixtures[0].request,cookie(ids[1])));
 for(let i=0;i<100&&releases.length<2;i++)await new Promise(r=>setTimeout(r,1));assert.equal(releases.length,2);assert.equal((await held.post(request('/api/analyze',fixtures[0].request,cookie(ids[2])))).status,429);for(const release of releases)release();await Promise.all([first,second]);
});

test('identity verification failures fail closed and refreshed auth cookies survive status, analysis failure and auxiliary responses',async()=>{
 const b=new FakeBoundary(),api=b.api();b.unavailable=true;assert.equal((await api.post(request())).status,503);assert.equal((await api.status(statusRequest())).status,503);assert.equal(b.modelCalls,0);b.unavailable=false;b.badId=true;assert.equal((await api.post(request())).status,503);assert.equal(b.modelCalls,0);b.badId=false;
 for(const run of [()=>api.status(statusRequest(cookie(ids[0],ids[0],true))),()=>api.post(request('/api/analyze',fixtures[0].request,cookie(ids[0],ids[0],true))),()=>aux(api,cookie(ids[0],ids[0],true),false)]){
  const response=await run();assert.ok(response.headers.getSetCookie().some(c=>c.includes('auth-token=')&&c.includes('HttpOnly')));
 }
});

test('disabled trial keeps exact legacy status and explicit judge demo fallback without account verification',async()=>{
 const b=new FakeBoundary(),api=b.api({ACCOUNT_TRIAL_ENABLED:'false'}),value=await(await api.status(statusRequest())).json();assert.deepEqual(Object.keys(value).sort(),['accessRequired','authorized','expiresAt','mode','ready','reason']);assert.equal(value.authorized,false);assert.equal(b.authCalls,0);
 const enabled=b.api(),login=await enabled.login(request('/api/session',{accessCode:'synthetic-demo-code'},'')),demo=login.headers.get('set-cookie')!.split(';')[0];assert.equal(login.status,200);
 assert.equal((await enabled.post(request('/api/analyze',fixtures[0].request,demo))).status,502);assert.equal(b.authCalls,0);
 const simulation=b.api({OFFERANCHOR_MODE:'simulation'});const preview=await simulation.post(request('/api/analyze',fixtures[0].request,''));assert.equal(preview.status,200);assert.equal((await preview.json()).mode,'simulation');assert.equal(b.authCalls,0);
});

test('trial exhaustion reply and optional session weight are accepted only for valid explicit account reservations',async()=>{
 const base={APP_ORIGIN:'https://product.example',SUPABASE_URL:project,SUPABASE_SERVER_KEY:'sb_secret_synthetic_trial_state_tests_only'};let calls=0;
 const state=createSharedState(base,{fetch:async()=>{calls++;return Response.json({ok:false,reason:'trial_exhausted'});}})!;
 assert.deepEqual(await state.call('paid_reserve',{trialAccount:'a'.repeat(43),weight:2,sessionWeight:1}),{ok:false,reason:'trial_exhausted'});
 await assert.rejects(state.call('paid_reserve',{weight:2}),SharedStateUnavailable);
 for(const sessionWeight of [0,3,1.5,'1'])await assert.rejects(state.call('paid_reserve',{trialAccount:'a'.repeat(43),weight:2,sessionWeight}),SharedStateUnavailable);
 assert.equal(calls,2);
});


test('a hanging identity lookup is bounded below the status deadline and foreign actions never begin verification',async()=>{
 let authCalls=0,modelCalls=0;const api=createWorkspaceApi({environment:env,library:approved,fetch:async()=>{authCalls++;return new Promise<Response>(()=>{});},providerFactory:()=>({modelId:'synthetic',region:'not_verified',extract:async()=>{modelCalls++;throw Error('Must not reach model');}})});
 const foreign=new Request(origin+'/api/analyze',{method:'POST',headers:{Origin:'https://foreign.example','Content-Type':'application/json',Cookie:cookie()},body:JSON.stringify(fixtures[0].request)});assert.equal((await api.post(foreign)).status,403);assert.equal(authCalls,0);
 const started=Date.now(),response=await api.status(statusRequest());assert.equal(response.status,503);assert.ok(Date.now()-started<4800);assert.equal(authCalls,1);assert.equal(modelCalls,0);
});
