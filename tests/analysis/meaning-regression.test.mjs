import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveProviderExtraction} from '../../lib/analysis/validate.ts';
import {selectPolicyReferences} from '../../lib/contracts/policy.ts';
import {loadReferenceLibrary} from '../../lib/knowledge/index.ts';
const root=new URL('../../',import.meta.url);
const read=p=>JSON.parse(readFileSync(new URL(p,root),'utf8'));
function explicitDraftLibrary(content,locales){const copy=structuredClone(content);copy.status='draft';for(const item of [...copy.cards,...copy.routes]){item.approvalStatus='draft';item.humanReviewer=null;item.localizedMeaningApproved=false;}return loadReferenceLibrary(copy,locales);}
const observed=read('tests/analysis/observed-development-finish-2026-10-13.json');
const cards=read('knowledge/library.json').cards;
test('Meaning regression records are fictional producer checks without human approval',()=>{
 assert.equal(observed.syntheticOnly,true);assert.equal(observed.independentEvaluation,false);assert.equal(observed.humanApproval,false);assert.equal(observed.releaseApproved,false);
 assert(observed.attempts.length>=2);
});
for(const c of observed.attempts)test('Frozen real output preserves required meaning: '+c.caseId,()=>{
 assert.equal(c.finishReason,'stop');
 const ex=resolveProviderExtraction(JSON.parse(c.jsonText),c.request);
 assert.equal(selectPolicyReferences(ex,cards).guidance,c.expectedGuidance);
 assert(ex.unknowns.some(u=>u.kind==='employer_authorization'&&u.priority==='context'));
 for(const q of ex.questions)assert(ex.unknowns.some(u=>u.id===q.unknownId&&u.priority==='blocking'));
 if(c.checkKind==='unknown'){
  assert.equal(ex.actions.length,1);const a=ex.actions[0];
  assert.deepEqual([a.actor,a.verb,a.polarity,a.resource,a.mechanism],['applicant','pay','requested','unknown','unclear']);
  assert(ex.unknowns.some(u=>u.kind==='resource'&&u.priority==='blocking'&&u.relatedActionIds.includes(a.id)));
  assert.equal(ex.questions.length,1);assert.equal(ex.claims.length,0);
 }
 if(['denial','withdrawal','task'].includes(c.checkKind)){
  assert.equal(ex.actions.length,1,'Reassurance or bare withdrawal must not invent a second operation');
  const a=ex.actions[0];assert.deepEqual([a.actor,a.verb,a.polarity,a.resource,a.mechanism],['applicant','transfer','requested','personal_money','task_recharge']);
  assert.equal(a.recipient,'unknown');
  assert(a.citations.some(x=>x.quote.includes('release the next batch and commission')));
  assert(ex.claims.some(x=>x.kind==='advertised_duty'&&x.citations.some(y=>['E1','E2'].includes(y.evidenceId))));
  assert(ex.claims.some(x=>x.kind==='repayment_promise'&&x.status==='stated_in_input'&&x.relatedActionIds.includes(a.id)));
  assert(ex.comparisons.some(x=>x.laterActionId===a.id));assert.equal(ex.questions.length,0);
  if(c.checkKind==='denial'){
   const denial=ex.claims.find(x=>x.kind==='instruction_denial');assert(denial);assert(denial.citations.some(x=>x.evidenceId==='E4'&&x.quote.includes('never asked')));
   assert(ex.relationships.some(x=>x.kind==='contradicts'&&x.earlierItemId===a.id&&x.laterItemId===denial.id));
  }
  if(c.checkKind==='withdrawal'){
   assert(!ex.claims.some(x=>x.kind==='instruction_denial'));assert(!ex.relationships.some(x=>x.kind==='contradicts'));
   assert(ex.claims.some(x=>x.kind==='other'&&x.citations.some(y=>y.evidenceId==='E4')));
  }
 }
 if(['loan','loanpay'].includes(c.checkKind)){
  assert.equal(ex.actions.length,2);assert.deepEqual(ex.actions.map(a=>[a.actor,a.verb,a.polarity,a.resource,a.mechanism]),[['applicant','borrow','requested','personal_borrowing','personal_borrowing'],['applicant',c.checkKind==='loan'?'transfer':'pay','requested','personal_borrowing','personal_borrowing']]);
  if(c.checkKind==='loan'){assert(ex.claims.some(x=>x.kind==='advertised_duty'));assert(ex.claims.some(x=>x.kind==='repayment_promise'&&x.status==='stated_in_input'));assert.equal(ex.comparisons.length,2);}else{assert.equal(ex.claims.length,0,'A single instruction contains no earlier duty or repayment assurance to invent');assert.equal(ex.comparisons.length,0);}assert.equal(ex.questions.length,0);
 }
 if(c.checkKind==='company'){
  assert(ex.actions.some(a=>a.actor==='employer'&&a.resource==='company_money'&&a.mechanism==='company_funded_work'));
  assert.equal(ex.actions.filter(a=>a.polarity==='prohibited').length,3);
  assert(ex.claims.some(c=>c.kind==='advertised_duty'));assert.equal(ex.comparisons.length,0);assert.equal(ex.questions.length,0);
 }
});

test('Historical v2.11 captures retain generation identity and replay through the current analysis policy',async()=>{
 const {analyze,PROMPT_VERSION,SYSTEM_PROMPT}=await import('../../lib/analysis/index.ts');
 const {createHash}=await import('node:crypto');
 const {loadReferenceLibrary}=await import('../../lib/knowledge/index.ts');
 const historical=await import('../../lib/analysis/prompt-candidate-v2.11.ts');assert.equal(observed.attempts.length,8);assert.equal(PROMPT_VERSION,read('tests/analysis/runtime-prompt-overlay-2026-10-19-loan-funding.json').activePromptVersion);
 const content=read('knowledge/library.json'),locales={'en-HK':read('locales/en-HK.json'),'zh-Hant-HK':read('locales/zh-Hant-HK.json')};
 const copy=structuredClone(content);for(const x of [...copy.cards,...copy.routes]){x.approvalStatus='approved';x.localizedMeaningApproved=true;x.humanReviewer='FICTIONAL_REPLAY_ONLY';}
 const testLibrary=loadReferenceLibrary(copy,locales),realDraft=explicitDraftLibrary(content,locales);
 for(const c of observed.attempts){
  assert.equal(c.promptVersion,historical.CANDIDATE211_PROMPT_VERSION);assert.equal(c.promptSha256,createHash('sha256').update(historical.CANDIDATE211_SYSTEM_PROMPT).digest('hex'));
  let calls=0;const provider={modelId:c.configuredModelId,region:'not_verified',async extract(input){calls++;assert.equal(input.promptVersion,PROMPT_VERSION);assert.equal(input.systemPrompt,SYSTEM_PROMPT);return {jsonText:c.jsonText,finishReason:c.finishReason,usage:c.usage,latencyMs:c.latencyMs};}};
  const context={provider,mode:'live',signal:new AbortController().signal,library:testLibrary};
  const response=await analyze(c.request,context);assert.equal(response.status,'complete',c.caseId);assert.equal(response.guidance,c.expectedGuidance,c.caseId);assert.equal(response.provenance.promptVersion,PROMPT_VERSION);assert.equal(calls,1);
  const blocked=await analyze(c.request,{...context,library:realDraft});assert.equal(blocked.status,'incomplete');assert.equal(blocked.errorCode,'configuration_unavailable');
 }
 assert.deepEqual(read('knowledge/library.json'),content,'Fictional replay approval must never persist');
});
