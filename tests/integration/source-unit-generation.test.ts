import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import providerSchema from '../../contracts/provider-extraction.schema.json';
import {createSourceBoundProvider} from '../../lib/server/provider-source-schema.ts';
import {resolveProviderExtraction} from '../../lib/analysis/validate.ts';
import {selectPolicyReferences} from '../../lib/contracts/policy.ts';
import {validUnicode} from '../../lib/contracts/schema.ts';
import {AnalysisFailure} from '../../lib/analysis/failure.ts';
import type {AnalyzeRequest,CanonicalExtraction} from '../../lib/contracts/index.ts';
const modulePromise=import('../../lib/server/source-unit-generation.ts').catch(()=>null);
async function mod(){const value=await modulePromise;assert.ok(value,'Source-unit generation must exist.');return value;}
const request=(texts:string[],kinds:string[]=[]):AnalyzeRequest=>({contractVersion:'2.0.0',requestId:'source-units-boundary-01',revision:1,locale:'en-HK',clarificationsUsed:0,evidence:texts.map((text,i)=>({id:'E'+(i+1),sequence:i+1,kind:kinds[i]??'instruction',label:'Authored synthetic source',text}))} as AnalyzeRequest);
const action=(operation:string,unitIds=['E1_u1'],polarity='requested',actor='applicant')=>({unitIds,actor,operation,polarity,recipient:'unknown'});
const statement=(kind:string,effect='none',unitIds=['E1_u1'],targets:number[]=[],assertedFunds:string|null=null)=>({unitIds,kind,effect,assertedFunds,targets});
const work=(unitIds=['E1_u1'],actor='applicant',polarity='requested')=>({unitIds,actor,polarity});
const atoms=(actions:any[]=[],statements:any[]=[],duties:any[]=[])=>({actions,statements,work:duties});
const approved=(a=0,s=0,w=0)=>({checkedActions:Array.from({length:a},(_,i)=>i),checkedStatements:Array.from({length:s},(_,i)=>i),checkedWork:Array.from({length:w},(_,i)=>i),unsupported:[],missing:[]});

test('the deterministic catalogue covers original nonwhitespace spans once without changing Unicode or line boundaries',async()=>{
 const m=await mod(),texts=['😀 Same instruction.\n😀 Same instruction.\n','x'.repeat(399)+'😀'+'z'.repeat(401),'First sentence. Second sentence.\nFinal line.'],r=request(texts),original=structuredClone(r),units=m.createSourceUnitCatalogue(r);
 for(const e of r.evidence){
  const selected=units.filter(u=>u.evidenceId===e.id),coverage=Array(e.text.length).fill(0);
  for(const u of selected){assert.equal(u.text,e.text.slice(u.start,u.end));assert.ok(u.text.length>0&&u.text.length<=200);assert.ok(validUnicode(u.text));for(let i=u.start;i<u.end;i++)coverage[i]++;}
  for(let i=0;i<e.text.length;i++)if(!/\s/u.test(e.text[i]))assert.equal(coverage[i],1,'Every original nonwhitespace UTF-16 unit survives exactly once.');
  assert.deepEqual(selected.map(u=>u.start),selected.map(u=>u.start).toSorted((a,b)=>a-b));
 }
 const repeats=units.filter(u=>u.evidenceId==='E1');assert.equal(repeats.length,2);assert.equal(repeats[0].text,repeats[1].text);assert.deepEqual(repeats.map(u=>u.occurrence),[1,2]);
 assert.deepEqual(r,original);assert.throws(()=>m.createSourceUnitCatalogue(request(['bad\rtext'])));assert.throws(()=>m.createSourceUnitCatalogue(request(['broken\uD800'])));
});

