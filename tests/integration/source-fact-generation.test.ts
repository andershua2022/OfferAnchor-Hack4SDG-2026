import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import providerSchema from '../../contracts/provider-extraction.schema.json';
import {createSourceBoundProvider} from '../../lib/server/provider-source-schema.ts';
import {resolveProviderExtraction} from '../../lib/analysis/validate.ts';
import {selectPolicyReferences} from '../../lib/contracts/policy.ts';
import {AnalysisFailure} from '../../lib/analysis/failure.ts';
import type {AnalyzeRequest,CanonicalExtraction} from '../../lib/contracts/index.ts';
const modulePromise=import('../../lib/server/source-fact-generation.ts').catch(()=>null);
const request=(texts:string[],kinds:string[]=[]):AnalyzeRequest=>({contractVersion:'2.0.0',requestId:'source-facts-boundary-01',revision:1,locale:'en-HK',clarificationsUsed:0,evidence:texts.map((text,i)=>({id:'E'+(i+1),sequence:i+1,kind:kinds[i]??'instruction',label:'Authored synthetic source',text}))} as AnalyzeRequest);
const cite=(evidenceId:string,quote:string)=>({evidenceId,quote,occurrence:1});
const action=(operation:string,quote:string,evidenceId='E1',polarity='requested',actor='applicant')=>({citations:[cite(evidenceId,quote)],actor,operation,polarity,recipient:'unknown',purpose:'Purpose not stated.'});
const statement=(kind:string,effect:string,quote:string,evidenceId='E1',targets:number[]=[],assertedFunds:string|null=null)=>({citations:[cite(evidenceId,quote)],kind,effect,assertedFunds,targets});
const facts=(actions:any[]=[],statements:any[]=[])=>({actions,statements});
async function mod(){const value=await modulePromise;assert.ok(value,'Typed source-fact generation must exist.');return value;}

test('source facts build unknown funding and known-own-funds clarification through the unchanged public validator',async()=>{
 const m=await mod();
 for(const [operation,text,resource,kind] of [['unresolved_pay','Pay before work can begin.','unknown','resource'],['own_funds_unresolved_pay','Pay using your own savings; the reason will be supplied later.','personal_money','payment_condition']]){
  const r=request([text]),out=m.resolveSourceFacts(JSON.stringify(facts([action(operation,text)])),r);
  assert.equal(out.extraction.actions[0].verb,'pay');assert.equal(out.extraction.actions[0].resource,resource);
  assert.equal(out.extraction.actions[0].mechanism,'unclear');
  const canonical=resolveProviderExtraction(out.extraction,r);
  assert.equal(selectPolicyReferences(canonical,[]).guidance,'clarify_before_action');
  assert.equal(canonical.unknowns.filter(u=>u.priority==='blocking').length,1);
  assert.equal(canonical.unknowns.find(u=>u.priority==='blocking')!.kind,kind);
  assert.equal(canonical.questions.length,1);
 }
});

test('IDs follow minimum source order while original action-index targets retain their meaning',async()=>{
 const m=await mod(),texts=['Borrow a personal loan.','Provide payroll account information.','Ignore the earlier borrowing instruction.'],r=request(texts,['instruction','instruction','reply']);
 const input=facts([action('share_payroll_details',texts[1],'E2'),action('borrow_personally',texts[0])],[statement('other','withdraws',texts[2],'E3',[1])]);
 const out=m.resolveSourceFacts(JSON.stringify(input),r);
 assert.equal(out.extraction.actions[0].id,'A1');assert.equal(out.extraction.actions[0].verb,'borrow');
 assert.equal(out.extraction.actions[1].id,'A2');assert.equal(out.extraction.actions[1].verb,'share_account_details');
 assert.deepEqual(out.extraction.claims[0].relatedActionIds,['A1']);
 assert.deepEqual(out.extraction.relationships.map(x=>[x.kind,x.earlierItemId,x.laterItemId]),[['clarifies','A1','C1']]);
 assert.deepEqual(out.facts,input,'Original atoms/indices are preserved for the independent audit.');
});

