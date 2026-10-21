import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadFrozenDevelopmentReference} from '../../tools/check-team-integration.mjs';
import {configurationRecord,runDevelopment,summarize} from '../../tools/evaluate-development.mjs';
import {validateCanonicalExtraction} from '../../lib/contracts/semantic.ts';
import {selectPolicyReferences} from '../../lib/contracts/policy.ts';
const base='tests/analysis/team-inputs-2026-10-14/';
const read=p=>readFileSync(new URL('../../'+p,import.meta.url));
test('Active v2 resolves DEV03 without overwriting the historical disputed reference',()=>{
 const active=loadFrozenDevelopmentReference(),old=loadFrozenDevelopmentReference({version:'v1'});
 assert.equal(active.inventory.referenceVersion,'OfferAnchor-development-annotations-frozen-v2');
 assert.equal(active.issues.length,0);assert.equal(active.inventory.metricReleaseBlocked,false);
 assert.equal(active.cases.find(c=>c.caseId==='DEV03').referenceBlocked,false);
 const a=active.expectedAnnotations.find(a=>a.case_id==='DEV03');
 assert.equal(a.resource,'unknown');assert.equal(a.mechanism,'unclear');
 assert.equal(a.expected_guidance,'clarify_before_action');assert.equal(a.critical_unknowns,'resource/funds unknown');
 assert.equal(old.expectedAnnotations.find(a=>a.case_id==='DEV03').resource,'personal_money');
 assert.equal(old.inventory.metricReleaseBlocked,true);assert.equal(old.issues[0].caseId,'DEV03');
 assert.deepEqual(active.cases.map(c=>[c.caseId,c.inputSha256,c.baseCaseId,c.primaryVariant]),old.cases.map(c=>[c.caseId,c.inputSha256,c.baseCaseId,c.primaryVariant]));
 assert.equal(active.inventory.DASEConsumerAcknowledgement,false);assert.equal(active.inventory.semanticAccuracy,null);
 assert.throws(()=>loadFrozenDevelopmentReference({version:'untrusted'}),/version/i);
});
test('Rewritten v2 annotations plus rewritten manifest cannot change the selected reference',()=>{
 const prefix=base+'frozen-development-annotations-v2/';
 const manifest=JSON.parse(read(prefix+'freeze-manifest.json'));
 const changed=Buffer.concat([read(prefix+'adjudicated-annotations.csv'),Buffer.from(' ')]);
 manifest.files['adjudicated-annotations.csv']=createHash('sha256').update(changed).digest('hex');
 assert.throws(()=>loadFrozenDevelopmentReference({readBytes:p=>p===prefix+'freeze-manifest.json'?Buffer.from(JSON.stringify(manifest)):p===prefix+'adjudicated-annotations.csv'?changed:read(p)}),/immutable.*manifest/i);
});
test('All 18 authored action projections remain structurally compatible, including unknown funds',()=>{
 const ref=loadFrozenDevelopmentReference(),projections=JSON.parse(read(base+'frozen-development-annotations-v2/canonical-action-check-inputs.json'));
 assert.equal(projections.length,18);
 for(const p of projections){
  validateCanonicalExtraction(p.extraction,p.request);
  const expected=ref.expectedAnnotations.filter(a=>a.case_id===p.caseId);
  assert.equal(selectPolicyReferences(p.extraction,[]).guidance,expected[0].expected_guidance,p.caseId);
  assert.equal(p.extraction.actions.length,expected.length,p.caseId);
 }
 const p=structuredClone(projections.find(p=>p.caseId==='DEV03'));
 const noBlock=structuredClone(p);noBlock.extraction.unknowns=noBlock.extraction.unknowns.filter(u=>u.priority!=='blocking');
 assert.throws(()=>validateCanonicalExtraction(noBlock.extraction,noBlock.request));
 p.extraction.actions[0].mechanism='task_recharge';
 assert.throws(()=>validateCanonicalExtraction(p.extraction,p.request));
});
test('A replay packet with a previous reference cannot be rescored as current v2',async()=>{
 const packet=await runDevelopment('recorded',{fixtureApprovals:true});
 const body=structuredClone(configurationRecord('recorded',true));delete body.configurationId;
 body.developmentReference.version='OfferAnchor-development-annotations-frozen-v1';
 const configuration={...body,configurationId:createHash('sha256').update(JSON.stringify(body)).digest('hex')};
 const attempts=packet.attempts.map(a=>({...a,configurationId:configuration.configurationId}));
 assert.throws(()=>summarize(attempts,configuration),/reference configuration/i);
 assert.equal(packet.summary.semantic.wholeCase.percentage,null);
 assert.equal(packet.summary.modelCalls,0);
});
