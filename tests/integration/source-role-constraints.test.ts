import assert from 'node:assert/strict';
import {test} from 'node:test';
import providerSchema from '../../contracts/provider-extraction.schema.json';
import {createSourceBoundProvider} from '../../lib/server/provider-source-schema.ts';
import {resolveProviderExtraction} from '../../lib/analysis/validate.ts';
import {AnalysisFailure} from '../../lib/analysis/failure.ts';
import type {AnalyzeRequest,ProviderExtraction} from '../../lib/contracts/index.ts';
const modulePromise=import('../../lib/server/source-role-constraints.ts').catch(()=>null);
async function mod(){const m=await modulePromise;assert.ok(m,'Source-role constraints must exist.');return m;}
const request=(texts:string[],labels:string[]=[]):AnalyzeRequest=>({contractVersion:'2.0.0',requestId:'source-roles-boundary-01',revision:1,locale:'en-HK',clarificationsUsed:0,evidence:texts.map((text,i)=>({id:'E'+(i+1),kind:'instruction',label:labels[i]??'Authored synthetic source',sequence:i+1,text}))});
const action=(recipient='unknown',unitIds=['E1_u1'],operation='share_payroll_details',polarity='requested')=>({unitIds,actor:'applicant',operation,polarity,recipient});
const atoms=(actions:any[]=[])=>({actions,context:[]});

test('recipient candidates require bounded role markers in original text and ignore labels, company, us and payroll context',async()=>{
 const m=await mod(),r=request(['Provide payroll account details to us. The company handles bank account registration.'],['Employer recruiter applicant supplier']);
 assert.deepEqual(m.sourceRecipientRoles(r),['unknown']);
 const schema=m.createRoleConstrainedContextSchema(r);assert.deepEqual(schema.properties!.actions.items!.properties!.recipient.enum,['unknown']);
 const all=request(['The employer and recruiter told the applicant to contact a supplier.']);
 assert.deepEqual(m.sourceRecipientRoles(all),['unknown','applicant','employer','recruiter','third_party']);
});

test('role markers use English Unicode word boundaries and explicitly supported Chinese role vocabulary',async()=>{
 const m=await mod();
 const controls:[string,ProviderExtraction['actions'][number]['recipient']][]=[
  ['Employer','employer'],['雇主','employer'],['僱主','employer'],
  ['our recruiter','recruiter'],['招聘方','recruiter'],['招聘人員','recruiter'],['招聘人员','recruiter'],['招聘者','recruiter'],
  ['the applicant','applicant'],['求職者','applicant'],['求职者','applicant'],['申請人','applicant'],['申请人','applicant'],
  ['supplier','third_party'],['vendor','third_party'],['lender','third_party'],['third party','third_party'],['third-party','third_party'],['thirdparty','third_party'],
  ['供應商','third_party'],['供应商','third_party'],['貸款機構','third_party'],['贷款机构','third_party'],['第三方','third_party'],
 ];
 for(const [text,role] of controls)assert.ok(m.sourceRecipientRoles(request([text])).includes(role),text);
 assert.deepEqual(m.sourceRecipientRoles(request(['αemployer employerβ recruiter_name applicantish suppliership lenderly thirdpartyish'])),['unknown']);
});

test('bank markers require a clear institutional to/from/with phrase and never ordinary bank-account wording',async()=>{
 const m=await mod();
 for(const text of ['Send it to the bank.','A reply from the bank.','Arrange it with the bank.','向銀行提供資料。','由银行处理。','給銀行。','给银行。'])assert.ok(m.sourceRecipientRoles(request([text])).includes('third_party'),text);
 for(const text of ['Provide your bank account number.','Send it to the bank account.','Move it from the bank account.','Share it with the bank account holder.','給銀行帳戶。','向银行的账户转账。','online banking password and OTP'])assert.deepEqual(m.sourceRecipientRoles(request([text])),['unknown'],text);
});

