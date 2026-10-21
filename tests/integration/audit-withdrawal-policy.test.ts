import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import schema from '../../contracts/provider-extraction.schema.json';
import {createSourceBoundProvider} from '../../lib/server/provider-source-schema.ts';
import {CANDIDATE228_PROMPT_VERSION,CANDIDATE228_SYSTEM_PROMPT,CANDIDATE228_AUDIT_VERSION} from '../../lib/analysis/prompt-candidate-v2.28.ts';
const request=JSON.parse(readFileSync('evals/repair-v28/cases.json','utf8')).cases.find((x:any)=>x.caseId==='RR06').request;
// Exact corrected draft from the exposed synthetic RR06 observation; no user data.
const draft={actions:[{unitIds:['E2_u1'],actor:'applicant',operation:'borrow_personally',polarity:'requested',recipient:'unknown'},{unitIds:['E2_u1'],actor:'applicant',operation:'transfer_loan_proceeds',polarity:'requested',recipient:'third_party'}],context:[{unitIds:['E1_u1'],meaning:'advertised_duty',targets:[]},{unitIds:['E3_u1'],meaning:'repayment_promise',targets:[0,1]},{unitIds:['E4_u1'],meaning:'withdraws_prior_request',targets:[0,1]}]};
const config={apiBaseUrl:'https://dashscope.aliyuncs.com/compatible-mode/v1',apiKey:'fictional-withdrawal-policy-test',modelId:'qwen3.8-max',region:'cn-beijing',responseMode:'json_schema' as const,maxOutputTokens:3000,timeoutMs:50000,temperature:null};
async function invoke(audit:unknown){
 const original=globalThis.fetch;const sent:any[]=[];
 globalThis.fetch=async(_input,init)=>{const body=JSON.parse(String(init?.body));sent.push(body);return Response.json({usage:{prompt_tokens:100,completion_tokens:40},choices:[{finish_reason:'stop',message:{content:JSON.stringify(sent.length===1?draft:audit)}}]});};
 try{const result=await createSourceBoundProvider(config).extract({request,promptVersion:CANDIDATE228_PROMPT_VERSION,systemPrompt:CANDIDATE228_SYSTEM_PROMPT,outputSchema:schema},new AbortController().signal);return {sent,result};}finally{globalThis.fetch=original;}
}
test('the real two-stage adapter sends the separately versioned withdrawal-polarity audit policy',async()=>{
 const {sent}=await invoke({unsupported:[],missing:[]});assert.equal(sent.length,2);assert.equal(CANDIDATE228_AUDIT_VERSION,'context-audit-1.8.0');assert.match(sent[1].messages[0].content,/A negated denial is not an asserted denial/);assert.match(sent[1].messages[0].content,/instruction_update/);
});
test('an audit finding on the same cancellation unit still rejects; no finding is filtered after inference',async()=>{
 await assert.rejects(invoke({unsupported:[],missing:[{unitId:'E4_u1',kind:'instruction_denial'}]}));
});
test('a repayment omission audit finding still rejects despite a withdrawal policy change',async()=>{
 await assert.rejects(invoke({unsupported:[],missing:[{unitId:'E3_u1',kind:'repayment_promise'}]}));
});
