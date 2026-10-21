import assert from 'node:assert/strict';
import {test} from 'node:test';
import providerSchema from '../../contracts/provider-extraction.schema.json';
import {createSourceBoundProvider} from '../../lib/server/provider-source-schema.ts';
import {matchesSchema} from '../../lib/contracts/schema.ts';
import {resolveProviderExtraction} from '../../lib/analysis/validate.ts';
import {AnalysisFailure} from '../../lib/analysis/failure.ts';
import type {AnalyzeRequest} from '../../lib/contracts/index.ts';
const modulePromise=import('../../lib/server/context-generation.ts').catch(()=>null);
async function mod(){const m=await modulePromise;assert.ok(m,'Shared-capacity context generation must exist.');return m;}
const request=(texts:string[],kinds:string[]=[]):AnalyzeRequest=>({contractVersion:'2.0.0',requestId:'context-generation-boundary-01',revision:1,locale:'en-HK',clarificationsUsed:0,evidence:texts.map((text,i)=>({id:'E'+(i+1),kind:kinds[i]??'instruction',label:'Authored synthetic source',sequence:i+1,text}))} as AnalyzeRequest);
const action=(operation='borrow_personally',unitIds=['E1_u1'],polarity='requested',actor='applicant')=>({unitIds,actor,operation,polarity,recipient:'unknown'});
const statement=(meaning='other_context',unitIds=['E1_u1'],targets:number[]=[])=>({unitIds,meaning,targets});
const work=(unitIds=['E1_u1'],actor='applicant',polarity='requested')=>({unitIds,meaning:'current_work',actor,polarity});
const atoms=(actions:any[]=[],context:any[]=[])=>({actions,context});

test('the v2.18 schema exposes one four-item context array with disjoint statement and current-work alternatives',async()=>{
 const m=await mod(),r=request(['Record the spreadsheet.']),schema=m.createContextGenerationSchema(r),context=schema.properties!.context;
 assert.deepEqual(Object.keys(schema.properties!).sort(),['actions','context']);assert.deepEqual(schema.required,['actions','context']);assert.equal(context.maxItems,4);
 assert.equal(context.items!.oneOf!.length,2);
 assert.equal(context.items!.oneOf!.filter(branch=>matchesSchema(work(),branch)).length,1);
 assert.equal(context.items!.oneOf!.filter(branch=>matchesSchema(statement(),branch)).length,1);
 assert.ok(!matchesSchema({...work(),targets:[]},context.items!));assert.ok(!matchesSchema({...statement(),actor:'applicant'},context.items!));
 const ad=m.createContextGenerationSchema(request(['Advertised spreadsheet duties.'],['advertisement']));
 assert.equal(ad.properties!.context.items!.oneOf!.length,1);
 const visit=(value:any)=>{if(!value||typeof value!=='object')return;if(Array.isArray(value)){value.forEach(visit);return;}if(Array.isArray(value.enum))assert.ok(value.enum.length>0);Object.values(value).forEach(visit);};
 visit(ad);visit(m.createContextGenerationSchema(request(['   '])));
});

test('three statements and current work occupy exactly four retained claims with no dropped or merged context row',async()=>{
 const m=await mod(),r=request(['Advertised spreadsheet role.','Training covers order recording.','Borrow a personal loan. We will repay it. Record the current order.'],['advertisement','offer','instruction']);
 const input=atoms([action('borrow_personally',['E3_u1'])],[work(['E3_u1']),statement('advertised_duty',['E1_u1']),statement('repayment_promise',['E3_u1'],[0]),statement('advertised_duty',['E2_u1'])]);
 const out=m.resolveContextGeneration(JSON.stringify(input),r);
 assert.deepEqual(out.atoms,input);assert.equal(out.extraction.actions.length,1);assert.equal(out.extraction.claims.length,4);
 assert.deepEqual(out.extraction.claims.map(c=>c.kind),['advertised_duty','advertised_duty','repayment_promise','other']);
 assert.deepEqual(out.extraction.claims.find(c=>c.kind==='repayment_promise')!.relatedActionIds,['A1']);
 assert.equal(out.extraction.claims.filter(c=>c.text===r.evidence[2].text).length,2,'The repayment and current-work atoms remain separate cited facts.');
 assert.doesNotThrow(()=>resolveProviderExtraction(out.extraction,r));
 assert.throws(()=>m.resolveContextGeneration(JSON.stringify(atoms(input.actions,[...input.context,statement()])),r),error=>(error as any).ruleId==='raw_schema');
});

