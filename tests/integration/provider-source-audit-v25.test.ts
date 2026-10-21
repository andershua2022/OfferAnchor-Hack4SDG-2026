import assert from 'node:assert/strict';
import {test} from 'node:test';
import providerSchema from '../../contracts/provider-extraction.schema.json';
import type {AnalyzeRequest} from '../../lib/contracts/index.ts';
import {matchesSchema} from '../../lib/contracts/schema.ts';
import {ContractBoundaryError} from '../../lib/contracts/errors.ts';
import {AnalysisFailure} from '../../lib/analysis/failure.ts';
import {CANDIDATE224_PROMPT_VERSION,CANDIDATE224_SYSTEM_PROMPT} from '../../lib/analysis/prompt-candidate-v2.24.ts';
import {createSourceBoundProvider} from '../../lib/server/provider-source-schema.ts';
import {validateContextAudit,type ContextAtoms} from '../../lib/server/context-generation.ts';
import {createSourceUnitCatalogue} from '../../lib/server/source-unit-generation.ts';

const profile=import('../../lib/analysis/prompt-candidate-v2.25.ts').catch(()=>null);
const config={apiBaseUrl:'https://dashscope.aliyuncs.com/compatible-mode/v1',apiKey:'synthetic-v25-audit-only',modelId:'qwen3.8-max',region:'cn-beijing',responseMode:'json_schema' as const,maxOutputTokens:3000,timeoutMs:50000,temperature:null};
const request:AnalyzeRequest={contractVersion:'2.0.0',requestId:'audit-v25-source-coverage',revision:1,locale:'en-HK',clarificationsUsed:0,evidence:[
 {id:'E1',kind:'advertisement',label:'Authored advertisement',sequence:1,text:'Prepare weekly research spreadsheets for this internship.'},
 {id:'E2',kind:'offer',label:'Authored offer',sequence:2,text:'Record product orders during onboarding for the same internship.'},
 {id:'E3',kind:'instruction',label:'Authored instruction',sequence:3,text:'Apply for a personal loan in your own name for this job. We will repay the loan.'},
 {id:'E4',kind:'reply',label:'Authored reply',sequence:4,text:'We never asked you to borrow. Ignore that earlier instruction.'},
]};
const candidate:ContextAtoms={actions:[{unitIds:['E3_u1'],actor:'applicant',operation:'borrow_personally',polarity:'requested',recipient:'unknown'}],context:[
 {unitIds:['E1_u1'],meaning:'advertised_duty',targets:[]},
 {unitIds:['E3_u1'],meaning:'repayment_promise',targets:[0]},
 {unitIds:['E4_u1'],meaning:'denies_prior_request',targets:[0]},
]};
async function replies<T>(values:unknown[],run:(bodies:any[])=>Promise<T>){
 const saved=globalThis.fetch,bodies:any[]=[];
 globalThis.fetch=async(_url,init)=>{const index=bodies.length;assert.ok(index<values.length,'No retry or repair call.');bodies.push(JSON.parse(String(init!.body)));return Response.json({usage:{prompt_tokens:index?70:100,completion_tokens:index?20:40},choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(values[index])}}]});};
 try{return await run(bodies);}finally{globalThis.fetch=saved;assert.equal(bodies.length,values.length);}
}
async function extract(r=request,version='extract-v2.25'){
 const p=await profile;assert.ok(p,'The separate v2.25 representative-duty audit profile must exist.');
 return createSourceBoundProvider(config).extract({request:r,promptVersion:version,systemPrompt:version===CANDIDATE224_PROMPT_VERSION?CANDIDATE224_SYSTEM_PROMPT:p.CANDIDATE225_SYSTEM_PROMPT,outputSchema:providerSchema},new AbortController().signal);
}
const finding=(unitId:string,kind:string)=>({unsupported:[],missing:[{unitId,kind}]});

