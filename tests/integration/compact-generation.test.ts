import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import schema from '../../contracts/provider-extraction.schema.json';
import {createSourceBoundProvider} from '../../lib/server/provider-source-schema.ts';
import {resolveProviderExtraction} from '../../lib/analysis/validate.ts';
import {selectPolicyReferences} from '../../lib/contracts/policy.ts';
import {AnalysisFailure} from '../../lib/analysis/failure.ts';
import type {AnalyzeRequest, CanonicalExtraction, ProviderExtraction} from '../../lib/contracts/index.ts';
import {createProviderAdapter} from '../../lib/analysis/provider.ts';
import {CANDIDATE213_SYSTEM_PROMPT} from '../../lib/analysis/prompt-candidate-v2.13.ts';

const provider = () => createSourceBoundProvider({
 apiBaseUrl:'https://dashscope.aliyuncs.com/compatible-mode/v1',apiKey:'synthetic-compact-boundary-only',
 modelId:'qwen3.8-max',region:'cn-beijing',responseMode:'json_schema',maxOutputTokens:2400,timeoutMs:25000,temperature:0,
});
const usage={inputTokens:321,outputTokens:123};
const input=(request:AnalyzeRequest,promptVersion='extract-v2.13')=>({request,promptVersion,systemPrompt:'Synthetic extraction boundary',outputSchema:schema});
const source='Never share an online-banking password or a login OTP with us.';
const request:AnalyzeRequest={contractVersion:'2.0.0',requestId:'compact-boundary-001',revision:1,locale:'en-HK',clarificationsUsed:0,
 evidence:[{id:'E1',kind:'instruction',label:'Authored synthetic control',sequence:1,text:source}]};
function compact(operation='share_login_otp',polarity='prohibited'){
 return {actions:[{id:'A1',actor:'applicant',operation,polarity,recipient:'employer',purpose:'Do not share banking access.',citations:[{evidenceId:'E1',quote:source,occurrence:1}]}],
 claims:[],comparisons:[],relationships:[],unknowns:[{id:'U1',kind:'employer_authorization',priority:'context',issue:'Sender authority is unverified.',relatedActionIds:['A1']}],questions:[]};
}
async function withReply<T>(value:unknown,run:(call:()=>Record<string,any>)=>Promise<T>,finishReason='stop'){
 const original=globalThis.fetch;let count=0,body:Record<string,any>={};
 globalThis.fetch=async(_url,init)=>{
  count++;body=JSON.parse(String(init!.body));
  return Response.json({usage:{prompt_tokens:321,completion_tokens:123},choices:[{finish_reason:finishReason,message:{role:'assistant',content:typeof value==='string'?value:JSON.stringify(value)}}]});
 };
 try{return await run(()=>body);}finally{globalThis.fetch=original;assert.equal(count,1,'Exactly one provider request; no repair/retry call.');}
}
const extract=(r=request,version='extract-v2.13')=>provider().extract(input(r,version),new AbortController().signal);

test('compact generation expands an OTP prohibition without changing its actor, polarity or evidence',async()=>{
 await withReply(compact(),async wire=>{
  const result=await extract(),raw=JSON.parse(result.jsonText);
  assert.deepEqual(raw.actions,[{id:'A1',actor:'applicant',verb:'share_otp',polarity:'prohibited',resource:'account_control',mechanism:'credential_control',recipient:'employer',purpose:'Do not share banking access.',citations:[{evidenceId:'E1',quote:source,occurrence:1}]}]);
  assert.equal(raw.actions[0].operation,undefined);
  assert.deepEqual(result.usage,usage);
  const generated=wire().response_format.json_schema.schema;
  assert.equal(generated.properties.actions.items.properties.verb,undefined);
  assert.equal(generated.properties.actions.items.properties.resource,undefined);
  assert.equal(generated.properties.actions.items.properties.mechanism,undefined);
  assert.ok(generated.properties.actions.items.properties.operation.enum.includes('share_login_otp'));
  assert.equal(generated.properties.actions.items.additionalProperties,false);
  assert.equal(generated.properties.comparisons.maxItems,0);
  assert.equal(generated.properties.relationships.maxItems,0);
  assert.ok(!generated.properties.claims.items.properties.kind.enum.includes('advertised_duty'));
  assert.equal(selectPolicyReferences(resolveProviderExtraction(raw,request),[]).guidance,'no_personal_financial_request_identified');
 });
});

