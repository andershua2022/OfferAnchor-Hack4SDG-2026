import {readFileSync,writeFileSync,mkdirSync,existsSync,lstatSync} from 'node:fs';
import {resolve,relative,isAbsolute,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import {analyze,PROMPT_VERSION,SYSTEM_PROMPT} from '../lib/analysis/index.ts';
import {loadFrozenDevelopmentReference} from './check-team-integration.mjs';
import {SYSTEM_PROMPT as simulationPrompt} from '../lib/analysis/prompt.ts';
import {CANDIDATE211_PROMPT_VERSION,CANDIDATE211_SYSTEM_PROMPT} from '../lib/analysis/prompt-candidate-v2.11.ts';
import {parseAnalyzeRequest,validateAnalyzeResponse} from '../lib/contracts/index.ts';
import {loadReferenceLibrary} from '../lib/knowledge/index.ts';
import {createProviderAdapter as validateProviderConfiguration} from '../lib/analysis/provider.ts';

const root=fileURLToPath(new URL('../',import.meta.url));
const read=p=>JSON.parse(readFileSync(resolve(root,p),'utf8'));
const digest=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const id=value=>typeof value==='string'&&/^[A-Za-z0-9._-]{1,96}$/.test(value);
const check=(value,message)=>{if(!value)throw Error(message);};
const freeze=value=>{
 if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}
 return value;
};
const inputHash=request=>digest({contractVersion:request.contractVersion,locale:request.locale,
 clarificationsUsed:request.clarificationsUsed,evidence:request.evidence});
const offlineProfiles=['simulation','recorded','authored'];
const profiles=[...offlineProfiles,'live-development'];
const recordedPacketPath='tests/analysis/observed-development-finish-2026-10-13.json';
const recordedPacketSha256='ba0c921b74b85b89a9cb4a8637b4d582f427852cdd51fe6dfeca0c56f4bdc683';
const currentValidationRuntime=()=>({promptVersion:PROMPT_VERSION,promptSha256:digest(SYSTEM_PROMPT)});
const recordedGeneration=()=>({packetPath:recordedPacketPath,packetSha256:recordedPacketSha256,
 promptVersion:CANDIDATE211_PROMPT_VERSION,promptSha256:digest(CANDIDATE211_SYSTEM_PROMPT),modelId:'qwen3.8-max'});