test('annotated evidence is a copied user payload and source-specific unit enums contain no free quote or purpose slots',async()=>{
 const m=await mod(),r=request(['For payroll registration, provide your account holder name and account number.']),original=structuredClone(r),catalogue=m.createSourceUnitCatalogue(r),copy=m.annotateSourceUnitRequest(r,catalogue),schema=m.createSourceUnitSchema(r,catalogue);
 assert.notEqual(copy,r);assert.deepEqual(r,original);assert.equal(copy.evidence[0].text,'[E1_u1] '+r.evidence[0].text);
 assert.deepEqual(Object.keys(schema.properties!).sort(),['actions','statements','work']);
 assert.deepEqual(schema.properties!.actions.items!.properties!.unitIds.items!.enum,['E1_u1']);
 assert.equal(schema.properties!.actions.items!.properties!.purpose,undefined);assert.equal(schema.properties!.actions.items!.properties!.citations,undefined);
 assert.ok(!schema.properties!.actions.items!.properties!.operation.enum!.includes('nonfinancial_work'));
 assert.ok(!schema.properties!.statements.items!.properties!.kind.enum!.includes('advertised_duty'));
});

test('unit selection retains full payroll purpose and coordinated OTP negation in exact original citations',async()=>{
 const m=await mod(),text='For payroll registration, provide your bank account holder name and account number. Never share an online-banking password or a login OTP with us.',r=request([text]);
 const input=atoms([action('share_payroll_details'),action('share_login_otp',['E1_u1'],'prohibited')]),out=m.resolveSourceUnits(JSON.stringify(input),r);
 assert.deepEqual(out.atoms,input);
 assert.deepEqual(out.extraction.actions.map(a=>[a.verb,a.resource,a.mechanism,a.polarity,a.recipient]),[['share_account_details','account_information','payroll_information','requested','unknown'],['share_otp','account_control','credential_control','prohibited','unknown']]);
 assert.deepEqual(out.extraction.actions.map(a=>a.citations[0].quote),[text,text]);
 const canonical=resolveProviderExtraction(out.extraction,r);assert.equal(canonical.actions[0].citations[0].start,0);assert.equal(canonical.actions[0].citations[0].end,text.length);
});

test('work facts remain claims beside finance while sole work and described third-party borrowing contrasts remain actions',async()=>{
 const m=await mod(),r=request(['Record orders. The employer transfers company funds to the supplier.']);
 const value=atoms([action('company_transfer',['E1_u1'],'described','employer')],[],[work()]);
 const out=m.resolveSourceUnits(JSON.stringify(value),r).extraction;
 assert.equal(out.actions.length,1);assert.equal(out.actions[0].mechanism,'company_funded_work');assert.equal(out.claims.length,1);assert.equal(out.claims[0].kind,'other');assert.equal(out.claims[0].text,r.evidence[0].text);
 assert.equal(selectPolicyReferences(resolveProviderExtraction(out,r),[]).guidance,'no_personal_financial_request_identified');
 const sole=m.resolveSourceUnits(JSON.stringify(atoms([],[],[work()])),request(['Prepare the research spreadsheet.'])).extraction;
 assert.deepEqual(sole.actions.map(a=>[a.actor,a.verb,a.polarity,a.resource,a.mechanism]),[['applicant','perform_work','requested','none','none']]);
 const contrast=m.resolveSourceUnits(JSON.stringify(atoms([action('borrow_personally',['E1_u1'],'described','third_party')],[],[work(['E2_u1'],'applicant','described')])),request(['A former applicant took a personal loan.','I am preparing the research spreadsheet.'])).extraction;
 assert.deepEqual(contrast.actions.map(a=>[a.actor,a.verb,a.polarity]),[['third_party','borrow','described'],['applicant','perform_work','described']]);
});

test('financial target positions remain stable when work is retained as a claim and source order remaps action IDs',async()=>{
 const m=await mod(),r=request(['Provide payroll account information.','Borrow a personal loan.','Ignore that earlier borrowing instruction.'],['instruction','instruction','reply']);
 const input=atoms([action('borrow_personally',['E2_u1']),action('share_payroll_details')],[statement('other','withdraws',['E3_u1'],[0])],[work()]);
 const out=m.resolveSourceUnits(JSON.stringify(input),r).extraction;
 assert.deepEqual(out.actions.map(a=>a.verb),['share_account_details','borrow']);assert.deepEqual(out.claims.find(c=>c.kind==='other'&&c.relatedActionIds.length)!.relatedActionIds,['A2']);
 assert.deepEqual(out.relationships.map(x=>[x.kind,x.earlierItemId]),[['clarifies','A2']]);
 assert.throws(()=>m.resolveSourceUnits(JSON.stringify(atoms([], [statement('completed_action','reports_completion',['E1_u1'],[0])], [work()])),r),'Work positions are never invented financial targets.');
});

