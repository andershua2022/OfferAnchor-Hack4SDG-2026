import assert from "node:assert/strict";
import {test} from "node:test";
import {existsSync} from "node:fs";
import {fixtures,initialState,previewReducer,previewFixture,protectedFooter} from "../../app/fixture-preview";
const origin="http://127.0.0.1:3000";
import {parseAnalyzeRequest} from "../../lib/contracts/index.ts";
const request=()=>{const r=parseAnalyzeRequest(structuredClone(fixtures.find(f=>f.fixtureId==="loan-en")!.request));if(!r.ok)throw Error("Fixture invalid");return r.request;};
const post=(value:unknown,source=origin)=>new Request(origin+"/api/analyze",{method:"POST",headers:{"Content-Type":"application/json","Origin":source},body:JSON.stringify(value)});
async function route(){assert(existsSync("app/api/analyze/route.ts"),"The shared simulation route has not been connected");return import("../../app/api/analyze/route");}
test("The simulation API calls the shared entry, preserves identity and cannot contact a model",async()=>{
 const {POST}=await route(),old=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;throw Error("No model/network in simulation");};
 try{
  for(const f of fixtures){const r={...structuredClone(f.request),requestId:"integration_case_001",revision:7};const response=await POST(post(r));
   assert.equal(response.status,200);assert.equal(response.headers.get("cache-control"),"no-store");const body=await response.json();
   assert.equal(body.status,"complete");assert.equal(body.requestId,r.requestId);assert.equal(body.revision,7);assert.equal(body.mode,"simulation");assert.equal(body.provenance.modelId,null);
  }
  const rewritten=new Request("http://localhost:3000/api/analyze",{method:"POST",headers:{"Origin":origin,"Content-Type":"application/json"},body:JSON.stringify(request())});
  assert.equal((await POST(rewritten)).status,200);assert.equal(calls,0);
 }finally{globalThis.fetch=old;}
});
test("Origin, invalid/oversized input and client-controlled mode fail before analysis; unmatched text is not canned",async()=>{
 const {POST}=await route();assert.equal((await POST(post(request(),"https://untrusted.example"))).status,403);
 const invalid=await POST(post({...request(),mode:"live"}));assert.equal(invalid.status,400);assert.equal((await invalid.json()).status,"rejected");
 const huge=new Request(origin+"/api/analyze",{method:"POST",headers:{"Origin":origin,"Content-Type":"application/json"},body:"x".repeat(96*1024+1)});
 assert.equal((await POST(huge)).status,400);
 const changed=request();changed.evidence[0].text+=" Different fictional wording.";
 const response=await POST(post(changed));assert.equal((await response.json()).errorCode,"simulation_unsupported");
});
test("Browser adapter validates current responses and rejects non-2xx, wrong identity and non-JSON success",async()=>{
 assert(existsSync("app/analysis-client.ts"),"The browser has not consumed shared response validation");
 const {requestAnalysis}=await import("../../app/analysis-client");
 const r=request(),fixture=previewFixture(r);assert.equal(fixture.status,"complete");if(fixture.status!=="complete")throw Error("Fixture missing");
 for(const [response,expected] of [[Response.json(fixture.response),"complete"],[Response.json(fixture.response,{status:500}),"incomplete"],[Response.json({...fixture.response,requestId:"wrong_identity_001"}),"incomplete"],[new Response("<html>error</html>"),"incomplete"]] as const){
  const out=await requestAnalysis(r,new AbortController().signal,async()=>response);assert.equal(out.status,expected);
 }
 const out=await requestAnalysis(r,new AbortController().signal,async()=>Response.json({contractVersion:"2.0.0",status:"rejected",errorCode:"unauthorized",retryable:false},{status:403}));
 assert.equal(out.status,"incomplete");if(out.status==="incomplete")assert.equal(out.errorCode,"unauthorized");
});
test("Exports use the current shared baseline instead of the old CS scaffold baseline",()=>{
 let s=previewReducer(initialState(),{type:"load",fixtureId:"loan-en"});s=previewReducer(s,{type:"start",requestId:"integration_export_001"});
 s=previewReducer(s,{type:"finish",requestId:s.request.requestId,revision:s.request.revision,outcome:previewFixture(s.request)});
 assert(protectedFooter(s).includes("baseline 2.2"));assert(!protectedFooter(s).includes("baseline 2.1"));
});