test('known roles must occur in a selected source unit and an absent marker rejects rather than silently downgrading',async()=>{
 const m=await mod(),r=request(['The employer has a recruitment office.','For payroll registration, provide holder name and account number to us.']);
 assert.ok(m.sourceRecipientRoles(r).includes('employer'));
 const wrong=atoms([action('employer',['E2_u1'])]),before=structuredClone(wrong);
 assert.throws(()=>m.resolveRoleConstrainedContext(JSON.stringify(wrong),r),error=>(error as any).errorCode==='invalid_output');
 assert.deepEqual(wrong,before);assert.equal(wrong.actions[0].recipient,'employer');
 assert.throws(()=>m.resolveRoleConstrainedContext(JSON.stringify(atoms([action('employer')])),request(['Provide account details to us.'])),error=>(error as any).errorCode==='invalid_output');
});

test('explicit recruiter and supplier receiver markers preserve original roles and canonical financial tuples',async()=>{
 const m=await mod();
 const recruiter=request(['Never share a login OTP with our recruiter.']),r=m.resolveRoleConstrainedContext(JSON.stringify(atoms([action('recruiter',['E1_u1'],'share_login_otp','prohibited')])),recruiter).extraction;
 assert.equal(r.actions[0].recipient,'recruiter');assert.equal(r.actions[0].actor,'applicant');assert.equal(r.actions[0].polarity,'prohibited');
 const company=request(['The employer will transfer company funds directly to the supplier.']),input=atoms([{unitIds:['E1_u1'],actor:'employer',operation:'company_transfer',polarity:'described',recipient:'third_party'}]);
 const c=m.resolveRoleConstrainedContext(JSON.stringify(input),company);
 assert.deepEqual(c.atoms,input);assert.deepEqual(c.extraction.actions.map(a=>[a.actor,a.verb,a.resource,a.mechanism,a.recipient]),[['employer','transfer','company_money','company_funded_work','third_party']]);
 assert.doesNotThrow(()=>resolveProviderExtraction(c.extraction,company));
});

test('the bounded vocabulary can reject a supported paraphrase and does not claim lexical availability proves receiver binding',async()=>{
 const m=await mod(),r=request(['For payroll, send the details to the hiring company payroll department.']);
 assert.deepEqual(m.sourceRecipientRoles(r),['unknown']);
 assert.throws(()=>m.resolveRoleConstrainedContext(JSON.stringify(atoms([action('employer')])),r),'This is an intentional profile representation limit, not a universal semantic rule.');
 const cooccurrence=request(['The employer says payroll registration should be completed with us.']);
 const candidate=atoms([action('employer')]);assert.doesNotThrow(()=>m.resolveRoleConstrainedContext(JSON.stringify(candidate),cooccurrence),'A cooccurring role marker is only a filter; independent binding audit still decides support.');
});

const config={apiBaseUrl:'https://dashscope.aliyuncs.com/compatible-mode/v1',apiKey:'synthetic-source-roles-only',modelId:'qwen3.8-max',region:'cn-beijing',responseMode:'json_schema' as const,maxOutputTokens:2400,timeoutMs:50000,temperature:null};
async function replies<T>(values:{value:unknown;http?:number;finish?:string;onFetch?:()=>void}[],run:(bodies:any[])=>Promise<T>){
 const saved=globalThis.fetch,bodies:any[]=[];
 globalThis.fetch=async(_url,init)=>{const i=bodies.length;assert.ok(i<values.length,'No retry or third call.');bodies.push(JSON.parse(String(init!.body)));const value=values[i];value.onFetch?.();if(value.http)return new Response('',{status:value.http});return Response.json({usage:{prompt_tokens:i?70:100,completion_tokens:i?20:40},choices:[{finish_reason:value.finish??'stop',message:{content:typeof value.value==='string'?value.value:JSON.stringify(value.value)}}]});};
 try{return await run(bodies);}finally{globalThis.fetch=saved;assert.equal(bodies.length,values.length);}
}
const extract=(r:AnalyzeRequest,signal=new AbortController().signal)=>createSourceBoundProvider(config).extract({request:r,promptVersion:'extract-v2.19',systemPrompt:'Synthetic role-constrained context.',outputSchema:providerSchema},signal);

