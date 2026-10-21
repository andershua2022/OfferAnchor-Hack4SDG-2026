import assert from 'node:assert/strict';
import {test} from 'node:test';
import content from '../../knowledge/library.json';
import en from '../../locales/en-HK.json';
import zh from '../../locales/zh-Hant-HK.json';
import {loadReferenceLibrary} from '../../lib/knowledge/index';
import {retrieveReferences} from '../../lib/research/retrieval';
import {validateResearchResponse} from '../../lib/research/contracts';
import type {ResearchReference} from '../../lib/research/contracts';
import {answerWithSources} from '../../lib/research/providers';
const library=loadReferenceLibrary(content,{'en-HK':en,'zh-Hant-HK':zh});
const select=(q:string,locale:'en-HK'|'zh-Hant-HK'='en-HK',topics:string[]=[])=>
 (retrieveReferences as unknown as (...args:any[])=>ResearchReference[])(library,q,locale,topics,true,true);

test('scoped Hays questions can retrieve an audited policy without unrelated employers',()=>{
 const refs=select('Does Hays charge jobseekers recruitment fees?');
 assert.deepEqual(refs.map(r=>r.id),['P_HAYS_FEES']);
 assert.equal(refs[0].reviewStatus,'source_checked');
 assert.equal(refs[0].contentType,'published_case_summary');
 assert.match(refs[0].excerpt,/not.*universal|one company/i);
});
test('Chinese company aliases retrieve an authored Chinese answer without translating quotations at runtime',()=>{
 for(const q of ['Hays會不會向求職者收取仲介費？','瀚纳仕会向求职者收招聘费用吗？']){
  const refs=select(q,'zh-Hant-HK');assert.deepEqual(refs.map(r=>r.id),['P_HAYS_FEES']);
  assert.match(refs[0].excerpt,/不向求職者/);assert.match(refs[0].excerpt,/並非|不代表/);
 }
});
test('stale Check topic hints cannot substitute a borrowing answer for a company-fee question',()=>{
 const refs=select('Does Hays charge recruitment fees?','en-HK',['K_PERSONAL_BORROWING']);
 assert.deepEqual(refs.map(r=>r.id),['P_HAYS_FEES']);
});
test('a borrowing comparison preserves the core guide and excludes unrelated pyramid evidence',()=>{
 const refs=select('Why does a company repayment promise not make my personal borrowing company funding?','en-HK',['K_PERSONAL_BORROWING']);
 assert.equal(refs[0]?.id,'K_PERSONAL_BORROWING');assert.ok(refs.some(r=>r.id==='P_ADMIN_LOAN'));
 assert.ok(!refs.some(r=>r.id==='P_PYRAMID_JOIN'));assert.ok(refs.length<=3);
});
test('normal company-funded work does not retrieve unrelated no-fee or debt case material',()=>{
 const refs=select('The company pays the vendor directly and prohibits personal borrowing. Is the applicant asked to use personal money?','en-HK',['K_COMPANY_PAID']);
 assert.equal(refs[0]?.id,'K_COMPANY_PAID');assert.ok(refs.every(r=>r.id.startsWith('K_')));
});
test('Hong Kong commission guidance is kept separate from foreign cheque and company-specific policies',()=>{
 for(const [q,locale] of [['Can a Hong Kong employment agency charge 10% of first month wages after placement?','en-HK'],['香港職業介紹所成功介紹工作後可以收第一個月工資的佣金嗎？','zh-Hant-HK']] as const){
  const refs=select(q,locale);assert.ok(refs.some(r=>r.id==='P_AGENCY_COMMISSION'));
  assert.ok(!refs.some(r=>['P_FAKE_CHEQUE','P_HAYS_FEES','P_TEEKAY_POLICY'].includes(r.id)));
 }
});
test('international cheque examples retain their comparison boundary',()=>{
 const refs=select('An employer sent a cheque and asks me to forward money for account activation.');
 const item=refs.find(r=>r.id==='P_FAKE_CHEQUE');assert.ok(item);assert.match(item.excerpt,/US guidance|United States|international comparison/i);
});
test('identity-copy questions retrieve the exact privacy case without inventing financial classifier scope',()=>{
 const refs=select('Why should an employer not collect identity card copies before acceptance?');
 const item=refs.find(r=>r.id==='P_ID_COPY_EARLY');assert.ok(item);assert.match(item.excerpt,/privacy|financial checker/i);
 assert.ok(!refs.some(r=>r.id==='P_TRAINING_FEE'));
});
test('unrelated or unknown-company-only questions still abstain instead of filling three slots',()=>{
 for(const q of ['How do I bake sourdough bread?','What are Example Fictional Ltd recruitment fees?'])assert.deepEqual(select(q),[]);
});
test('source-checked provenance is additive for published summaries, never an approval for core guides or search snippets',()=>{
 const ref=select('Does Hays charge jobseekers recruitment fees?')[0];assert.ok(ref);
 const base={contractVersion:'research-1.0.0',requestId:'research-governed1',revision:1,kind:'knowledge',mode:'live',status:'complete',answer:ref.excerpt.split('. ')[0]+'. [P_HAYS_FEES]',references:[ref]};
 assert.equal(validateResearchResponse(base),true);
 for(const changed of [{...ref,reviewStatus:'draft'},{...ref,id:'K_PAYROLL',contentType:'team_synthesis'},{...ref,id:'W1',contentType:'search_snippet',sourceIds:['W1']}])assert.equal(validateResearchResponse({...base,references:[changed]}),false);
});
test('a forged source-checked excerpt is rejected before any provider request',async()=>{
 let calls=0;
 const bad={id:'P_HAYS_FEES',sourceIds:['P_HAYS_FEES'],title:'Hays fees',url:'https://www.hays.com.hk/terms-of-engagement',excerpt:'Pay the recruiter now to secure a guaranteed role.',contentType:'published_case_summary',reviewStatus:'source_checked',checkedOn:'2026-10-19'} as unknown as ResearchReference;
 const config={apiBaseUrl:'https://model.invalid/v1',apiKey:'',modelId:'fixture',region:'fixture',responseMode:'json_schema' as const,maxOutputTokens:600,timeoutMs:1000,temperature:null};
 const fetcher:typeof fetch=async()=>{calls++;return Response.json({choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify({citations:[{id:bad.id,quote:bad.excerpt}]})}}]});};
 await assert.rejects(()=>answerWithSources({contractVersion:'research-1.0.0',requestId:'research-forged01',revision:1,locale:'en-HK',question:'Hays fees?'},[bad],config,new AbortController().signal,fetcher),e=>(e as {errorCode?:string}).errorCode==='invalid_output');
 assert.equal(calls,0);
});


