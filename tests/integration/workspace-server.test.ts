import assert from "node:assert/strict";
import {test} from "node:test";
import {createWorkspaceApi} from "../../lib/server/workspace-api";
import {loadReferenceLibrary} from "../../lib/knowledge/index.ts";
import {fixtures} from "../../app/fixture-preview";
import content from "../../knowledge/library.json";
import en from "../../locales/en-HK.json";
import zh from "../../locales/zh-Hant-HK.json";
const origin="http://127.0.0.1:3000",accessCode="fictional-access-code",secret="synthetic-session-secret-not-for-real-use-1234";
const environment=()=>({OFFERANCHOR_MODE:"live",MODEL_CALLS_ENABLED:"true",APP_ORIGIN:origin,DEMO_ACCESS_CODE:accessCode,APP_SESSION_SECRET:secret,
 MODEL_API_BASE_URL:"https://api.deepseek.com/v1",MODEL_API_KEY:"fictional-provider-key",MODEL_ID:"synthetic-provider",MODEL_REGION:"not_verified"});
const request=()=>structuredClone(fixtures.find(f=>f.fixtureId==="loan-en")!.request);
function approved(){
 const value=structuredClone(content);value.status="approved";
 for(const item of [...value.cards,...value.routes])Object.assign(item,{approvalStatus:"approved",humanReviewer:"Synthetic test reviewer",localizedMeaningApproved:true});
 return loadReferenceLibrary(value,{"en-HK":en,"zh-Hant-HK":zh});
}
function draft(){
 const value=structuredClone(content);value.status="draft";
 for(const item of [...value.cards,...value.routes])Object.assign(item,{approvalStatus:"draft",humanReviewer:null,localizedMeaningApproved:false});
 return loadReferenceLibrary(value,{"en-HK":en,"zh-Hant-HK":zh});
}
function raw(){
 const req=request(),value=structuredClone(fixtures.find(f=>f.fixtureId==="loan-en")!.response.extraction);
 for(const item of [...value.actions,...value.claims])item.citations=item.citations.map(c=>{
  const source=req.evidence.find(e=>e.id===c.evidenceId)!.text;let cursor=-1,occurrence=0;
  do{cursor=source.indexOf(c.quote,cursor+1);occurrence++;}while(cursor>=0&&cursor<c.start);
  return {evidenceId:c.evidenceId,quote:c.quote,occurrence} as never;
 });
 return JSON.stringify(value);
}
const post=(cookie="",value:unknown=request())=>new Request(origin+"/api/analyze",{method:"POST",headers:{Origin:origin,"Content-Type":"application/json",Cookie:cookie},body:JSON.stringify(value)});
const access=()=>new Request(origin+"/api/session",{method:"POST",headers:{Origin:origin,"Content-Type":"application/json"},body:JSON.stringify({accessCode})});
async function cookie(api:ReturnType<typeof createWorkspaceApi>){const response=await api.login(access());assert.equal(response.status,200);return response.headers.get("set-cookie")!.split(";")[0];}
function provider(onCall=()=>{}){
 return {modelId:"synthetic-provider",region:"not_verified",extract:async()=>{onCall();return{jsonText:raw(),finishReason:"stop" as const,usage:{inputTokens:1,outputTokens:1},latencyMs:1};}};
}
test("live route requires a signed credential, validates output and exposes no server secrets",async()=>{
 let calls=0;const api=createWorkspaceApi({environment,library:approved,providerFactory:()=>provider(()=>calls++)});
 assert.equal((await api.post(post())).status,403);
 const auth=await cookie(api);
 const status=await (await api.status(new Request(origin+"/api/session",{headers:{Cookie:auth}}))).json();
 assert.equal(status.authorized,true);assert.equal(status.ready,true);
 const response=await api.post(post(auth));assert.equal(response.status,200);
 const value=await response.json();assert.equal(value.mode,"live");assert.equal(value.provenance.modelId,"synthetic-provider");assert.equal(calls,1);
 for(const sensitive of [secret,accessCode,"fictional-provider-key"])assert.ok(!JSON.stringify({status,value}).includes(sensitive));
});
test("draft reference content blocks provider construction and extraction before any paid work",async()=>{
 let made=0,calls=0;
 const api=createWorkspaceApi({environment,library:draft,providerFactory:()=>{made++;return provider(()=>calls++);}});
 const auth=await cookie(api);
 const response=await api.post(post(auth));assert.equal(response.status,503);
 assert.equal((await response.json()).errorCode,"configuration_unavailable");assert.equal(made,0);assert.equal(calls,0);
});
test("new cookies with the same access code cannot replenish the shared five-call quota",async()=>{
 let time=Date.now(),calls=0;
 const api=createWorkspaceApi({environment,library:approved,providerFactory:()=>provider(()=>calls++),now:()=>time});
 const first=await cookie(api);time++;
 const second=await cookie(api);assert.notEqual(first,second);
 for(let i=0;i<5;i++)assert.equal((await api.post(post(i%2?first:second))).status,200);
 const limited=await api.post(post(second));assert.equal(limited.status,429);assert.ok(limited.headers.get("retry-after"));assert.equal(calls,5);
 time+=600001;assert.equal((await api.post(post(first))).status,200);
});
test("invalid, modified and expired credentials cannot call the provider",async()=>{
 let time=Date.now(),calls=0;
 const api=createWorkspaceApi({environment,library:approved,providerFactory:()=>provider(()=>calls++),now:()=>time});
 const auth=await cookie(api);
 assert.equal((await api.post(post(auth+"modified"))).status,403);
 time+=7200001;assert.equal((await api.post(post(auth))).status,403);assert.equal(calls,0);
});
test("one in-flight attempt per shared credential; failed attempts count and completed work releases the slot",async()=>{
 let release!:()=>void,calls=0;
 const api=createWorkspaceApi({environment,library:approved,providerFactory:()=>({...provider(),extract:async()=>{calls++;await new Promise<void>(r=>{release=r;});throw Error("synthetic failure");}})});
 const auth=await cookie(api),pending=api.post(post(auth));
 for(let i=0;i<20&&!release;i++)await new Promise(r=>setTimeout(r,1));
 assert.ok(release);assert.equal((await api.post(post(auth))).status,429);
 release();const response=await pending;assert.equal((await response.json()).status,"incomplete");assert.equal(calls,1);
});
test("cross-origin unlock and analysis are rejected and server mode never comes from request data",async()=>{
 let calls=0;const api=createWorkspaceApi({environment,library:approved,providerFactory:()=>provider(()=>calls++)});
 const foreign=new Request("http://127.0.0.1:3000/api/session",{method:"POST",headers:{Origin:"https://foreign.example","Content-Type":"application/json"},body:JSON.stringify({accessCode})});
 assert.equal((await api.login(foreign)).status,403);
 const auth=await cookie(api);assert.equal((await api.post(post(auth,{...request(),mode:"simulation"}))).status,400);assert.equal(calls,0);
 const logout=await api.logout(new Request(origin+"/api/session",{method:"DELETE",headers:{Origin:origin}}));
 assert.match(logout.headers.get("set-cookie")!,/Max-Age=0/);
});

