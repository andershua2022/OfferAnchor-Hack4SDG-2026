import assert from 'node:assert/strict';
import {test} from 'node:test';
import schema from '../../contracts/provider-extraction.schema.json';
import {createSourceBoundProvider} from '../../lib/server/provider-source-schema.ts';
import {createSourceUnitCatalogue} from '../../lib/server/source-unit-generation.ts';
import {resolveProviderExtraction} from '../../lib/analysis/validate.ts';
import {AnalysisFailure} from '../../lib/analysis/failure.ts';
import type {AnalyzeRequest} from '../../lib/contracts/index.ts';
const modulePromise=import('../../lib/server/source-unit-meaning-generation.ts').catch(()=>null);
async function mod(){const m=await modulePromise;assert.ok(m,'Atomic source-unit meanings must exist.');return m;}
const request=(texts:string[],kinds:string[]=[]):AnalyzeRequest=>({contractVersion:'2.0.0',requestId:'source-meaning-boundary-01',revision:1,locale:'en-HK',clarificationsUsed:0,evidence:texts.map((text,i)=>({id:'E'+(i+1),kind:kinds[i]??'instruction',label:'Authored synthetic source',sequence:i+1,text}))} as AnalyzeRequest);
const action=(operation='borrow_personally',unitIds=['E1_u1'],polarity='requested',actor='applicant')=>({unitIds,actor,operation,polarity,recipient:'unknown'});
const statement=(meaning:string,unitIds=['E2_u1'],targets:number[]=[0])=>({unitIds,meaning,targets});
const work=(unitIds=['E1_u1'])=>({unitIds,actor:'applicant',polarity:'requested'});
const atoms=(actions:any[]=[],statements:any[]=[],duties:any[]=[])=>({actions,statements,work:duties});

test('atomic statement meanings preserve literal public kinds, user reports, repayment uncertainty and financial-event relationships',async()=>{
 const m=await mod();
 const cases=[
  ['advertised_duty','The role involves recording orders.','advertisement','advertised_duty',null],
  ['repayment_promise','We will repay that personal loan.','reply','repayment_promise',null],
  ['denies_prior_request','We never asked for that personal loan.','reply','instruction_denial','contradicts'],
  ['withdraws_prior_request','Ignore that earlier personal loan instruction.','reply','other','clarifies'],
  ['reports_financial_completion','I obtained that personal loan.','user_note','completed_action','clarifies'],
  ['repeats_financial_instruction','The same personal loan request is repeated.','reply','other','repeats'],
  ['funds_own','That same financing arrangement uses personal savings.','reply','other','contradicts'],
  ['funds_personal_loan','That same financing arrangement uses personal-loan proceeds.','reply','other',null],
  ['funds_company','That same financing arrangement uses company funds.','reply','other','contradicts'],
  ['funds_unknown','Funding for that arrangement is unstated.','reply','other',null],
  ['funds_no_personal_funds','No personal funding is required for that arrangement.','reply','other','contradicts'],
  ['other_context','A past unrelated bonus was reportedly paid.','reply','other',null],
 ];
 for(const [meaning,text,kind,claimKind,relation] of cases){
  const r=request(['Apply for a personal loan.',text!],['instruction',kind!]),out=m.resolveSourceUnitMeanings(JSON.stringify(atoms([action()],[statement(meaning!)])),r);
  assert.equal(out.extraction.claims[0].kind,claimKind,meaning!);
  assert.equal(out.extraction.claims[0].status,meaning==='reports_financial_completion'?'user_reported':'stated_in_input');
  assert.deepEqual(out.extraction.claims[0].relatedActionIds,['A1']);
  assert.deepEqual(out.extraction.relationships.map(x=>x.kind),relation?[relation]:[],meaning!);
  assert.equal(out.extraction.unknowns.some(x=>x.kind==='repayment_verification'),meaning==='repayment_promise');
  assert.doesNotThrow(()=>resolveProviderExtraction(out.extraction,r));
 }
});

test('funding statement kind derives only from all cited advertisement or offer sources',async()=>{
 const m=await mod(),r=request(['Apply for a personal loan.','No personal funding is required for this job.','The same arrangement is company-funded.'],['instruction','advertisement','reply']);
 const ad=m.resolveSourceUnitMeanings(JSON.stringify(atoms([action()],[statement('funds_no_personal_funds',['E2_u1'])])),r).extraction;
 assert.equal(ad.claims[0].kind,'advertised_duty');
 const mixed=m.resolveSourceUnitMeanings(JSON.stringify(atoms([action()],[statement('funds_company',['E2_u1','E3_u1'])])),r).extraction;
 assert.equal(mixed.claims[0].kind,'other');
 assert.throws(()=>m.resolveSourceUnitMeanings(JSON.stringify(atoms([action()],[statement('advertised_duty',['E3_u1'])])),r),error=>(error as any).ruleId==='claim');
});