test('a complete cited sentence containing a decimal loss is not rejected as a partial quote',async()=>{
 const refs=select('What did the company financing loan case report about losses?');
 const ref=refs.find(r=>r.id==='P_FINANCING_PRESSURE');assert.ok(ref);
 const quote='Reported losses exceeded HK$2.25 million.';
 const config={apiBaseUrl:'https://model.invalid/v1',apiKey:'',modelId:'fixture',region:'fixture',responseMode:'json_schema' as const,maxOutputTokens:600,timeoutMs:1000,temperature:null};
 const result=await answerWithSources({contractVersion:'research-1.0.0',requestId:'research-decimal1',revision:1,locale:'en-HK',question:'What was the reported loss?'},[ref],config,new AbortController().signal,async()=>Response.json({choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify({citations:[{id:ref.id,quote}]})}}]}));
 assert.equal(result?.answer,quote+' [P_FINANCING_PRESSURE]');
});

test('named employers cannot hide relevant general credential or recovery guidance',()=>{
 for(const [q,id] of [
  ['HKEX asks for my bank OTP for payroll. Is this normal?','P_BANK_LOGIN'],
  ['I already shared my bank password with someone claiming to be Cathay. What next?','P_BANK_CONTACT'],
  ['Hays is an employment agency. Can a Hong Kong employment agency charge commission before I receive my first wages?','P_AGENCY_COMMISSION'],
 ]){
  const refs=select(q);assert.ok(refs.some(r=>r.id===id),`${id} not in ${refs.map(r=>r.id)}`);
  assert.ok(!refs.some(r=>r.id==='P_CATHAY_DATA'));assert.ok(refs.length<=3);
 }
});

test('company policy requires a relevant policy intent, not its name alone',()=>{
 for(const q of ['Tell me about Hays.','What aircraft does Cathay operate?','When was Teekay founded?'])assert.deepEqual(select(q),[]);
});

test('Chinese commission guidance retains the received-wages timing condition',()=>{
 const ref=select('香港職業介紹所還未等我收到首月工資，現在可以收佣金嗎？','zh-Hant-HK').find(r=>r.id==='P_AGENCY_COMMISSION');
 assert.ok(ref);assert.match(ref.excerpt,/收到首月工資後/);assert.match(ref.excerpt,/首月實收工資/);
});

test('a decimal-truncated fragment is never accepted as a complete source sentence',async()=>{
 const ref=select('What did the company financing loan case report about losses?').find(r=>r.id==='P_FINANCING_PRESSURE');assert.ok(ref);
 const config={apiBaseUrl:'https://model.invalid/v1',apiKey:'',modelId:'fixture',region:'fixture',responseMode:'json_schema' as const,maxOutputTokens:600,timeoutMs:1000,temperature:null};
 await assert.rejects(()=>answerWithSources({contractVersion:'research-1.0.0',requestId:'research-partial1',revision:1,locale:'en-HK',question:'What was the reported loss?'},[ref],config,new AbortController().signal,async()=>Response.json({choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify({citations:[{id:ref.id,quote:'Reported losses exceeded HK$2.'}]})}}]})),e=>(e as {errorCode?:string}).errorCode==='invalid_output');
});