test('compact output rejects an old malformed three-field capture instead of repairing it',async()=>{
 const value:any=compact();delete value.actions[0].operation;
 Object.assign(value.actions[0],{verb:'other',resource:'account_control',mechanism:'credential_control'});
 await withReply(value,async()=>{
  await assert.rejects(extract(),error=>error instanceof AnalysisFailure&&error.errorCode==='invalid_output'&&assert.deepEqual(error.usage,usage)===undefined);
 });
});

test('unknown operations, extra fields and missing operation reject before expansion with original usage',async()=>{
 const values:any[]=[];
 const unknown:any=compact('invented_operation');values.push(unknown);
 const extraAction:any=compact();extraAction.actions[0].resource='account_control';values.push(extraAction);
 const extraRoot:any=compact();extraRoot.guidance='safe';values.push(extraRoot);
 const missing:any=compact();delete missing.actions[0].operation;values.push(missing);
 for(const value of values)await withReply(value,async()=>{
  await assert.rejects(extract(),error=>error instanceof AnalysisFailure&&error.errorCode==='invalid_output'&&assert.deepEqual(error.usage,usage)===undefined);
 });
});

test('compact citation shapes reject before expansion and exact wrong quotations still fail the canonical resolver',async()=>{
 const malformed:any=compact();malformed.actions[0].citations[0].occurrence=0;
 await withReply(malformed,async()=>{
  await assert.rejects(extract(),error=>error instanceof AnalysisFailure&&error.errorCode==='invalid_citation'&&assert.deepEqual(error.usage,usage)===undefined);
 });
 const extra:any=compact();extra.actions[0].citations[0].start=0;
 await withReply(extra,async()=>{
  await assert.rejects(extract(),error=>error instanceof AnalysisFailure&&error.errorCode==='invalid_citation');
 });
 const wrong=compact();wrong.actions[0].citations[0].quote='An invented quotation.';
 await withReply(wrong,async()=>{
  const result=await extract();
  assert.throws(()=>resolveProviderExtraction(JSON.parse(result.jsonText),request),error=>(error as any).errorCode==='invalid_citation');
 });
});

test('refusal, truncation and other unfinished outputs retain finish reason, raw text and usage',async()=>{
 for(const [wireReason,expected] of [['refusal','refusal'],['length','length'],['tool_calls','other']]){
  await withReply('{unfinished compact output',async()=>{
   const result=await extract();assert.equal(result.jsonText,'{unfinished compact output');assert.equal(result.finishReason,expected);assert.deepEqual(result.usage,usage);
  },wireReason);
 }
});

test('invalid or excessive compact JSON fails once with observed usage',async()=>{
 for(const value of ['{broken', ' '.repeat(96*1024)+'{}'])await withReply(value,async()=>{
  await assert.rejects(extract(),error=>error instanceof AnalysisFailure&&error.errorCode==='invalid_output'&&assert.deepEqual(error.usage,usage)===undefined);
 });
});