test('v2.19 sends a source-conditioned recipient enum and audits unchanged original atoms with bounded generation and unchanged audit budgets',async()=>{
 const r=request(['For payroll registration, provide account holder name and number to us.']),input=atoms([action()]),before=structuredClone(r);
 await replies([{value:input},{value:{unsupported:[],missing:[]}}],async bodies=>{
  const result=await extract(r);
  assert.deepEqual(bodies[0].response_format.json_schema.schema.properties.actions.items.properties.recipient.enum,['unknown']);
  assert.deepEqual(bodies.map(b=>[b.enable_thinking,b.thinking_budget,b.max_tokens]),[[true,1024,3000],[true,512,1536]]);
  assert.deepEqual(JSON.parse(bodies[1].messages[1].content).auditCandidate,input);
  assert.equal(JSON.parse(result.jsonText).actions[0].recipient,'unknown');assert.deepEqual(result.usage,{inputTokens:170,outputTokens:60});assert.deepEqual(r,before);
 });
});

test('role-filter failures stop before audit, while cooccurring markers and an unknown paraphrase receiver still require audit support',async()=>{
 const plain=request(['For payroll registration provide account details to us.']);
 await replies([{value:atoms([action('employer')])}],async()=>assert.rejects(extract(plain),error=>error instanceof AnalysisFailure&&error.errorCode==='invalid_output'&&error.usage.inputTokens===100));
 const wrongUnit=request(['The employer has a recruitment office.','For payroll registration provide details to us.']);
 await replies([{value:atoms([action('employer',['E2_u1'])])}],async()=>assert.rejects(extract(wrongUnit),error=>error instanceof AnalysisFailure&&error.errorCode==='invalid_output'&&error.usage.inputTokens===100));
 for(const [r,input] of [[request(['The employer says provide payroll details to us.']),atoms([action('employer')])],[request(['Send payroll details to the hiring company payroll department.']),atoms([action()])]] as const){
  await replies([{value:input},{value:{unsupported:[{collection:'actions',index:0,field:'recipient',reasonCode:'not_supported_by_source'}],missing:[]}}],async()=>assert.rejects(extract(r),error=>error instanceof AnalysisFailure&&error.errorCode==='invalid_output'&&error.usage.outputTokens===60));
 }
});

test('v2.19 preserves strict citations, failure usage and cancellation without changing the chosen role',async()=>{
 const m=await mod(),r=request(['Provide payroll information to the employer.']);
 assert.throws(()=>m.resolveRoleConstrainedContext(JSON.stringify(atoms([action('employer',['E8_u1'])])),r),error=>(error as any).errorCode==='invalid_citation');
 const extra:any=atoms([action('employer')]);extra.actions[0].verified=true;assert.throws(()=>m.resolveRoleConstrainedContext(JSON.stringify(extra),r),error=>(error as any).errorCode==='invalid_output');
 await replies([{value:atoms([action('employer')])},{value:null,http:503}],async()=>assert.rejects(extract(r),error=>{assert.ok(error instanceof AnalysisFailure);assert.deepEqual(error.usage,{inputTokens:null,outputTokens:null});assert.deepEqual((error as any).phaseUsage,{generation:{inputTokens:100,outputTokens:40},audit:{inputTokens:null,outputTokens:null}});return true;}));
 const before=new AbortController();before.abort();await replies([],async()=>assert.rejects(extract(r,before.signal),error=>error instanceof AnalysisFailure&&error.errorCode==='cancelled'));
});