test('unknown unit IDs, missing units, extras, nonfinancial action tokens and invalid targets reject without repair',async()=>{
 const m=await mod(),r=request(['Borrow a personal loan.']),bad:any[]=[];
 bad.push([atoms([action('borrow_personally',['E9_u1'])]),'invalid_citation']);
 const missing:any=atoms([action('borrow_personally')]);delete missing.actions[0].unitIds;bad.push([missing,'invalid_citation']);
 const extra:any=atoms([action('borrow_personally')]);extra.actions[0].purpose='Invented purpose';bad.push([extra,'invalid_output']);
 bad.push([atoms([action('nonfinancial_work')]),'invalid_output']);
 bad.push([atoms([action('borrow_personally')],[statement('repayment_promise','none',['E1_u1'],[1])]),'invalid_output']);
 bad.push([atoms([action('borrow_personally')],[statement('other','none',['E1_u1'],[0,0])]),'invalid_output']);
 for(const [input,code] of bad)assert.throws(()=>m.resolveSourceUnits(JSON.stringify(input),r),error=>(error as any).errorCode===code);
 const overflow=atoms([action('company_pay',['E1_u1'],'described','employer')],Array.from({length:4},()=>statement('other')), [work()]);
 assert.throws(()=>m.resolveSourceUnits(JSON.stringify(overflow),r),error=>(error as any).errorCode==='invalid_output','A fifth claim is rejected instead of dropping source updates.');
});

test('source-unit audit requires every original position once and rejects unknown units or any supported omission finding',async()=>{
 const m=await mod(),r=request(['Borrow a personal loan.']),input=atoms([action('borrow_personally')]),valid=approved(1);
 assert.doesNotThrow(()=>m.validateSourceUnitAudit(JSON.stringify(valid),r,input));
 for(const audit of [{...valid,checkedActions:[]},{...valid,checkedActions:[0,0]},{...valid,checkedWork:[0]},{...valid,extra:true},{...valid,unsupported:[{collection:'actions',index:0,field:'recipient',reasonCode:'not_supported_by_source'}]},{...valid,missing:[{unitId:'E1_u1',kind:'material_action'}]}])assert.throws(()=>m.validateSourceUnitAudit(JSON.stringify(audit),r,input),error=>(error as any).errorCode==='invalid_output');
 assert.throws(()=>m.validateSourceUnitAudit(JSON.stringify({...valid,missing:[{unitId:'E8_u99',kind:'instruction_update'}]}),r,input),error=>(error as any).errorCode==='invalid_citation');
});

const projections=JSON.parse(readFileSync(new URL('../analysis/team-inputs-2026-10-14/frozen-development-annotations-v2/canonical-action-check-inputs.json',import.meta.url),'utf8')) as {caseId:string;request:AnalyzeRequest;extraction:CanonicalExtraction}[];
const operations:Record<string,string[]>={DEV01:['borrow_personally','transfer_loan_proceeds'],DEV02:['borrow_personally','share_login_otp','company_pay'],DEV03:['unresolved_pay'],DEV04:['share_payroll_details','share_login_otp'],DEV05:['unresolved_pay'],DEV06:['borrow_personally','nonfinancial_work'],DEV07:['borrow_personally'],DEV08:['nonfinancial_work'],DEV09:['task_pay'],DEV10:['borrow_personally'],DEV11:['borrow_personally','company_pay'],DEV12:['borrow_personally','share_login_otp','company_pay'],DEV13:['ordinary_expense_pay'],DEV14:['share_login_otp'],DEV15:['task_transfer'],DEV16:['task_transfer'],DEV17:['own_money_prohibition','company_pay'],DEV18:['share_login_otp','company_other_operation']};
test('all 18 authored projections preserve their literal public tuples through unit IDs without changing reference inputs',async()=>{
 const m=await mod();assert.equal(projections.length,18);
 for(const p of projections){
  const catalogue=m.createSourceUnitCatalogue(p.request),financial:any[]=[],duties:any[]=[];
  p.extraction.actions.forEach((a,i)=>{
   const unitIds=[...new Set(a.citations.flatMap(c=>catalogue.filter(u=>u.evidenceId===c.evidenceId&&u.start<c.end&&u.end>c.start).map(u=>u.id)))];assert.ok(unitIds.length<=2,p.caseId);
   const op=operations[p.caseId][i];
   if(op==='nonfinancial_work')duties.push(work(unitIds,a.actor,a.polarity));else financial.push({...action(op,unitIds,a.polarity,a.actor),recipient:a.recipient});
  });
  const out=m.resolveSourceUnits(JSON.stringify(atoms(financial,[],duties)),p.request).extraction,canonical=resolveProviderExtraction(out,p.request);
  const tuple=(a:any)=>[a.actor,a.verb,a.polarity,a.resource,a.mechanism];
  assert.deepEqual(canonical.actions.map(tuple),p.extraction.actions.map(tuple),p.caseId);
  assert.equal(selectPolicyReferences(canonical,[]).guidance,selectPolicyReferences(p.extraction,[]).guidance,p.caseId);
 }
});