test('the previous prompt profile keeps the legacy raw wire and schema unchanged',async()=>{
 const raw:ProviderExtraction={...compact(),actions:[{id:'A1',actor:'applicant',verb:'share_otp',polarity:'prohibited',resource:'account_control',mechanism:'credential_control',recipient:'employer',purpose:'Do not share banking access.',citations:[{evidenceId:'E1',quote:source,occurrence:1}]}]} as ProviderExtraction;
 await withReply(raw,async wire=>{
  const result=await extract(request,'extract-v2.12');assert.deepEqual(JSON.parse(result.jsonText),raw);
  const generated=wire().response_format.json_schema.schema;
  assert.equal(generated.properties.actions.items.properties.operation,undefined);
  assert.ok(generated.properties.actions.items.properties.verb.enum.includes('other'));
 });
 const malformed:any=structuredClone(raw);malformed.actions[0].verb='other';
 await withReply(malformed,async()=>{
  const result=await extract(request,'extract-v2.12');assert.deepEqual(JSON.parse(result.jsonText),malformed);
  assert.throws(()=>resolveProviderExtraction(JSON.parse(result.jsonText),request),error=>(error as any).ruleId==='mechanism');
 });
});

const projections=JSON.parse(readFileSync(new URL('../analysis/team-inputs-2026-10-14/frozen-development-annotations-v2/canonical-action-check-inputs.json',import.meta.url),'utf8')) as {caseId:string;request:AnalyzeRequest;extraction:CanonicalExtraction}[];
// Independent authored operation labels; expected tuples come from the unchanged frozen reference.
const operations:Record<string,string[]>={
 DEV01:['borrow_personally','transfer_loan_proceeds'],DEV02:['borrow_personally','share_login_otp','company_pay'],
 DEV03:['unresolved_pay'],DEV04:['share_payroll_details','share_login_otp'],DEV05:['unresolved_pay'],
 DEV06:['borrow_personally','nonfinancial_work'],DEV07:['borrow_personally'],DEV08:['nonfinancial_work'],
 DEV09:['task_pay'],DEV10:['borrow_personally'],DEV11:['borrow_personally','company_pay'],
 DEV12:['borrow_personally','share_login_otp','company_pay'],DEV13:['ordinary_expense_pay'],DEV14:['share_login_otp'],
 DEV15:['task_transfer'],DEV16:['task_transfer'],DEV17:['own_money_prohibition','company_pay'],DEV18:['share_login_otp','company_other_operation'],
};
function projectedCompact(p:typeof projections[number]):Record<string,any>{
 const copy=structuredClone(p.extraction);
 const rawCitation=(c:CanonicalExtraction['actions'][number]['citations'][number])=>{
  const text=p.request.evidence.find(e=>e.id===c.evidenceId)!.text;let from=0,occurrence=0,pos=-1;
  do{pos=text.indexOf(c.quote,from);occurrence++;from=pos+1;}while(pos>=0&&pos<c.start);
  assert.equal(pos,c.start,'Authored canonical position must resolve exactly.');
  return {evidenceId:c.evidenceId,quote:c.quote,occurrence};
 };
 return {...copy,actions:copy.actions.map(({verb,resource,mechanism,...a},i)=>({...a,operation:operations[p.caseId][i],citations:a.citations.map(rawCitation)})),claims:copy.claims.map(c=>({...c,citations:c.citations.map(rawCitation)}))};
}
test('all 18 frozen projections pass compact to raw to unchanged canonical validation without changing expected meaning',async()=>{
 assert.equal(projections.length,18);
 for(const p of projections)await withReply(projectedCompact(p),async()=>{
  const result=await extract(p.request),canonical=resolveProviderExtraction(JSON.parse(result.jsonText),p.request);
  assert.deepEqual(canonical,p.extraction,p.caseId);
  const guidance=selectPolicyReferences(canonical,[]).guidance;
  if(p.caseId==='DEV03'||p.caseId==='DEV05')assert.equal(guidance,'clarify_before_action',p.caseId);
 });
});

test('unknown funding and missing payer are never inferred and still require a linked blocking unknown',async()=>{
 for(const id of ['DEV03','DEV05']){
  const p=projections.find(p=>p.caseId===id)!,value=projectedCompact(p);
  value.unknowns=value.unknowns.filter((u:any)=>u.priority!=='blocking');
  await withReply(value,async()=>{
   const result=await extract(p.request),raw=JSON.parse(result.jsonText);
   assert.equal(raw.actions[0].actor,id==='DEV03'?'applicant':'unknown');
   assert.equal(raw.actions[0].resource,'unknown');assert.equal(raw.actions[0].mechanism,'unclear');
   assert.throws(()=>resolveProviderExtraction(raw,p.request),error=>(error as any).ruleId==='unknown');
  });
 }
});

