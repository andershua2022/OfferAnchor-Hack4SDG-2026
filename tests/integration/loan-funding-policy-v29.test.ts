import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import schema from '../../contracts/provider-extraction.schema.json';
import {createSourceBoundProvider} from '../../lib/server/provider-source-schema.ts';
import {CANDIDATE228_SYSTEM_PROMPT} from '../../lib/analysis/prompt-candidate-v2.28.ts';
const next=import('../../lib/analysis/prompt-candidate-v2.29.ts').catch(()=>null);
const cases=JSON.parse(readFileSync('tests/analysis/release-cases-2026-10-19.json','utf8')).items;
const request=cases.find((x:any)=>x.id==='F01').request;
const positive={actions:[{unitIds:['E2_u1'],actor:'applicant',operation:'borrow_personally',polarity:'requested',recipient:'unknown'},{unitIds:['E2_u1'],actor:'applicant',operation:'transfer_loan_proceeds',polarity:'requested',recipient:'third_party'}],context:[{unitIds:['E1_u1'],meaning:'advertised_duty',targets:[]},{unitIds:['E3_u1'],meaning:'repayment_promise',targets:[0,1]},{unitIds:['E4_u1'],meaning:'withdraws_prior_request',targets:[0,1]}]};
const company={actions:[{unitIds:['E1_u1','E2_u1'],actor:'applicant',operation:'company_transfer',polarity:'requested',recipient:'third_party'},{unitIds:['E2_u1'],actor:'applicant',operation:'task_transfer',polarity:'prohibited',recipient:'third_party'},{unitIds:['E2_u1'],actor:'applicant',operation:'borrow_personally',polarity:'prohibited',recipient:'unknown'}],context:[{unitIds:['E2_u1'],meaning:'funds_company',targets:[0]}]};
const config={apiBaseUrl:'https://dashscope.aliyuncs.com/compatible-mode/v1',apiKey:'fictional-loan-funding-regression-test',modelId:'qwen3.8-max',region:'cn-beijing',responseMode:'json_schema' as const,maxOutputTokens:3000,timeoutMs:50000,temperature:null};
async function invoke(input:any,draft:any,audit:any={unsupported:[],missing:[]}){
 const profile=await next;assert.ok(profile,'The independently versioned loan-funding generation profile must exist');
 const original=globalThis.fetch,sent:any[]=[];
 globalThis.fetch=async(_input,init)=>{const body=JSON.parse(String(init?.body));sent.push(body);assert.ok(sent.length<=2);return Response.json({usage:{prompt_tokens:100,completion_tokens:40},choices:[{finish_reason:'stop',message:{content:JSON.stringify(sent.length===1?draft:audit)}}]});};
 try{const provider=createSourceBoundProvider(config);assert.equal(provider.maxRequestsPerExtraction,2);const result=await provider.extract({request:input,promptVersion:profile.CANDIDATE229_PROMPT_VERSION,systemPrompt:profile.CANDIDATE229_SYSTEM_PROMPT,outputSchema:schema},new AbortController().signal);return {result,sent};}finally{globalThis.fetch=original;}
}
test('new generation profile keeps the original loan and proceeds with one targeted repayment assurance',async()=>{
 const {result,sent}=await invoke(request,positive);assert.equal(sent.length,2);const e=JSON.parse(result.jsonText);assert.deepEqual(e.actions.map((a:any)=>[a.verb,a.resource]),[['borrow','personal_borrowing'],['transfer','personal_borrowing']]);const promise=e.claims.find((c:any)=>c.kind==='repayment_promise');assert.equal(promise.relatedActionIds.length,2);assert.ok(!e.claims.some((c:any)=>c.kind==='completed_action'||c.kind==='instruction_denial'));assert.match(sent[1].messages[0].content,/context-audit-1\.8\.0/);assert.match(sent[1].messages[0].content,/A negated denial is not an asserted denial/);
 const p=await next;assert.equal(p!.CANDIDATE229_PROMPT_VERSION,'extract-v2.29');assert.notEqual(p!.CANDIDATE229_SYSTEM_PROMPT,CANDIDATE228_SYSTEM_PROMPT);
});
test('the observed unsupported company-funding row still fails closed, without silent rewriting or an extra audit call',async()=>{
 const wrong=structuredClone(positive);wrong.context.splice(2,0,{unitIds:['E3_u1'],meaning:'funds_company',targets:[1]});const before=structuredClone(wrong);await assert.rejects(invoke(request,wrong),(e:any)=>e.errorCode==='invalid_output');assert.deepEqual(wrong,before);
});
test('a genuine company-funded same-payment clarification remains accepted with its distinct prohibitions',async()=>{
 const r=cases.find((x:any)=>x.id==='F02').request;const {result,sent}=await invoke(r,company);assert.equal(sent.length,2);const e=JSON.parse(result.jsonText);assert.equal(e.actions.filter((a:any)=>a.polarity==='requested').length,1);assert.equal(e.actions[0].resource,'company_money');assert.equal(e.actions.filter((a:any)=>a.polarity==='prohibited').length,2);assert.equal(e.questions.length,0);
});
test('the stronger generation prompt does not filter a real unsupported-funding audit finding',async()=>{
 await assert.rejects(invoke(request,positive,{unsupported:[{collection:'actions',index:1,field:'operation'}],missing:[]}),(e:any)=>e.errorCode==='invalid_output');
});
