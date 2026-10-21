import assert from 'node:assert/strict';
import {test} from 'node:test';
import schema from '../../contracts/provider-extraction.schema.json';
import {createSourceBoundProvider} from '../../lib/server/provider-source-schema.ts';
import {AnalysisFailure} from '../../lib/analysis/failure.ts';
import {resolveProviderExtraction} from '../../lib/analysis/validate.ts';
import type {AnalyzeRequest} from '../../lib/contracts/index.ts';
import type {ProviderConfig} from '../../lib/analysis/provider.ts';

const config:ProviderConfig={apiBaseUrl:'https://dashscope.aliyuncs.com/compatible-mode/v1',apiKey:'synthetic-source-audit-only',modelId:'qwen3.8-max',region:'cn-beijing',responseMode:'json_schema',maxOutputTokens:2400,timeoutMs:25000,temperature:0};
const words='For payroll registration, provide your account holder name and account number.';
const request:AnalyzeRequest={contractVersion:'2.0.0',requestId:'source-audit-boundary-01',revision:1,locale:'en-HK',clarificationsUsed:0,evidence:[{id:'E1',kind:'instruction',label:'Fictional payroll request',sequence:1,text:words}]};
const candidate=()=>({actions:[{id:'A1',actor:'applicant',operation:'share_payroll_details',polarity:'requested',recipient:'unknown',purpose:'Payroll registration.',citations:[{evidenceId:'E1',quote:words,occurrence:1}]}],claims:[],comparisons:[],relationships:[],unknowns:[{id:'U1',kind:'employer_authorization',priority:'context',issue:'Sender authority is unverified.',relatedActionIds:['A1']}],questions:[]});
const expectedRaw={actions:[{id:'A1',actor:'applicant',verb:'share_account_details',resource:'account_information',mechanism:'payroll_information',polarity:'requested',recipient:'unknown',purpose:'Payroll registration.',citations:[{evidenceId:'E1',quote:words,occurrence:1}]}],claims:[],comparisons:[],relationships:[],unknowns:[{id:'U1',kind:'employer_authorization',priority:'context',issue:'Sender authority is unverified.',relatedActionIds:['A1']}],questions:[]};
const accepted=()=>({checkedIds:['A1','U1'],unsupported:[],missing:[]});
type Reply={value:unknown;finish?:string;wire?:unknown;http?:number;onFetch?:()=>void};
async function replies<T>(values:Reply[],run:(bodies:Record<string,any>[])=>Promise<T>){
 const original=globalThis.fetch,bodies:Record<string,any>[]=[];
 globalThis.fetch=async(_url,init)=>{
  const index=bodies.length;assert.ok(index<values.length,'No automatic retry or third request.');
  bodies.push(JSON.parse(String(init!.body)));const reply=values[index];reply.onFetch?.();
  if(reply.http)return new Response('',{status:reply.http});
  return Response.json(reply.wire??{usage:{prompt_tokens:index===0?100:70,completion_tokens:index===0?40:20},choices:[{finish_reason:reply.finish??'stop',message:{role:'assistant',content:typeof reply.value==='string'?reply.value:JSON.stringify(reply.value)}}]});
 };
 try{return await run(bodies);}finally{globalThis.fetch=original;assert.equal(bodies.length,values.length);}
}
const run=(signal=new AbortController().signal,version='extract-v2.14')=>createSourceBoundProvider(config).extract({request,promptVersion:version,systemPrompt:'Synthetic quote-first extraction.',outputSchema:schema},signal);
const isFailure=(code:string,inputTokens:number|null=170,outputTokens:number|null=60)=>(error:unknown)=>{assert.ok(error instanceof AnalysisFailure);assert.equal(error.errorCode,code);assert.deepEqual(error.usage,{inputTokens,outputTokens});return true;};

