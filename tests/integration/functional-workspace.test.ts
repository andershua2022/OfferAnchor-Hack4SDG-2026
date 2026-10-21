import assert from "node:assert/strict";
import { test } from "node:test";
import { fixtures, initialState, previewFixture, previewReducer, canExport, protectedFooter } from "../../app/fixture-preview";
import type { PreviewEvent } from "../../app/fixture-preview";
import { requestAnalysis } from "../../app/analysis-client";
import { POST } from "../../app/api/analyze/route";

const event = (type:string, fields:Record<string,unknown> = {}) => ({type,...fields}) as unknown as PreviewEvent;
function loaded(id="loan-en") {return previewReducer(initialState(),{type:"load",fixtureId:id});}
function complete(id="loan-en") {
 let state=previewReducer(loaded(id),event("start",{requestId:"functional_request_01",now:100}));
 return previewReducer(state,event("finish",{requestId:state.request.requestId,revision:state.request.revision,outcome:previewFixture(state.request),now:101}));
}
test("cancel retires an attempt immediately and late completion cannot restore it",()=>{
 let state=previewReducer(loaded(),event("start",{requestId:"functional_request_01",now:100}));
 const previous=state.request,outcome=previewFixture(previous);
 state=previewReducer(state,event("terminate",{requestId:previous.requestId,revision:previous.revision,errorCode:"cancelled"}));
 assert.equal(state.phase,"incomplete");
 assert.equal(state.outcome?.status==="incomplete"&&state.outcome.errorCode,"cancelled");
 assert.equal(previewReducer(state,event("finish",{requestId:previous.requestId,revision:previous.revision,outcome,now:101})),state);
 assert.equal(canExport(state),false);
});
test("elapsed monotonic deadline defeats delayed callbacks and delayed state remains cancellable",()=>{
 let state=previewReducer(loaded(),event("start",{requestId:"functional_request_01",now:100}));
 state=previewReducer(state,event("delayed",{requestId:state.request.requestId,revision:state.request.revision,now:20100}));
 assert.equal(state.phase,"delayed");
 state=previewReducer(state,event("finish",{requestId:state.request.requestId,revision:state.request.revision,outcome:previewFixture(state.request),now:58100}));
 assert.equal(state.phase,"incomplete");
 assert.equal(state.outcome?.status==="incomplete"&&state.outcome.errorCode,"timeout");
});
test("reordering preserves evidence IDs, rebuilds sequence and invalidates exports",()=>{
 const prior=complete(),state=previewReducer(prior,event("reorder",{id:"E2",direction:-1}));
 assert.deepEqual(state.request.evidence.map(e=>e.id),["E2","E1","E3"]);
 assert.deepEqual(state.request.evidence.map(e=>e.sequence),[1,2,3]);
 assert.equal(state.request.revision,prior.request.revision+1);
 assert.equal(canExport(state),false);
});
test("answering an issued question appends a labelled note, preserving the question and original evidence",()=>{
 const prior=complete("missing-payer-en"),question=prior.displayedQuestions[0];
 const state=previewReducer(prior,event("answer",{questionKey:prior.shownQuestionKeys[0],value:"The company pays directly."}));
 assert.equal(state.request.evidence.length,2);
 assert.deepEqual(state.request.evidence[0],prior.request.evidence[0]);
 assert.equal(state.request.evidence[1].kind,"user_note");
 assert.ok(state.request.evidence[1].text.includes(question.text));
 assert.ok(state.request.evidence[1].text.includes("The company pays directly."));
 assert.equal(state.request.clarificationsUsed,1);
 assert.equal(canExport(state),false);
 assert.equal(previewReducer(state,event("answer",{questionKey:prior.shownQuestionKeys[0],value:"Duplicate answer."})),state);
});
test("quotation preference survives reanalysis and example replacement without becoming a user-authored edit",()=>{
 let state=complete();
 state=previewReducer(state,event("quotes",{value:false}));
 assert.equal(state.includeQuotes,false);
 assert.equal(state.body,state.originalBody);
 state=previewReducer(state,{type:"load",fixtureId:"company-en"});
 state=previewReducer(state,event("start",{requestId:"functional_request_02",now:200}));
 state=previewReducer(state,event("finish",{requestId:state.request.requestId,revision:state.request.revision,outcome:previewFixture(state.request),now:201}));
 assert.equal(state.includeQuotes,false);
 assert.ok(!state.body.includes("[0:"));
});
test("protected provenance uses actual mode and model and never labels a live result as simulation",()=>{
 const state=complete();
 assert.ok(state.outcome?.status==="complete");
 if(state.outcome?.status!=="complete")return;
 const response={...state.outcome.response,mode:"live" as const,provenance:{...state.outcome.response.provenance,modelId:"synthetic-provider",promptVersion:"extract-v2.11"}};
 const live={...state,outcome:{status:"complete" as const,response}};
 const footer=protectedFooter(live);
 assert.ok(footer.includes("modelId: synthetic-provider"));
 assert.ok(!footer.includes("SIMULATION"));
});
test("cancellation settles even when a transport ignores AbortSignal; no automatic retry",async()=>{
 const controller=new AbortController();let calls=0;
 const send=(async()=>{calls++;return await new Promise<Response>(()=>{});}) as typeof fetch;
 const pending=requestAnalysis(loaded().request as never,controller.signal,send);
 controller.abort();
 const value=await Promise.race([pending,new Promise<null>(r=>setTimeout(()=>r(null),100))]);
 assert.ok(value,"Transport cancellation must settle without waiting for the transport");
 assert.equal(value.status==="incomplete"&&value.errorCode,"cancelled");
 assert.equal(calls,1);
});
test("browser validation accepts only its server-selected response mode",async()=>{
 const request=loaded().request;
 const fixture=fixtures.find(f=>f.fixtureId==="loan-en")!;
 const response={...fixture.response,requestId:request.requestId,revision:request.revision,mode:"live",provenance:{...fixture.response.provenance,modelId:"synthetic-provider",promptVersion:"extract-v2.11"}};
 const send=(async()=>Response.json(response)) as typeof fetch;
 const invoke=requestAnalysis as unknown as (r:unknown,s:AbortSignal,f:typeof fetch,mode:"live"|"simulation")=>ReturnType<typeof requestAnalysis>;
 assert.equal((await invoke(request,new AbortController().signal,send,"live")).status,"complete");
 const rejected=await invoke(request,new AbortController().signal,send,"simulation");
 assert.equal(rejected.status==="incomplete"&&rejected.errorCode,"invalid_output");
});
test("a live-mode configuration cannot silently fall back to authored simulation",async()=>{
 const previous=process.env.OFFERANCHOR_MODE,enabled=process.env.MODEL_CALLS_ENABLED;
 process.env.OFFERANCHOR_MODE="live";process.env.MODEL_CALLS_ENABLED="false";
 try{
  const response=await POST(new Request("http://127.0.0.1:3000/api/analyze",{method:"POST",headers:{Origin:"http://127.0.0.1:3000","Content-Type":"application/json"},body:JSON.stringify(loaded().request)}));
  assert.equal(response.status,503);
  assert.equal((await response.json()).errorCode,"configuration_unavailable");
 }finally{
  if(previous===undefined)delete process.env.OFFERANCHOR_MODE;else process.env.OFFERANCHOR_MODE=previous;
  if(enabled===undefined)delete process.env.MODEL_CALLS_ENABLED;else process.env.MODEL_CALLS_ENABLED=enabled;
 }
});