test('denial preserves the original demand and a same-event contradiction without a new operation',async()=>{
 const m=await mod(),texts=['Apply for a personal loan.','We never asked you to apply for that personal loan.'],r=request(texts,['instruction','reply']);
 const out=m.resolveSourceFacts(JSON.stringify(facts([action('borrow_personally',texts[0])],[statement('instruction_denial','denies_occurrence',texts[1],'E2',[0])])),r).extraction;
 assert.equal(out.actions.length,1);assert.equal(out.actions[0].polarity,'requested');
 assert.equal(out.claims[0].text,texts[1]);assert.equal(out.claims[0].status,'stated_in_input');
 assert.deepEqual(out.relationships.map(x=>[x.kind,x.earlierItemId,x.laterItemId]),[['contradicts','A1','C1']]);
 assert.ok(out.unknowns.some(u=>u.kind==='contradiction'&&u.priority==='blocking'));
 assert.deepEqual(out.questions,[]);assert.equal(selectPolicyReferences(resolveProviderExtraction(out,r),[]).guidance,'pause_requested_action');
});

test('company funding and two no-personal-funding statements agree with prohibited personal borrowing',async()=>{
 const m=await mod(),texts=['No personal funding is required.','The employer pays from company funds. Do not take a personal loan.','No personal funding is required.'],r=request(texts,['advertisement','instruction','reply']);
 const input=facts([action('company_pay',texts[1],'E2','described','employer'),action('borrow_personally',texts[1],'E2','prohibited')],[statement('advertised_duty','states_funding',texts[0],'E1',[0,1],'no_personal_funds'),statement('other','states_funding',texts[2],'E3',[0,1],'no_personal_funds')]);
 const out=m.resolveSourceFacts(JSON.stringify(input),r).extraction;
 assert.deepEqual(out.relationships,[]);assert.deepEqual(out.questions,[]);
 assert.equal(selectPolicyReferences(resolveProviderExtraction(out,r),[]).guidance,'no_personal_financial_request_identified');
});

test('repayment is an exact-quote unverified claim and same-source effects create no chronology links',async()=>{
 const m=await mod(),text='Borrow a personal loan. We promise to repay it. Ignore that borrowing instruction.',r=request([text]);
 const input=facts([action('borrow_personally','Borrow a personal loan.')],[statement('repayment_promise','none','We promise to repay it.','E1',[0]),statement('other','withdraws','Ignore that borrowing instruction.','E1',[0])]);
 const out=m.resolveSourceFacts(JSON.stringify(input),r).extraction;
 assert.equal(out.actions.length,1);assert.equal(out.claims[0].text,'We promise to repay it.');
 assert.equal(out.claims[0].status,'stated_in_input');assert.ok(out.unknowns.some(u=>u.kind==='repayment_verification'));
 assert.deepEqual(out.relationships,[]);
});

test('completed user-note actions are user reported and quotes retain exact Unicode and repeated occurrences',async()=>{
 const m=await mod(),texts=['Transfer your loan proceeds.','😀 I transferred it. I transferred it.'],r=request(texts,['instruction','user_note']);
 const s=statement('completed_action','reports_completion','I transferred it.','E2',[0]);s.citations[0].occurrence=2;
 const out=m.resolveSourceFacts(JSON.stringify(facts([action('transfer_loan_proceeds',texts[0])],[s])),r).extraction;
 assert.equal(out.claims[0].status,'user_reported');
 const canonical=resolveProviderExtraction(out,r);assert.equal(canonical.claims[0].citations[0].start,21);
 assert.deepEqual(out.relationships.map(x=>x.kind),['clarifies']);
});

test('invalid citations, extra fields, unknown operations and incompatible typed effects reject without repair',async()=>{
 const m=await mod(),text='Borrow a personal loan.',r=request([text]),values:any[]=[];
 const missing:any=facts([action('borrow_personally',text)]);delete missing.actions[0].citations;values.push([missing,'invalid_citation']);
 const quote=facts([action('borrow_personally','Invented quote.')]);values.push([quote,'invalid_citation']);
 values.push([facts([action('not_an_operation',text)]),'invalid_output']);
 const extra:any=facts([action('borrow_personally',text)]);extra.actions[0].resource='personal_borrowing';values.push([extra,'invalid_output']);
 values.push([facts([action('borrow_personally',text)],[statement('repayment_promise','withdraws',text,'E1',[0])]),'invalid_output']);
 values.push([facts([action('borrow_personally',text)],[statement('other','none',text,'E1',[0],'company')]),'invalid_output']);
 for(const [value,code] of values)assert.throws(()=>m.resolveSourceFacts(JSON.stringify(value),r),error=>(error as any).errorCode===code);
});

