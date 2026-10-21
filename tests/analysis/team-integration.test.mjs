import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadReferenceLibrary} from '../../lib/knowledge/index.ts';
const root=new URL('../../',import.meta.url);
const read=p=>readFileSync(new URL(p,root));
const toolkit=()=>import('../../tools/check-team-integration.mjs');
const flatten=(obj,prefix='',out={})=>{for(const [key,value]of Object.entries(obj)){const path=prefix?prefix+'.'+key:key;if(value&&typeof value==='object')flatten(value,path,out);else out[path]=value;}return out;};
function setPath(obj,path,value){const parts=path.split('.');const last=parts.pop();const parent=parts.reduce((current,key)=>current[key],obj);parent[last]=value;}
function explicitDraftLibrary(content,locales){const copy=structuredClone(content);copy.status='draft';for(const item of [...copy.cards,...copy.routes]){item.approvalStatus='draft';item.humanReviewer=null;item.localizedMeaningApproved=false;}return loadReferenceLibrary(copy,locales);}
function draftConfiguration(e,library){const config=e.configurationRecord('recorded');config.runtimeLibrarySha256=createHash('sha256').update(JSON.stringify(library)).digest('hex');config.contentApproval='synthetic_draft_fixture';const {configurationId,...body}=config;config.configurationId=createHash('sha256').update(JSON.stringify(body)).digest('hex');return config;}

test('Current review footer retains its checkpoint plus the one approved locale overlay',()=>{
 const html=read('tests/analysis/acceptance-review-2026-10-14-r5/review.html').toString('utf8');
 const data=JSON.parse(/<script id="review-data" type="application\/json">(.*?)<\/script>/s.exec(html)[1]);
  const overlay=JSON.parse(read('tests/analysis/approved-content-overlay-2026-10-17.json'));
 assert(html.includes('id="snapshot-id"'));
 assert(html.includes("document.getElementById('snapshot-id').textContent=data.checkpointId"));
 assert.equal(data.checkpointId,JSON.parse(read('tests/analysis/acceptance-review-2026-10-14-r5/checkpoint.json')).checkpointSha256);
  for(const [locale,old] of [['en-HK',data.en],['zh-Hant-HK',data.zh]]){
    const expected=structuredClone(old);
    for(const change of overlay.approvedLocaleChanges.filter(x=>x.locale===locale)){
      assert.equal(flatten(expected)[change.key],change.before);
      setPath(expected,change.key,change.after);
    }
    assert.deepEqual(expected,JSON.parse(read('locales/'+locale+'.json')));
  }
});

test('Frozen teammate development inputs bind exact source bytes, families and decisions',async()=>{
 const t=await toolkit(),r=t.loadFrozenDevelopmentReference();
 assert.equal(r.inventory.records,18);assert.equal(r.inventory.baseFamilies,14);
 assert.equal(r.inventory.controlRecords,10);assert.equal(r.inventory.controlFamilies,6);
 assert.equal(r.inventory.actionRows,28);assert.equal(r.inventory.independentGold,false);
 assert.equal(r.cases.filter(c=>c.primaryVariant).length,14);
 assert(r.cases.every(c=>c.partition==='development'&&c.frozenReferenceVersion===r.inventory.referenceVersion));
 assert.equal(r.issues.length,0);assert.equal(r.inventory.referenceVersion,'OfferAnchor-development-annotations-frozen-v2');
 assert.equal(r.inventory.semanticAccuracy,null);assert.equal(r.inventory.metricReleaseBlocked,false);
 assert.equal(r.inventory.DASEConsumerAcknowledgement,false);
 assert.equal(r.cases.find(c=>c.caseId==='DEV03').referenceBlocked,false);
 assert.equal(r.expectedAnnotations.find(a=>a.case_id==='DEV03').resource,'unknown');
});

test('Changed frozen CSV or source input is rejected before it becomes a measurement case',async()=>{
 const t=await toolkit();
 for(const suffix of ['adjudicated-annotations.csv','canonical-selected-inputs.json','frozen-development-split.csv']){
  assert.throws(()=>t.loadFrozenDevelopmentReference({readBytes:path=>{
   const b=read(path);return path.endsWith(suffix)?Buffer.concat([b,Buffer.from(' ')]):b;
  }}),/frozen file hash/i);
 }
});

test('Design bytes remain pinned and the separately approved content overlay is bounded',async()=>{
 const t=await toolkit(),r=t.inspectTeamIntegration();
 assert.equal(r.languagePairs,103);assert.equal(r.acceptedReplacementKeys,6);
 assert.equal(r.DesignLanguageAcceptance,'member_self_report_bound_to_exact_bytes');
 assert.equal(r.ApprovedContentOverlay.approvedItems,11);assert.equal(r.ApprovedContentOverlay.approvedLocaleChanges,1);
 assert.equal(r.pendingContentItems.length,0);assert.equal(r.sourceContentApproval,true);assert.equal(r.productionApprovalApplied,false);
 assert.equal(r.modelCalls,0);assert.equal(r.CSAppAcceptance,false);
});