test('a bare own-money prohibition operation cannot bypass the requested-action semantic guard',async()=>{
 const value=compact('own_money_prohibition','requested');
 await withReply(value,async()=>{
  const result=await extract(),raw=JSON.parse(result.jsonText);
  assert.equal(raw.actions[0].polarity,'requested');assert.equal(raw.actions[0].mechanism,'none');
  assert.throws(()=>resolveProviderExtraction(raw,request),error=>(error as any).ruleId==='mechanism');
 });
});

test('additional supported operations retain their literal public tuples for every polarity',async()=>{
 const expected:[string,string,string,string][]=[
  ['pay_loan_proceeds','pay','personal_borrowing','personal_borrowing'],
  ['share_bank_control','share_account_details','account_control','credential_control'],
  ['company_transfer','transfer','company_money','company_funded_work'],
  ['ordinary_expense_transfer','transfer','personal_money','ordinary_work_expense'],
  ['unresolved_transfer','transfer','unknown','unclear'],['unresolved_borrow','borrow','unknown','unclear'],
  ['unresolved_share_details','share_account_details','unknown','unclear'],['nonfinancial_other','other','none','none'],
 ];
 for(const [operation,verb,resource,mechanism] of expected)for(const polarity of ['requested','prohibited','described','uncertain']){
  const value=compact(operation,polarity);value.unknowns.push({id:'U2',kind:'resource',priority:'blocking',issue:'Resource needs checking.',relatedActionIds:['A1']});
  if(!['unresolved_transfer','unresolved_borrow','unresolved_share_details'].includes(operation)||!['requested','uncertain'].includes(polarity))value.unknowns.pop();
  await withReply(value,async()=>{
   const result=await extract(),raw=JSON.parse(result.jsonText),a=raw.actions[0];
   assert.deepEqual([a.verb,a.resource,a.mechanism,a.polarity],[verb,resource,mechanism,polarity]);
   assert.doesNotThrow(()=>resolveProviderExtraction(raw,request));
  });
 }
});

test('the direct generic provider retains its canonical wire with the v2.13 candidate',async()=>{
 const raw={...compact(),actions:[{id:'A1',actor:'applicant',verb:'share_otp',polarity:'prohibited',resource:'account_control',mechanism:'credential_control',recipient:'employer',purpose:'Do not share banking access.',citations:[{evidenceId:'E1',quote:source,occurrence:1}]}]};
 await withReply(raw,async wire=>{
  const generic=createProviderAdapter({apiBaseUrl:'https://dashscope.aliyuncs.com/compatible-mode/v1',apiKey:'synthetic-generic-compatibility',modelId:'qwen3.8-max',region:'cn-beijing',responseMode:'json_schema',maxOutputTokens:2400,timeoutMs:25000,temperature:0});
  const result=await generic.extract({...input(request),systemPrompt:CANDIDATE213_SYSTEM_PROMPT},new AbortController().signal);
  assert.deepEqual(JSON.parse(result.jsonText),raw);
  assert.deepEqual(wire().response_format.json_schema.schema,schema);
  assert.doesNotThrow(()=>resolveProviderExtraction(JSON.parse(result.jsonText),request));
 });
});

test('the full compact validator retains source restrictions and uniqueness before expansion',async()=>{
 const advertised:any=compact();advertised.claims=[{id:'C1',kind:'advertised_duty',status:'stated_in_input',text:'An invented earlier advertised duty.',relatedActionIds:['A1'],citations:[{evidenceId:'E1',quote:source,occurrence:1}]}];
 const duplicate:any=compact();duplicate.unknowns[0].relatedActionIds=['A1','A1'];
 for(const value of [advertised,duplicate])await withReply(value,async()=>{
  await assert.rejects(extract(),error=>error instanceof AnalysisFailure&&error.errorCode==='invalid_output'&&assert.deepEqual(error.usage,usage)===undefined);
 });
});