test('targets must be unique existing original action positions and prior-event effects cannot point forward',async()=>{
 const m=await mod(),texts=['We never asked that.','Borrow a personal loan.'],r=request(texts,['reply','instruction']);
 for(const targets of [[1],[0,0]])assert.throws(()=>m.resolveSourceFacts(JSON.stringify(facts([action('borrow_personally',texts[1],'E2')],[statement('instruction_denial','denies_occurrence',texts[0],'E1',targets)])),r));
 assert.throws(()=>m.resolveSourceFacts(JSON.stringify(facts([action('borrow_personally',texts[1],'E2')],[statement('instruction_denial','denies_occurrence',texts[0],'E1',[0])])),r),error=>(error as any).ruleId==='chronology');
});

const projections=JSON.parse(readFileSync(new URL('../analysis/team-inputs-2026-10-14/frozen-development-annotations-v2/canonical-action-check-inputs.json',import.meta.url),'utf8')) as {caseId:string;request:AnalyzeRequest;extraction:CanonicalExtraction}[];
const operations:Record<string,string[]>={DEV01:['borrow_personally','transfer_loan_proceeds'],DEV02:['borrow_personally','share_login_otp','company_pay'],DEV03:['unresolved_pay'],DEV04:['share_payroll_details','share_login_otp'],DEV05:['unresolved_pay'],DEV06:['borrow_personally','nonfinancial_work'],DEV07:['borrow_personally'],DEV08:['nonfinancial_work'],DEV09:['task_pay'],DEV10:['borrow_personally'],DEV11:['borrow_personally','company_pay'],DEV12:['borrow_personally','share_login_otp','company_pay'],DEV13:['ordinary_expense_pay'],DEV14:['share_login_otp'],DEV15:['task_transfer'],DEV16:['task_transfer'],DEV17:['own_money_prohibition','company_pay'],DEV18:['share_login_otp','company_other_operation']};
test('all 18 authored action projections remain structurally representable without changing their reference tuples',async()=>{
 const m=await mod();assert.equal(projections.length,18);
 for(const p of projections){
  const actions=p.extraction.actions.map((a,i)=>({actor:a.actor,operation:operations[p.caseId][i],polarity:a.polarity,recipient:a.recipient,purpose:a.purpose,citations:a.citations.map(c=>{
   const text=p.request.evidence.find(e=>e.id===c.evidenceId)!.text;let from=0,pos=-1,occurrence=0;do{pos=text.indexOf(c.quote,from);occurrence++;from=pos+1;}while(pos>=0&&pos<c.start);assert.equal(pos,c.start);
   return {evidenceId:c.evidenceId,quote:c.quote,occurrence};
  })}));
  const out=m.resolveSourceFacts(JSON.stringify(facts(actions)),p.request).extraction,canonical=resolveProviderExtraction(out,p.request);
  const tuple=(a:any)=>[a.actor,a.verb,a.polarity,a.resource,a.mechanism];
  assert.deepEqual(canonical.actions.map(tuple),p.extraction.actions.map(tuple),p.caseId);
  assert.equal(selectPolicyReferences(canonical,[]).guidance,selectPolicyReferences(p.extraction,[]).guidance,p.caseId);
 }
});

test('the atom audit checks original positions and rejects unsupported fields, missing sources and bad quotes',async()=>{
 const m=await mod(),text='Provide payroll account information.',r=request([text]),input=facts([action('share_payroll_details',text)]);
 const valid={checkedActions:[0],checkedStatements:[],unsupported:[],missing:[]};
 assert.doesNotThrow(()=>m.validateSourceFactAudit(JSON.stringify(valid),r,input));
 for(const value of [{...valid,checkedActions:[]},{...valid,checkedActions:[0,0]},{...valid,unsupported:[{collection:'actions',index:0,field:'recipient',reasonCode:'not_supported_by_source'}]},{...valid,missing:[{evidenceId:'E1',quote:text,kind:'material_action'}]}])assert.throws(()=>m.validateSourceFactAudit(JSON.stringify(value),r,input));
 assert.throws(()=>m.validateSourceFactAudit(JSON.stringify({...valid,missing:[{evidenceId:'E1',quote:'Invented omission.',kind:'material_action'}]}),r,input),error=>(error as any).errorCode==='invalid_citation');
});

