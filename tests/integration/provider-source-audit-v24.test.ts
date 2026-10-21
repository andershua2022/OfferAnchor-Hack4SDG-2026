import assert from 'node:assert/strict';
import {test} from 'node:test';
import providerSchema from '../../contracts/provider-extraction.schema.json';
import type {AnalyzeRequest} from '../../lib/contracts/index.ts';
import {PROMPT_VERSION,SYSTEM_PROMPT} from '../../lib/analysis/index.ts';
import {AnalysisFailure} from '../../lib/analysis/failure.ts';
import {CANDIDATE222_PROMPT_VERSION,CANDIDATE222_SYSTEM_PROMPT,CANDIDATE222_AUDIT_SYSTEM_PROMPT} from '../../lib/analysis/prompt-candidate-v2.22.ts';
import {CANDIDATE223_PROMPT_VERSION,CANDIDATE223_SYSTEM_PROMPT} from '../../lib/analysis/prompt-candidate-v2.23.ts';
import {createSourceBoundProvider} from '../../lib/server/provider-source-schema.ts';

const profile=import('../../lib/analysis/prompt-candidate-v2.24.ts').catch(()=>null);
const config={apiBaseUrl:'https://dashscope.aliyuncs.com/compatible-mode/v1',apiKey:'synthetic-v24-audit-only',modelId:'qwen3.8-max',region:'cn-beijing',responseMode:'json_schema' as const,maxOutputTokens:3000,timeoutMs:50000,temperature:null};
const request:AnalyzeRequest={contractVersion:'2.0.0',requestId:'audit-v24-repeated-promise',revision:1,locale:'en-HK',clarificationsUsed:0,evidence:[
 {id:'E1',kind:'advertisement',label:'Authored synthetic advertisement',sequence:1,text:'Record the order sheet; no personal money is needed.'},
 {id:'E2',kind:'instruction',label:'Authored synthetic instruction',sequence:2,text:'Borrow a personal loan and transfer its proceeds to the coordinator. We will repay the loan and refund the amount.'},
 {id:'E3',kind:'reply',label:'Authored synthetic reply',sequence:3,text:'We never asked you to borrow or transfer; ignore that earlier instruction. Our repayment promise is unchanged.'},
]};
const candidate={actions:[
 {unitIds:['E2_u1'],actor:'applicant',operation:'borrow_personally',polarity:'requested',recipient:'unknown'},
 {unitIds:['E2_u1'],actor:'applicant',operation:'transfer_loan_proceeds',polarity:'requested',recipient:'unknown'},
],context:[
 {unitIds:['E1_u1'],meaning:'advertised_duty',targets:[]},
 {unitIds:['E1_u1'],meaning:'funds_no_personal_funds',targets:[]},
 {unitIds:['E2_u1'],meaning:'repayment_promise',targets:[0,1]},
 {unitIds:['E3_u1'],meaning:'denies_prior_request',targets:[0,1]},
]};
async function replies<T>(values:unknown[],run:(bodies:any[])=>Promise<T>){
 const saved=globalThis.fetch,bodies:any[]=[];
 globalThis.fetch=async(url,init)=>{
  assert.equal(String(url),config.apiBaseUrl+'/chat/completions');
  const index=bodies.length;assert.ok(index<values.length,'No retry, repair or extra provider call.');
  bodies.push(JSON.parse(String(init!.body)));
  return Response.json({usage:{prompt_tokens:index?70:100,completion_tokens:index?20:40},choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(values[index])}}]});
 };
 try{return await run(bodies);}finally{globalThis.fetch=saved;assert.equal(bodies.length,values.length);}
}
async function extract(version='extract-v2.24'){
 const p=await profile;assert.ok(p,'The separate v2.24 audit-alignment profile must exist.');
 const systemPrompt=version===CANDIDATE222_PROMPT_VERSION?CANDIDATE222_SYSTEM_PROMPT:version===CANDIDATE223_PROMPT_VERSION?CANDIDATE223_SYSTEM_PROMPT:p.CANDIDATE224_SYSTEM_PROMPT;
 return createSourceBoundProvider(config).extract({request,promptVersion:version,systemPrompt,outputSchema:providerSchema},new AbortController().signal);
}

test('v24 retains unchanged generation dispatch and unchanged generation with separately versioned audit coverage',async()=>{
 const p=await profile;assert.ok(p,'The separate v2.24 audit-alignment profile must exist.');
assert.equal(p.CANDIDATE224_SYSTEM_PROMPT,CANDIDATE223_SYSTEM_PROMPT);
 assert.equal(p.CANDIDATE224_AUDIT_VERSION,'context-audit-1.4.0');
 const captures:any[][]=[],extractions:unknown[]=[];
 for(const version of [CANDIDATE222_PROMPT_VERSION,CANDIDATE223_PROMPT_VERSION,p.CANDIDATE224_PROMPT_VERSION])await replies([candidate,{unsupported:[],missing:[]}],async bodies=>{
  const result=await extract(version);captures.push(bodies);extractions.push(JSON.parse(result.jsonText));
  assert.deepEqual(bodies.map(b=>[b.enable_thinking,b.thinking_budget,b.max_tokens]),[[true,1024,3000],[true,768,1536]]);
  assert.deepEqual(JSON.parse(bodies[1].messages[1].content).auditCandidate,candidate);
  assert.deepEqual(result.usage,{inputTokens:170,outputTokens:60});
 });
 assert.deepEqual(captures[2][0],captures[1][0]);assert.deepEqual(captures[1],captures[0]);
 assert.deepEqual(extractions[2],extractions[1]);
 assert.ok(captures[0][1].messages[0].content.startsWith(CANDIDATE222_AUDIT_SYSTEM_PROMPT));
 assert.ok(captures[2][1].messages[0].content.startsWith(p.CANDIDATE224_AUDIT_SYSTEM_PROMPT));
 assert.notEqual(captures[2][1].messages[0].content,captures[1][1].messages[0].content);
 assert.ok(captures[2][1].messages[0].content.includes('Repeated reassurance of the same already retained repayment promise'));
 assert.ok(captures[2][1].messages[0].content.includes('distinct assurance'));
});

test('v24 still rejects audit findings for a missing distinct promise or an unsupported event link without repair',async()=>{
 const findings=[
  {unsupported:[],missing:[{unitId:'E3_u1',kind:'repayment_promise'}]},
  {unsupported:[{collection:'context',index:2,field:'targets',reasonCode:'wrong_event'}],missing:[]},
 ];
 for(const audit of findings)await replies([candidate,audit],async()=>assert.rejects(extract(),error=>error instanceof AnalysisFailure&&error.errorCode==='invalid_output'&&error.usage.inputTokens===170));
});

test('v24 preserves the v23 repayment rejection before audit and the historical v22 behavior',async()=>{
 const omitted={actions:candidate.actions,context:candidate.context.filter(row=>row.meaning!=='repayment_promise')},before=structuredClone(omitted);
 for(const version of ['extract-v2.23','extract-v2.24'])await replies([omitted],async()=>assert.rejects(extract(version),error=>error instanceof AnalysisFailure&&error.errorCode==='invalid_output'&&error.usage.inputTokens===100));
 await replies([omitted,{unsupported:[],missing:[]}],async()=>{const result=await extract(CANDIDATE222_PROMPT_VERSION);assert.ok(!JSON.parse(result.jsonText).claims.some((claim:any)=>claim.kind==='repayment_promise'));});
 assert.deepEqual(omitted,before);
});