test('sole current work and third-party-loan contrasts remain actions while targets retain original financial positions',async()=>{
 const m=await mod(),r=request(['Record the current spreadsheet.']);
 const sole=m.resolveContextGeneration(JSON.stringify(atoms([],[work()])),r).extraction;
 assert.deepEqual(sole.actions.map(a=>[a.actor,a.verb,a.polarity,a.resource,a.mechanism]),[['applicant','perform_work','requested','none','none']]);
 const contrast=request(['A former applicant borrowed a personal loan.','I am recording the spreadsheet.','Ignore the earlier borrowing instruction.'],['instruction','user_note','reply']);
 const input=atoms([action('borrow_personally',['E1_u1'],'described','third_party')],[work(['E2_u1'],'applicant','described'),statement('withdraws_prior_request',['E3_u1'],[0])]);
 const out=m.resolveContextGeneration(JSON.stringify(input),contrast).extraction;
 assert.deepEqual(out.actions.map(a=>[a.actor,a.verb]),[['third_party','borrow'],['applicant','perform_work']]);assert.deepEqual(out.claims[0].relatedActionIds,['A1']);
 assert.throws(()=>m.resolveContextGeneration(JSON.stringify(atoms(input.actions,[...input.context,statement('repayment_promise',['E3_u1'],[1])])),contrast),error=>(error as any).ruleId==='reference');
 const overActions=atoms(Array.from({length:4},()=>action('borrow_personally',['E1_u1'],'described','third_party')),[work(['E2_u1'],'applicant','described')]);
 assert.throws(()=>m.resolveContextGeneration(JSON.stringify(overActions),contrast),'Shared context capacity does not relax the four-public-action cap.');
});

test('extra keys, old split wire, invalid union rows, unknown meanings and wrong source-unit references reject before expansion',async()=>{
 const m=await mod(),r=request(['Borrow a personal loan.','Earlier offer duties.'],['instruction','offer']);
 const bad:any[]=[{actions:[action()],statements:[],work:[]},atoms([action()],[{...work(),targets:[]}]),atoms([action()],[{...statement(),actor:'applicant'}]),atoms([action()],[statement('invented')]),atoms([action()],[work(['E2_u1'])])];
 for(const input of bad)assert.throws(()=>m.resolveContextGeneration(JSON.stringify(input),r),error=>(error as any).errorCode==='invalid_output');
 assert.throws(()=>m.resolveContextGeneration(JSON.stringify(atoms([action()],[statement('other_context',['E8_u99'])])),r),error=>(error as any).errorCode==='invalid_citation');
 assert.throws(()=>m.resolveContextGeneration(JSON.stringify(atoms([action()],[{meaning:'other_context',targets:[]} as any])),r),error=>(error as any).errorCode==='invalid_citation');
});