test('v2.15 uses exactly two calls and audits atoms rather than generated public text or IDs',async()=>{
 const text='Provide payroll account information.',r=request([text]),input=facts([action('share_payroll_details',text)]),original=globalThis.fetch,bodies:any[]=[];
 globalThis.fetch=async(_url,init)=>{bodies.push(JSON.parse(String(init!.body)));assert.ok(bodies.length<=2);const content=bodies.length===1?input:{checkedActions:[0],checkedStatements:[],unsupported:[],missing:[]};return Response.json({usage:{prompt_tokens:100,completion_tokens:20},choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(content)}}]});};
 try{
  const provider=createSourceBoundProvider({apiBaseUrl:'https://dashscope.aliyuncs.com/compatible-mode/v1',apiKey:'synthetic-facts-only',modelId:'qwen3.8-max',region:'cn-beijing',responseMode:'json_schema',maxOutputTokens:1800,timeoutMs:25000,temperature:0});
  const result=await provider.extract({request:r,promptVersion:'extract-v2.15',systemPrompt:'Synthetic source-fact extraction.',outputSchema:providerSchema},new AbortController().signal);
  assert.deepEqual(Object.keys(bodies[0].response_format.json_schema.schema.properties).sort(),['actions','statements']);
  assert.deepEqual(JSON.parse(bodies[1].messages[1].content).auditCandidate,input);
  const raw=JSON.parse(result.jsonText);assert.deepEqual(Object.keys(raw).sort(),['actions','claims','comparisons','questions','relationships','unknowns']);assert.equal(raw.actions[0].recipient,'unknown');
  assert.equal(selectPolicyReferences(resolveProviderExtraction(raw,r),[]).guidance,'no_personal_financial_request_identified');
  assert.deepEqual(result.usage,{inputTokens:200,outputTokens:40});
 }finally{globalThis.fetch=original;assert.equal(bodies.length,2);}
});


test('repayment promises link to an existing money action while context-only promises need no invented target',async()=>{
 const m=await mod(),texts=['Borrow a personal loan. We promise to repay that loan.'],r=request(texts);
 const promise=statement('repayment_promise','none','We promise to repay that loan.');
 assert.throws(()=>m.resolveSourceFacts(JSON.stringify(facts([action('borrow_personally','Borrow a personal loan.')],[promise])),r),error=>(error as any).ruleId==='reference');
 const context=m.resolveSourceFacts(JSON.stringify(facts([],[promise])),request(['We promise to repay that loan.'])).extraction;
 assert.deepEqual(context.claims[0].relatedActionIds,[]);assert.deepEqual(context.actions,[]);
});

test('the reduced live representation keeps ordinary work in statements alongside finance except third-party contrasts',async()=>{
 const m=await mod(),texts=['Use your own money to unlock the order tasks.'],r=request(texts);
 const value=facts([action('task_pay',texts[0]),action('nonfinancial_work',texts[0])]);
 assert.throws(()=>m.resolveSourceFacts(JSON.stringify(value),r),error=>(error as any).errorCode==='invalid_output');
 const company=request(['Record orders. The employer transfers company funds.']);
 assert.throws(()=>m.resolveSourceFacts(JSON.stringify(facts([action('nonfinancial_work','Record orders.'),action('company_transfer','The employer transfers company funds.','E1','described','employer')])),company),error=>(error as any).errorCode==='invalid_output');
});

test('the focused audit can report an omitted withdrawal as a real source update',async()=>{
 const m=await mod(),texts=['Borrow a personal loan.','Ignore that earlier borrowing instruction.'],r=request(texts,['instruction','reply']),input=facts([action('borrow_personally',texts[0])]);
 const audit={checkedActions:[0],checkedStatements:[],unsupported:[],missing:[{evidenceId:'E2',quote:texts[1],kind:'instruction_update'}]};
 assert.throws(()=>m.validateSourceFactAudit(JSON.stringify(audit),r,input),error=>(error as any).errorCode==='invalid_output'&&(error as any).ruleId==='contract');
});