test('a supported candidate survives one independent audit unchanged with combined usage',async()=>{
 await replies([{value:candidate()},{value:accepted()}],async bodies=>{
  const result=await run();assert.deepEqual(JSON.parse(result.jsonText),expectedRaw);
  assert.deepEqual(result.usage,{inputTokens:170,outputTokens:60});assert.ok(result.latencyMs>=0);
  assert.doesNotThrow(()=>resolveProviderExtraction(JSON.parse(result.jsonText),request));
  assert.equal((createSourceBoundProvider(config) as any).maxRequestsPerExtraction,2);
  assert.ok(bodies[0].response_format.json_schema.schema.properties.actions.items.properties.operation);
  assert.equal(bodies[0].response_format.json_schema.schema.$schema,undefined);
  assert.equal(bodies[0].response_format.json_schema.schema.title,undefined);
  assert.deepEqual(Object.keys(bodies[0].response_format.json_schema.schema.properties.actions.items.properties).slice(0,2),['id','citations']);
  assert.equal(JSON.parse(bodies[0].messages[1].content).auditCandidate,undefined);
  assert.deepEqual(JSON.parse(bodies[1].messages[1].content).auditCandidate,expectedRaw);
  assert.deepEqual(JSON.parse(bodies[1].messages[1].content).evidence,request.evidence);
  assert.equal(bodies[1].max_tokens,650);
  assert.ok(bodies[1].response_format.json_schema.schema.properties.checkedIds);
  assert.ok(!bodies[1].messages[0].content.includes(JSON.stringify(expectedRaw)),'Candidate is data in the user message, never audit instructions.');
 });
});

test('unsupported credential actions, actors and inferred recipients reject the whole candidate without repair',async()=>{
 for(const field of ['operation','actor','recipient']){
  const value=candidate();
  if(field==='operation')value.actions[0].operation='share_login_otp';
  if(field==='actor')value.actions[0].actor='employer';
  if(field==='recipient')value.actions[0].recipient='employer';
  const audit:any=accepted();audit.unsupported=[{itemId:'A1',field,reasonCode:'not_supported_by_source'}];
  await replies([{value},{value:audit}],async()=>{await assert.rejects(run(),isFailure('invalid_output'));});
 }
});

test('the audit must cover each candidate ID exactly once and cannot introduce unknown IDs or extra keys',async()=>{
 const audits:any[]=[{...accepted(),checkedIds:['A1']},{...accepted(),checkedIds:['A1','A1','U1']},{...accepted(),checkedIds:['A1','U2']},{...accepted(),guidance:'safe'},{...accepted(),unsupported:[{itemId:'A9',field:'actor',reasonCode:'not_supported_by_source'}]}];
 for(const audit of audits)await replies([{value:candidate()},{value:audit}],async()=>{await assert.rejects(run(),isFailure('invalid_output'));});
});

test('a reported missing source-backed material action fails safely instead of accepting a partial result',async()=>{
 const audit:any=accepted();audit.missing=[{evidenceId:'E1',quote:words,kind:'material_action'}];
 await replies([{value:candidate()},{value:audit}],async()=>{await assert.rejects(run(),isFailure('invalid_output'));});
});

test('invalid evidence references and quotations in an audit remain citation failures',async()=>{
 for(const finding of [{evidenceId:'E8',quote:words,kind:'material_action'},{evidenceId:'E1',quote:'An invented demand.',kind:'material_action'}]){
  const audit:any=accepted();audit.missing=[finding];
  await replies([{value:candidate()},{value:audit}],async()=>{await assert.rejects(run(),isFailure('invalid_citation'));});
 }
});

test('malformed, truncated and refused audit outputs retain the usage of both calls',async()=>{
 for(const reply of [{value:'{broken'},{value:accepted(),finish:'length'},{value:accepted(),finish:'refusal'},{value:{...accepted(),unsupported:[{itemId:'A1',field:'actor',reasonCode:'invented_reason'}]}}]){
  await replies([{value:candidate()},reply],async()=>{await assert.rejects(run(),isFailure('invalid_output'));});
 }
});

