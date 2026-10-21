import assert from 'node:assert/strict';
import {test} from 'node:test';
import providerSchema from '../../contracts/provider-extraction.schema.json';
import type {AnalyzeRequest} from '../../lib/contracts/index.ts';
import type {ContextAtoms} from '../../lib/server/context-generation.ts';
import {createSourceUnitCatalogue} from '../../lib/server/source-unit-generation.ts';
import {createSourceBoundProvider} from '../../lib/server/provider-source-schema.ts';
import {AnalysisFailure} from '../../lib/analysis/failure.ts';
import {CANDIDATE222_PROMPT_VERSION,CANDIDATE222_SYSTEM_PROMPT} from '../../lib/analysis/prompt-candidate-v2.22.ts';
const modulePromise=import('../../lib/server/repayment-coverage.ts').catch(()=>null);
const promptPromise=import('../../lib/analysis/prompt-candidate-v2.23.ts').catch(()=>null);
async function mod(){const m=await modulePromise;assert.ok(m,'Repayment coverage rejection filter must exist.');return m;}
const request=(texts:string[]):AnalyzeRequest=>({contractVersion:'2.0.0',requestId:'repayment-coverage-synthetic',revision:1,locale:'en-HK',clarificationsUsed:0,evidence:texts.map((text,i)=>({id:'E'+(i+1),kind:'instruction',label:'Authored synthetic repayment coverage',sequence:i+1,text}))});
const action=(operation='unresolved_pay',polarity='requested',actor='applicant',unitIds=['E1_u1'])=>({unitIds,actor,operation,polarity,recipient:'unknown'});
const promise=(unitIds=['E1_u1'],targets=[0])=>({unitIds,meaning:'repayment_promise' as const,targets});
const atoms=(actions:any[]=[action()],context:any[]=[])=>({actions,context}) as ContextAtoms;
const invalid=(error:unknown)=>(error as any).errorCode==='invalid_output';

test('repayment coverage checks every explicit marker unit and active financial target without adding or repairing facts',async()=>{
 const m=await mod();assert.equal(m.REPAYMENT_COVERAGE_VERSION,'repayment-coverage-1.0.0');
 const r=request(['Pay the fee. We will return the amount.','We will refund the deposit.']),units=createSourceUnitCatalogue(r),input=atoms([action()],[promise()]),before=structuredClone(input);
 assert.throws(()=>m.assertRepaymentCoverage(input,units),invalid,'A promise for a different marker unit cannot cover this one.');assert.deepEqual(input,before);
 input.context.push(promise(['E2_u1']));assert.doesNotThrow(()=>m.assertRepaymentCoverage(input,units));
 const wrong=atoms([action('unresolved_pay','prohibited'),action('unresolved_transfer','uncertain','unknown')],[promise(['E1_u1'],[0]),promise(['E2_u1'],[0])]);
 assert.throws(()=>m.assertRepaymentCoverage(wrong,units),invalid,'Targets must include an active original financial index.');
 for(const row of wrong.context)if(row.meaning!=='current_work')row.targets=[1];assert.doesNotThrow(()=>m.assertRepaymentCoverage(wrong,units));
 assert.throws(()=>m.assertRepaymentCoverage(atoms([action()],[{unitIds:['E1_u1'],meaning:'other_context',targets:[]}]),createSourceUnitCatalogue(request(['We will repay the loan.']))),invalid);
 assert.throws(()=>m.assertRepaymentCoverage(atoms([action()],[promise(['E1_u1'],[])]),createSourceUnitCatalogue(request(['We will repay the loan.']))),invalid);
});

test('requested and uncertain pay transfer and borrow trigger regardless of actor or funding, with bounded bilingual markers',async()=>{
 const m=await mod(),units=createSourceUnitCatalogue(request(['We will refund the deposit.']));
 for(const actor of ['applicant','employer','recruiter','third_party','unknown'])for(const operation of ['unresolved_pay','unresolved_transfer','unresolved_borrow','company_pay'])for(const polarity of ['requested','uncertain'])assert.throws(()=>m.assertRepaymentCoverage(atoms([action(operation,polarity,actor)]),units),invalid);
 for(const text of ['We will refund the deposit.','We will repay the loan.','We will return the amount.','We’ll refund it.','公司會退款。','我們會退還款項。','我们将会还款。','我哋會退返。'])assert.throws(()=>m.assertRepaymentCoverage(atoms(),createSourceUnitCatalogue(request([text]))),invalid,text);
 for(const text of ['Our refund policy is undecided.','We may consider a refund.','swe will refund the deposit.','We will refunding later.'])assert.doesNotThrow(()=>m.assertRepaymentCoverage(atoms(),createSourceUnitCatalogue(request([text]))),text);
});