const semantic20Promise=import('../../lib/analysis/prompt-candidate-v2.20.ts').catch(()=>null);
async function semantic20(){const m=await semantic20Promise;assert.ok(m,'The separate v2.20 semantic prompt must exist.');return m;}
const extract20=async(r:AnalyzeRequest)=>{const p=await semantic20();return createSourceBoundProvider(config).extract({request:r,promptVersion:p.CANDIDATE220_PROMPT_VERSION,systemPrompt:p.CANDIDATE220_SYSTEM_PROMPT,outputSchema:providerSchema},new AbortController().signal);};

test('v2.20 frontloads funding, absence-versus-prohibition and performer rules while preserving the complete v2.19 prompt',async()=>{
 const p=await semantic20(),previous=await import('../../lib/analysis/prompt-candidate-v2.19.ts');
 assert.equal(p.CANDIDATE220_PROMPT_VERSION,'extract-v2.20');assert.equal(p.CANDIDATE220_AUDIT_VERSION,'context-audit-1.1.0');
 assert.ok(p.CANDIDATE220_SYSTEM_PROMPT.endsWith(previous.CANDIDATE219_SYSTEM_PROMPT));
 const front=p.CANDIDATE220_SYSTEM_PROMPT.slice(0,-previous.CANDIDATE219_SYSTEM_PROMPT.length);
 for(const rule of ['unresolved_pay','not required','prohibited','sole current work','recipient','actor','earlier funding'])assert.ok(front.includes(rule),rule);
});

test('v2.20 preserves unknown funds, sole current work and a company performer with unchanged role schema and request budgets',async()=>{
 const p=await semantic20();
 const examples=[
  {r:request(['Pay HKD 760 to unlock the next work batch.']),input:atoms([action('unknown',['E1_u1'],'unresolved_pay')]),expected:[['applicant','pay','requested','unknown','unclear','unknown']]},
  {r:request(['No payment or borrowing is required. Schedule the planning meeting tomorrow.']),input:{actions:[],context:[{unitIds:['E1_u1'],meaning:'current_work',actor:'applicant',polarity:'requested'}]},expected:[['applicant','perform_work','requested','none','none','unknown']]},
  {r:request(['The company pays the supplier directly using company funds.']),input:atoms([{unitIds:['E1_u1'],actor:'employer',operation:'company_pay',polarity:'described',recipient:'third_party'}]),expected:[['employer','pay','described','company_money','company_funded_work','third_party']]},
 ];
 for(const {r,input,expected} of examples)await replies([{value:input},{value:{unsupported:[],missing:[]}}],async bodies=>{
  const result=await extract20(r),out=JSON.parse(result.jsonText);
  assert.deepEqual(out.actions.map((a:any)=>[a.actor,a.verb,a.polarity,a.resource,a.mechanism,a.recipient]),expected);
  assert.ok(bodies[0].messages[0].content.startsWith(p.CANDIDATE220_SYSTEM_PROMPT));
  assert.ok(bodies[1].messages[0].content.includes(p.CANDIDATE220_AUDIT_GUIDANCE));
  assert.deepEqual(bodies.map(b=>[b.thinking_budget,b.max_tokens]),[[1024,3000],[512,1536]]);
  const schema=bodies[0].response_format.json_schema.schema;
  assert.deepEqual(schema.properties.actions.items.properties.recipient.enum,(await mod()).sourceRecipientRoles(r));
  assert.ok(schema.properties.actions.items.properties.actor.enum.includes('employer'),'Receiver vocabulary must not remove a supported company performer.');
  assert.deepEqual(JSON.parse(bodies[1].messages[1].content).auditCandidate,input);
 });
});