test('an audit provider failure preserves phase charges while keeping the aggregate unknown',async()=>{
 await replies([{value:candidate()},{value:null,http:503}],async()=>{await assert.rejects(run(),error=>{isFailure('provider_error',null,null)(error);assert.deepEqual((error as any).phaseUsage,{generation:{inputTokens:100,outputTokens:40},audit:{inputTokens:null,outputTokens:null}});return true;});});
 await replies([{value:candidate()},{value:null,wire:{usage:{prompt_tokens:70,completion_tokens:20},choices:[]}}],async()=>{await assert.rejects(run(),isFailure('invalid_output'));});
});

test('invalid generation stops before the audit and preserves the observed first charge',async()=>{
 const badQuote=candidate();badQuote.actions[0].citations[0].quote='An invented payroll request.';
 const extra:any=candidate();extra.actions[0].resource='account_information';
 for(const value of [badQuote,extra])await replies([{value}],async()=>{await assert.rejects(run(),isFailure(value===badQuote?'invalid_citation':'invalid_output',100,40));});
 await replies([{value:candidate(),finish:'length'}],async()=>{await assert.rejects(run(),isFailure('invalid_output',100,40));});
});

test('cancellation before generation makes no call and cancellation in the audit propagates without a third call',async()=>{
 const before=new AbortController();before.abort();
 await replies([],async()=>{await assert.rejects(run(before.signal),error=>error instanceof AnalysisFailure&&error.errorCode==='cancelled');});
 const during=new AbortController();
 await replies([{value:candidate()},{value:accepted(),onFetch:()=>during.abort()}],async()=>{
  await assert.rejects(run(during.signal),error=>error instanceof AnalysisFailure&&error.errorCode==='cancelled'&&error.usage.inputTokens===null&&error.usage.outputTokens===null);
 });
});

test('legacy v2.12 and compact v2.13 retain their single-call paths',async()=>{
 await replies([{value:expectedRaw}],async()=>{const result=await run(undefined,'extract-v2.12');assert.deepEqual(JSON.parse(result.jsonText),expectedRaw);assert.deepEqual(result.usage,{inputTokens:100,outputTokens:40});});
 await replies([{value:candidate()}],async()=>{const result=await run(undefined,'extract-v2.13');assert.deepEqual(JSON.parse(result.jsonText),expectedRaw);assert.deepEqual(result.usage,{inputTokens:100,outputTokens:40});});
});


test('a slow first phase may use the shared budget without reserving seven idle seconds',async()=>{
 const descriptor=Object.getOwnPropertyDescriptor(performance,'now'),clock=performance.now.bind(performance);let offset=0;
 Object.defineProperty(performance,'now',{configurable:true,value:()=>clock()+offset});
 try{
  await replies([{value:candidate(),onFetch:()=>{offset=19000;}},{value:accepted()}],async()=>{
   const result=await run();assert.deepEqual(JSON.parse(result.jsonText),expectedRaw);assert.ok(result.latencyMs>=19000);
  });
 }finally{if(descriptor)Object.defineProperty(performance,'now',descriptor);else Reflect.deleteProperty(performance,'now');}
});

test('a missing usage dimension in an attempted audit keeps that aggregate total unknown',async()=>{
 const wire={usage:{prompt_tokens:70},choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(accepted())}}]};
 await replies([{value:candidate()},{value:null,wire}],async()=>{
  const result=await run();assert.deepEqual(result.usage,{inputTokens:170,outputTokens:null});
 });
});


test('schema echoes and input metadata are rejected rather than stripped from captured output',async()=>{
 const values=[{...candidate(),$schema:'https://schemas.example.invalid/test'},{...candidate(),locale:'en-HK'},{...candidate(),remainingQuestions:2},schema];
 for(const value of values)await replies([{value}],async()=>{await assert.rejects(run(),isFailure('invalid_output',100,40));});
});