test('nonactive financial events and OTP or payroll alone do not trigger; quoted denials can conservatively abstain without becoming claims',async()=>{
 const m=await mod(),units=createSourceUnitCatalogue(request(['We will repay the loan.']));
 for(const [operation,polarity] of [['company_other_operation','described'],['borrow_personally','prohibited'],['share_login_otp','requested'],['share_payroll_details','requested']])assert.doesNotThrow(()=>m.assertRepaymentCoverage(atoms([action(operation,polarity)]),units));
 const input=atoms(),before=structuredClone(input),quoted=createSourceUnitCatalogue(request(['The note never said “We will refund the deposit.”']));
 assert.throws(()=>m.assertRepaymentCoverage(input,quoted),invalid,'This filter deliberately cannot decide quotation or negation scope.');assert.deepEqual(input,before);assert.equal(input.context.length,0);
});

const config={apiBaseUrl:'https://dashscope.aliyuncs.com/compatible-mode/v1',apiKey:'fictional-repayment-filter-only',modelId:'qwen3.8-max',region:'cn-beijing',responseMode:'json_schema' as const,maxOutputTokens:2400,timeoutMs:50000,temperature:null};
async function replies<T>(values:unknown[],run:(rawBodies:string[])=>Promise<T>){
 const saved=globalThis.fetch,rawBodies:string[]=[];
 globalThis.fetch=async(_url,init)=>{const index=rawBodies.length;assert.ok(index<values.length,'No retry, repair call or extra audit.');rawBodies.push(String(init!.body));return Response.json({usage:{prompt_tokens:index?70:100,completion_tokens:index?20:40},choices:[{finish_reason:'stop',message:{content:JSON.stringify(values[index])}}]});};
 try{return await run(rawBodies);}finally{globalThis.fetch=saved;assert.equal(rawBodies.length,values.length);}
}
async function extract(r:AnalyzeRequest,version='extract-v2.23'){
 const p=await promptPromise;assert.ok(p,'The separate v2.23 alias profile must exist.');
 return createSourceBoundProvider(config).extract({request:r,promptVersion:version,systemPrompt:version===CANDIDATE222_PROMPT_VERSION?CANDIDATE222_SYSTEM_PROMPT:p.CANDIDATE223_SYSTEM_PROMPT,outputSchema:providerSchema},new AbortController().signal);
}

test('v2.23 rejects the captured failure shape before audit with first-call usage, while v2.22 preserves its original two-call behavior',async()=>{
 await mod();const r=request(['Use your own HKD 760 and transfer it to unlock the work batch. We will return the amount with earnings.']);
 const omitted=atoms([action('task_transfer')],[{unitIds:['E1_u1'],meaning:'current_work',actor:'applicant',polarity:'requested'}]),before=structuredClone(omitted);
 await replies([omitted],async()=>assert.rejects(extract(r),error=>{assert.ok(error instanceof AnalysisFailure);assert.equal(error.errorCode,'invalid_output');assert.deepEqual(error.usage,{inputTokens:100,outputTokens:40});assert.deepEqual((error as any).phaseUsage,{generation:{inputTokens:100,outputTokens:40},audit:null});return true;}));
 assert.deepEqual(omitted,before);
 await replies([omitted,{unsupported:[],missing:[]}],async()=>{const result=await extract(r,CANDIDATE222_PROMPT_VERSION);assert.ok(!JSON.parse(result.jsonText).claims.some((c:any)=>c.kind==='repayment_promise'));});
 const wrongUnit=request(['Pay using your own money to unlock the work. We will refund the deposit.','An ordinary onboarding note.']);
 for(const context of [[promise(['E2_u1'])],[promise(['E1_u1'],[])],[{unitIds:['E1_u1'],meaning:'other_context',targets:[]}]])await replies([atoms([action('task_pay')],context)],async()=>assert.rejects(extract(wrongUnit),error=>error instanceof AnalysisFailure&&error.errorCode==='invalid_output'&&error.usage.inputTokens===100));
});

test('the v2.23 alias and a correct typed promise produce byte-identical generation and audit POST bodies to v2.22',async()=>{
 const m=await mod(),p=await promptPromise;assert.ok(p);assert.equal(p.CANDIDATE223_PROMPT_VERSION,'extract-v2.23');assert.equal(p.CANDIDATE223_SYSTEM_PROMPT,CANDIDATE222_SYSTEM_PROMPT);assert.equal(m.REPAYMENT_COVERAGE_VERSION,'repayment-coverage-1.0.0');
 const r=request(['Borrow a personal loan for the project. We will repay the loan.']),input=atoms([action('borrow_personally')],[promise()]),responses=[input,{unsupported:[],missing:[]}],bodies:string[][]=[];
 for(const version of [CANDIDATE222_PROMPT_VERSION,p.CANDIDATE223_PROMPT_VERSION])await replies(responses,async raw=>{const result=await extract(r,version);bodies.push([...raw]);assert.ok(JSON.parse(result.jsonText).claims.some((c:any)=>c.kind==='repayment_promise'));assert.deepEqual(result.usage,{inputTokens:170,outputTokens:60});});
 assert.deepEqual(bodies[1],bodies[0]);assert.equal(bodies[0].length,2);
});