test('a prohibition on transferring own funds preserves transfer and never infers polarity',async()=>{
 const text='Never transfer your own money to us. The company uses its own funds.';
 const r=structuredClone(request);r.evidence[0].text=text;
 const value=compact('own_money_transfer_prohibition','prohibited');
 Object.assign(value.actions[0],{recipient:'unknown',purpose:'Do not transfer personal funds.',citations:[{evidenceId:'E1',quote:text,occurrence:1}]});
 await withReply(value,async()=>{
  const result=await extract(r),raw=JSON.parse(result.jsonText);
  assert.deepEqual(raw.actions,[{id:'A1',actor:'applicant',verb:'transfer',polarity:'prohibited',resource:'personal_money',mechanism:'none',recipient:'unknown',purpose:'Do not transfer personal funds.',citations:[{evidenceId:'E1',quote:text,occurrence:1}]}]);
  assert.equal(selectPolicyReferences(resolveProviderExtraction(raw,r),[]).guidance,'no_personal_financial_request_identified');
 });
 value.actions[0].polarity='requested';
 await withReply(value,async()=>{
  const result=await extract(r),raw=JSON.parse(result.jsonText);
  assert.equal(raw.actions[0].polarity,'requested');
  assert.throws(()=>resolveProviderExtraction(raw,r),error=>(error as any).ruleId==='mechanism');
 });
});

test('explicit own funds with an unresolved purpose remain known and require a linked payment-condition blocker',async()=>{
 const cases=[
  {operation:'own_funds_unresolved_pay',verb:'pay',text:'Please pay using your own savings; we will tell you what the payment is for later.'},
  {operation:'own_funds_unresolved_transfer',verb:'transfer',text:'Please transfer your own savings; we will tell you what the transfer is for later.'},
 ];
 for(const c of cases){
  const r=structuredClone(request);r.evidence[0].text=c.text;
  const value:any=compact(c.operation,'requested');
  Object.assign(value.actions[0],{recipient:'unknown',purpose:'The payment condition has not been stated.',citations:[{evidenceId:'E1',quote:c.text,occurrence:1}]});
  value.unknowns.push({id:'U2',kind:'payment_condition',priority:'blocking',issue:'The purpose or condition of the payment is unstated.',relatedActionIds:['A1']});
  value.questions=[{id:'Q1',unknownId:'U2',text:'What is the payment required for?'}];
  await withReply(value,async()=>{
   const result=await extract(r),raw=JSON.parse(result.jsonText);
   assert.deepEqual(raw.actions,[{id:'A1',actor:'applicant',verb:c.verb,polarity:'requested',resource:'personal_money',mechanism:'unclear',recipient:'unknown',purpose:'The payment condition has not been stated.',citations:[{evidenceId:'E1',quote:c.text,occurrence:1}]}]);
   assert.deepEqual(raw.unknowns[1],{id:'U2',kind:'payment_condition',priority:'blocking',issue:'The purpose or condition of the payment is unstated.',relatedActionIds:['A1']});
   const canonical=resolveProviderExtraction(raw,r);
   assert.equal(selectPolicyReferences(canonical,[]).guidance,'clarify_before_action');
   assert.deepEqual(canonical.questions,[{id:'Q1',unknownId:'U2',text:'What is the payment required for?'}]);
  });
  value.unknowns=value.unknowns.filter((u:any)=>u.priority!=='blocking');value.questions=[];
  await withReply(value,async()=>{
   const result=await extract(r),raw=JSON.parse(result.jsonText);
   assert.equal(raw.actions[0].resource,'personal_money');
   assert.throws(()=>resolveProviderExtraction(raw,r),error=>(error as any).ruleId==='unknown');
  });
 }
});
