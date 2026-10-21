import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {parseAnalyzeRequest} from '../lib/contracts/index.ts';
const root=fileURLToPath(new URL('../',import.meta.url));
const inputRoot='tests/analysis/team-inputs-2026-10-14/';
const design=inputRoot+'design-reviewed-copy/';
const readBytes=p=>readFileSync(resolve(root,p));
const sha=b=>createHash('sha256').update(b).digest('hex');
const check=(v,m)=>{if(!v)throw Error(m);};
const read=(p,reader=readBytes)=>JSON.parse(reader(p).toString('utf8'));
function csv(bytes){
 const text=bytes.toString('utf8').replace(/^\uFEFF/,''),rows=[];
 let row=[],field='',quoted=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
  else if(!quoted&&c===','){row.push(field);field='';}
  else if(!quoted&&(c==='\n'||c==='\r')){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(x=>x!==''))rows.push(row);row=[];field='';}
  else field+=c;
 }
 check(!quoted,'Unclosed CSV field');
 if(field||row.length){row.push(field);rows.push(row);}
 const header=rows.shift();check(header&&new Set(header).size===header.length,'Invalid CSV columns');
 return rows.map(r=>{check(r.length===header.length,'CSV row width mismatch');return Object.fromEntries(header.map((h,i)=>[h,r[i]]));});
}
const flatten=(obj,prefix='',out={})=>{for(const [k,v]of Object.entries(obj)){const key=prefix?prefix+'.'+k:k;if(v&&typeof v==='object')flatten(v,key,out);else{check(typeof v==='string'&&v.trim(),'Invalid locale string');out[key]=v;}}return out;};
const inputHash=c=>sha(JSON.stringify({contractVersion:c.contractVersion,locale:c.locale,clarificationsUsed:c.clarificationsUsed,
 evidence:c.evidence.map(e=>({id:e.id,kind:e.kind,label:e.label,sequence:e.sequence,text:e.text.replaceAll('\r\n','\n')}))}));
const approvedOverlayPath='tests/analysis/approved-content-overlay-2026-10-17.json';
const overlayFiles=['knowledge/library.json','locales/en-HK.json','locales/zh-Hant-HK.json'];
// Public snapshots have no private Git history; the same pinned producer bytes ship as fixtures.
const producerBytes=p=>readBytes('tests/analysis/producer-content-baseline/'+p);
function localeValue(value,path){return path.split('.').reduce((part,key)=>part?.[key],value);}