test('work unit enums admit only current instruction/reply/user-note evidence and use maxItems zero without empty enums otherwise',async()=>{
 const m=await mod(),r=request(['Advertised spreadsheet duties.','Offer training duties.','Current order instruction.','Current reply duty.','I am currently recording orders.'],['advertisement','offer','instruction','reply','user_note']),catalogue=createSourceUnitCatalogue(r),out=m.createSourceUnitMeaningSchema(r,catalogue);
 assert.deepEqual(out.properties!.work.items!.properties!.unitIds.items!.enum,['E3_u1','E4_u1','E5_u1']);
 assert.throws(()=>m.resolveSourceUnitMeanings(JSON.stringify(atoms([],[],[work(['E2_u1'])])),r));
 const earlier=request(['Advertised spreadsheet duties.'],['advertisement']),onlyAd=m.createSourceUnitMeaningSchema(earlier);
 assert.equal(onlyAd.properties!.work.maxItems,0);assert.ok(onlyAd.properties!.work.items!.properties!.unitIds.items!.enum!.length>0);
 assert.throws(()=>m.resolveSourceUnitMeanings(JSON.stringify(atoms([],[],[work()])),earlier));
 const blank=m.createSourceUnitMeaningSchema(request(['   ']));
 const visit=(value:any)=>{if(!value||typeof value!=='object')return;if(Array.isArray(value)){value.forEach(visit);return;}if(Array.isArray(value.enum))assert.ok(value.enum.length>0);Object.values(value).forEach(visit);};visit(blank);
});

test('historical commission is context while a full denial-plus-withdrawal unit has one atomic denial meaning',async()=>{
 const m=await mod(),r=request(['Please use your own savings to unlock the next tasks.','A past unrelated commission was reportedly paid.','We never requested that earlier payment. Ignore the old note.'],['instruction','offer','reply']);
 const input=atoms([action('task_pay')],[statement('other_context',['E2_u1'],[]),statement('denies_prior_request',['E3_u1'])]),out=m.resolveSourceUnitMeanings(JSON.stringify(input),r);
 assert.equal(out.extraction.actions.length,1);assert.deepEqual(out.extraction.claims.map(x=>x.kind),['other','instruction_denial']);assert.equal(out.extraction.claims[1].text,r.evidence[2].text);
 assert.deepEqual(out.extraction.relationships.map(x=>x.kind),['contradicts']);assert.deepEqual(out.atoms,input);
 assert.throws(()=>m.resolveSourceUnitMeanings(JSON.stringify(atoms([action('task_pay')],[statement('reports_financial_completion',['E2_u1'],[])])),r),error=>(error as any).ruleId==='reference');
});

test('old Cartesian statement wires, unknown meanings, invalid IDs, target invention and over-cap work preservation reject without repair',async()=>{
 const m=await mod(),r=request(['Borrow a personal loan.','We promise to repay that loan.']),bad:any[]=[];
 bad.push(atoms([action()],[{unitIds:['E2_u1'],kind:'other',effect:'withdraws',assertedFunds:'company',targets:[0]}]));
 bad.push(atoms([action()],[statement('invented_meaning')]));
 bad.push(atoms([action()],[statement('repayment_promise',['E2_u1'],[1])]));
 const extra:any=atoms([action()],[statement('repayment_promise')]);extra.statements[0].assertedFunds=null;bad.push(extra);
 bad.push(atoms([action()],Array.from({length:4},()=>statement('other_context',['E2_u1'],[])),[work()]));
 for(const input of bad)assert.throws(()=>m.resolveSourceUnitMeanings(JSON.stringify(input),r),error=>(error as any).errorCode==='invalid_output');
 assert.throws(()=>m.resolveSourceUnitMeanings(JSON.stringify(atoms([action()],[statement('repayment_promise',['E9_u1'])])),r),error=>(error as any).errorCode==='invalid_citation');
});

test('the audit accepts only findings arrays and rejects every finding, unknown reference and legacy checked-vector extra',async()=>{
 const m=await mod(),r=request(['Borrow a personal loan.']),input=atoms([action()]),good={unsupported:[],missing:[]};
 assert.doesNotThrow(()=>m.validateSourceUnitMeaningAudit(JSON.stringify(good),r,input));
 for(const value of [{...good,checkedActions:[0]},{...good,unsupported:[{collection:'actions',index:0,field:'recipient',reasonCode:'not_supported_by_source'}]},{...good,unsupported:[{collection:'statements',index:0,field:'meaning',reasonCode:'wrong_event'}]},{...good,missing:[{unitId:'E1_u1',kind:'material_action'}]}])assert.throws(()=>m.validateSourceUnitMeaningAudit(JSON.stringify(value),r,input),error=>(error as any).errorCode==='invalid_output');
 assert.throws(()=>m.validateSourceUnitMeaningAudit(JSON.stringify({...good,missing:[{unitId:'E8_u4',kind:'material_action'}]}),r,input),error=>(error as any).errorCode==='invalid_citation');
});