test("deleting every source does not allow initial intake to reuse a retired evidence ID",()=>{
 let state=loaded("missing-payer-en");
 state=previewReducer(state,{type:"delete",id:"E1"});
 state=previewReducer(state,event("initialize",{evidence:[{id:"E1",sequence:1,kind:"instruction",label:"New instruction",text:"A new fictional instruction."}]}));
 assert.equal(state.request.evidence[0].id,"E2");
 assert.equal(state.nextEvidenceId,3);
});
test("authored clarification and denial continuations append in place without resetting the session",()=>{
 for(const [before,after] of [["missing-payer-en","funding-note-en"],["task-en","task-denial-en"]]){
  const prior=complete(before);
  const next=previewReducer(prior,event("continue_authored"));
  assert.equal(next.request.evidence.length,prior.request.evidence.length+1);
  assert.deepEqual(next.request.evidence.slice(0,-1),prior.request.evidence);
  assert.equal(next.request.revision,prior.request.revision+1);
  assert.equal(next.request.clarificationsUsed,prior.request.clarificationsUsed);
  const outcome=previewFixture(next.request);
  assert.equal(outcome.status,"complete",after);
 }
});

test("a valid bound incomplete response keeps its exact safe reason on non-2xx HTTP",async()=>{
 const request=loaded().request;
 const out=await requestAnalysis(request as never,new AbortController().signal,async()=>Response.json({
  contractVersion:"2.0.0",requestId:request.requestId,revision:request.revision,status:"incomplete",errorCode:"simulation_unsupported",retryable:false
 },{status:422}));
 assert.equal(out.status==="incomplete"&&out.errorCode,"simulation_unsupported");
 assert.equal(out.status==="incomplete"&&out.retryable,false);
});



