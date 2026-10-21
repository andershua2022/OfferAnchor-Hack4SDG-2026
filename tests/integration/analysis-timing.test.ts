import assert from 'node:assert/strict';
import {test} from 'node:test';
import {requestAnalysis} from '../../app/analysis-client.ts';
import {parseAnalyzeRequest} from '../../lib/contracts/index.ts';
import {fixtures,initialState,previewFixture,previewReducer,canExport} from '../../app/fixture-preview.ts';
import {createWorkspaceApi} from '../../lib/server/workspace-api.ts';
import {loadReferenceLibrary} from '../../lib/knowledge/index.ts';
import content from '../../knowledge/library.json';
import en from '../../locales/en-HK.json';
import zh from '../../locales/zh-Hant-HK.json';

function analysisRequest(){const parsed=parseAnalyzeRequest(structuredClone(fixtures.find(f=>f.fixtureId==='loan-en')!.request));assert.ok(parsed.ok);return parsed.request;}
function started(){const loaded=previewReducer(initialState(),{type:'load',fixtureId:'loan-en'});return previewReducer(loaded,{type:'start',requestId:'timing_regression_01',now:100});}
function approved(){const value=structuredClone(content);value.status='approved';for(const item of [...value.cards,...value.routes])Object.assign(item,{approvalStatus:'approved',humanReviewer:'Synthetic timing reviewer',localizedMeaningApproved:true});return loadReferenceLibrary(value,{'en-HK':en,'zh-Hant-HK':zh});}
const environment=()=>({APP_ORIGIN:'http://localhost:3000',OFFERANCHOR_MODE:'live',MODEL_CALLS_ENABLED:'true',APP_SESSION_SECRET:'synthetic-timing-secret-not-for-real-use-1234',DEMO_ACCESS_CODE:'synthetic-timing-code',MODEL_API_BASE_URL:'https://api.deepseek.com/v1',MODEL_API_KEY:'synthetic-timing-key',MODEL_ID:'synthetic',MODEL_REGION:'not_verified'});

test('a current response after forty-five seconds can still complete and export',()=>{
 const state=started(),next=previewReducer(state,{type:'finish',requestId:state.request.requestId,revision:state.request.revision,outcome:previewFixture(state.request),now:45100});
 assert.equal(next.phase,'complete');assert.equal(canExport(next),true);
});

test('the delayed indicator still starts at twenty seconds and an extended run remains cancellable',()=>{
 let state=started();
 state=previewReducer(state,{type:'delayed',requestId:state.request.requestId,revision:state.request.revision,now:20099});assert.equal(state.phase,'processing');
 state=previewReducer(state,{type:'delayed',requestId:state.request.requestId,revision:state.request.revision,now:20100});assert.equal(state.phase,'delayed');
 state=previewReducer(state,{type:'delayed',requestId:state.request.requestId,revision:state.request.revision,now:45100});assert.equal(state.phase,'delayed');
 const previous=state.request;state=previewReducer(state,{type:'terminate',requestId:previous.requestId,revision:previous.revision,errorCode:'cancelled'});
 assert.equal(state.outcome?.status==='incomplete'&&state.outcome.errorCode,'cancelled');
 const late=previewReducer(state,{type:'finish',requestId:previous.requestId,revision:previous.revision,outcome:previewFixture(previous),now:55100});
 assert.equal(late,state);assert.equal(canExport(late),false);
});

test('the exact fifty-eight-second boundary rejects a late result even if its timer callback was delayed',()=>{
 const state=started();
 const before=previewReducer(state,{type:'finish',requestId:state.request.requestId,revision:state.request.revision,outcome:previewFixture(state.request),now:58099});assert.equal(before.phase,'complete');
 const late=previewReducer(state,{type:'finish',requestId:state.request.requestId,revision:state.request.revision,outcome:previewFixture(state.request),now:58100});
 assert.equal(late.phase,'incomplete');assert.equal(late.outcome?.status==='incomplete'&&late.outcome.errorCode,'timeout');assert.equal(canExport(late),false);
 const resumed=previewReducer(state,{type:'delayed',requestId:state.request.requestId,revision:state.request.revision,now:60100});assert.equal(resumed.phase,'incomplete');assert.equal(canExport(resumed),false);
});

test('the HTTP adapter accepts a forty-five-second response without retrying',async context=>{
 let elapsed=0,calls=0;context.mock.method(performance,'now',()=>elapsed);
 const request=analysisRequest(),outcome=previewFixture(request);assert.ok(outcome.status==='complete');
 const result=await requestAnalysis(request,new AbortController().signal,async()=>{calls++;elapsed=45000;return Response.json(outcome.response);});
 assert.equal(result.status,'complete');assert.equal(calls,1);
});

test('HTTP parsing that crosses fifty-eight seconds cannot publish a complete result',async context=>{
 let elapsed=0,calls=0;context.mock.method(performance,'now',()=>elapsed);
 const request=analysisRequest(),outcome=previewFixture(request);assert.ok(outcome.status==='complete');
 const result=await requestAnalysis(request,new AbortController().signal,async()=>{calls++;elapsed=57000;const response=Response.json(outcome.response);response.json=async()=>{elapsed=58000;return outcome.response;};return response;});
 assert.equal(result.status==='incomplete'&&result.errorCode,'timeout');assert.equal(calls,1);
});

test('explicit cancellation still wins during an extended HTTP request',async context=>{
 let elapsed=0,calls=0;context.mock.method(performance,'now',()=>elapsed);const controller=new AbortController();
 const request=analysisRequest();
 const pending=requestAnalysis(request,controller.signal,async()=>{calls++;elapsed=45000;return await new Promise<Response>(()=>{});});
 controller.abort();const result=await pending;
 assert.equal(result.status==='incomplete'&&result.errorCode,'cancelled');assert.equal(calls,1);
});

