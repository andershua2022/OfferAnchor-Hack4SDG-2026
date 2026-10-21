import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {createHash} from 'node:crypto';
const root=new URL('../../',import.meta.url);
const read=p=>JSON.parse(readFileSync(new URL(p,root),'utf8'));
const hashes=Object.fromEntries(['knowledge/library.json','locales/en-HK.json','locales/zh-Hant-HK.json','evals/student/development-cases.json'].map(p=>[p,createHash('sha256').update(readFileSync(new URL(p,root))).digest('hex')]));
const checkpoint=read('tests/analysis/acceptance-review-2026-10-14-r5/checkpoint.json');
const material=()=>({content:read('knowledge/library.json'),locales:{'en-HK':read('locales/en-HK.json'),'zh-Hant-HK':read('locales/zh-Hant-HK.json')},sourceHashes:structuredClone(hashes),checkpointId:checkpoint.checkpointSha256});
async function toolkit(){assert(existsSync(new URL('tools/import-content-review.mjs',root)),'Human review-record importer is missing');return import('../../tools/import-content-review.mjs');}
function records(t,m=material()){
 const make=(view,role,reviewer,keys)=>({project:'OfferAnchor',recordType:'human_self_report_'+view+'_review',reviewerId:reviewer,reviewerRole:role,reviewedUtc:'2026-10-12T12:00:00.000Z',checkpointId:m.checkpointId,sourceHashes:m.sourceHashes,humanReadingAttested:true,humanIdentityIndependentlyVerified:false,productionApprovalApplied:false,independentEvaluation:false,rows:keys.map(id=>({id,decision:'accept_existing',note:''}))});
 // Fictional records exist only in memory to exercise boundary validation. No approval is saved.
 return [make('content','Communication','REVIEWER-C',[...m.content.cards,...m.content.routes].map(i=>i.id)),make('language','Design','REVIEWER-D',t.localeGroupIds(m.locales['en-HK']))];
}
test('Importer is dry and binds exact reviewed source identities',async()=>{
 const t=await toolkit();const m=material(),before=JSON.stringify(m);const out=t.compileContentReviews(m,records(t));
 assert.equal(JSON.stringify(m),before);assert.equal(out.content.status,'approved');
 assert.equal(out.summary.approved,11);assert.equal(out.summary.humanIdentityIndependentlyVerified,false);
 assert(out.content.cards.every(c=>c.localizedMeaningApproved&&c.humanReviewer.includes('REVIEWER-C')));
 assert.deepEqual(out.content.sources,m.content.sources);assert.equal(out.summary.modelCalls,0);
});
test('One changed source, checkpoint, role or missing attestation blocks import',async()=>{
 const t=await toolkit();
 for(const change of [r=>r.sourceHashes['locales/en-HK.json']='0'.repeat(64),r=>r.checkpointId='0'.repeat(64),r=>r.reviewerRole='AI-DS',r=>r.humanReadingAttested=false]){
 const rows=records(t);change(rows[0]);assert.throws(()=>t.compileContentReviews(material(),rows));
 }
});
test('Agent/fictitious signatures and reused human identities cannot activate content',async()=>{
 const t=await toolkit();for(const name of ['Codex','agent-main','FICTIONAL_REVIEW','TEST_REVIEW','ai_ds','AI','ChatGPT']){
 const r=records(t);r[0].reviewerId=name;assert.throws(()=>t.compileContentReviews(material(),r));
 }
 const r=records(t);r[1].reviewerId=r[0].reviewerId;assert.throws(()=>t.compileContentReviews(material(),r));
});
test('Reject missing/duplicate/invented groups and unreasoned changes',async()=>{
 const t=await toolkit();
 for(const change of [r=>r.rows.pop(),r=>r.rows.push(r.rows[0]),r=>r.rows[0].id='invented',r=>r.rows[0].decision='pending',r=>r.rows[0].decision='needs_change']){
 const r=records(t);change(r[1]);assert.throws(()=>t.compileContentReviews(material(),r));
 }
});
test('Needs-change/uncertainty keeps affected cards draft, never approving a proposed amendment',async()=>{
 const t=await toolkit();const r=records(t);r[1].rows.find(x=>x.id==='knowledge.cards.K_PERSONAL_BORROWING').decision='needs_change';
 r[1].rows.find(x=>x.id==='knowledge.cards.K_PERSONAL_BORROWING').note='Include explicitly borrowed-money payment in the reviewed wording.';
 const out=t.compileContentReviews(material(),r);const card=out.content.cards.find(c=>c.id==='K_PERSONAL_BORROWING');
 assert.equal(card.approvalStatus,'draft');assert.equal(card.localizedMeaningApproved,false);assert.equal(card.humanReviewer,null);
 assert.equal(out.content.status,'draft');assert.equal(out.summary.approved,10);assert.equal(out.summary.blocked,1);
 assert.deepEqual(card.questions,material().content.cards.find(c=>c.id===card.id).questions);
});
test('Locale key mismatch or a previously missing group blocks the import',async()=>{
 const t=await toolkit();const m=material();delete m.locales['zh-Hant-HK'].guidance;assert.throws(()=>t.compileContentReviews(m,records(t)));
});