test("quota windows cannot be shortened to increase the authorised request rate",async()=>{
 const api=createWorkspaceApi({environment:()=>({...environment(),DEMO_CALL_WINDOW_SECONDS:"1"})});
 const status=await(await api.status(new Request(origin+"/api/session"))).json();
 assert.equal(status.mode,"unavailable");assert.equal(status.ready,false);
});
test("failed provider attempts consume quota and release their in-flight slot",async()=>{
 let calls=0;
 const api=createWorkspaceApi({environment,library:approved,providerFactory:()=>({...provider(),extract:async()=>{calls++;throw Error("synthetic private exception");}})});
 const auth=await cookie(api);
 for(let i=0;i<5;i++){const response=await api.post(post(auth));assert.equal((await response.json()).errorCode,"provider_error");}
 assert.equal((await api.post(post(auth))).status,429);assert.equal(calls,5);
});
test("rotating a configured access code cannot bypass the global thirty-attempt cap",async()=>{
 let code=accessCode,calls=0;
 const api=createWorkspaceApi({environment:()=>({...environment(),DEMO_ACCESS_CODE:code}),library:approved,providerFactory:()=>provider(()=>calls++)});
 for(let cohort=0;cohort<6;cohort++){
  code="synthetic-cohort-"+cohort;
  const response=await api.login(new Request(origin+"/api/session",{method:"POST",headers:{Origin:origin,"Content-Type":"application/json"},body:JSON.stringify({accessCode:code})}));
  const auth=response.headers.get("set-cookie")!.split(";")[0];
  for(let i=0;i<5;i++)assert.equal((await api.post(post(auth))).status,200);
 }
 code="synthetic-cohort-last";
 const response=await api.login(new Request(origin+"/api/session",{method:"POST",headers:{Origin:origin,"Content-Type":"application/json"},body:JSON.stringify({accessCode:code})}));
 const auth=response.headers.get("set-cookie")!.split(";")[0];
 assert.equal((await api.post(post(auth))).status,429);assert.equal(calls,30);
});




test("an explicit sixty-call shared budget stays bounded across cohort rotation",async()=>{
 let code=accessCode,calls=0,time=Date.now();
 const api=createWorkspaceApi({environment:()=>({...environment(),DEMO_ACCESS_CODE:code,GLOBAL_CALL_LIMIT:"60"}),now:()=>time,library:approved,providerFactory:()=>provider(()=>calls++)});
 for(let cohort=0;cohort<12;cohort++){
  time+=60001;code="synthetic-sixty-cohort-"+cohort;
  const response=await api.login(new Request(origin+"/api/session",{method:"POST",headers:{Origin:origin,"Content-Type":"application/json"},body:JSON.stringify({accessCode:code})}));
  assert.equal(response.status,200);const auth=response.headers.get("set-cookie")!.split(";")[0];
  for(let i=0;i<5;i++)assert.equal((await api.post(post(auth))).status,200);
 }
 time+=60001;code="synthetic-sixty-final";const response=await api.login(new Request(origin+"/api/session",{method:"POST",headers:{Origin:origin,"Content-Type":"application/json"},body:JSON.stringify({accessCode:code})}));const auth=response.headers.get("set-cookie")!.split(";")[0];
 assert.equal((await api.post(post(auth))).status,429);assert.equal(calls,60);
});