test('the browser transport schedules a fifty-eight-second abort that settles an uncooperative request',async context=>{
 const clock=new AbortController();let configured=0,calls=0;
 context.mock.method(AbortSignal,'timeout',(milliseconds:number)=>{configured=milliseconds;return clock.signal;});
 const request=analysisRequest();
 const pending=requestAnalysis(request,new AbortController().signal,async()=>{calls++;return await new Promise<Response>(()=>{});});
 assert.equal(configured,58000);clock.abort(new DOMException('Synthetic timeout','TimeoutError'));
 const result=await pending;assert.equal(result.status==='incomplete'&&result.errorCode,'timeout');assert.equal(calls,1);
});

test('workspace defaults provide the fifty-second provider budget and accept the declared server ceiling',async()=>{
 let timeout:number|null=null;
 const api=createWorkspaceApi({environment,library:approved,providerFactory:config=>{timeout=config.timeoutMs;return {modelId:'synthetic',region:'not_verified',extract:async()=>{throw Error('No extraction expected');}};}});
 const status=await(await api.status(new Request('http://localhost:3000/api/session'))).json();
 assert.equal(status.ready,true);assert.equal(timeout,50000);
 const exact=createWorkspaceApi({environment:()=>({...environment(),MODEL_TIMEOUT_MS:'50000',SERVER_TIMEOUT_MS:'53000'}),library:approved,providerFactory:()=>({modelId:'synthetic',region:'not_verified',extract:async()=>{throw Error('No extraction expected');}})});
 assert.equal((await(await exact.status(new Request('http://localhost:3000/api/session'))).json()).ready,true);
});

test('out-of-range runtime budgets fail before constructing a provider',async()=>{
 for(const limits of [{MODEL_TIMEOUT_MS:'50001'},{SERVER_TIMEOUT_MS:'53001'},{MODEL_TIMEOUT_MS:'0'},{SERVER_TIMEOUT_MS:'NaN'}]){
  let constructed=0;const api=createWorkspaceApi({environment:()=>({...environment(),...limits}),library:approved,providerFactory:()=>{constructed++;throw Error('Provider must not be constructed');}});
  const status=await(await api.status(new Request('http://localhost:3000/api/session'))).json();assert.equal(status.ready,false);assert.equal(status.mode,'unavailable');assert.equal(constructed,0);
 }
});

function rawLoan(){
 const fixture=fixtures.find(f=>f.fixtureId==='loan-en')!,request=fixture.request,value=structuredClone(fixture.response.extraction);
 for(const item of [...value.actions,...value.claims])item.citations=item.citations.map(c=>{
  const source=request.evidence.find(e=>e.id===c.evidenceId)!.text;let cursor=-1,occurrence=0;
  do{cursor=source.indexOf(c.quote,cursor+1);occurrence++;}while(cursor>=0&&cursor<c.start);
  return {evidenceId:c.evidenceId,quote:c.quote,occurrence} as never;
 });
 return JSON.stringify(value);
}
test('workspace passes its server budget to analysis so a forty-five-second extraction can complete',async context=>{
 let elapsed=0,calls=0;context.mock.method(performance,'now',()=>elapsed);
 const api=createWorkspaceApi({environment,library:approved,providerFactory:()=>({modelId:'synthetic',region:'not_verified',extract:async()=>{calls++;elapsed=45000;return {jsonText:rawLoan(),finishReason:'stop',usage:{inputTokens:1,outputTokens:1},latencyMs:45000};}})});
 const login=await api.login(new Request('http://localhost:3000/api/session',{method:'POST',headers:{Origin:'http://localhost:3000','Content-Type':'application/json'},body:JSON.stringify({accessCode:'synthetic-timing-code'})}));assert.equal(login.status,200);
 const response=await api.post(new Request('http://localhost:3000/api/analyze',{method:'POST',headers:{Origin:'http://localhost:3000','Content-Type':'application/json',Cookie:login.headers.get('set-cookie')!.split(';')[0]},body:JSON.stringify(fixtures.find(f=>f.fixtureId==='loan-en')!.request)}));
 assert.equal((await response.json()).status,'complete');assert.equal(calls,1);
});
test('the server still rejects an extraction at the exact fifty-three-second limit',async context=>{
 let elapsed=0,calls=0;context.mock.method(performance,'now',()=>elapsed);
 const api=createWorkspaceApi({environment,library:approved,providerFactory:()=>({modelId:'synthetic',region:'not_verified',extract:async()=>{calls++;elapsed=53000;return {jsonText:rawLoan(),finishReason:'stop',usage:{inputTokens:1,outputTokens:1},latencyMs:53000};}})});
 const login=await api.login(new Request('http://localhost:3000/api/session',{method:'POST',headers:{Origin:'http://localhost:3000','Content-Type':'application/json'},body:JSON.stringify({accessCode:'synthetic-timing-code'})}));assert.equal(login.status,200);
 const response=await api.post(new Request('http://localhost:3000/api/analyze',{method:'POST',headers:{Origin:'http://localhost:3000','Content-Type':'application/json',Cookie:login.headers.get('set-cookie')!.split(';')[0]},body:JSON.stringify(fixtures.find(f=>f.fixtureId==='loan-en')!.request)}));
 const value=await response.json();assert.equal(value.status,'incomplete');assert.equal(value.errorCode,'timeout');assert.equal(calls,1);
});