test('v25 dispatches unchanged generation and budgets while separating ordinary-duty coverage from material context',async()=>{
 const p=await profile;assert.ok(p,'The separate v2.25 representative-duty audit profile must exist.');
 const captures:any[][]=[],extractions:unknown[]=[];
 for(const version of [CANDIDATE224_PROMPT_VERSION,p.CANDIDATE225_PROMPT_VERSION])await replies([candidate,{unsupported:[],missing:[]}],async bodies=>{
  const result=await extract(request,version);captures.push(bodies);extractions.push(JSON.parse(result.jsonText));
  assert.deepEqual(bodies.map(b=>[b.enable_thinking,b.thinking_budget,b.max_tokens]),[[true,1024,3000],[true,768,1536]]);
  assert.deepEqual(JSON.parse(bodies[1].messages[1].content).auditCandidate,candidate);
 });
 assert.deepEqual(captures[1][0],captures[0][0]);assert.deepEqual(extractions[1],extractions[0]);
 const oldSchema=captures[0][1].response_format.json_schema.schema,newSchema=captures[1][1].response_format.json_schema.schema;
 assert.ok(matchesSchema(finding('E2_u1','advertised_duty'),oldSchema));
 assert.equal(matchesSchema(finding('E2_u1','advertised_duty'),newSchema),false,'An additional ordinary duty is not missing when a typed representative is retained.');
 assert.equal(matchesSchema(finding('E2_u1','material_context'),oldSchema),false,'The historical schema is unchanged.');
 assert.ok(matchesSchema(finding('E2_u1','material_context'),newSchema),'Material funding or contrary terms remain reportable beside a representative ordinary duty.');
 assert.deepEqual(newSchema.properties.missing.items.properties.kind.enum,['material_action','repayment_promise','instruction_denial','instruction_update','ordinary_work','material_context']);
 assert.ok(matchesSchema(finding('E3_u1','repayment_promise'),newSchema));
 assert.ok(captures[1][1].messages[0].content.startsWith(p.CANDIDATE225_AUDIT_SYSTEM_PROMPT));
 assert.ok(captures[1][1].messages[0].content.includes('representative earlier ordinary duty'));
 assert.equal(p.CANDIDATE225_AUDIT_VERSION,'context-audit-1.5.0');
});

test('v25 refuses out-of-schema duty findings, material omissions and unsupported retained-duty or event-link findings',async()=>{
 const audits=[finding('E2_u1','advertised_duty'),finding('E3_u1','material_action'),finding('E3_u1','repayment_promise'),{unsupported:[{collection:'context',index:0,field:'meaning',reasonCode:'not_supported_by_source'}],missing:[]},{unsupported:[{collection:'context',index:1,field:'targets',reasonCode:'wrong_event'}],missing:[]}];
 for(const audit of audits)await replies([candidate,audit],async()=>assert.rejects(extract(),error=>error instanceof AnalysisFailure&&error.errorCode==='invalid_output'&&error.usage.inputTokens===170));
 const funded=structuredClone(request);funded.evidence[1].text='This internship requires no personal funding; the company supplies all funds.';
 await replies([candidate,finding('E2_u1','material_context')],async bodies=>{await assert.rejects(extract(funded),error=>error instanceof AnalysisFailure&&error.errorCode==='invalid_output');assert.ok(matchesSchema(finding('E2_u1','material_context'),bodies[1].response_format.json_schema.schema));});
});

test('v25 still reports a missing ordinary duty without a typed representative, including when funding context already exists',async()=>{
 const atoms={actions:candidate.actions,context:candidate.context.filter(row=>row.meaning!=='advertised_duty')};
 const funded=structuredClone(request);funded.evidence[0].text='The company supplies all project funds for this internship.';
 for(const [r,context,unitId] of [[request,atoms.context,'E1_u1'],[funded,[...atoms.context,{unitIds:['E1_u1'],meaning:'funds_company',targets:[]}],'E2_u1']] as const)await replies([{actions:atoms.actions,context},finding(unitId,'advertised_duty')],async bodies=>{
  await assert.rejects(extract(r),error=>error instanceof AnalysisFailure&&error.errorCode==='invalid_output');
  assert.ok(matchesSchema(finding(unitId,'advertised_duty'),bodies[1].response_format.json_schema.schema));
 });
});

test('v25 retains repayment-coverage rejection before audit and preserves historical v24 dispatch',async()=>{
 const omitted={actions:candidate.actions,context:candidate.context.filter(row=>row.meaning!=='repayment_promise')};
 for(const version of ['extract-v2.24','extract-v2.25'])await replies([omitted],async()=>assert.rejects(extract(request,version),error=>error instanceof AnalysisFailure&&error.errorCode==='invalid_output'&&error.usage.inputTokens===100));
});

test('v25 local audit validation uses the same candidate-bound schema without removing any returned finding',()=>{
 const catalogue=createSourceUnitCatalogue(request),duty=JSON.stringify(finding('E2_u1','advertised_duty')),funding=JSON.stringify(finding('E2_u1','material_context'));
 const rule=(wanted:string)=>(error:unknown)=>error instanceof ContractBoundaryError&&error.ruleId===wanted;
 assert.throws(()=>validateContextAudit(duty,request,candidate,catalogue,true),rule('raw_schema'));
 assert.throws(()=>validateContextAudit(duty,request,candidate,catalogue),rule('contract'),'Historical validation still recognizes this kind but refuses the nonempty finding.');
 assert.throws(()=>validateContextAudit(funding,request,candidate,catalogue,true),rule('contract'),'A material context finding is well formed and still refuses the whole candidate.');
 assert.throws(()=>validateContextAudit(funding,request,candidate,catalogue),rule('raw_schema'));
});