// Verify the user-authorized consumer overlay semantically against the preserved producer bytes.
export function inspectApprovedContentOverlay(){
 const overlay=read(approvedOverlayPath),handoff=read(overlay.producerSnapshot.path);
 check(overlay.recordDate==='2026-10-17'&&overlay.status==='consumer_approved_overlay'&&overlay.scope==='human_content_approval_and_localized_meaning_only','Wrong approved content overlay scope');
 check(overlay.producerSnapshot.recordDate===handoff.recordDate&&overlay.producerSnapshot.libraryVersion===handoff.libraryVersion&&overlay.producerSnapshot.libraryVersion==='draft-0.2.0','Producer handoff identity changed');
 const approvalBytes=readBytes(overlay.approvalRecord.path),approvalText=approvalBytes.toString('utf8');
 check(sha(approvalBytes)===overlay.approvalRecord.sha256&&approvalText.includes('approval authorized by the user on 2026-10-17')&&approvalText.includes('all seven cards and all four routes'),'Content approval record changed or lacks scope');
 for(const path of overlayFiles){
  const entry=handoff.sharedDependencies.find(x=>x.path===path),baseline=producerBytes(path);
  check(entry&&sha(baseline)===entry.sha256,'Producer source bytes do not match the pinned handoff');
  check(sha(readBytes(path))===overlay.files[path],'Approved overlay active bytes changed');
 }
 const before=JSON.parse(producerBytes('knowledge/library.json').toString('utf8'));
 const after=read('knowledge/library.json');
 check(before.libraryVersion===after.libraryVersion&&before.humanApprovalRequiredForLiveUse===true&&after.humanApprovalRequiredForLiveUse===true,'Library version or live-use gate changed');
 check(before.status==='draft'&&after.status==='approved','Content approval status is not the recorded draft-to-approved transition');
 const expectedIds=[...before.cards,...before.routes].map(x=>x.id).sort();
 check(JSON.stringify([...overlay.approvedItems].sort())===JSON.stringify(expectedIds),'Approved item inventory differs from producer content');
 const normalized=structuredClone(after);normalized.status=before.status;
 for(const group of ['cards','routes'])for(const item of normalized[group]){
  const original=before[group].find(x=>x.id===item.id);check(original,'Approved item missing from producer content');
  for(const field of ['approvalStatus','humanReviewer','localizedMeaningApproved'])item[field]=original[field];
  if(group==='cards'&&item.id==='K_TASK_RECHARGE')item.questions=original.questions;
  if(group==='cards'&&item.id==='K_ALREADY_ACTED')item.sourceIds=original.sourceIds;
 }
 const newSource=after.sources.find(x=>x.id==='S11');
 check(newSource?.url==='https://www.hsbc.com.hk/content/dam/hsbc/hk/docs/help/cybersecurity-and-fraud/hsbc-fraudbooklet.pdf'&&approvalText.includes('S11 was checked on **2026-10-17**'),'Approved S11 bank-contact source does not match the recorded review');
 normalized.sources=normalized.sources.filter(x=>x.id!=='S11');
 check(JSON.stringify(normalized)===JSON.stringify(before),'Library has changes outside approved status, K_TASK_RECHARGE grammar, and S11 bank-contact source');
 for(const item of [...after.cards,...after.routes])check(item.approvalStatus==='approved'&&item.localizedMeaningApproved===true&&item.humanReviewer==='AI/DS representative (user-approved 2026-10-17)','An item lacks the recorded approval metadata');
 const acted=after.cards.find(x=>x.id==='K_ALREADY_ACTED');
 check(JSON.stringify(acted.sourceIds)===JSON.stringify([...before.cards.find(x=>x.id==='K_ALREADY_ACTED').sourceIds,'S11']),'S11 is attached to an unexpected card');
 const localeChanges=[];
 for(const locale of ['en-HK','zh-Hant-HK']){
  const path='locales/'+locale+'.json',prior=JSON.parse(producerBytes(path).toString('utf8'));
  const current=read(path),oldFlat=flatten(prior),newFlat=flatten(current);
  for(const key of Object.keys(oldFlat))if(oldFlat[key]!==newFlat[key])localeChanges.push({locale,key,before:oldFlat[key],after:newFlat[key]});
  check(Object.keys(oldFlat).length===Object.keys(newFlat).length&&Object.keys(oldFlat).every(key=>key in newFlat),'Locale key inventory changed');
 }
 check(JSON.stringify(localeChanges)===JSON.stringify(overlay.approvedLocaleChanges),'Locale changes differ from the recorded approval allowlist');
 check(overlay.approvedLocaleChanges.length===1&&overlay.approvedLocaleChanges[0].locale==='en-HK'&&overlay.approvedLocaleChanges[0].key==='knowledge.cards.K_TASK_RECHARGE.question','Unexpected locale approval allowlist');
 return {recordDate:overlay.recordDate,scope:overlay.scope,approvedItems:overlay.approvedItems.length,changedFiles:overlayFiles,approvedLocaleChanges:localeChanges.length,producerSnapshotCommit:overlay.producerSnapshot.commit};
}