test("prepared examples remain exact, disclosed and free on a live service",async()=>{
 let calls=0;
 const send=(async()=>{calls++;throw Error("Prepared examples must not reach the network");}) as typeof fetch;
 const invoke=requestAnalysis as unknown as (r:unknown,s:AbortSignal,f:typeof fetch,m:"live"|"simulation",examples:boolean)=>ReturnType<typeof requestAnalysis>;
 for(const fixture of fixtures){
  const request={...structuredClone(fixture.request),requestId:"example_request_01",revision:9};
  const response=await invoke(request,new AbortController().signal,send,"live",true);
  assert.equal(calls,0);
  assert.equal(response.status,"complete");
  if(response.status==="complete"){assert.equal(response.mode,"simulation");assert.equal(response.provenance.modelId,null);assert.equal(response.requestId,request.requestId);assert.equal(response.revision,9);}
 }
});

test("editing an example sends the current request once to the live service",async()=>{
 const fixture=fixtures.find(f=>f.fixtureId==="loan-en")!,request=structuredClone(fixture.request);
 request.evidence[0].text+="\nPlease confirm the reporting date.";
 let calls=0;
 const send=(async(_url,init)=>{calls++;assert.deepEqual(JSON.parse(init!.body as string),request);return Response.json({...fixture.response,requestId:request.requestId,revision:request.revision,mode:"live",provenance:{...fixture.response.provenance,modelId:"synthetic-provider",promptVersion:"extract-v2.11"}});}) as typeof fetch;
 const invoke=requestAnalysis as unknown as (r:unknown,s:AbortSignal,f:typeof fetch,m:"live"|"simulation",examples:boolean)=>ReturnType<typeof requestAnalysis>;
 const response=await invoke(request,new AbortController().signal,send,"live",true);
 assert.equal(calls,1);assert.equal(response.status,"complete");if(response.status==="complete")assert.equal(response.mode,"live");
});

test("a cancelled prepared check cannot produce an exportable result",async()=>{
 const controller=new AbortController();controller.abort();let calls=0;
 const invoke=requestAnalysis as unknown as (r:unknown,s:AbortSignal,f:typeof fetch,m:"live"|"simulation",examples:boolean)=>ReturnType<typeof requestAnalysis>;
 const response=await invoke(loaded().request,controller.signal,(async()=>{calls++;throw Error("No call");}) as typeof fetch,"live",true);
 assert.equal(calls,0);assert.equal(response.status==="incomplete"&&response.errorCode,"cancelled");
});