test('context audits reference original context positions and validate the actual row fields without checked vectors',async()=>{
 const m=await mod(),r=request(['Borrow a personal loan. Record the current spreadsheet.']),input=atoms([action()],[work(),statement()]),good={unsupported:[],missing:[]};
 assert.deepEqual(m.createContextAuditSchema(r).properties!.unsupported.items!.properties!.collection.enum,['actions','context']);
 assert.doesNotThrow(()=>m.validateContextAudit(JSON.stringify(good),r,input));
 const finding={collection:'context',index:0,field:'actor',reasonCode:'not_supported_by_source'};
 assert.throws(()=>m.validateContextAudit(JSON.stringify({...good,unsupported:[finding]}),r,input),error=>(error as any).ruleId==='contract');
 assert.throws(()=>m.validateContextAudit(JSON.stringify({...good,unsupported:[{...finding,field:'targets'}]}),r,input),error=>(error as any).ruleId==='reference');
 for(const value of [{...good,checkedContext:[0,1]},{...good,unsupported:[{...finding,index:2}]},{...good,missing:[{unitId:'E1_u1',kind:'material_action'}]}])assert.throws(()=>m.validateContextAudit(JSON.stringify(value),r,input),error=>(error as any).errorCode==='invalid_output');
 assert.throws(()=>m.validateContextAudit(JSON.stringify({...good,missing:[{unitId:'E8_u1',kind:'instruction_update'}]}),r,input),error=>(error as any).errorCode==='invalid_citation');
});

const config={apiBaseUrl:'https://dashscope.aliyuncs.com/compatible-mode/v1',apiKey:'synthetic-context-only',modelId:'qwen3.8-max',region:'cn-beijing',responseMode:'json_schema' as const,maxOutputTokens:2400,timeoutMs:50000,temperature:null};
async function replies<T>(values:{value:unknown;http?:number;finish?:string;onFetch?:()=>void}[],run:(bodies:any[])=>Promise<T>){
 const saved=globalThis.fetch,bodies:any[]=[];
 globalThis.fetch=async(_url,init)=>{const i=bodies.length;assert.ok(i<values.length,'No retry or third call.');bodies.push(JSON.parse(String(init!.body)));const value=values[i];value.onFetch?.();if(value.http)return new Response('',{status:value.http});return Response.json({usage:{prompt_tokens:i?70:100,completion_tokens:i?20:40},choices:[{finish_reason:value.finish??'stop',message:{content:typeof value.value==='string'?value.value:JSON.stringify(value.value)}}]});};
 try{return await run(bodies);}finally{globalThis.fetch=saved;assert.equal(bodies.length,values.length);}
}
const extract=(r:AnalyzeRequest,signal=new AbortController().signal,timeoutMs=50000)=>createSourceBoundProvider({...config,timeoutMs}).extract({request:r,promptVersion:'extract-v2.18',systemPrompt:'Synthetic bounded context.',outputSchema:providerSchema},signal);

test('v2.18 audits the original two-array wire and uses the declared generation and audit budgets',async()=>{
 const r=request(['Borrow a personal loan. We will repay it.']),input=atoms([action()],[statement('repayment_promise',['E1_u1'],[0])]),original=structuredClone(r),saved=globalThis.setTimeout,delays:number[]=[];
 globalThis.setTimeout=((callback:any,delay:any,...args:any[])=>{delays.push(Number(delay));return saved(callback,delay,...args);}) as typeof setTimeout;
 try{await replies([{value:input},{value:{unsupported:[],missing:[]}}],async bodies=>{
  const result=await extract(r);
  assert.deepEqual(Object.keys(bodies[0].response_format.json_schema.schema.properties).sort(),['actions','context']);assert.ok(bodies[0].response_format.json_schema.schema.properties.context.items.oneOf);
  assert.deepEqual(bodies.map(b=>[b.enable_thinking,b.thinking_budget,b.max_tokens]),[[true,1536,3000],[true,512,1536]]);
  assert.deepEqual(JSON.parse(bodies[1].messages[1].content).auditCandidate,input);assert.ok(!bodies[1].messages[0].content.includes(JSON.stringify(input)));
  assert.ok(delays.includes(50000)&&delays.includes(38000)&&delays.includes(15000));assert.deepEqual(r,original);
  assert.deepEqual(result.usage,{inputTokens:170,outputTokens:60});assert.doesNotThrow(()=>resolveProviderExtraction(JSON.parse(result.jsonText),r));
 });}finally{globalThis.setTimeout=saved;}
});