// These are exposed development references. No hidden inputs, model calls or verdicts are imported.
export function loadFrozenDevelopmentReference({readBytes:reader=readBytes,version='v2'}={}){
 check(['v1','v2'].includes(version),'Unknown frozen reference version');
 const frozen=inputRoot+'frozen-development-annotations-'+version+'/';
 const manifestIdentity=version==='v1'?'e4bddfb1d4b4ac10809a1f16815e78867c15077c37859eb87f4df83101e63fff':'080cbe6388d53ad7a73b142eafd99a0e19b907bfda4fb3744bddbc8df4d2d7a0';
 check(sha(reader(frozen+'freeze-manifest.json'))===manifestIdentity,'Immutable frozen-'+version+' manifest identity mismatch');
 const manifest=read(frozen+'freeze-manifest.json',reader),record=read(frozen+'freeze-record.json',reader);
 check(manifest.version===record.version&&manifest.scope==='development_annotations'&&record.developmentAnnotationFreezeCompleted===true&&record.independentBenchmarkEstablished===false,'Wrong frozen development scope');
 for(const [name,hash]of Object.entries(manifest.files)){
  check(/^[a-zA-Z0-9.-]+$/.test(name),'Invalid frozen filename');
  check(sha(reader(frozen+name))===hash,'Frozen file hash mismatch');
 }
 const inputs=read(frozen+'canonical-selected-inputs.json',reader),split=csv(reader(frozen+'frozen-development-split.csv')),
 annotations=csv(reader(frozen+'adjudicated-annotations.csv'));
 const issueRecord=read(inputRoot+'integration-issues.json',reader),issues=version==='v1'?issueRecord.historicalIssues:issueRecord.issues;
 check(Array.isArray(issues),'Missing versioned integration issues');
 if(version==='v2'){
  const previous=loadFrozenDevelopmentReference({readBytes:reader,version:'v1'});
  check(manifest.supersedes===previous.inventory.referenceVersion&&manifest.DEV03DisputeStatus==='resolved_in_Design_frozen_reference_v2','Missing v2 decision provenance');
  check(reader(frozen+'canonical-selected-inputs.json').equals(reader(inputRoot+'frozen-development-annotations-v1/canonical-selected-inputs.json')),'V2 source input bytes changed');
  const priorSplit=csv(reader(inputRoot+'frozen-development-annotations-v1/frozen-development-split.csv'));
  check(JSON.stringify(split.map(({frozen_utc,...r})=>r))===JSON.stringify(priorSplit.map(({frozen_utc,...r})=>r)),'V2 split identity changed');
  const comparable=a=>Object.fromEntries(Object.entries(a).filter(([k])=>k!=='adjudication'));
  for(const a of annotations.filter(a=>a.case_id!=='DEV03')){
   const old=previous.expectedAnnotations.find(o=>o.case_id===a.case_id&&o.gold_action_id===a.gold_action_id);
   check(old&&JSON.stringify(comparable(a))===JSON.stringify(comparable(old)),'V2 changed an unrelated case judgment');
  }
  const a=annotations.find(a=>a.case_id==='DEV03');
  check(a&&a.actor==='applicant'&&a.verb==='pay'&&a.polarity==='requested'&&a.resource==='unknown'&&a.mechanism==='unclear'&&a.expected_guidance==='clarify_before_action'&&a.critical_unknowns==='resource/funds unknown','V2 funding decision mismatch');
  check(issueRecord.activeReferenceVersion===manifest.version&&issues.length===0&&issueRecord.resolvedIssues.some(i=>i.id==='DEV03_UNSPECIFIED_FUNDS'&&i.referenceVersion===manifest.version&&i.inputSha256==='c84b12f1edafe0bd867407320f4162c6bd5e6f244e4e329338a902ee80eaab8f'),'V2 resolution receipt mismatch');
 }
 const seeds=read('evals/student/development-cases.json',reader).cases;
 check(inputs.length===18&&split.length===18&&annotations.length===28&&new Set(inputs.map(i=>i.caseId)).size===18,'Frozen record count mismatch');
 const families=new Map(),seenActions=new Set();
 const cases=inputs.map(input=>{
  const s=split.find(s=>s.case_id===input.caseId),seed=seeds.find(c=>c.caseId===input.caseId);
  check(s&&seed&&s.partition==='development'&&s.source_type==='synthetic','Unknown or non-development input');
  const hash=inputHash(input.canonicalInput);
  check(hash===input.textSha256&&hash===s.text_sha256&&hash===inputHash(seed.request),'Frozen canonical input identity mismatch');
  check(s.base_case_id===input.baseCaseId&&['0','1'].includes(s.primary_variant)&&['0','1'].includes(s.benign_or_confusable),'Invalid frozen split');
  const request={...input.canonicalInput,requestId:'frozen_'+input.caseId,revision:1};
  check(parseAnalyzeRequest(request).ok,'Frozen request fails the public contract');
  const rows=annotations.filter(a=>a.case_id===input.caseId);check(rows.length>0,'Missing action reference');
  for(const a of rows){
   check(a.partition==='development'&&a.base_case_id===s.base_case_id&&a.variant_id===s.variant_id&&a.frozen_text_sha256===hash,'Annotation identity mismatch');
   const actionKey=a.case_id+':'+a.gold_action_id;check(!seenActions.has(actionKey),'Duplicate frozen action');seenActions.add(actionKey);
   for(const c of a.citation_ranges.split('|')){
    const m=/^(E[1-8]):(\d+):(\d+)$/.exec(c),e=m&&request.evidence.find(e=>e.id===m[1]);
    check(e&&Number(m[2])<Number(m[3])&&Number(m[3])<=e.text.length,'Invalid frozen citation range');
   }
  }
  check(new Set(rows.map(a=>a.expected_guidance)).size===1,'Conflicting case guidance');
  const family=families.get(s.base_case_id)??{primary:0,control:s.benign_or_confusable==='1'};
  check(family.control===(s.benign_or_confusable==='1'),'Conflicting family control status');
  if(s.primary_variant==='1')family.primary++;families.set(s.base_case_id,family);
  const conflicts=issues.filter(i=>i.caseId===input.caseId);
  check(conflicts.every(i=>i.inputSha256===hash&&i.referenceVersion===manifest.version&&i.status==='owner_adjudication_pending'),'Stale adjudication issue');
  return {caseId:input.caseId,baseCaseId:s.base_case_id,variantId:s.variant_id,partition:'development',
   primaryVariant:s.primary_variant==='1',benignOrConfusable:s.benign_or_confusable==='1',
   missingInformation:rows[0].expected_guidance==='clarify_before_action',request,inputSha256:hash,
   frozenReferenceVersion:manifest.version,referenceBlocked:conflicts.length>0,expectedActionCount:rows.length};
 });
 check(families.size===14&&[...families.values()].every(f=>f.primary===1),'Invalid primary family denominator');
 check(issues.every(i=>cases.some(c=>c.caseId===i.caseId)),'Unknown adjudication issue');
 const inventory={records:cases.length,baseFamilies:families.size,controlRecords:cases.filter(c=>c.benignOrConfusable).length,
  controlFamilies:[...families.values()].filter(f=>f.control).length,actionRows:annotations.length,
  referenceVersion:manifest.version,referenceManifestSha256:sha(reader(frozen+'freeze-manifest.json')),
  freezeStatus:issues.length?'frozen_exposed_development_reference_with_open_adjudication_issue':'frozen_exposed_development_reference_v2_adopted_by_AI_DS',independentGold:false,
  confirmationBasis:record.confirmationBasis,confirmationIndependentlyAuthenticated:false,
  AI_DSImportCompleted:true,DASEConsumerAcknowledgement:false,metricReleaseBlocked:issues.length>0,
  openAdjudicationIssues:issues.map(i=>({id:i.id,caseId:i.caseId,ownerRole:i.ownerRole})),semanticAccuracy:null,
  cases:cases.map(c=>({caseId:c.caseId,baseCaseId:c.baseCaseId,inputSha256:c.inputSha256,primaryVariant:c.primaryVariant,referenceBlocked:c.referenceBlocked}))};
 return {inventory,cases,expectedAnnotations:annotations,issues};
}