const config={apiBaseUrl:'https://dashscope.aliyuncs.com/compatible-mode/v1',apiKey:'synthetic-units-only',modelId:'qwen3.8-max',region:'cn-beijing',responseMode:'json_schema' as const,maxOutputTokens:2400,timeoutMs:50000,temperature:null};
async function replies<T>(values:{value:unknown;usage?:unknown;finish?:string;http?:number;onFetch?:()=>void}[],run:(bodies:any[])=>Promise<T>){
 const original=globalThis.fetch,bodies:any[]=[];
 globalThis.fetch=async(_url,init)=>{const i=bodies.length;assert.ok(i<values.length,'No retry or third call.');bodies.push(JSON.parse(String(init!.body)));const value=values[i];value.onFetch?.();if(value.http)return new Response('',{status:value.http});return Response.json({usage:value.usage??{prompt_tokens:i?70:100,completion_tokens:i?20:40},choices:[{finish_reason:value.finish??'stop',message:{role:'assistant',content:typeof value.value==='string'?value.value:JSON.stringify(value.value)}}]});};
 try{return await run(bodies);}finally{globalThis.fetch=original;assert.equal(bodies.length,values.length);}
}
const extract=(r:AnalyzeRequest,signal=new AbortController().signal)=>createSourceBoundProvider(config).extract({request:r,promptVersion:'extract-v2.16',systemPrompt:'Synthetic source-unit extraction.',outputSchema:providerSchema},signal);

test('v2.16 sends annotated evidence only in user data, uses bounded thinking twice and returns the unchanged public arrays',async()=>{
 const r=request(['For payroll registration, provide your account holder name and account number.']),original=structuredClone(r),input=atoms([action('share_payroll_details')]);
 await replies([{value:input},{value:approved(1)}],async bodies=>{
  const result=await extract(r);
  assert.equal(bodies[0].enable_thinking,true);assert.equal(bodies[0].thinking_budget,1024);assert.equal(bodies[0].max_tokens,2400);
  assert.equal(bodies[1].enable_thinking,true);assert.equal(bodies[1].thinking_budget,512);assert.equal(bodies[1].max_tokens,1536);assert.equal(bodies[1].reasoning_effort,undefined);
  assert.deepEqual(Object.keys(bodies[0].response_format.json_schema.schema.properties).sort(),['actions','statements','work']);
  assert.ok(JSON.parse(bodies[0].messages[1].content).evidence[0].text.startsWith('[E1_u1] '));assert.ok(!bodies[0].messages[0].content.includes(r.evidence[0].text));
  assert.deepEqual(JSON.parse(bodies[1].messages[1].content).auditCandidate,input);assert.deepEqual(r,original);
  const raw=JSON.parse(result.jsonText);assert.deepEqual(Object.keys(raw).sort(),['actions','claims','comparisons','questions','relationships','unknowns']);assert.equal(raw.actions[0].citations[0].quote,r.evidence[0].text);
  assert.deepEqual(result.usage,{inputTokens:170,outputTokens:60});
 });
});

