import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import providerSchema from '../../contracts/provider-extraction.schema.json';
import type {ContextAtoms} from '../../lib/server/context-generation.ts';
import {createSourceUnitCatalogue} from '../../lib/server/source-unit-generation.ts';
import {createSourceBoundProvider} from '../../lib/server/provider-source-schema.ts';
import {CANDIDATE228_PROMPT_VERSION,CANDIDATE228_SYSTEM_PROMPT} from '../../lib/analysis/prompt-candidate-v2.28.ts';
import {AnalysisFailure} from '../../lib/analysis/failure.ts';
const request=JSON.parse(readFileSync('evals/repair-v28/cases.json','utf8')).cases.find((x:any)=>x.caseId==='RR06').request;
// Captured wrong draft from a fictional official-provider development case; no private user material.
const captured:ContextAtoms={"actions":[{"unitIds":["E2_u1"],"actor":"applicant","operation":"borrow_personally","polarity":"requested","recipient":"unknown"},{"unitIds":["E2_u1"],"actor":"applicant","operation":"transfer_loan_proceeds","polarity":"requested","recipient":"third_party"}],"context":[{"unitIds":["E1_u1"],"meaning":"advertised_duty","targets":[]},{"unitIds":["E3_u1"],"meaning":"repayment_promise","targets":[0]},{"unitIds":["E3_u1"],"meaning":"funds_company","targets":[1]},{"unitIds":["E4_u1"],"meaning":"withdraws_prior_request","targets":[0,1]}]};
const config={apiBaseUrl:'https://dashscope.aliyuncs.com/compatible-mode/v1',apiKey:'fictional-promise-funding-regression',modelId:'qwen3.8-max',region:'cn-beijing',responseMode:'json_schema' as const,maxOutputTokens:3000,timeoutMs:50000,temperature:null};
test('the captured promise-as-company-funding draft is rejected before audit with generation usage preserved',async()=>{
 const original=globalThis.fetch;let calls=0;const before=structuredClone(captured);
 globalThis.fetch=async()=>{calls++;return Response.json({usage:{prompt_tokens:100,completion_tokens:40},choices:[{finish_reason:'stop',message:{content:JSON.stringify(calls===1?captured:{unsupported:[],missing:[]})}}]});};
 try{await assert.rejects(createSourceBoundProvider(config).extract({request,promptVersion:CANDIDATE228_PROMPT_VERSION,systemPrompt:CANDIDATE228_SYSTEM_PROMPT,outputSchema:providerSchema},new AbortController().signal),e=>e instanceof AnalysisFailure&&e.errorCode==='invalid_output'&&e.usage.inputTokens===100&&e.usage.outputTokens===40);assert.equal(calls,1);assert.deepEqual(captured,before);}finally{globalThis.fetch=original;}
});
test('a typed repayment assurance for both original loan operations remains acceptable and is not rewritten',async()=>{
 const m=await import('../../lib/server/repayment-coverage.ts');const fn=(m as any).assertPromiseFundingConsistency;assert.equal(typeof fn,'function');
 const correct=structuredClone(captured);correct.context=correct.context.filter(row=>row.meaning!=='funds_company');const p=correct.context.find(row=>row.meaning==='repayment_promise')!;if(p.meaning!=='current_work')p.targets=[0,1];const before=structuredClone(correct);assert.doesNotThrow(()=>fn(correct,createSourceUnitCatalogue(request)));assert.deepEqual(correct,before);
});
test('a separate explicit current company-funds claim remains a contradiction candidate, not a repayment promise',async()=>{
 const m=await import('../../lib/server/repayment-coverage.ts');const fn=(m as any).assertPromiseFundingConsistency;assert.equal(typeof fn,'function');
 const r=structuredClone(request);r.evidence.push({id:'E5',kind:'reply',label:'Fictional conflicting current-funds assertion',sequence:5,text:'Those transferred funds were company money, not personal loan proceeds.'});const mixed=structuredClone(captured);mixed.context=mixed.context.map(row=>row.meaning==='funds_company'?{...row,unitIds:['E5_u1']}:row);assert.doesNotThrow(()=>fn(mixed,createSourceUnitCatalogue(r)));
});
test('company-funded non-loan work and non-pledge sources stay outside this finite reject-only guard',async()=>{
 const m=await import('../../lib/server/repayment-coverage.ts');const fn=(m as any).assertPromiseFundingConsistency;assert.equal(typeof fn,'function');
 const company=structuredClone(captured);company.actions[1].operation='company_transfer';assert.doesNotThrow(()=>fn(company,createSourceUnitCatalogue(request)));
 const r=structuredClone(request);r.evidence[2].text='The amount was company money and no refund or future assurance is stated.';assert.doesNotThrow(()=>fn(captured,createSourceUnitCatalogue(r)));
});