test('v2.20 rejects unsupported funding, modality, performer and omitted earlier funding without repair or retry',async()=>{
 const p=await semantic20();
 const examples=[
  {r:request(['Pay HKD 760 to unlock the next work batch.']),input:atoms([action('unknown',['E1_u1'],'task_pay')]),audit:{unsupported:[{collection:'actions',index:0,field:'operation',reasonCode:'not_supported_by_source'}],missing:[]}},
  {r:request(['No payment or borrowing is required.']),input:atoms([action('unknown',['E1_u1'],'own_money_prohibition','prohibited')]),audit:{unsupported:[{collection:'actions',index:0,field:'polarity',reasonCode:'not_supported_by_source'}],missing:[]}},
  {r:request(['The company pays the supplier directly using company funds.']),input:atoms([{unitIds:['E1_u1'],actor:'unknown',operation:'company_pay',polarity:'described',recipient:'third_party'}]),audit:{unsupported:[{collection:'actions',index:0,field:'actor',reasonCode:'not_supported_by_source'}],missing:[]}},
 ];
 const earlier=request(['The company covers all task costs.','Pay HKD 760 to unlock the next work batch.']);earlier.evidence[0].kind='advertisement';
 examples.push({r:earlier,input:atoms([action('unknown',['E2_u1'],'unresolved_pay')]),audit:{unsupported:[],missing:[{unitId:'E1_u1',kind:'advertised_duty'}]}} as any);
 for(const {r,input,audit} of examples)await replies([{value:input},{value:audit}],async bodies=>{
  await assert.rejects(extract20(r),error=>error instanceof AnalysisFailure&&error.errorCode==='invalid_output'&&error.usage.inputTokens===170&&error.usage.outputTokens===60);
  assert.deepEqual(JSON.parse(bodies[1].messages[1].content).auditCandidate,input,'The original unsupported candidate must not be repaired.');
  for(const rule of ['funding','not required','actor','sole current work','earlier funding'])assert.ok(bodies[1].messages[0].content.includes(rule),rule);
  assert.ok(bodies[1].messages[0].content.includes(p.CANDIDATE220_AUDIT_VERSION));
 });
});

test('v2.19 retains its original generation text and context-audit-1.0.0 prompt after adding v2.20',async()=>{
 await semantic20();const previous=await import('../../lib/server/context-generation.ts'),r=request(['For payroll registration, provide account details to us.']);
 await replies([{value:atoms([action()])},{value:{unsupported:[],missing:[]}}],async bodies=>{
  await extract(r);
  assert.ok(bodies[0].messages[0].content.startsWith('Synthetic role-constrained context.'));
  assert.ok(bodies[1].messages[0].content.startsWith(previous.CONTEXT_AUDIT_SYSTEM_PROMPT+'\nRequired output JSON schema:\n'));
  assert.ok(!bodies[1].messages[0].content.includes('context-audit-1.1.0'));
 });
});


const semantic21Promise=import('../../lib/analysis/prompt-candidate-v2.21.ts').catch(()=>null);
async function semantic21(){const m=await semantic21Promise;assert.ok(m,'The separate v2.21 semantic prompt must exist.');return m;}
const extract21=async(r:AnalyzeRequest,timeoutMs=50000)=>{const p=await semantic21();return createSourceBoundProvider({...config,timeoutMs}).extract({request:r,promptVersion:p.CANDIDATE221_PROMPT_VERSION,systemPrompt:p.CANDIDATE221_SYSTEM_PROMPT,outputSchema:providerSchema},new AbortController().signal);};

test('v2.21 inherits v2.20 and frontloads company-other and representative-duty audit coverage with its own provenance',async()=>{
 const p=await semantic21(),previous=await semantic20();
 assert.equal(p.CANDIDATE221_PROMPT_VERSION,'extract-v2.21');assert.equal(p.CANDIDATE221_AUDIT_VERSION,'context-audit-1.2.0');
 assert.ok(p.CANDIDATE221_SYSTEM_PROMPT.endsWith(previous.CANDIDATE220_SYSTEM_PROMPT));
 assert.ok(p.CANDIDATE221_SYSTEM_PROMPT.startsWith('A source-described company'));
 for(const rule of ['company_other_operation','representative earlier duty','material earlier funding'])assert.ok(p.CANDIDATE221_AUDIT_GUIDANCE.toLowerCase().includes(rule),rule);
});