test('Rejected shared guidance wording blocks every live approval even when item-specific language passes',async()=>{
 const t=await toolkit(),r=records(t);const shared=r[1].rows.find(x=>x.id==='guidance');
 shared.decision='needs_change';shared.note='The shared guidance wording must be corrected before live use.';
 const out=t.compileContentReviews(material(),r);
 assert.equal(out.content.status,'draft');assert.equal(out.summary.approved,0);
 assert(out.content.cards.every(x=>x.approvalStatus==='draft'&&!x.localizedMeaningApproved));
 assert(out.summary.nonAcceptedLanguageGroups.some(x=>x.id==='guidance'));
});


test('Applying reviews detects any changed source and binds parse/hash to the same captured bytes',async()=>{
 const t=await toolkit(),directory=mkdtempSync(join(tmpdir(),'offeranchor-review-'));
 try{
  for(const path of Object.keys(hashes)){mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),readFileSync(new URL(path,root)));}
  const snapshot=t.readReviewedSources(directory);assert.deepEqual(snapshot.sourceHashes,hashes);
  for(const path of Object.keys(hashes)){
   assert.equal(createHash('sha256').update(snapshot.sourceBytes[path]).digest('hex'),snapshot.sourceHashes[path]);
   writeFileSync(join(directory,path),Buffer.concat([snapshot.sourceBytes[path],Buffer.from(' ')]));
   assert.throws(()=>t.assertReviewedSourcesUnchanged(directory,snapshot));
   writeFileSync(join(directory,path),snapshot.sourceBytes[path]);
   t.assertReviewedSourcesUnchanged(directory,snapshot);
  }
 }finally{rmSync(directory,{recursive:true,force:true});}
});

test('The exact teammate Design record can be reused dry without fabricating a fresh signature',async()=>{
 const t=await toolkit(),m=material(),d=read('tests/analysis/team-inputs-2026-10-14/design-reviewed-copy/human-language-review.json');
 for(const locale of ['en-HK','zh-Hant-HK']){
  m.locales[locale]=read('tests/analysis/team-inputs-2026-10-14/design-reviewed-copy/'+locale+'.json');
  m.sourceHashes['locales/'+locale+'.json']=d.candidateLocaleHashes[locale];
 }
 const r=records(t,m);
 const before=JSON.stringify(d),out=t.compileContentReviews(m,[r[0],d]);
 assert.equal(out.summary.approved,11);
 assert.equal(out.summary.languageReviewBasis,'pinned_Design_member_self_report_exact_candidate_bytes');
 assert.equal(out.summary.productionApprovalApplied,false);assert.equal(JSON.stringify(d),before);
 for(const change of [x=>x.reviewerId='OtherPerson',x=>x.humanReadingAttested=false,x=>x.candidateLocaleHashes['en-HK']='0'.repeat(64)]){
  const bad=structuredClone(d);change(bad);assert.throws(()=>t.compileContentReviews(m,[r[0],bad]));
 }
 const changed=structuredClone(m);changed.sourceHashes['locales/en-HK.json']='0'.repeat(64);
 assert.throws(()=>t.compileContentReviews(changed,[r[0],d]));
 assert.throws(()=>t.compileContentReviews(m,[d]));
});