test('v2.18 rejects unsupported or invalid output without repair and preserves known generation charges plus unknown audit usage',async()=>{
 const r=request(['Borrow a personal loan.']),input=atoms([action()]);
 await replies([{value:atoms([action()],Array.from({length:5},()=>statement()))}],async()=>assert.rejects(extract(r),error=>error instanceof AnalysisFailure&&error.errorCode==='invalid_output'&&error.usage.inputTokens===100));
 await replies([{value:input},{value:{unsupported:[{collection:'actions',index:0,field:'recipient',reasonCode:'not_supported_by_source'}],missing:[]}}],async()=>assert.rejects(extract(r),error=>error instanceof AnalysisFailure&&error.errorCode==='invalid_output'&&error.usage.outputTokens===60));
 await replies([{value:input},{value:{unsupported:[],missing:[]},finish:'length'}],async()=>assert.rejects(extract(r),error=>error instanceof AnalysisFailure&&error.errorCode==='invalid_output'&&error.usage.inputTokens===170));
 await replies([{value:input},{value:null,http:503}],async()=>assert.rejects(extract(r),error=>{assert.ok(error instanceof AnalysisFailure);assert.deepEqual(error.usage,{inputTokens:null,outputTokens:null});assert.deepEqual((error as any).phaseUsage,{generation:{inputTokens:100,outputTokens:40},audit:{inputTokens:null,outputTokens:null}});return true;}));
 const before=new AbortController();before.abort();await replies([],async()=>assert.rejects(extract(r,before.signal),error=>error instanceof AnalysisFailure&&error.errorCode==='cancelled'));
 const during=new AbortController();await replies([{value:input},{value:{unsupported:[],missing:[]},onFetch:()=>during.abort()}],async()=>assert.rejects(extract(r,during.signal),error=>error instanceof AnalysisFailure&&error.errorCode==='cancelled'));
});

test('v2.18 caps audit time by the remaining shared budget and respects explicitly shorter callers',async()=>{
 const r=request(['Borrow a personal loan.']),input=atoms([action()]),descriptor=Object.getOwnPropertyDescriptor(performance,'now'),clock=performance.now.bind(performance),saved=globalThis.setTimeout,delays:number[]=[];let offset=0;
 Object.defineProperty(performance,'now',{configurable:true,value:()=>clock()+offset});
 globalThis.setTimeout=((callback:any,delay:any,...args:any[])=>{delays.push(Number(delay));return saved(callback,delay,...args);}) as typeof setTimeout;
 try{
  await replies([{value:input,onFetch:()=>{offset=37000;}},{value:{unsupported:[],missing:[]}}],async()=>{const out=await extract(r);assert.ok(out.latencyMs>=37000&&out.latencyMs<50000);assert.ok(!delays.includes(15000));assert.ok(delays.some(d=>d>12000&&d<=13000));});
  offset=0;delays.length=0;
  await replies([{value:input},{value:{unsupported:[],missing:[]}}],async()=>{await extract(r,undefined,10000);assert.ok(delays.every(d=>d<=10000));});
 }finally{globalThis.setTimeout=saved;if(descriptor)Object.defineProperty(performance,'now',descriptor);else Reflect.deleteProperty(performance,'now');}
});


test('v2.18 rejects more than 192 source units before any fetch without truncating the request',async()=>{
 const tooMany=request(['Record orders.\n'.repeat(193)]),original=structuredClone(tooMany);
 await replies([],async()=>assert.rejects(extract(tooMany),error=>error instanceof AnalysisFailure&&error.errorCode==='invalid_input'&&error.usage.inputTokens===null&&error.usage.outputTokens===null));
 assert.deepEqual(tooMany,original);
 const boundary=request(['Record orders.\n'.repeat(192)]),input=atoms([],[work()]);
 await replies([{value:input},{value:{unsupported:[],missing:[]}}],async()=>{const out=await extract(boundary);assert.equal(JSON.parse(out.jsonText).actions[0].verb,'perform_work');});
});