test('v2.21 retains an explicitly described company-fund operation without inventing pay or transfer and uses bounded 768-token audit thinking',async()=>{
 const p=await semantic21(),saved=globalThis.setTimeout,delays:number[]=[];
 globalThis.setTimeout=((callback:any,delay:any,...args:any[])=>{delays.push(Number(delay));return saved(callback,delay,...args);}) as typeof setTimeout;
 try{
  for(const text of ['The employer uses company funds for the project.','The company provides company funds for project expenses.','The employer spends company funds on the work.']){
   const r=request([text]),input=atoms([{unitIds:['E1_u1'],actor:'employer',operation:'company_other_operation',polarity:'described',recipient:'unknown'}]);
   await replies([{value:input},{value:{unsupported:[],missing:[]}}],async bodies=>{
    const result=await extract21(r),out=JSON.parse(result.jsonText);
    assert.deepEqual(out.actions.map((a:any)=>[a.actor,a.verb,a.resource,a.mechanism,a.polarity,a.recipient]),[['employer','other','company_money','company_funded_work','described','unknown']]);
    assert.deepEqual(bodies.map(b=>[b.thinking_budget,b.max_tokens]),[[1024,3000],[768,1536]]);
    assert.ok(bodies[1].messages[0].content.startsWith(p.CANDIDATE221_AUDIT_GUIDANCE));
    assert.deepEqual(JSON.parse(bodies[1].messages[1].content).auditCandidate,input);
   });
  }
  assert.ok(delays.includes(50000)&&delays.includes(38000)&&delays.includes(25000));
 }finally{globalThis.setTimeout=saved;}
});

test('v2.21 can retain representative earlier duty while material funding findings still reject the whole unchanged candidate',async()=>{
 const p=await semantic21(),r=request(['Prepare inventory reports.','Onboarding also includes filing routine stock records.','Borrow a personal loan for the work. We will repay that loan.','We never requested that borrowing; ignore that message.']);
 r.evidence[0].kind='advertisement';r.evidence[1].kind='offer';r.evidence[3].kind='reply';
 const input={actions:[action('unknown',['E3_u1'],'borrow_personally')],context:[{unitIds:['E1_u1'],meaning:'advertised_duty',targets:[]},{unitIds:['E3_u1'],meaning:'repayment_promise',targets:[0]},{unitIds:['E4_u1'],meaning:'denies_prior_request',targets:[0]}]};
 await replies([{value:input},{value:{unsupported:[],missing:[]}}],async bodies=>{
  const result=await extract21(r);assert.equal(JSON.parse(result.jsonText).claims.length,3);
  assert.deepEqual(JSON.parse(bodies[1].messages[1].content).auditCandidate,input);
  assert.ok(bodies[1].messages[0].content.startsWith(p.CANDIDATE221_AUDIT_GUIDANCE));
 });
 const funded=request(['The employer provides company funds for all project expenses.','Pay HKD 760 to unlock the next work batch.']);funded.evidence[0].kind='advertisement';
 const omitted=atoms([action('unknown',['E2_u1'],'unresolved_pay')]);
 await replies([{value:omitted},{value:{unsupported:[],missing:[{unitId:'E1_u1',kind:'advertised_duty'}]}}],async bodies=>{
  await assert.rejects(extract21(funded),error=>error instanceof AnalysisFailure&&error.errorCode==='invalid_output'&&error.usage.outputTokens===60);
  assert.deepEqual(JSON.parse(bodies[1].messages[1].content).auditCandidate,omitted);
 });
});

