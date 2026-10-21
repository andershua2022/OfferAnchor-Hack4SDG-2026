import assert from 'node:assert/strict';
import {test} from 'node:test';
import {loadReferenceLibrary} from '../../lib/knowledge/index.ts';
import content from '../../knowledge/library.json';
import en from '../../locales/en-HK.json';
import zh from '../../locales/zh-Hant-HK.json';
const contractsPromise = import('../../lib/research/contracts.ts').catch(()=>null);
const retrievalPromise = import('../../lib/research/retrieval.ts').catch(()=>null);
const input={contractVersion:'research-1.0.0',requestId:'research-0001',revision:2,locale:'en-HK',question:'Why personal borrowing?'};
function draftLibrary(){const fixture=structuredClone(content);fixture.status='draft';for(const item of [...fixture.cards,...fixture.routes])Object.assign(item,{approvalStatus:'draft',humanReviewer:null,localizedMeaningApproved:false});return loadReferenceLibrary(fixture,{'en-HK':en,'zh-Hant-HK':zh});}
const reference={id:'K_PERSONAL_BORROWING',sourceIds:['S03','S04'],title:'Personal borrowing',url:'https://www.adcc.gov.hk/en-hk/alerts-detail/test.html',excerpt:'Borrowing in your own name remains your debt.',contentType:'team_synthesis',reviewStatus:'draft',checkedOn:'2026-10-05'};
test('strict route envelopes reject cross-route, unknown, oversized and malformed fields',async()=>{
 const contracts=await contractsPromise;
 assert.ok(contracts,'Research envelope parser must be implemented');
 assert.deepEqual(contracts.parseResearchInput(input,'knowledge'),input);
 for(const bad of [{...input,query:'search'},{...input,extra:true},{...input,question:'x'.repeat(501)},{...input,topicIds:['K_MADE_UP']},{...input,topicIds:['K_PAYROLL','K_PAYROLL']},{...input,revision:0},{...input,requestId:'x'},{...input,question:'\ud800'}]) assert.equal(contracts.parseResearchInput(bad,'knowledge'),null);
 assert.equal(contracts.parseResearchInput(input,'web'),null);
 const web={...input,query:'job-trap guidance'} as Record<string,unknown>;delete web.question;
 assert.ok(contracts.parseResearchInput(web,'web'));
 assert.equal(contracts.parseResearchInput({...web,topicIds:[]},'web'),null);
});
test('browser validation binds modes and identifiers and rejects malicious or ambiguous envelopes',async()=>{
 const contracts=await contractsPromise;
 assert.ok(contracts);
 const response={contractVersion:'research-1.0.0',requestId:'research-0001',revision:2,kind:'knowledge',mode:'simulation',status:'sources_only',answer:null,references:[reference]};
 assert.equal(contracts.validateResearchResponse(response,{requestId:'research-0001',revision:2,kind:'knowledge',mode:'simulation'}),true);
 for(const bad of [{...response,requestId:'research-old1'},{...response,status:'complete',answer:'Fake simulation answer'},{...response,answer:'not null'},{...response,extra:true},{...response,references:[{...reference,url:'https://adcc.gov.hk.evil.example/x'}]},{...response,references:[{...reference,url:'https://user:pass@www.adcc.gov.hk/x'}]},{...response,references:[{...reference,url:'javascript:alert(1)'}]},{...response,references:[{...reference,excerpt:'<script>alert(1)</script>'}]}]) assert.equal(contracts.validateResearchResponse(bad,{requestId:'research-0001',revision:2,kind:'knowledge',mode:'simulation'}),false);
 assert.equal(contracts.validateResearchResponse({...response,kind:'web'}),false);
});
test('retrieval retains company and prohibition contrasts and abstains on unrelated questions',async()=>{
 const retrieval=await retrievalPromise;
 assert.ok(retrieval,'Local retrieval must be implemented');
 const library=draftLibrary();
 const company=retrieval.retrieveReferences(library,'Who pays when the company pays directly or prohibits personal borrowing?','en-HK',[]);
 assert.ok(company.some(r=>r.id==='K_COMPANY_PAID'));
 assert.ok(company.length<=3);
 assert.ok(company.every(r=>r.reviewStatus==='draft'));
 assert.equal(company.find(r=>r.id==='K_COMPANY_PAID')?.contentType,'team_synthesis');
 assert.deepEqual(retrieval.retrieveReferences(library,'How do I bake sourdough bread?','en-HK',[]),[]);
 const chinese=retrieval.retrieveReferences(library,'公司要求我個人借貸，還款承諾代表甚麼？','zh-Hant-HK',[]);
 assert.ok(chinese.some(r=>r.id==='K_PERSONAL_BORROWING'));
 const reports=retrieval.retrieveReferences(library,'internship freshman remote commission early payments','en-HK',[]);
 assert.ok(reports.some(r=>r.id==='P_STUDENT_TASK'&&r.contentType==='published_case_summary'&&r.reviewStatus==='draft'));
});


test('browser links reject credential-bearing query parameters on otherwise trusted hosts',async()=>{
 const contracts=await contractsPromise;assert.ok(contracts);
 for(const url of ['https://www.adcc.gov.hk/?auth=private','https://www.adcc.gov.hk/?key=private','https://www.adcc.gov.hk/?sid=private'])assert.equal(contracts.safeReferenceUrl(url,'web'),false);
 assert.equal(contracts.safeReferenceUrl('https://www.pcpd.org.hk/tc_chi/news_events/media_statements/press_20260129.html','web'),true);
});
