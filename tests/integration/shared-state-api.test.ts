import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createAccountApi} from '../../lib/server/account-api.ts';
import {createWorkspaceApi} from '../../lib/server/workspace-api.ts';
import {loadReferenceLibrary} from '../../lib/knowledge/index.ts';
import content from '../../knowledge/library.json';
import en from '../../locales/en-HK.json';
import zh from '../../locales/zh-Hant-HK.json';
import {fixtures} from '../../app/fixture-preview';

const origin='https://product.example',project='https://synthetic-project.supabase.co';
const serverKey='sb_secret_synthetic_shared_state_tests_only';
const environment=()=>({APP_ORIGIN:origin,SUPABASE_URL:project,SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic_tests_only',SUPABASE_SERVER_KEY:serverKey,RUNTIME_STATE_MODE:'shared',EMAIL_SIGNUP_PUBLIC_ENABLED:'true',OFFERANCHOR_MODE:'live',MODEL_CALLS_ENABLED:'true',DEMO_ACCESS_CODE:'synthetic-demo-code',APP_SESSION_SECRET:'synthetic-session-secret-for-tests-only-1234',MODEL_API_BASE_URL:'https://api.deepseek.com/v1',MODEL_API_KEY:'synthetic-model-key',MODEL_ID:'synthetic',MODEL_REGION:'not_verified'});
const user={id:'6c97aa7e-4a3e-4a5a-b896-6785fc3c190a',aud:'authenticated',role:'authenticated',email:'synthetic@example.invalid',app_metadata:{provider:'email'},user_metadata:{},created_at:'2026-10-01T00:00:00Z'};
const token=[{alg:'HS256',typ:'JWT'},{sub:user.id,aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+3600},'synthetic-signature'].map(v=>Buffer.from(typeof v==='string'?v:JSON.stringify(v)).toString('base64url')).join('.');
function request(path:string,body?:unknown,cookie='',base=origin){return new Request(base+path,{method:body===undefined?'GET':'POST',headers:{Origin:base,'Content-Type':'application/json',Cookie:cookie},...(body===undefined?{}:{body:JSON.stringify(body)})});}
function cookies(response:Response,previous=''){const jar=new Map(previous.split(';').filter(Boolean).map(item=>{const [k,...v]=item.trim().split('=');return [k,v.join('=')];}));for(const value of response.headers.getSetCookie()){const [k,...v]=value.split(';')[0].split('=');if(v.join('='))jar.set(k,v.join('='));else jar.delete(k);}return [...jar].map(([k,v])=>k+'='+v).join('; ');}
function approved(){const value=structuredClone(content);value.status='approved';for(const item of [...value.cards,...value.routes])Object.assign(item,{approvalStatus:'approved',humanReviewer:'Synthetic test reviewer',localizedMeaningApproved:true});return loadReferenceLibrary(value,{'en-HK':en,'zh-Hant-HK':zh});}

// Deterministic external-boundary double; this does not execute or validate Postgres transactions.
class FakeDatabase{
 time=1000;available=true;malformed=false;loseReplyFor:string|null=null;authCalls=0;paidCalls=0;rpcCalls=0;wrongCode=false;
 holdVerify:(()=>Promise<void>)|null=null;
 events:{scope:string;kind:string;subject:string;at:number}[]=[];
 challenges=new Map<string,{email:string;expires:number;attempts:number;claim:string|null;claimExpires:number}>();
 windows=new Map<string,{started:number;calls:number}>();
 leases=new Map<string,{cohort:string;weight:number;expires:number;released:boolean}>();
 operations:string[]=[];
 key(p:Record<string,any>,id:string){return p.scope+':'+id;}
 window(key:string,seconds:number){let row=this.windows.get(key);if(!row){row={started:this.time,calls:0};this.windows.set(key,row);}if(this.time-row.started>=seconds*1000){row.started=this.time;row.calls=0;}return row;}
 run(op:string,p:Record<string,any>):Record<string,unknown>{
  this.operations.push(op);
  const id=this.key(p,p.id);
  if(op==='auth_start'){
   const seconds=p.method==='email'?3600:60,limit=p.method==='email'?(p.publicEmail?20:2):20;
   if(p.method==='email'&&this.events.some(e=>e.scope===p.scope&&e.kind==='email'&&e.subject===p.emailKey&&e.at>this.time-60000))return {ok:false,reason:'email_send_wait',retry:60};
   const events=this.events.filter(e=>e.scope===p.scope&&e.kind===p.method&&e.at>this.time-seconds*1000);
   if(events.length>=limit)return {ok:false,reason:'rate_limited',retry:Math.max(1,Math.ceil((events[0].at+seconds*1000-this.time)/1000))};
   this.events.push({scope:p.scope,kind:p.method,subject:p.emailKey,at:this.time});return {ok:true};
  }
  if(op==='demo_login'){const row=this.window(this.key(p,'demo-login'),60);if(row.calls>=10)return {ok:false,reason:'rate_limited',retry:60};row.calls++;return {ok:true};}
  if(op==='challenge_create'){if(p.previousId)this.challenges.delete(this.key(p,p.previousId));this.challenges.set(id,{email:p.email,expires:this.time+600000,attempts:0,claim:null,claimExpires:0});return {ok:true};}
  if(op==='challenge_revoke'){this.challenges.delete(id);return {ok:true};}
  const challenge=this.challenges.get(id);
  if(op==='challenge_claim'){
   if(!challenge||challenge.expires<=this.time||challenge.attempts>=5)return {ok:false,reason:'code_expired'};
   const attempts=this.events.filter(e=>e.scope===p.scope&&e.kind==='verify'&&e.at>this.time-600000);
   if(challenge.claim&&challenge.claimExpires>this.time||attempts.length>=30)return {ok:false,reason:'rate_limited'};
   challenge.attempts++;challenge.claim=p.claimId;challenge.claimExpires=this.time+60000;
   this.events.push({scope:p.scope,kind:'verify',subject:'',at:this.time});return {ok:true,email:challenge.email};
  }
  if(op==='challenge_check'||op==='challenge_finish'){
   if(!challenge||challenge.expires<=this.time||challenge.claim!==p.claimId||challenge.claimExpires<=this.time)return {ok:false,reason:'code_expired'};
   if(op==='challenge_check')return {ok:true};
   if(p.consume){this.challenges.delete(id);return {ok:true};}
   if(challenge.attempts>=5){this.challenges.delete(id);return {ok:false,reason:'code_expired'};}
   challenge.claim=null;return {ok:true};
  }
  if(op==='paid_reserve'){
   const existing=this.leases.get(id);if(existing)return existing.expires>this.time&&!existing.released?{ok:true,leaseId:p.id}:{ok:false,retry:1};
   const global=this.window(this.key(p,'global'),p.globalWindow),local=this.window(this.key(p,'cohort:'+p.cohort),p.sessionWindow);
   const active=[...this.leases.entries()].filter(([k,v])=>k.startsWith(p.scope+':')&&!v.released&&v.expires>this.time).map(([,v])=>v);
   if(local.calls+p.weight>p.sessionLimit||global.calls+p.weight>p.globalLimit||active.filter(v=>v.cohort===p.cohort).length>=p.sessionConcurrent||active.length>=p.globalConcurrent)return {ok:false,retry:600};
   global.calls+=p.weight;local.calls+=p.weight;this.leases.set(id,{cohort:p.cohort,weight:p.weight,expires:this.time+60000,released:false});return {ok:true,leaseId:p.id};
  }
  if(op==='paid_release'){const lease=this.leases.get(id);if(lease)lease.released=true;return {ok:true};}
  throw Error('Unexpected synthetic RPC operation: '+op);
 }
 fetch:typeof fetch=async(input,init)=>{
  const url=new URL(String(input));
  assert.equal(url.origin,project);
  if(url.pathname.startsWith('/rest/v1/')){
   this.rpcCalls++;assert.equal(url.pathname,'/rest/v1/rpc/offeranchor_runtime_state');assert.equal(init?.method,'POST');assert.equal(init?.redirect,'error');assert.equal(init?.cache,'no-store');assert.equal(new Headers(init?.headers).get('apikey'),serverKey);
   if(!this.available)throw Error('PRIVATE DATABASE ERROR '+serverKey);
   if(this.malformed)return Response.json({ok:true,privateExtra:'PRIVATE DATABASE CONTENT'});
   const body=JSON.parse(String(init?.body));assert.deepEqual(Object.keys(body).sort(),['p_input','p_operation']);assert.match(body.p_input.scope,/^[a-f0-9]{64}$/);
   const reply=this.run(body.p_operation,body.p_input);if(this.loseReplyFor===body.p_operation){this.loseReplyFor=null;throw Error('Synthetic committed response lost');}return Response.json(reply);
  }
  assert.ok(url.pathname.startsWith('/auth/v1/'));assert.ok(!new Headers(init?.headers).get('apikey')?.includes('sb_secret'));this.authCalls++;
  if(url.pathname==='/auth/v1/otp')return Response.json({});
  if(url.pathname==='/auth/v1/verify'){if(this.holdVerify)await this.holdVerify();if(this.wrongCode)return Response.json({message:'Synthetic invalid code',error_code:'otp_expired'},{status:400});return Response.json({access_token:token,refresh_token:'synthetic-refresh',expires_in:3600,token_type:'bearer',user});}
  if(url.pathname==='/auth/v1/user')return Response.json(user);
  if(url.pathname==='/auth/v1/logout')return new Response(null,{status:204});
  throw Error('Unexpected synthetic auth endpoint');
 };
}
const account=(db:FakeDatabase,overrides:Record<string,string|undefined>={})=>createAccountApi({environment:()=>({...environment(),...overrides}),fetch:db.fetch,now:()=>db.time});
function workspace(db:FakeDatabase,weight:1|2=1,onCall:()=>Promise<void>=async()=>{},overrides:Record<string,string|undefined>={}){
 return createWorkspaceApi({environment:()=>({...environment(),...overrides}),fetch:db.fetch,now:()=>db.time,library:approved,providerFactory:()=>({modelId:'synthetic',region:'not_verified',maxRequestsPerExtraction:weight,extract:async()=>{db.paidCalls++;await onCall();throw Error('Synthetic paid failure');}})});
}
async function unlock(api:ReturnType<typeof createWorkspaceApi>,code='synthetic-demo-code'){const response=await api.login(request('/api/session',{accessCode:code}));assert.equal(response.status,200);return cookies(response);}
const analyze=(api:ReturnType<typeof createWorkspaceApi>,cookie:string)=>api.post(request('/api/analyze',structuredClone(fixtures[0].request),cookie));
const auxiliary=(api:ReturnType<typeof createWorkspaceApi>,cookie:string)=>api.auxiliary(request('/api/knowledge/ask',{question:'Synthetic question'},cookie),v=>v,async(_v,c)=>c.runPaid(async()=>Response.json({ok:true})));
async function sent(api:ReturnType<typeof createAccountApi>,jar=''){const response=await api.start(request('/api/account/start',{method:'email',email:user.email},jar));assert.equal(response.status,200);return cookies(response,jar);}
async function until(check:()=>boolean){for(let i=0;i<100&&!check();i++)await new Promise(r=>setTimeout(r,1));assert.ok(check(),'Synthetic operation did not reach its boundary');}

test('remote HTTPS and Vercel cannot use missing shared configuration or a local-mode bypass',async()=>{
 for(const overrides of [{SUPABASE_SERVER_KEY:''},{SUPABASE_SERVER_KEY:'',RUNTIME_STATE_MODE:'local'},{SUPABASE_SERVER_KEY:'',APP_ORIGIN:'http://localhost:3000',VERCEL:'1'}]){
  const db=new FakeDatabase(),base=overrides.APP_ORIGIN||origin;
  const api=account(db,overrides);
  assert.equal((await api.start(request('/api/account/start',{method:'google'},'',base))).status,503);
  assert.equal(db.authCalls,0);assert.equal(db.rpcCalls,0);
 }
 const db=new FakeDatabase(),api=workspace(db,1,async()=>{},{SUPABASE_SERVER_KEY:''});
 assert.equal((await api.login(request('/api/session',{accessCode:'synthetic-demo-code'}))).status,503);assert.equal(db.paidCalls,0);
});

test('a code-only email challenge sent on one API instance verifies on another and cannot replay',async()=>{
 const db=new FakeDatabase(),a=account(db),b=account(db),jar=await sent(a);
 const response=await b.verifyEmail(request('/api/account/verify',{code:'12345678'},jar));
 assert.equal(response.status,200);assert.equal((await response.json()).status,'signed_in');
 assert.ok(response.headers.getSetCookie().some(c=>c.includes('auth-token')));assert.equal((await a.verifyEmail(request('/api/account/verify',{code:'12345678'},jar))).status,410);
 assert.equal(db.challenges.size,0);
});

test('shared challenges enforce five wrong attempts and cannot accept email or challenge data from the body',async()=>{
 const db=new FakeDatabase(),a=account(db),b=account(db),jar=await sent(a);db.wrongCode=true;
 assert.equal((await b.verifyEmail(request('/api/account/verify',{code:'12345678',email:user.email},jar))).status,400);
 for(let i=0;i<4;i++)assert.equal((await (i%2?a:b).verifyEmail(request('/api/account/verify',{code:'12345678'},jar))).status,400);
 assert.equal((await b.verifyEmail(request('/api/account/verify',{code:'12345678'},jar))).status,410);
 const calls=db.authCalls;assert.equal((await a.verifyEmail(request('/api/account/verify',{code:'12345678'},jar))).status,410);assert.equal(db.authCalls,calls);
});

test('shared expiry and resend revoke an old challenge across instances',async()=>{
 const db=new FakeDatabase(),a=account(db),b=account(db),old=await sent(a);db.time+=61000;
 const latest=await sent(b,old);assert.equal((await a.verifyEmail(request('/api/account/verify',{code:'12345678'},old))).status,410);
 db.time+=600001;assert.equal((await a.verifyEmail(request('/api/account/verify',{code:'12345678'},latest))).status,410);
});

test('a logout on another instance invalidates a pending verification before provisional cookies commit',async()=>{
 const db=new FakeDatabase(),a=account(db),b=account(db),jar=await sent(a);let release!:()=>void,entered=false;
 db.holdVerify=async()=>{entered=true;await new Promise<void>(r=>{release=r;});};
 const pending=b.verifyEmail(request('/api/account/verify',{code:'12345678'},jar));await until(()=>entered);
 assert.equal((await a.verifyEmail(request('/api/account/verify',{code:'12345678'},jar))).status,429);
 assert.equal((await a.signOut(request('/api/account/logout',{},jar))).status,200);
 release();const result=await pending;assert.equal(result.status,410);assert.equal(result.headers.getSetCookie().length,0);
});

test('shared email cooldown and Google initiation limits cannot reset on a fresh instance',async()=>{
 const db=new FakeDatabase(),a=account(db),b=account(db);await sent(a);
 assert.equal((await b.start(request('/api/account/start',{method:'email',email:user.email}))).status,429);
 for(let i=0;i<20;i++)assert.equal((await (i%2?a:b).start(request('/api/account/start',{method:'google'}))).status,200);
 assert.equal((await account(db).start(request('/api/account/start',{method:'google'}))).status,429);
});

test('shared store outage and malformed RPC results never fall back or expose private details',async()=>{
 for(const malformed of [false,true]){
  const db=new FakeDatabase();db.available=malformed;db.malformed=malformed;
  const result=await account(db).start(request('/api/account/start',{method:'email',email:user.email}));
  assert.equal(result.status,503);assert.equal(db.authCalls,0);
  assert.ok(!(await result.text()).includes('PRIVATE'));assert.equal(result.headers.getSetCookie().length,0);assert.equal(db.rpcCalls,1);
 }
});

test('five failed paid attempts share the same allowance across API instances and auxiliary routes',async()=>{
 const db=new FakeDatabase(),a=workspace(db),b=workspace(db),jar=await unlock(a);
 for(let i=0;i<4;i++)assert.equal((await analyze(i%2?a:b,jar)).status,502);
 assert.equal((await auxiliary(b,jar)).status,200);
 assert.equal((await analyze(workspace(db),jar)).status,429);assert.equal(db.paidCalls,4);
 db.time+=600001;assert.equal((await analyze(b,jar)).status,502);
});

test('two fixed model requests reserve two calls before extraction; auxiliary work reserves one',async()=>{
 const db=new FakeDatabase(),a=workspace(db,2),b=workspace(db,2),jar=await unlock(a);
 assert.equal((await analyze(a,jar)).status,502);assert.equal((await analyze(b,jar)).status,502);
 assert.equal((await analyze(a,jar)).status,429);assert.equal(db.paidCalls,2);
 assert.equal((await auxiliary(b,jar)).status,200);assert.equal((await auxiliary(a,jar)).status,429);
});

test('shared in-flight reservations prevent concurrent extraction on different API instances',async()=>{
 const db=new FakeDatabase();let entered=false,release!:()=>void;
 const a=workspace(db,1,async()=>{entered=true;await new Promise<void>(r=>{release=r;});}),b=workspace(db),jar=await unlock(a);
 const pending=analyze(a,jar);await until(()=>entered);assert.equal((await analyze(b,jar)).status,429);
 release();assert.equal((await pending).status,502);assert.equal((await analyze(b,jar)).status,502);
});

test('a shared reservation failure or uncertain response never makes a paid call',async()=>{
 for(const malformed of [false,true]){
  const db=new FakeDatabase(),api=workspace(db),jar=await unlock(api);db.available=malformed;db.malformed=malformed;
  const result=await analyze(api,jar);assert.equal(result.status,503);assert.equal(db.paidCalls,0);assert.ok(!(await result.text()).includes(serverKey));
 }
});

test('remote simulation remains available without shared credentials and never constructs paid providers',async()=>{
 const db=new FakeDatabase(),api=workspace(db,1,async()=>{},{OFFERANCHOR_MODE:'simulation',SUPABASE_SERVER_KEY:''});
 const response=await analyze(api,'');assert.equal(response.status,200);assert.equal((await response.json()).mode,'simulation');assert.equal(db.rpcCalls,0);assert.equal(db.paidCalls,0);
});

test('the global thirty-call budget survives API recreation and access-code rotation',async()=>{
 const db=new FakeDatabase();
 for(let cohort=0;cohort<6;cohort++){
  const code='synthetic-code-'+cohort,api=workspace(db,1,async()=>{},{DEMO_ACCESS_CODE:code}),jar=await unlock(api,code);
  for(let i=0;i<5;i++)assert.equal((await analyze(api,jar)).status,502);
 }
 const api=workspace(db,1,async()=>{},{DEMO_ACCESS_CODE:'synthetic-last-code'}),jar=await unlock(api,'synthetic-last-code');
 assert.equal((await analyze(api,jar)).status,429);assert.equal(db.paidCalls,30);
});

test('the shared global concurrency limit permits two different cohorts and denies a third',async()=>{
 const db=new FakeDatabase();let entered=0;const release:(()=>void)[]=[];
 const hold=async()=>{entered++;await new Promise<void>(r=>release.push(r));};
 const a=workspace(db,1,hold,{DEMO_ACCESS_CODE:'synthetic-code-a'}),b=workspace(db,1,hold,{DEMO_ACCESS_CODE:'synthetic-code-b'}),c=workspace(db,1,async()=>{},{DEMO_ACCESS_CODE:'synthetic-code-c'});
 const ja=await unlock(a,'synthetic-code-a'),jb=await unlock(b,'synthetic-code-b'),jc=await unlock(c,'synthetic-code-c');
 const pending=[analyze(a,ja),analyze(b,jb)];await until(()=>entered===2);
 assert.equal((await analyze(c,jc)).status,429);for(const finish of release)finish();await Promise.all(pending);
 assert.equal((await analyze(c,jc)).status,502);
});

test('a cohort window reset does not erase an in-flight reservation',async()=>{
 const db=new FakeDatabase(),b=workspace(db),jar=await unlock(b);await analyze(b,jar);db.time=600990;
 let entered=false,release!:()=>void;
 const a=workspace(db,1,async()=>{entered=true;await new Promise<void>(r=>{release=r;});});
 const pending=analyze(a,jar);await until(()=>entered);db.time=601001;
 assert.equal((await analyze(b,jar)).status,429);release();await pending;
 assert.equal((await analyze(b,jar)).status,502);
});

test('an abandoned shared lease expires while its consumed call remains counted',async()=>{
 const db=new FakeDatabase(),b=workspace(db),jar=await unlock(b);let entered=false,release!:()=>void;
 const a=workspace(db,1,async()=>{entered=true;await new Promise<void>(r=>{release=r;});});
 const pending=analyze(a,jar);await until(()=>entered);
 assert.equal((await analyze(b,jar)).status,429);db.time+=60001;
 assert.equal((await analyze(b,jar)).status,502);release();await pending;
 for(let i=0;i<3;i++)assert.equal((await analyze(b,jar)).status,502);
 assert.equal((await analyze(b,jar)).status,429);assert.equal(db.paidCalls,5);
});

test('ten shared access-code attempts cannot reset through instance recreation',async()=>{
 const db=new FakeDatabase();
 for(let i=0;i<10;i++)assert.equal((await workspace(db).login(request('/api/session',{accessCode:'wrong-synthetic-code'}))).status,403);
 assert.equal((await workspace(db).login(request('/api/session',{accessCode:'synthetic-demo-code'}))).status,429);
 db.time+=60001;assert.equal((await workspace(db).login(request('/api/session',{accessCode:'synthetic-demo-code'}))).status,200);
});

test('Google initiation on another instance revokes the previous email challenge',async()=>{
 const db=new FakeDatabase(),a=account(db),b=account(db),jar=await sent(a);
 assert.equal((await b.start(request('/api/account/start',{method:'google'},jar))).status,200);
 const before=db.authCalls;assert.equal((await a.verifyEmail(request('/api/account/verify',{code:'12345678'},jar))).status,410);assert.equal(db.authCalls,before);
});

test('the shared verification budget counts attempts across distinct challenges',async()=>{
 const db=new FakeDatabase();db.wrongCode=true;
 for(let i=0;i<6;i++){
  const api=account(db),response=await api.start(request('/api/account/start',{method:'email',email:'synthetic-'+i+'@example.invalid'})),jar=cookies(response);assert.equal(response.status,200);
  for(let attempt=0;attempt<5;attempt++)assert.equal((await account(db).verifyEmail(request('/api/account/verify',{code:'12345678'},jar))).status,attempt===4?410:400);
 }
 const result=await account(db).start(request('/api/account/start',{method:'email',email:'synthetic-final@example.invalid'}));assert.equal(result.status,200);
 const before=db.authCalls;assert.equal((await account(db).verifyEmail(request('/api/account/verify',{code:'12345678'},cookies(result)))).status,429);assert.equal(db.authCalls,before);
});

test('a failed, missing or mismatched final user lookup cannot publish a provisional shared OTP session',async()=>{
 for(const failure of ['unavailable','missing','wrong-email']){
  const db=new FakeDatabase(),api=createAccountApi({environment,now:()=>db.time,fetch:async(input,init)=>{
   if(new URL(String(input)).pathname==='/auth/v1/user')return failure==='unavailable'?Response.json({message:'Synthetic unavailable'},{status:503}):failure==='missing'?Response.json({}):Response.json({...user,email:'different@example.invalid'});
   return db.fetch(input,init);
  }}),jar=await sent(api);
  const result=await api.verifyEmail(request('/api/account/verify',{code:'12345678'},jar));
  assert.equal(result.status,502,failure);assert.equal(result.headers.getSetCookie().length,0,failure);
  assert.equal((await account(db).verifyEmail(request('/api/account/verify',{code:'12345678'},jar))).status,410);
 }
});

test('an uncertain final challenge consume cannot commit provisional cookies',async()=>{
 const db=new FakeDatabase(),api=createAccountApi({environment,now:()=>db.time,fetch:async(input,init)=>{
  if(new URL(String(input)).pathname==='/rest/v1/rpc/offeranchor_runtime_state'){
   const wire=JSON.parse(String(init?.body));
   if(wire.p_operation==='challenge_finish'&&wire.p_input.consume){db.run(wire.p_operation,wire.p_input);throw Error('PRIVATE committed response lost');}
  }
  return db.fetch(input,init);
 }}),jar=await sent(api);
 const result=await api.verifyEmail(request('/api/account/verify',{code:'12345678'},jar));
 assert.equal(result.status,503);assert.equal(result.headers.getSetCookie().length,0);assert.equal(db.challenges.size,0);assert.ok(!(await result.text()).includes('PRIVATE'));
});

test('a committed reservation whose reply is lost consumes quota but never calls the provider',async()=>{
 const db=new FakeDatabase();db.loseReplyFor='paid_reserve';const api=workspace(db),jar=await unlock(api);
 assert.equal((await analyze(api,jar)).status,503);assert.equal(db.paidCalls,0);
 assert.equal((await analyze(workspace(db),jar)).status,429);
 db.time+=60001;for(let i=0;i<4;i++)assert.equal((await analyze(workspace(db),jar)).status,502);
 assert.equal((await analyze(api,jar)).status,429);assert.equal(db.paidCalls,4);
});

test('a lost release remains bounded by lease expiry and never refunds failed paid attempts',async()=>{
 const db=new FakeDatabase();let once=true;
 const api=workspace(db,1,async()=>{if(once){once=false;db.available=false;}}),jar=await unlock(api);
 assert.equal((await analyze(api,jar)).status,502);db.available=true;
 assert.equal((await analyze(workspace(db),jar)).status,429);db.time+=60001;
 for(let i=0;i<4;i++)assert.equal((await analyze(workspace(db),jar)).status,502);
 assert.equal((await analyze(workspace(db),jar)).status,429);assert.equal(db.paidCalls,5);
});