const historicalMetadata=c=>({latencyMs:c.latencyMs,usage:c.usage,promptVersion:c.promptVersion,promptSha256:c.promptSha256});
function recordedPacket(){
 const text=readFileSync(resolve(root,recordedPacketPath),'utf8'),identity=recordedGeneration();
 check(digest(text)===identity.packetSha256,'Historical capture packet hash mismatch');
 const packet=JSON.parse(text);
 check(packet.syntheticOnly===true&&packet.promptVersion===identity.promptVersion&&packet.promptSha256===identity.promptSha256&&
  packet.attempts.every(c=>c.promptVersion===identity.promptVersion&&c.promptSha256===identity.promptSha256&&c.configuredModelId===identity.modelId),'Captured prompt mismatch');
 return packet;
}
function checkReplayConfiguration(configuration){
 if(configuration.profile!=='recorded')return;
 check(JSON.stringify(configuration.recordedGeneration)===JSON.stringify(recordedGeneration()),'Historical capture configuration mismatch');
 check(JSON.stringify(configuration.currentValidationRuntime)===JSON.stringify(currentValidationRuntime()),'Historical replay validation runtime mismatch');
}
function providerSelectionRecord(config){
 check(config&&typeof config==='object'&&!Array.isArray(config),'Explicit provider configuration is required');
 const stable={...config},validated=validateProviderConfiguration(stable); // Pure canonical config validation only; never extract.
 const record={modelId:validated.modelId,region:validated.region,endpointSha256:digest(stable.apiBaseUrl.replace(/\/$/,'')),
  responseMode:stable.responseMode,maxOutputTokens:stable.maxOutputTokens,timeoutMs:stable.timeoutMs,temperature:stable.temperature,
  thinkingBudget:stable.thinkingBudget??null,credentialMaterialRecorded:false};
 return {...record,sha256:digest(record)};
}
const providerEntries=['lib/analysis/index.ts','lib/server/provider-source-schema.ts'];
const currentLiveProviders=new WeakSet();
export async function createCurrentLiveProvider(config){
 // Snapshot before the asynchronous import so later caller mutation cannot change the selected config.
 const stableConfig={...config},providerSelection=freeze(providerSelectionRecord(stableConfig));
 const {createSourceBoundProvider}=await import('../lib/server/provider-source-schema.ts');
 const provider=Object.freeze({...createSourceBoundProvider(stableConfig),providerSelection});
 currentLiveProviders.add(provider);
 return provider;
}
/** Actual local import closure, including type/schema dependencies; the optional reader enables byte-only tests. */
export function providerRuntimeRecord(readBytes=path=>readFileSync(resolve(root,path))){
 const files=new Map();
 const visit=path=>{
  if(files.has(path))return;
  check(/\.(?:ts|mts|mjs|js|json)$/.test(path),'Unsupported provider runtime dependency');
  const bytes=readBytes(path),text=typeof bytes==='string'?bytes:Buffer.from(bytes).toString('utf8');
  files.set(path,{path,sha256:createHash('sha256').update(bytes).digest('hex')});
  if(path.endsWith('.json'))return;
  const dependencies=[
   ...text.matchAll(/^\s*(?:import|export)\s+(?:type\s+)?(?:[^;'"]*?\s+from\s*)?['"](\.[^'"]+)['"]/gm),
   ...text.matchAll(/\bimport\s*\(\s*['"](\.[^'"]+)['"]\s*\)/g),
  ];
  for(const match of dependencies){
   const target=relative(root,resolve(dirname(resolve(root,path)),match[1])).replaceAll('\\','/');
   check(target&&!isAbsolute(target)&&target!=='..'&&!target.startsWith('../'),'Provider runtime dependency leaves workspace');
   visit(target);
  }
 };
 providerEntries.forEach(visit);
 const record={version:'provider-runtime-1.0.0',promptVersion:PROMPT_VERSION,entryPoints:[...providerEntries],files:[...files.values()].sort((a,b)=>a.path.localeCompare(b.path))};
 return {...record,sha256:digest(record)};
}
function checkAnalysisTimeout(value){
 check(Number.isSafeInteger(value)&&value>=1&&value<=53000,'Invalid frozen analysis timeout');
}
function checkProviderRuntime(configuration){
 checkAnalysisTimeout(configuration.analysisTimeoutMs);
 if(configuration.profile==='live-development'){
  const selection=configuration.providerSelection;
  check(selection&&typeof selection==='object','Fresh provider selection is missing');
  const {sha256,...body}=selection;
  check(digest(body)===sha256&&selection.modelId===configuration.modelId,'Fresh provider selection identity mismatch');
  check(!configuration.recordedGeneration&&!configuration.currentValidationRuntime,'Fresh development cannot inherit historical generation');
 }
 check(JSON.stringify(configuration.providerRuntime)===JSON.stringify(providerRuntimeRecord()),'Provider runtime configuration mismatch');
}
export const REVIEW_FIELDS=[
 'actor_exact','verb_exact','polarity_exact','resource_exact','mechanism_exact',
 'promise_exact','guidance_exact','contradiction_preserved','critical_unknowns_preserved',
 'required_question_relevant','evidence_meaning_exact',
];
const naFields=new Set(['actor_exact','verb_exact','polarity_exact','resource_exact','mechanism_exact',
 'contradiction_preserved','critical_unknowns_preserved','required_question_relevant']);
function library(fixtureApprovals){
 const content=read('knowledge/library.json');
 if(fixtureApprovals)for(const item of [...content.cards,...content.routes]){
  item.approvalStatus='approved';item.humanReviewer='FICTIONAL_DEVELOPMENT_CHECK_ONLY';item.localizedMeaningApproved=true;
 }
 return loadReferenceLibrary(content,{'en-HK':read('locales/en-HK.json'),'zh-Hant-HK':read('locales/zh-Hant-HK.json')});
}
function referenceIdentity(){
 const i=developmentInventory();
 return {version:i.referenceVersion,manifestSha256:i.referenceManifestSha256,
  issuesSha256:createHash('sha256').update(readFileSync(resolve(root,'tests/analysis/team-inputs-2026-10-14/integration-issues.json'))).digest('hex'),
  loaderSha256:createHash('sha256').update(readFileSync(resolve(root,'tools/check-team-integration.mjs'))).digest('hex'),
  adapterSha256:createHash('sha256').update(readFileSync(resolve(root,'tools/evaluate-development.mjs'))).digest('hex')};
}
export function configurationRecord(profile,fixtureApprovals=false,{analysisTimeoutMs=28000,providerConfig}={}){
 checkAnalysisTimeout(analysisTimeoutMs);
 check(profiles.includes(profile),'Unsupported development profile');
 check(profile!=='simulation'||!fixtureApprovals,'Simulation keeps the real draft library');
 const fresh=profile==='live-development',providerSelection=fresh?providerSelectionRecord(providerConfig):null;
 if(profile==='recorded')recordedPacket();
 const manifest=read('tests/analysis/module-handoff.json');
 const selected=[...manifest.moduleFiles,...manifest.sharedDependencies].map(item=>({
  path:item.path,sha256:createHash('sha256').update(readFileSync(resolve(root,item.path))).digest('hex')}));
 const record={
  profile,mode:profile==='simulation'?'simulation':'live',
  contractVersion:'2.0.0',analysisTimeoutMs,promptVersion:profile==='simulation'?'extract-v2.0':PROMPT_VERSION,
  promptSha256:digest(profile==='simulation'?simulationPrompt:SYSTEM_PROMPT),
  ...(profile==='recorded'?{recordedGeneration:recordedGeneration(),currentValidationRuntime:currentValidationRuntime()}:{}),
  libraryVersion:read('knowledge/library.json').libraryVersion,
  runtimeLibrarySha256:digest(library(fixtureApprovals)),
  modelId:profile==='simulation'?null:profile==='authored'?'FICTIONAL_AUTHORED_ONLY':fresh?providerSelection.modelId:'qwen3.8-max',
  ...(fresh?{providerSelection,evidenceType:'fresh_exposed_synthetic_model_development',independentEvaluation:false,reviewStatus:'whole_case_judgment_pending'}:{}),
  contentApproval:fixtureApprovals?'fictional_test_only':'root_draft',
  policyId:'loan-funded-pay-2026-10-11',
  developmentReference:referenceIdentity(),
  providerRuntime:providerRuntimeRecord(),
  selectedFiles:selected,
  buildId:digest(selected),
 };
 return {...record,configurationId:digest(record)};
}
export function developmentInventory(){return loadFrozenDevelopmentReference().inventory;}
export function frozenDevelopmentCases(){return loadFrozenDevelopmentReference().cases;}

function prepareCases(cases){
 check(Array.isArray(cases)&&cases.length>0&&cases.length<=1000,'Invalid case inventory');
 const families=new Map(),identities=new Map();
 return cases.map(c=>{
  check(c.partition==='development','This adapter refuses held-out inputs');
  check([c.caseId,c.baseCaseId,c.variantId].every(id),'Invalid case identifier');
  check(typeof c.primaryVariant==='boolean'&&typeof c.benignOrConfusable==='boolean'&&typeof c.missingInformation==='boolean','Missing split/category metadata');
  const parsed=parseAnalyzeRequest(c.request);check(parsed.ok,'Invalid case request');
  const hash=inputHash(parsed.request);
  const previous=identities.get(c.caseId);
  const identity=[c.baseCaseId,c.variantId,c.primaryVariant,c.benignOrConfusable,c.missingInformation,hash];
  check(!previous||JSON.stringify(previous)===JSON.stringify(identity),'Case identity or text changed between attempts');
  identities.set(c.caseId,identity);
  const f=families.get(c.baseCaseId)??{primary:new Set(),category:c.benignOrConfusable};
  check(f.category===c.benignOrConfusable,'Conflicting family category');
  if(c.primaryVariant)f.primary.add(c.caseId);
  families.set(c.baseCaseId,f);
  return {...c,request:parsed.request,inputSha256:hash};
 }).map((c,_,prepared)=>{
  check([...families.values()].every(f=>f.primary.size===1),'Each family requires exactly one primary variant');
  return c;
 });
}
function blankReview(a){
 return {runId:a.runId,configurationId:a.configurationId,inputSha256:a.inputSha256,
  reviewerId:null,reviewKind:null,expectedActionCount:null,...Object.fromEntries(REVIEW_FIELDS.map(k=>[k,null])),
  unsafe_advice:null,raw_unsafe_output:null,notes:''};
}
export async function evaluateCases(cases,{mode,library:references,configuration,providerForCase}){
 check(typeof providerForCase==='function','Explicit providerForCase is required');
 const {configurationId,...configurationBody}=configuration;
 check(digest(configurationBody)===configurationId,'Configuration record digest mismatch');
 checkProviderRuntime(configuration);
 checkReplayConfiguration(configuration);
 const captures=configuration.profile==='recorded'?recordedPacket().attempts:[];
 const prepared=prepareCases(cases);
 check(JSON.stringify(configuration.developmentReference)===JSON.stringify(referenceIdentity()),'Development reference configuration mismatch');
 const fixed=loadFrozenDevelopmentReference().cases;
 if(prepared.some(c=>c.frozenReferenceVersion||fixed.some(f=>f.caseId===c.caseId))){
  check(prepared.length===fixed.length&&new Set(prepared.map(c=>c.caseId)).size===fixed.length&&prepared.every(c=>c.frozenReferenceVersion),'All eighteen frozen development records are required');
  for(const c of prepared){
   const expected=fixed.find(f=>f.caseId===c.caseId);
   check(expected&&['baseCaseId','variantId','partition','primaryVariant','benignOrConfusable','missingInformation','inputSha256','frozenReferenceVersion','referenceBlocked','expectedActionCount'].every(k=>c[k]===expected[k]),'Frozen reference metadata mismatch');
  }
  const {configurationId,...body}=configuration;
  const selection={...body,developmentReferenceSet:'all_18_frozen_exposed'};
  configuration={...selection,configurationId:digest(selection)};
 }
 configuration=freeze(structuredClone(configuration));
 check(configuration.mode===mode,'Configuration mode mismatch');
 check(configuration.promptVersion===(mode==='simulation'?'extract-v2.0':PROMPT_VERSION),'Configuration prompt mismatch');
 check(configuration.promptSha256===digest(mode==='simulation'?simulationPrompt:SYSTEM_PROMPT),'Configuration prompt hash mismatch');
 check(configuration.libraryVersion===references.libraryVersion,'Configuration library mismatch');
 check(configuration.runtimeLibrarySha256===digest(references),'Configuration library content identity mismatch');
 const contentBlocked=mode==='live'&&references.status!=='approved'&&![...references.cards,...references.routes].some(i=>i.approvalStatus==='approved'&&i.localizedMeaningApproved&&i.humanReviewer);
 const counters=new Map(),attempts=[],details=[];
 for(const c of prepared){
  const capture=captures.find(item=>item.caseId===c.caseId);
  if(capture||c.historicalGeneration)check(capture&&inputHash(capture.request)===c.inputSha256&&
   JSON.stringify(c.historicalGeneration)===JSON.stringify(historicalMetadata(capture))&&
   c.recorded?.jsonText===capture.jsonText&&c.recorded?.finishReason===capture.finishReason,'Historical capture metadata or output mismatch');
  const historicalGeneration=capture?structuredClone(historicalMetadata(capture)):null;
  const runId='eval_'+randomUUID().replaceAll('-','');
  const request=freeze(structuredClone({...c.request,requestId:runId}));
  const attempt=(counters.get(c.caseId)??0)+1;counters.set(c.caseId,attempt);
  const provider=mode==='simulation'||contentBlocked?null:providerForCase(structuredClone(c));
  check(mode==='simulation'||contentBlocked||provider?.modelId===configuration.modelId,'Configured model binding mismatch');
  if(configuration.profile==='live-development'&&!contentBlocked){
   check(currentLiveProviders.has(provider),'Fresh development requires the current live provider factory');
   check(provider?.providerSelection?.sha256===configuration.providerSelection.sha256,'Configured provider selection mismatch');
  }
  let observation=null;
  const runUtc=new Date().toISOString();
  const started=performance.now();
  const response=await analyze(request,{mode,provider,library:references,timeoutMs:configuration.analysisTimeoutMs,signal:new AbortController().signal,
   onObservation:event=>{observation=event;}});
  const validated=validateAnalyzeResponse(response,request,mode);
  // Offline replay validates with current code but retains the actual capture's generation identity.
  const accepted=historicalGeneration&&validated.status==='complete'?validateAnalyzeResponse({...validated,
   provenance:{...validated.provenance,promptVersion:historicalGeneration.promptVersion}},request,mode):validated;
  if(historicalGeneration&&observation)observation={...observation,promptVersion:historicalGeneration.promptVersion};
  check(accepted.status!=='complete'||accepted.provenance.modelId===configuration.modelId,'Output model binding mismatch');
  const citations=accepted.status==='complete'?[...accepted.extraction.actions,...accepted.extraction.claims].flatMap(a=>a.citations):[];
  const record={runId,runUtc,caseId:c.caseId,baseCaseId:c.baseCaseId,variantId:c.variantId,
   partition:'development',referenceVersion:c.frozenReferenceVersion??null,referenceBlocked:c.referenceBlocked===true,configurationId:configuration.configurationId,inputSha256:c.inputSha256,attempt,
   primaryResult:c.primaryVariant&&attempt===1,benignOrConfusable:c.benignOrConfusable,missingInformation:c.missingInformation,
   status:accepted.status,errorCode:accepted.status==='incomplete'?accepted.errorCode:null,
   completeValidShape:accepted.status==='complete'?1:0,
   validCitations:accepted.status==='incomplete'?0:citations.length?1:'NA',
   producedActions:accepted.status==='complete'?accepted.extraction.actions.length:null,
   observation,wallTimeMs:performance.now()-started,
   historicalGeneration};
  attempts.push(record);details.push({runId,request,response:accepted,rawRecorded:c.recorded??null});
 }
 return {configuration,attempts,details,reviews:attempts.map(blankReview),summary:summarize(attempts,configuration)};
}
function fraction(rows,verdict){
 const values=rows.map(verdict);
 const passed=values.filter(v=>v===true).length,failed=values.filter(v=>v===false).length,pending=values.filter(v=>v===null).length;
 return {passed,failed,pending,total:rows.length,percentage:pending===0&&rows.length?100*passed/rows.length:null};
}
export function summarize(attempts,configuration,reviews=[]){
 check(Array.isArray(reviews),'Invalid review records');
 const {configurationId,...configurationBody}=configuration;
 check(digest(configurationBody)===configurationId,'Configuration record digest mismatch');
 checkProviderRuntime(configuration);
 checkReplayConfiguration(configuration);
 const captures=configuration.profile==='recorded'?recordedPacket().attempts:[];
 for(const a of attempts)if(a.historicalGeneration){
  const capture=captures.find(c=>c.caseId===a.caseId);
  check(capture&&a.inputSha256===inputHash(capture.request)&&JSON.stringify(a.historicalGeneration)===JSON.stringify(historicalMetadata(capture)),
   'Historical capture score binding mismatch');
 }
 const replay=attempts.length>0&&attempts.every(a=>a.historicalGeneration)?configuration.recordedGeneration:null;
 check(JSON.stringify(configuration.developmentReference)===JSON.stringify(referenceIdentity()),'Development reference configuration mismatch');
 check(new Set(attempts.map(a=>a.runId)).size===attempts.length,'Duplicate run identity');
 check(attempts.every(a=>a.configurationId===configurationId&&a.partition==='development'),'Attempt configuration or partition mismatch');
 const fixed=loadFrozenDevelopmentReference().cases;
 if(configuration.developmentReferenceSet==='all_18_frozen_exposed'||attempts.some(a=>fixed.some(f=>f.caseId===a.caseId))){
  check(configuration.developmentReferenceSet==='all_18_frozen_exposed','Frozen reference configuration selection is missing');
  check(JSON.stringify(configuration.developmentReference)===JSON.stringify(referenceIdentity()),'Development reference configuration mismatch');
  check(attempts.length===fixed.length&&new Set(attempts.map(a=>a.caseId)).size===fixed.length,'All eighteen frozen records must remain in the scored denominator');
  for(const a of attempts){
   const expected=fixed.find(c=>c.caseId===a.caseId);
   check(expected&&['baseCaseId','variantId','partition','benignOrConfusable','missingInformation','inputSha256'].every(k=>a[k]===expected[k])&&a.primaryResult===expected.primaryVariant&&a.referenceVersion===expected.frozenReferenceVersion&&a.referenceBlocked===expected.referenceBlocked,'Frozen score binding mismatch');
  }
 }

 const attemptMap=new Map(attempts.map(a=>[a.runId,a]));
 const reviewMap=new Map();
 for(const r of reviews){
  const a=attemptMap.get(r.runId);
  check(a&&!reviewMap.has(r.runId),'Unknown or duplicate review');
  check(r.configurationId===configuration.configurationId&&r.inputSha256===a.inputSha256,'Review identity mismatch');
  check(r.expectedActionCount===null||r.expectedActionCount===undefined||Number.isSafeInteger(r.expectedActionCount)&&r.expectedActionCount>=0,'Invalid expected action count');
  const hasVerdict=[...REVIEW_FIELDS,'unsafe_advice','raw_unsafe_output'].some(k=>r[k]!==null&&r[k]!==undefined);
  check(!hasVerdict||(id(r.reviewerId)&&['producer_development','human_development'].includes(r.reviewKind)),'Verdict requires declared development reviewer');
  for(const k of [...REVIEW_FIELDS,'unsafe_advice','raw_unsafe_output']){
   check(r[k]===null||r[k]===undefined||r[k]===0||r[k]===1||(r[k]==='NA'&&naFields.has(k)),'Invalid verdict value');
   if(r[k]==='NA'&&['actor_exact','verb_exact','polarity_exact','resource_exact','mechanism_exact'].includes(k))
    check(r.expectedActionCount===0&&a.producedActions===0,'NA requires no expected and no produced actions');
  }
  reviewMap.set(r.runId,r);
 }
 const primary=attempts.filter(a=>a.primaryResult);
 check(new Set(primary.map(a=>a.baseCaseId)).size===primary.length,'Duplicate primary base family');
 const referenceIssueCases=primary.filter(a=>a.referenceBlocked).map(a=>a.caseId);
 const verdict=a=>{
  if(a.completeValidShape===0||a.validCitations===0)return false;
  const r=reviewMap.get(a.runId);
  if(r&&r.expectedActionCount!==null&&r.expectedActionCount!==undefined&&((r.expectedActionCount>0&&a.producedActions===0)||(r.expectedActionCount===0&&a.producedActions>0)))return false;
  if(r?.unsafe_advice===1||REVIEW_FIELDS.some(k=>r?.[k]===0))return false;
  if(!r||r.expectedActionCount===null||r.expectedActionCount===undefined||r.unsafe_advice===null||r.unsafe_advice===undefined||REVIEW_FIELDS.some(k=>r[k]===null||r[k]===undefined))return null;
  return true;
 };
 const components=Object.fromEntries(REVIEW_FIELDS.map(k=>{
  const values=primary.map(a=>{
   const r=reviewMap.get(a.runId);
   if(r?.[k]==='NA'&&['contradiction_preserved','critical_unknowns_preserved','required_question_relevant'].includes(k))return 'NA';
   if(['actor_exact','verb_exact','polarity_exact','resource_exact','mechanism_exact'].includes(k)){
    if(r?.expectedActionCount===0&&a.producedActions>0)return 0;
    if(r?.expectedActionCount===0&&a.producedActions===0)return 'NA';
    if(r?.expectedActionCount>0&&a.producedActions===0)return 0;
    if(a.completeValidShape===0)return r?.expectedActionCount>0?0:null;
   }else if(a.completeValidShape===0)return 0;
   return r?.[k]??null;
  });
  const passed=values.filter(v=>v===1).length,failed=values.filter(v=>v===0).length;
  const na=values.filter(v=>v==='NA').length,pending=values.filter(v=>v===null).length;
  return [k,{passed,failed,na,pending,total:values.length,applicable:values.length-na,
   percentage:pending===0&&passed+failed>0?100*passed/(passed+failed):null}];
 }));
 const safetyReviewed=attempts.filter(a=>[0,1].includes(reviewMap.get(a.runId)?.unsafe_advice));
 const rawReviewed=attempts.filter(a=>[0,1].includes(reviewMap.get(a.runId)?.raw_unsafe_output));
 const times=attempts.map(a=>a.wallTimeMs).sort((a,b)=>a-b);
 const percentile=q=>times.length?times[Math.max(0,Math.ceil(times.length*q)-1)]:null;
 return {
  project:'OfferAnchor',scope:'development_engineering_only',evidenceType:configuration.profile==='live-development'?'fresh_exposed_synthetic_model_development':configuration.profile==='recorded'?'recorded_development_replay':configuration.profile==='authored'?'authored_compatibility':'authored_simulation',
  configurationId:configuration.configurationId,buildId:configuration.buildId,
  mode:configuration.mode,promptVersion:replay?.promptVersion??configuration.promptVersion,promptSha256:replay?.promptSha256??configuration.promptSha256,
  ...(configuration.profile==='recorded'?{recordedGeneration:configuration.recordedGeneration,currentValidationRuntime:configuration.currentValidationRuntime}:{}),
  contentApproval:configuration.contentApproval,releaseApproved:false,independentEvaluation:false,modelCalls:configuration.profile==='live-development'?null:0,
  operations:{attempts:attempts.length,primaryAttempts:primary.length,secondaryAttempts:attempts.length-primary.length,
   latencyKind:configuration.profile==='live-development'?'current_analysis_wall_time':'offline_adapter_wall_time',p50Ms:percentile(.5),p95Ms:percentile(.95),maxMs:times.at(-1)??null,
   newChargedTokens:configuration.profile==='live-development'?null:0,originalGenerationMetadataIsHistorical:configuration.profile!=='live-development'},
  engineering:{completeValid:attempts.filter(a=>a.completeValidShape===1).length,
   incomplete:attempts.filter(a=>a.completeValidShape===0).length,
   citationValid:attempts.filter(a=>a.validCitations===1).length,citationNA:attempts.filter(a=>a.validCitations==='NA').length,
   failures:attempts.filter(a=>a.errorCode).map(a=>({runId:a.runId,caseId:a.caseId,errorCode:a.errorCode}))},
  semantic:{components,referenceAdjudicationBlocked:referenceIssueCases.length>0,referenceIssueCaseIds:referenceIssueCases,wholeCase:{...fraction(primary,verdict),...(referenceIssueCases.length?{percentage:null,publicationStatus:'blocked_pending_reference_adjudication'}:{})},
   controls:fraction(primary.filter(a=>a.benignOrConfusable),verdict),
   missingInformation:fraction(primary.filter(a=>a.missingInformation),verdict),
   producerReviews:[...reviewMap.values()].filter(r=>r.reviewKind==='producer_development').length,
   humanDevelopmentReviews:[...reviewMap.values()].filter(r=>r.reviewKind==='human_development').length},
  safety:{reviewed:safetyReviewed.length,pending:attempts.length-safetyReviewed.length,
   unsafeObserved:safetyReviewed.filter(a=>reviewMap.get(a.runId).unsafe_advice===1).length,
   rawReviewed:rawReviewed.length,rawPending:attempts.length-rawReviewed.length,
   rawUnsafeObserved:rawReviewed.filter(a=>reviewMap.get(a.runId).raw_unsafe_output===1).length},
 };
}
export async function runDevelopment(profile,{fixtureApprovals=false}={}){
 check(offlineProfiles.includes(profile),'runDevelopment supports offline profiles only');
 const configuration=configurationRecord(profile,fixtureApprovals);
 let cases;
 if(profile==='simulation'){
  const primaryGroups={'task-zh':'task-en','company-zh':'company-en','funding-note-en':'missing-payer-en','task-denial-en':'task-en'};
  cases=read('examples/simulation-fixtures.json').fixtures.map(f=>({
   caseId:f.fixtureId,baseCaseId:primaryGroups[f.fixtureId]??f.fixtureId,variantId:f.fixtureId,
   primaryVariant:!primaryGroups[f.fixtureId],benignOrConfusable:['company-en','company-zh','missing-payer-en','funding-note-en'].includes(f.fixtureId),
   missingInformation:f.fixtureId==='missing-payer-en',request:read('examples/'+f.requestFile),partition:'development'}));
 }else if(profile==='recorded'){
  const packet=recordedPacket();
  const primaryGroups={'funding-unknown-zh':'funding-unknown-en','denial-en':'task-en','withdrawal-en':'task-en'};
  const seen=new Set();
  cases=packet.attempts.map(c=>{
   check(c.promptVersion===configuration.recordedGeneration.promptVersion&&c.promptSha256===configuration.recordedGeneration.promptSha256&&c.configuredModelId===configuration.modelId,'Capture configuration mismatch');
   const baseCaseId=primaryGroups[c.caseId]??c.caseId,primaryVariant=!seen.has(baseCaseId);seen.add(baseCaseId);
   return {caseId:c.caseId,baseCaseId,variantId:c.caseId,primaryVariant,
    benignOrConfusable:c.caseId==='company-en'||c.checkKind==='unknown',missingInformation:c.checkKind==='unknown',partition:'development',request:c.request,
    recorded:{jsonText:c.jsonText,finishReason:c.finishReason},
    historicalGeneration:historicalMetadata(c)};
  });
 }else{
  cases=read('tests/analysis/semantic-development-2026-10-11.json').cases.map(c=>({
   caseId:c.caseId,baseCaseId:c.caseId,variantId:'authored',primaryVariant:true,
   benignOrConfusable:c.expectedGuidance!=='pause_requested_action',missingInformation:c.expectedGuidance==='clarify_before_action',
   partition:'development',request:c.request,recorded:{jsonText:JSON.stringify(c.authoredExtraction),finishReason:'stop'}}));
 }
 const originalFetch=globalThis.fetch;
 globalThis.fetch=()=>{throw Error('Offline development checks forbid network access');};
 try {
  return await evaluateCases(cases,{mode:configuration.mode,library:library(fixtureApprovals),configuration,
   providerForCase:c=>({modelId:configuration.modelId,region:'not_verified',async extract(){return {...c.recorded,usage:{inputTokens:null,outputTokens:null},latencyMs:0};}})});
 }finally{globalThis.fetch=originalFetch;}
}
const privateOutput=resolve(root,'.local-data/development-evaluation');
function outputDirectory(name){
 check(id(name),'Invalid local run name');
 const directory=resolve(privateOutput,name);
 check(relative(privateOutput,directory)!=='..'&&!isAbsolute(relative(privateOutput,directory)),'Invalid output directory');
 for(const p of [privateOutput,directory])check(!existsSync(p)||!lstatSync(p).isSymbolicLink(),'Symbolic-link output is not supported');
 return directory;
}
async function main(args){
 if(args.length===1&&args[0]==='--inventory'){process.stdout.write(JSON.stringify(developmentInventory(),null,2)+'\n');return;}
 if(args.length===2&&args[0]==='--score-run'){
  const directory=outputDirectory(args[1]);
  const packet=JSON.parse(readFileSync(resolve(directory,'packet.json'),'utf8'));
  const reviews=JSON.parse(readFileSync(resolve(directory,'reviews.json'),'utf8'));
  process.stdout.write(JSON.stringify(summarize(packet.attempts,packet.configuration,reviews),null,2)+'\n');return;
 }
 check(args.length>=4&&args[0]==='--profile'&&args[2]==='--output-run'&&
  (args.length===4||args.length===5&&args[4]==='--fixture-approvals'),'Use --profile simulation|recorded|authored --output-run NAME [--fixture-approvals]');
 const directory=outputDirectory(args[3]);check(!existsSync(directory),'Run already exists; preserve original records');
 const packet=await runDevelopment(args[1],{fixtureApprovals:args[4]==='--fixture-approvals'});
 mkdirSync(directory,{recursive:true});
 writeFileSync(resolve(directory,'packet.json'),JSON.stringify(packet,null,2),{flag:'wx'});
 writeFileSync(resolve(directory,'reviews.json'),JSON.stringify(packet.reviews,null,2),{flag:'wx'});
 writeFileSync(resolve(directory,'summary.json'),JSON.stringify(packet.summary,null,2),{flag:'wx'});
 process.stdout.write(JSON.stringify(packet.summary,null,2)+'\n');
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 main(process.argv.slice(2)).catch(()=>{process.stderr.write('Development measurement unavailable. Check the documented profile and local run; no raw error or evidence is printed.\n');process.exitCode=1;});
}