// The public kit deliberately excludes proprietary visual/frame inspection.
export function inspectDesignFlowIntake(){
 return {status:'excluded_from_public_review_kit',checked:false,reason:'Production design inputs are retained privately.'};
}

export function inspectTeamIntegration(){
 const reference=loadFrozenDevelopmentReference(),record=read(design+'human-language-review.json'),
 en=flatten(read('locales/en-HK.json')),zh=flatten(read('locales/zh-Hant-HK.json'));
 check(record.recordType==='Design_actual_human_language_review'&&record.humanReadingAttested===true&&record.reviewerId==='Design','Missing Design language self-report');
 check(JSON.stringify(Object.keys(en).sort())===JSON.stringify(Object.keys(zh).sort())&&Object.keys(en).length===record.candidatePairCount,'Locale key mismatch');
 for(const lang of ['en-HK','zh-Hant-HK'])check(sha(readBytes(design+lang+'.json'))===record.candidateLocaleHashes[lang],'Pinned Design-reviewed locale bytes changed');
 const overlay=inspectApprovedContentOverlay();
 const html=readBytes('tests/analysis/acceptance-review-2026-10-13-r4/review.html').toString('utf8');
 const old=JSON.parse(/<script id="review-data" type="application\/json">(.*?)<\/script>/s.exec(html)[1]);
 for(const [lang,baseline]of [['en-HK',old.en],['zh-Hant-HK',old.zh]]){
  const before=flatten(baseline),after=lang==='en-HK'?en:zh;
  check(Object.keys(before).every(k=>k in after),'An existing locale key was dropped');
  check(Object.keys(after).filter(k=>!(k in before)).sort().join('|')===record.supplementKeysAccepted.slice().sort().join('|'),'Unreviewed supplemental key');
  check(Object.keys(before).filter(k=>before[k]!==after[k]).every(k=>record.acceptedReplacementKeys.includes(k)),'Unreviewed replacement');
 }
 const content=read('knowledge/library.json');
 return {project:'OfferAnchor',scope:'nonvisual_teammate_input_integration_not_release',promptVersion:'extract-v2.11',contractVersion:'2.0.0',
  pinnedDesignCommit:'e42b87c8953aa9c339790bd83fe9f0124ff42325',pinnedDASECommit:'25b6f094b4b89cd018c153bd1cdb2e4517994c58',
  languagePairs:Object.keys(en).length,acceptedReplacementKeys:record.acceptedReplacementKeys.length,
  DesignLanguageAcceptance:'member_self_report_bound_to_exact_bytes',
  DesignFlowIntake:inspectDesignFlowIntake(),ApprovedContentOverlay:overlay,pendingContentItems:[...content.cards,...content.routes].filter(i=>i.approvalStatus!=='approved').map(i=>i.id),
  developmentReference:reference.inventory,sourceContentApproval:true,productionApprovalApplied:false,
  CSAppAcceptance:false,DASEIndependentEvaluation:false,modelCalls:0,heldOutPrivateTextRead:false};
}

function main(args){
 check(args.length===0||args.length===1&&args[0]==='--inventory','Use no arguments or --inventory');
 process.stdout.write(JSON.stringify(args.length?loadFrozenDevelopmentReference().inventory:inspectTeamIntegration(),null,2)+'\n');
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){try{main(process.argv.slice(2));}catch{process.stderr.write('Team integration check failed: verify pinned files, hashes, labels and locale records. No source text or credentials are printed.\n');process.exitCode=1;}}