test('v2.21 caps the larger audit allowance by shared remaining time and leaves v2.20 audit text and budgets unchanged',async()=>{
 const p=await semantic21(),previous=await semantic20(),old=await import('../../lib/server/context-generation.ts'),r=request(['For payroll registration, provide holder name and account number to us.']),input=atoms([action()]);
 const descriptor=Object.getOwnPropertyDescriptor(performance,'now'),clock=performance.now.bind(performance),saved=globalThis.setTimeout,delays:number[]=[];let offset=0;
 Object.defineProperty(performance,'now',{configurable:true,value:()=>clock()+offset});
 globalThis.setTimeout=((callback:any,delay:any,...args:any[])=>{delays.push(Number(delay));return saved(callback,delay,...args);}) as typeof setTimeout;
 try{
  await replies([{value:input,onFetch:()=>{offset=37000;}},{value:{unsupported:[],missing:[]}}],async()=>{await extract21(r);assert.ok(!delays.includes(25000));assert.ok(delays.some(d=>d>12000&&d<=13000));});
  offset=0;delays.length=0;
  await replies([{value:input},{value:{unsupported:[],missing:[]}}],async()=>{await extract21(r,10000);assert.ok(delays.every(d=>d<=10000));});
  delays.length=0;
  await replies([{value:input},{value:{unsupported:[],missing:[]}}],async bodies=>{
   await extract20(r);assert.deepEqual(bodies.map(b=>b.thinking_budget),[1024,512]);assert.ok(delays.includes(15000)&&!delays.includes(25000));
   assert.ok(bodies[1].messages[0].content.startsWith(old.CONTEXT_AUDIT_SYSTEM_PROMPT+'\n\n'+previous.CANDIDATE220_AUDIT_GUIDANCE));
   assert.ok(!bodies[1].messages[0].content.includes(p.CANDIDATE221_AUDIT_VERSION));
  });
 }finally{globalThis.setTimeout=saved;if(descriptor)Object.defineProperty(performance,'now',descriptor);else Reflect.deleteProperty(performance,'now');}
});


const semantic22Promise=import('../../lib/analysis/prompt-candidate-v2.22.ts').catch(()=>null);
async function semantic22(){const m=await semantic22Promise;assert.ok(m,'The separate v2.22 semantic prompt must exist.');return m;}
const extract22=async(r:AnalyzeRequest)=>{const p=await semantic22();return createSourceBoundProvider(config).extract({request:r,promptVersion:p.CANDIDATE222_PROMPT_VERSION,systemPrompt:p.CANDIDATE222_SYSTEM_PROMPT,outputSchema:providerSchema},new AbortController().signal);};

test('v2.22 binds the performer to the selected operation and replaces inherited audits with a standalone wire-only protocol',async()=>{
 const p=await semantic22(),previous=await semantic21();
 assert.equal(p.CANDIDATE222_PROMPT_VERSION,'extract-v2.22');assert.equal(p.CANDIDATE222_AUDIT_VERSION,'context-audit-1.3.0');
 assert.ok(p.CANDIDATE222_SYSTEM_PROMPT.endsWith(previous.CANDIDATE221_SYSTEM_PROMPT));
 const front=p.CANDIDATE222_SYSTEM_PROMPT.slice(0,-previous.CANDIDATE221_SYSTEM_PROMPT.length);
 for(const rule of ['specific action','selected source units','payroll','applicant','other sources'])assert.ok(front.includes(rule),rule);
 assert.ok(!p.CANDIDATE222_AUDIT_SYSTEM_PROMPT.toLowerCase().includes('comparison'),'The auditor cannot condition coverage on an invisible derived field.');
 assert.ok(!p.CANDIDATE222_AUDIT_SYSTEM_PROMPT.includes(previous.CANDIDATE221_AUDIT_GUIDANCE));
});