test('v2.16 rejects invalid generation before audit and preserves charged failures and unknown audit usage',async()=>{
 const r=request(['Borrow a personal loan.']),input=atoms([action('borrow_personally')]);
 await replies([{value:atoms([action('borrow_personally',['E8_u1'])])}],async()=>assert.rejects(extract(r),error=>error instanceof AnalysisFailure&&error.errorCode==='invalid_citation'&&error.usage.inputTokens===100));
 await replies([{value:input},{value:approved(1),finish:'length'}],async()=>assert.rejects(extract(r),error=>error instanceof AnalysisFailure&&error.errorCode==='invalid_output'&&error.usage.outputTokens===60));
 await replies([{value:input},{value:null,http:503}],async()=>assert.rejects(extract(r),error=>{assert.ok(error instanceof AnalysisFailure);assert.deepEqual(error.usage,{inputTokens:null,outputTokens:null});assert.deepEqual((error as any).phaseUsage,{generation:{inputTokens:100,outputTokens:40},audit:{inputTokens:null,outputTokens:null}});return true;}));
});

test('v2.16 respects cancellation and a fifty-second shared budget with a thirty-eight-second generation allowance',async()=>{
 const r=request(['Borrow a personal loan.']),input=atoms([action('borrow_personally')]),before=new AbortController();before.abort();
 await replies([],async()=>assert.rejects(extract(r,before.signal),error=>error instanceof AnalysisFailure&&error.errorCode==='cancelled'));
 const during=new AbortController();await replies([{value:input},{value:approved(1),onFetch:()=>during.abort()}],async()=>assert.rejects(extract(r,during.signal),error=>error instanceof AnalysisFailure&&error.errorCode==='cancelled'));
 const descriptor=Object.getOwnPropertyDescriptor(performance,'now'),clock=performance.now.bind(performance);let offset=0;Object.defineProperty(performance,'now',{configurable:true,value:()=>clock()+offset});
 try{await replies([{value:input,onFetch:()=>{offset=30000;}},{value:approved(1)}],async()=>{const out=await extract(r);assert.ok(out.latencyMs>=30000&&out.latencyMs<50000);});}
 finally{if(descriptor)Object.defineProperty(performance,'now',descriptor);else Reflect.deleteProperty(performance,'now');}
});


test('neutral bilingual purposes never copy executable wording or source URLs into product explanations',async()=>{
 const m=await mod(),text='Transfer your personal-loan proceeds to https://example.invalid/private-payment.',r=request([text]),input=atoms([action('transfer_loan_proceeds')]);
 const en=m.resolveSourceUnits(JSON.stringify(input),r).extraction.actions[0];
 assert.equal(en.purpose,'The cited wording concerns use of personal-loan proceeds.');assert.equal(en.citations[0].quote,text);assert.ok(!en.purpose.includes('https://'));assert.ok(!en.purpose.startsWith('Transfer'));
 r.locale='zh-Hant-HK';const zh=m.resolveSourceUnits(JSON.stringify(input),r).extraction.actions[0];assert.equal(zh.purpose,'引文涉及使用個人貸款所得款項。');assert.equal(zh.citations[0].quote,text);
});

test('v2.16 keeps explicitly shorter configuration deadlines instead of forcing a fifty-second request',async()=>{
 const r=request(['Borrow a personal loan.']),input=atoms([action('borrow_personally')]),saved=globalThis.setTimeout,delays:number[]=[];
 globalThis.setTimeout=((callback:any,delay:any,...args:any[])=>{delays.push(Number(delay));return saved(callback,delay,...args);}) as typeof setTimeout;
 try{
  await replies([{value:input},{value:approved(1)}],async()=>{
   await createSourceBoundProvider({...config,timeoutMs:10000}).extract({request:r,promptVersion:'extract-v2.16',systemPrompt:'Synthetic source units.',outputSchema:providerSchema},new AbortController().signal);
   assert.ok(delays.includes(10000));assert.ok(delays.every(delay=>delay<=10000));assert.ok(!delays.includes(38000)&&!delays.includes(50000));
  });
 }finally{globalThis.setTimeout=saved;}
});