const config={apiBaseUrl:'https://dashscope.aliyuncs.com/compatible-mode/v1',apiKey:'synthetic-meaning-only',modelId:'qwen3.8-max',region:'cn-beijing',responseMode:'json_schema' as const,maxOutputTokens:2400,timeoutMs:50000,temperature:null};
async function replies<T>(values:{value:unknown;http?:number;finish?:string;onFetch?:()=>void}[],run:(bodies:any[])=>Promise<T>){
 const saved=globalThis.fetch,bodies:any[]=[];
 globalThis.fetch=async(_url,init)=>{const i=bodies.length;assert.ok(i<values.length,'No third request or retry.');bodies.push(JSON.parse(String(init!.body)));const value=values[i];value.onFetch?.();if(value.http)return new Response('',{status:value.http});return Response.json({usage:{prompt_tokens:i?70:100,completion_tokens:i?20:40},choices:[{finish_reason:value.finish??'stop',message:{content:typeof value.value==='string'?value.value:JSON.stringify(value.value)}}]});};
 try{return await run(bodies);}finally{globalThis.fetch=saved;assert.equal(bodies.length,values.length);}
}
const extract=(r:AnalyzeRequest,signal=new AbortController().signal)=>createSourceBoundProvider(config).extract({request:r,promptVersion:'extract-v2.17',systemPrompt:'Synthetic atomic meanings.',outputSchema:schema},signal);
test('v2.17 sends original atomic meanings to a simple findings audit with the same two bounded thinking requests',async()=>{
 const r=request(['Borrow a personal loan.','We will repay that personal loan.']),original=structuredClone(r),input=atoms([action()],[statement('repayment_promise')]);
 await replies([{value:input},{value:{unsupported:[],missing:[]}}],async bodies=>{
  const result=await extract(r);
  assert.ok(bodies[0].response_format.json_schema.schema.properties.statements.items.properties.meaning);assert.equal(bodies[0].response_format.json_schema.schema.properties.statements.items.properties.effect,undefined);
  assert.deepEqual(Object.keys(bodies[1].response_format.json_schema.schema.properties).sort(),['missing','unsupported']);
  assert.deepEqual(JSON.parse(bodies[1].messages[1].content).auditCandidate,input);
  assert.deepEqual(bodies.map(x=>[x.enable_thinking,x.thinking_budget,x.max_tokens]),[[true,1024,2400],[true,512,1536]]);
  const out=JSON.parse(result.jsonText);assert.equal(out.claims[0].kind,'repayment_promise');assert.equal(out.actions[0].recipient,'unknown');assert.doesNotThrow(()=>resolveProviderExtraction(out,r));assert.deepEqual(r,original);assert.deepEqual(result.usage,{inputTokens:170,outputTokens:60});
 });
});

test('v2.17 preserves phase charges, cancellation and generation rejection without retry or output repair',async()=>{
 const r=request(['Borrow a personal loan.']),input=atoms([action()]);
 await replies([{value:atoms([action()],[statement('unknown',['E1_u1'])])}],async()=>assert.rejects(extract(r),error=>error instanceof AnalysisFailure&&error.errorCode==='invalid_output'&&error.usage.inputTokens===100));
 await replies([{value:input},{value:{unsupported:[],missing:[]},finish:'length'}],async()=>assert.rejects(extract(r),error=>error instanceof AnalysisFailure&&error.errorCode==='invalid_output'&&error.usage.inputTokens===170));
 await replies([{value:input},{value:null,http:503}],async()=>assert.rejects(extract(r),error=>{assert.ok(error instanceof AnalysisFailure);assert.deepEqual(error.usage,{inputTokens:null,outputTokens:null});assert.deepEqual((error as any).phaseUsage,{generation:{inputTokens:100,outputTokens:40},audit:{inputTokens:null,outputTokens:null}});return true;}));
 const before=new AbortController();before.abort();await replies([],async()=>assert.rejects(extract(r,before.signal),error=>error instanceof AnalysisFailure&&error.errorCode==='cancelled'));
 const during=new AbortController();await replies([{value:input},{value:{unsupported:[],missing:[]},onFetch:()=>during.abort()}],async()=>assert.rejects(extract(r,during.signal),error=>error instanceof AnalysisFailure&&error.errorCode==='cancelled'));
});