test('v2.22 preserves separate company and applicant payroll performers with the v2.21 request budgets',async()=>{
 const p=await semantic22(),r=request(['The company uses company funds for project costs.','For payroll registration, provide your account holder name and account number to us.']);
 const input=atoms([{unitIds:['E1_u1'],actor:'employer',operation:'company_other_operation',polarity:'described',recipient:'unknown'},action('unknown',['E2_u1'])]);
 await replies([{value:input},{value:{unsupported:[],missing:[]}}],async bodies=>{
  const result=await extract22(r),out=JSON.parse(result.jsonText);
  assert.deepEqual(out.actions.map((a:any)=>[a.actor,a.verb,a.resource]),[['employer','other','company_money'],['applicant','share_account_details','account_information']]);
  assert.deepEqual(bodies.map(b=>[b.thinking_budget,b.max_tokens]),[[1024,3000],[768,1536]]);
  assert.ok(bodies[1].messages[0].content.startsWith(p.CANDIDATE222_AUDIT_SYSTEM_PROMPT+'\nRequired output JSON schema:\n'));
  assert.deepEqual(JSON.parse(bodies[1].messages[1].content).auditCandidate,input);
 });
 const wrong=structuredClone(input);wrong.actions[1].actor='employer';
 await replies([{value:wrong},{value:{unsupported:[{collection:'actions',index:1,field:'actor',reasonCode:'not_supported_by_source'}],missing:[]}}],async bodies=>{
  await assert.rejects(extract22(r),error=>error instanceof AnalysisFailure&&error.errorCode==='invalid_output'&&error.usage.inputTokens===170&&error.usage.outputTokens===60);
  assert.deepEqual(JSON.parse(bodies[1].messages[1].content).auditCandidate,wrong,'Wrong actor is rejected, never rewritten to applicant.');
 });
});

test('v2.22 defines representative earlier duty using retained source atoms and still rejects material omissions and malformed findings',async()=>{
 const p=await semantic22(),r=request(['Maintain inventory records.','Additional onboarding includes arranging old files.','Borrow a personal loan for the work. We promise to repay it.']);r.evidence[0].kind='advertisement';r.evidence[1].kind='offer';
 const input={actions:[action('unknown',['E3_u1'],'borrow_personally')],context:[{unitIds:['E1_u1'],meaning:'advertised_duty',targets:[]},{unitIds:['E3_u1'],meaning:'repayment_promise',targets:[0]}]};
 await replies([{value:input},{value:{unsupported:[],missing:[]}}],async bodies=>{
  const result=await extract22(r);assert.equal(JSON.parse(result.jsonText).claims.length,2);
  assert.ok(bodies[1].messages[0].content.includes('one retained source-supported earlier advertised_duty'));
  assert.ok(bodies[1].messages[0].content.includes('material earlier funding'));
 });
 const funded=request(['The company provides company funds for project costs.','Pay HKD 760 to unlock the next work batch.']);funded.evidence[0].kind='advertisement';const omitted=atoms([action('unknown',['E2_u1'],'unresolved_pay')]);
 for(const finding of [{unsupported:[],missing:[{unitId:'E1_u1',kind:'advertised_duty'}]},{unsupported:[],missing:[{unitId:'E9_u1',kind:'advertised_duty'}]},{unsupported:[],missing:[],checkedContext:[0]}])await replies([{value:omitted},{value:finding}],async()=>{
  await assert.rejects(extract22(funded),error=>error instanceof AnalysisFailure&&error.errorCode===(finding.missing[0]?.unitId==='E9_u1'?'invalid_citation':'invalid_output'));
 });
 const old=await semantic21(),context=await import('../../lib/server/context-generation.ts');
 await replies([{value:input},{value:{unsupported:[],missing:[]}}],async bodies=>{
  await extract21(r);assert.ok(bodies[1].messages[0].content.startsWith(old.CANDIDATE221_AUDIT_GUIDANCE+'\n\n'+context.CONTEXT_AUDIT_SYSTEM_PROMPT));
  assert.ok(!bodies[1].messages[0].content.includes(p.CANDIDATE222_AUDIT_VERSION));
 });
});