test('The frozen reference feeds the same analyze adapter and leaves draft results as failures',async()=>{
 const t=await toolkit(),e=await import('../../tools/evaluate-development.mjs');
 const content=JSON.parse(read('knowledge/library.json')),locales={'en-HK':JSON.parse(read('locales/en-HK.json')),'zh-Hant-HK':JSON.parse(read('locales/zh-Hant-HK.json'))};
 const library=explicitDraftLibrary(content,locales);
 let calls=0;
 const r=await e.evaluateCases(t.loadFrozenDevelopmentReference().cases,{mode:'live',library,configuration:draftConfiguration(e,library),providerForCase:()=>({modelId:'qwen3.8-max',region:'not_verified',async extract(){calls++;throw Error('Draft content must not call a provider');}})});
 assert.equal(calls,0);assert.equal(r.attempts.length,18);
 assert.equal(r.summary.operations.primaryAttempts,14);
 assert(r.attempts.every(a=>a.errorCode==='configuration_unavailable'));
 assert.equal(r.summary.independentEvaluation,false);
 assert.equal(r.summary.semantic.wholeCase.failed,14);
 assert.equal(r.summary.semantic.wholeCase.percentage,0);
 assert.equal(r.summary.semantic.referenceAdjudicationBlocked,false);
 assert.deepEqual(r.summary.semantic.referenceIssueCaseIds,[]);
});

test('Frozen metadata and the full reference denominator cannot be stripped by a caller',async()=>{
 const t=await toolkit(),e=await import('../../tools/evaluate-development.mjs');
 const {loadReferenceLibrary}=await import('../../lib/knowledge/index.ts');
 const library=loadReferenceLibrary(JSON.parse(read('knowledge/library.json')),{'en-HK':JSON.parse(read('locales/en-HK.json')),'zh-Hant-HK':JSON.parse(read('locales/zh-Hant-HK.json'))});
 let calls=0;const options={mode:'live',library,configuration:e.configurationRecord('recorded'),providerForCase:()=>{calls++;throw Error('No inference before reference checks');}};
 const altered=t.loadFrozenDevelopmentReference().cases;
 altered.find(c=>c.caseId==='DEV03').referenceBlocked=true;
 await assert.rejects(()=>e.evaluateCases(altered,options),/frozen.*metadata/i);
 await assert.rejects(()=>e.evaluateCases(t.loadFrozenDevelopmentReference().cases.filter(c=>c.caseId!=='DEV03'),options),/all.*frozen/i);
 const stripped=t.loadFrozenDevelopmentReference().cases.filter(c=>c.caseId!=='DEV03').map(c=>{delete c.frozenReferenceVersion;delete c.referenceBlocked;delete c.expectedActionCount;return c;});
 await assert.rejects(()=>e.evaluateCases(stripped,options),/all.*frozen/i);
 assert.equal(calls,0);
});

test('Frozen configuration binds current issue decisions as well as annotations and code',async()=>{
 const t=await toolkit(),e=await import('../../tools/evaluate-development.mjs');
 const {createHash}=await import('node:crypto');
 const library=loadReferenceLibrary(JSON.parse(read('knowledge/library.json')),{'en-HK':JSON.parse(read('locales/en-HK.json')),'zh-Hant-HK':JSON.parse(read('locales/zh-Hant-HK.json'))});
 const config=e.configurationRecord('recorded');
 config.developmentReference.issuesSha256='0'.repeat(64);
 const {configurationId,...body}=config;config.configurationId=createHash('sha256').update(JSON.stringify(body)).digest('hex');
 await assert.rejects(()=>e.evaluateCases(t.loadFrozenDevelopmentReference().cases,{mode:'live',library,configuration:config,providerForCase:()=>{throw Error('No inference before configuration checks');}}),/reference configuration/i);
});

test('Frozen v1 cannot be rewritten by changing an annotation and its manifest together',async()=>{
 const t=await toolkit(),{createHash}=await import('node:crypto');
 const base='tests/analysis/team-inputs-2026-10-14/frozen-development-annotations-v1/';
 const manifest=JSON.parse(read(base+'freeze-manifest.json'));
 const changed=Buffer.from(read(base+'adjudicated-annotations.csv').toString('utf8').replace('personal_money,task_recharge','unknown,unclear'));
 manifest.files['adjudicated-annotations.csv']=createHash('sha256').update(changed).digest('hex');
 assert.throws(()=>t.loadFrozenDevelopmentReference({readBytes:path=>path===base+'freeze-manifest.json'?Buffer.from(JSON.stringify(manifest)):path===base+'adjudicated-annotations.csv'?changed:read(path)}),/immutable.*manifest/i);
});

test('Rescoring cannot drop a frozen case or change its persisted marker',async()=>{
 const t=await toolkit(),e=await import('../../tools/evaluate-development.mjs');
 const {loadReferenceLibrary}=await import('../../lib/knowledge/index.ts');
 const content=JSON.parse(read('knowledge/library.json')),locales={'en-HK':JSON.parse(read('locales/en-HK.json')),'zh-Hant-HK':JSON.parse(read('locales/zh-Hant-HK.json'))};
 const library=explicitDraftLibrary(content,locales);
 const run=await e.evaluateCases(t.loadFrozenDevelopmentReference().cases,{mode:'live',library,configuration:draftConfiguration(e,library),providerForCase:()=>{throw Error('No draft-content inference');}});
 await assert.throws(()=>e.summarize(run.attempts.filter(a=>a.caseId!=='DEV03'),run.configuration),/all.*frozen/i);
 const rows=structuredClone(run.attempts);rows.find(a=>a.caseId==='DEV03').referenceBlocked=true;
 assert.throws(()=>e.summarize(rows,run.configuration),/frozen.*binding/i);
});
