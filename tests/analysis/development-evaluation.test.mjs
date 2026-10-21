import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadReferenceLibrary} from '../../lib/knowledge/index.ts';
const read=p=>JSON.parse(readFileSync(new URL('../../'+p,import.meta.url),'utf8'));
async function toolkit(){
 assert(existsSync(new URL('../../tools/evaluate-development.mjs',import.meta.url)),'The shared-module development measurement adapter is missing');
 return import('../../tools/evaluate-development.mjs');
}
function cases(){
 const r=read('examples/request-personal-loan.json');
 return [
 {caseId:'one',baseCaseId:'base',variantId:'primary',partition:'development',primaryVariant:true,benignOrConfusable:false,missingInformation:false,request:r},
 {caseId:'variant',baseCaseId:'base',variantId:'translation',partition:'development',primaryVariant:false,benignOrConfusable:false,missingInformation:false,request:r},
 {caseId:'one',baseCaseId:'base',variantId:'primary',partition:'development',primaryVariant:true,benignOrConfusable:false,missingInformation:false,request:r},
 ];
}
function approved(){
 const c=read('knowledge/library.json');
 for(const item of [...c.cards,...c.routes]){item.approvalStatus='approved';item.humanReviewer='FICTIONAL_DEVELOPMENT_CHECK_ONLY';item.localizedMeaningApproved=true;}
 return loadReferenceLibrary(c,{'en-HK':read('locales/en-HK.json'),'zh-Hant-HK':read('locales/zh-Hant-HK.json')});
}
function explicitDraft(){
 const c=read('knowledge/library.json');c.status='draft';
 for(const item of [...c.cards,...c.routes]){item.approvalStatus='draft';item.humanReviewer=null;item.localizedMeaningApproved=false;}
 return loadReferenceLibrary(c,{'en-HK':read('locales/en-HK.json'),'zh-Hant-HK':read('locales/zh-Hant-HK.json')});
}
function draftConfig(t,library){
 const config=t.configurationRecord('recorded');config.runtimeLibrarySha256=createHash('sha256').update(JSON.stringify(library)).digest('hex');config.contentApproval='synthetic_draft_fixture';
 const {configurationId,...body}=config;config.configurationId=createHash('sha256').update(JSON.stringify(body)).digest('hex');return config;
}
async function recordedDraftRun(t){
 const packet=read('tests/analysis/observed-development-finish-2026-10-13.json'),primaryGroups={'funding-unknown-zh':'funding-unknown-en','denial-en':'task-en','withdrawal-en':'task-en'},seen=new Set();
 const cases=packet.attempts.map(c=>{const baseCaseId=primaryGroups[c.caseId]??c.caseId,primaryVariant=!seen.has(baseCaseId);seen.add(baseCaseId);return {caseId:c.caseId,baseCaseId,variantId:c.caseId,primaryVariant,benignOrConfusable:c.caseId==='company-en'||c.checkKind==='unknown',missingInformation:c.checkKind==='unknown',partition:'development',request:c.request,recorded:{jsonText:c.jsonText,finishReason:c.finishReason},historicalGeneration:{latencyMs:c.latencyMs,usage:c.usage,promptVersion:c.promptVersion,promptSha256:c.promptSha256}};});
 const library=explicitDraft(),configuration=draftConfig(t,library);
 const run=await t.evaluateCases(cases,{mode:'live',library,configuration,providerForCase:()=>{throw Error('Explicit draft fixture must not call a provider');}});
 return {run,library};
}
test('Simulation measurement preserves authored identity and leaves meaning/safety unreviewed',async()=>{
 const t=await toolkit(); const original=globalThis.fetch;
 globalThis.fetch=()=>{throw Error('Network forbidden');};
 try {
 const run=await t.runDevelopment('simulation');
 assert.equal(run.summary.operations.attempts,8);
 assert.equal(run.summary.engineering.completeValid,8);
 assert.equal(run.summary.modelCalls,0);
 assert.equal(run.summary.semantic.wholeCase.percentage,null);
 assert.equal(run.summary.safety.pending,8);
 assert(!JSON.stringify(run.summary).includes('personal loan in your own name'));
 assert.equal(run.reviews.every(r=>r.actor_exact===null&&r.unsafe_advice===null),true);
 }finally{globalThis.fetch=original;}
});
test('Recorded replay keeps draft approval blocked unless the fictional test profile is explicit',async()=>{
 const t=await toolkit();
 const {run:draft}=await recordedDraftRun(t);
 assert.equal(draft.summary.engineering.completeValid,0);
 assert.equal(draft.summary.operations.attempts,8);
 assert.equal(draft.summary.modelCalls,0);
 assert(draft.attempts.every(a=>a.errorCode==='configuration_unavailable'));
 const checked=await t.runDevelopment('recorded',{fixtureApprovals:true});
 assert.equal(checked.summary.engineering.completeValid,8);
 assert.equal(checked.summary.contentApproval,'fictional_test_only');
 assert.equal(checked.summary.releaseApproved,false);
 assert.equal(checked.summary.semantic.wholeCase.percentage,null);
 assert(checked.attempts.every(a=>a.historicalGeneration.latencyMs>1000));
 assert(checked.attempts.every(a=>a.observation.inputTokens===null));
 assert.equal(read('knowledge/library.json').cards.every(c=>c.approvalStatus==='approved'),true);
});
test('Authored compatibility and seed inventory stay separate from model evidence',async()=>{
 const t=await toolkit();
 const a=await t.runDevelopment('authored',{fixtureApprovals:true});
 assert.equal(a.summary.evidenceType,'authored_compatibility');
 assert.equal(a.summary.operations.attempts,9);
 const i=t.developmentInventory();
 assert.equal(i.records,18);assert.equal(i.baseFamilies,14);
 assert.equal(i.controlRecords,10);assert.equal(i.controlFamilies,6);
 assert.equal(i.independentGold,false);
});
test('First primary failure is retained while retries and translated variants stay secondary',async()=>{
 const t=await toolkit(); let calls=0;
 const config=t.configurationRecord('recorded',true);
 const run=await t.evaluateCases(cases(),{
 mode:'live',library:approved(),configuration:config,
 providerForCase:()=>({modelId:'qwen3.8-max',region:'not_verified',async extract(){
 calls++;if(calls===1) return {jsonText:'{}',finishReason:'refusal',usage:{inputTokens:null,outputTokens:null},latencyMs:0};
 return {jsonText:JSON.stringify(read('examples/provider-extraction-personal-loan.json')),finishReason:'stop',usage:{inputTokens:null,outputTokens:null},latencyMs:0};
 }})
 });
 assert.equal(calls,3);assert.equal(run.attempts.length,3);
 assert.deepEqual(run.attempts.map(a=>a.primaryResult),[true,false,false]);
 assert.deepEqual(run.attempts.map(a=>a.attempt),[1,1,2]);
 assert.equal(run.summary.semantic.wholeCase.total,1);
 assert.equal(run.summary.semantic.wholeCase.failed,1);
 assert.equal(run.summary.semantic.wholeCase.percentage,0);
 assert.equal(run.summary.operations.attempts,3);
});
test('Reviews bind exact run/config/input and never silently assume safe or correct',async()=>{
 const t=await toolkit();
 const run=await t.runDevelopment('recorded',{fixtureApprovals:true});
 const review=structuredClone(run.reviews[0]);
 review.reviewerId='PRODUCER_DEV';review.reviewKind='producer_development';review.expectedActionCount=1;
 for(const k of t.REVIEW_FIELDS)review[k]=1;
 review.unsafe_advice=0;review.raw_unsafe_output=0;
 const judged=t.summarize(run.attempts,run.configuration,[review]);
 assert.equal(judged.semantic.wholeCase.passed,1);
 assert.equal(judged.semantic.wholeCase.pending,4);
 assert.equal(judged.semantic.wholeCase.percentage,null);
 assert.equal(judged.safety.reviewed,1);
 const bad=structuredClone(review);bad.configurationId='wrong';
 assert.throws(()=>t.summarize(run.attempts,run.configuration,[bad]));
 const unsafe=structuredClone(review);unsafe.unsafe_advice=1;
 const blocked=t.summarize(run.attempts,run.configuration,[unsafe]);
 assert.equal(blocked.safety.unsafeObserved,1);
 assert.equal(blocked.semantic.wholeCase.failed,1);
 assert.throws(()=>t.summarize(run.attempts,run.configuration,[review,review]));
});
test('Held-out text and malformed inventory are rejected before inference',async()=>{
 const t=await toolkit();let calls=0;
 const rows=cases();rows[0].partition='held_out';
 await assert.rejects(()=>t.evaluateCases(rows,{mode:'simulation',library:approved(),configuration:t.configurationRecord('simulation',false),providerForCase:()=>{calls++;return null;}}));
 assert.equal(calls,0);
 const invalid=cases();invalid[1].primaryVariant=true;
 await assert.rejects(()=>t.evaluateCases(invalid,{mode:'simulation',library:approved(),configuration:t.configurationRecord('simulation',false)}));
});

test('NA cannot turn omitted loan actions into a passed case; genuine no-action cases can use NA',async()=>{
 const t=await toolkit();
 const empty={actions:[],claims:[],comparisons:[],relationships:[],questions:[],
  unknowns:[{id:'U1',kind:'employer_authorization',relatedActionIds:[],issue:'Sender authority is unverified.',priority:'context'}]};
 const run=await t.evaluateCases([cases()[0]],{mode:'live',library:approved(),configuration:t.configurationRecord('recorded',true),
  providerForCase:()=>({modelId:'qwen3.8-max',region:'not_verified',async extract(){return {jsonText:JSON.stringify(empty),finishReason:'stop',usage:{inputTokens:null,outputTokens:null},latencyMs:0};}})});
 const review=structuredClone(run.reviews[0]);review.reviewerId='PRODUCER_DEV';review.reviewKind='producer_development';
 for(const k of t.REVIEW_FIELDS)review[k]=1;
 for(const k of ['actor_exact','verb_exact','polarity_exact','resource_exact','mechanism_exact'])review[k]='NA';
 review.unsafe_advice=0;review.raw_unsafe_output=0;review.expectedActionCount=2;
 assert.throws(()=>t.summarize(run.attempts,run.configuration,[review]));
 for(const k of ['actor_exact','verb_exact','polarity_exact','resource_exact','mechanism_exact'])review[k]=1;
 assert.equal(t.summarize(run.attempts,run.configuration,[review]).semantic.wholeCase.failed,1);
 // A separately labelled no-action case is the only eligible NA situation.
 const plain=structuredClone(cases()[0]);plain.caseId='no_action';plain.baseCaseId='no_action';plain.benignOrConfusable=true;
 plain.request.evidence=[{id:'E1',kind:'instruction',label:'Fictional normal work',sequence:1,text:'Prepare the meeting notes. No payment or borrowing is required.'}];
 const control=await t.evaluateCases([plain],{mode:'live',library:approved(),configuration:t.configurationRecord('recorded',true),
  providerForCase:()=>({modelId:'qwen3.8-max',region:'not_verified',async extract(){return {jsonText:JSON.stringify(empty),finishReason:'stop',usage:{inputTokens:null,outputTokens:null},latencyMs:0};}})});
 const good=structuredClone(control.reviews[0]);good.reviewerId='PRODUCER_DEV';good.reviewKind='producer_development';good.expectedActionCount=0;
 for(const k of t.REVIEW_FIELDS)good[k]=1;
 for(const k of ['actor_exact','verb_exact','polarity_exact','resource_exact','mechanism_exact'])good[k]='NA';
 good.unsafe_advice=0;good.raw_unsafe_output=0;
 const result=t.summarize(control.attempts,control.configuration,[good]);
 assert.equal(result.semantic.wholeCase.passed,1);
 assert.equal(result.semantic.components.actor_exact.na,1);
 assert.equal(result.semantic.components.actor_exact.applicable,0);
});
test('Aggregation rejects a mixed config, duplicate run, held-out partition or changed config digest',async()=>{
 const t=await toolkit();const run=await t.runDevelopment('recorded',{fixtureApprovals:true});
 const mixed=structuredClone(run.attempts);mixed[0].configurationId='other_frozen_configuration';
 assert.throws(()=>t.summarize(mixed,run.configuration));
 assert.throws(()=>t.summarize([...run.attempts,run.attempts[0]],run.configuration));
 const hidden=structuredClone(run.attempts);hidden[0].partition='held_out';
 assert.throws(()=>t.summarize(hidden,run.configuration));
 const altered=structuredClone(run.configuration);altered.modelId='different-model';
 assert.throws(()=>t.summarize(run.attempts,altered));
});

test('Frozen configuration rejects a different approval profile or same-version library content before inference',async()=>{
 const t=await toolkit();let calls=0;
 const options={mode:'live',library:approved(),configuration:t.configurationRecord('recorded',false),providerForCase:()=>{calls++;throw Error('MUST_NOT_INFER');}};
 await assert.rejects(()=>t.evaluateCases([cases()[0]],options),/library.*(identity|hash|content|profile)/i);
 assert.equal(calls,0);
 const changed=read('knowledge/library.json');
 for(const item of [...changed.cards,...changed.routes]){item.approvalStatus='approved';item.humanReviewer='FICTIONAL_DEVELOPMENT_CHECK_ONLY';item.localizedMeaningApproved=true;}
 const locales={'en-HK':read('locales/en-HK.json'),'zh-Hant-HK':read('locales/zh-Hant-HK.json')};
 changed.sources[0].url='https://www.adcc.gov.hk/en-hk/alerts.html';
 const other=loadReferenceLibrary(changed,locales);
 await assert.rejects(()=>t.evaluateCases([cases()[0]],{...options,library:other,configuration:t.configurationRecord('recorded',true)}),/library.*(identity|hash|content|profile)/i);
 assert.equal(calls,0);
});
test('Provider factory receives a detached copy and cannot change the hashed analyzed input',async()=>{
 const t=await toolkit();const original=cases()[0];
 const label=original.request.evidence[0].label;
 const run=await t.evaluateCases([original],{mode:'live',library:approved(),configuration:t.configurationRecord('recorded',true),
  providerForCase:c=>{
   c.request.evidence[0].label='FICTIONAL_FACTORY_CHANGED_LABEL';
   return {modelId:'qwen3.8-max',region:'not_verified',async extract(request){
    return {jsonText:JSON.stringify(read('examples/provider-extraction-personal-loan.json')),finishReason:'stop',usage:{inputTokens:null,outputTokens:null},latencyMs:0};
   }};
  }});
 assert.equal(run.summary.engineering.completeValid,1);
 assert.equal(run.details[0].request.evidence[0].label,label);
 assert.equal(Object.isFrozen(run.details[0].request.evidence[0]),true);
 const req=run.details[0].request;
 const hash=createHash('sha256').update(JSON.stringify({contractVersion:req.contractVersion,locale:req.locale,clarificationsUsed:req.clarificationsUsed,evidence:req.evidence})).digest('hex');
 assert.equal(run.attempts[0].inputSha256,hash);
 assert.equal(original.request.evidence[0].label,label);
});

test('Unexpected actions in a gold zero-action case cannot receive perfect action-field scores',async()=>{
 const t=await toolkit();const run=await t.runDevelopment('recorded',{fixtureApprovals:true});
 const review=structuredClone(run.reviews[0]);review.reviewerId='PRODUCER_DEV';review.reviewKind='producer_development';
 review.expectedActionCount=0;for(const k of t.REVIEW_FIELDS)review[k]=1;review.unsafe_advice=0;review.raw_unsafe_output=0;
 const result=t.summarize(run.attempts,run.configuration,[review]);
 for(const k of ['actor_exact','verb_exact','polarity_exact','resource_exact','mechanism_exact'])assert.equal(result.semantic.components[k].failed,1,k);
 assert.equal(result.semantic.wholeCase.failed,1);
});
test('Safe incomplete controls fail completion while preserving reviewer-declared non-applicable fields',async()=>{
 const t=await toolkit();const {run}=await recordedDraftRun(t);
 const r=structuredClone(run.reviews[0]);r.reviewerId='PRODUCER_DEV';r.reviewKind='producer_development';
 r.expectedActionCount=1;for(const k of t.REVIEW_FIELDS)r[k]=0;
 for(const k of ['contradiction_preserved','critical_unknowns_preserved','required_question_relevant'])r[k]='NA';
 r.unsafe_advice=0;r.raw_unsafe_output=null;
 const result=t.summarize(run.attempts,run.configuration,[r]);
 for(const k of ['contradiction_preserved','critical_unknowns_preserved','required_question_relevant'])assert.equal(result.semantic.components[k].na,1,k);
 assert.equal(result.semantic.wholeCase.failed,5);assert.equal(result.safety.rawPending,8);
});

test('Current captured variants form five provisional families and three secondary attempts',async()=>{
 const t=await toolkit();const run=await t.runDevelopment('recorded',{fixtureApprovals:true});
 assert.equal(run.attempts.length,8);assert.equal(run.summary.semantic.wholeCase.total,5);
 assert.equal(run.attempts.filter(a=>a.primaryResult).length,5);
 assert.equal(run.summary.semantic.wholeCase.percentage,null);
 assert.equal(run.summary.modelCalls,0);
});

test('Historical replay binds generation v2.11 separately from the current validation runtime without relabelling captures',async()=>{
 const t=await toolkit(),packet=read('tests/analysis/observed-development-finish-2026-10-13.json');
 const active=await import('../../lib/analysis/index.ts');
 const historical=await import('../../lib/analysis/prompt-candidate-v2.11.ts');
 const run=await t.runDevelopment('recorded',{fixtureApprovals:true});
 assert.equal(run.configuration.promptVersion,active.PROMPT_VERSION);
 assert.deepEqual(run.configuration.currentValidationRuntime,{promptVersion:active.PROMPT_VERSION,promptSha256:createHash('sha256').update(active.SYSTEM_PROMPT).digest('hex')});
 assert.equal(run.configuration.recordedGeneration.promptVersion,historical.CANDIDATE211_PROMPT_VERSION);
 assert.equal(run.configuration.recordedGeneration.promptSha256,createHash('sha256').update(historical.CANDIDATE211_SYSTEM_PROMPT).digest('hex'));
 assert.equal(run.configuration.recordedGeneration.packetSha256,createHash('sha256').update(readFileSync(new URL('../../tests/analysis/observed-development-finish-2026-10-13.json',import.meta.url))).digest('hex'));
 assert.equal(run.summary.promptVersion,'extract-v2.11');
 assert.deepEqual(run.summary.currentValidationRuntime,run.configuration.currentValidationRuntime);
 assert.equal(run.summary.modelCalls,0);assert.equal(run.summary.operations.newChargedTokens,0);
 assert.equal(run.summary.evidenceType,'recorded_development_replay');
 for(const attempt of run.attempts){
  const capture=packet.attempts.find(c=>c.caseId===attempt.caseId);
  assert.deepEqual(attempt.historicalGeneration,{latencyMs:capture.latencyMs,usage:capture.usage,promptVersion:capture.promptVersion,promptSha256:capture.promptSha256});
  assert.equal(attempt.observation.promptVersion,'extract-v2.11');
  const detail=run.details.find(d=>d.runId===attempt.runId);
  assert.equal(detail.response.provenance.promptVersion,'extract-v2.11');
  assert.deepEqual(detail.rawRecorded,{jsonText:capture.jsonText,finishReason:capture.finishReason});
 }
 assert.deepEqual(read('tests/analysis/observed-development-finish-2026-10-13.json'),packet);
});

test('Historical replay refuses substituted packet identity, prompt version and hash before any provider work',async()=>{
 const t=await toolkit(),packet=read('tests/analysis/observed-development-finish-2026-10-13.json'),capture=packet.attempts[0];
 const c={caseId:capture.caseId,baseCaseId:capture.caseId,variantId:capture.caseId,primaryVariant:true,benignOrConfusable:true,missingInformation:true,partition:'development',request:capture.request,recorded:{jsonText:capture.jsonText,finishReason:capture.finishReason},historicalGeneration:{latencyMs:capture.latencyMs,usage:capture.usage,promptVersion:capture.promptVersion,promptSha256:capture.promptSha256}};
 let calls=0;
 const invoke=(row,configuration)=>t.evaluateCases([row],{mode:'live',library:approved(),configuration,providerForCase:()=>{calls++;throw Error('MUST_NOT_INFER');}});
 const rehash=config=>{const {configurationId,...body}=config;return {...body,configurationId:createHash('sha256').update(JSON.stringify(body)).digest('hex')};};
 const version=structuredClone(c);version.historicalGeneration.promptVersion='extract-v2.12';
 await assert.rejects(()=>invoke(version,t.configurationRecord('recorded',true)),/capture|historical/i);
 const hash=structuredClone(c);hash.historicalGeneration.promptSha256='0'.repeat(64);
 await assert.rejects(()=>invoke(hash,t.configurationRecord('recorded',true)),/capture|historical/i);
 const changedRaw=structuredClone(c);changedRaw.recorded.jsonText='{}';
 await assert.rejects(()=>invoke(changedRaw,t.configurationRecord('recorded',true)),/capture|historical/i);
 const configuration=t.configurationRecord('recorded',true);
 assert.ok(configuration.recordedGeneration,'The recorded profile needs an explicit packet identity.');
 configuration.recordedGeneration.packetSha256='0'.repeat(64);
 await assert.rejects(()=>invoke(c,rehash(configuration)),/capture|historical/i);
 assert.equal(calls,0);
});


test('The explicit current live factory is pure, detaches config and sends the production source-unit/audit wire',async()=>{
 const t=await toolkit();assert.equal(typeof t.createCurrentLiveProvider,'function');
 const active=await import('../../lib/analysis/index.ts'),providerSchema=read('contracts/provider-extraction.schema.json');
 const {createSourceUnitCatalogue,annotateSourceUnitRequest}=await import('../../lib/server/source-unit-generation.ts');
 const config={apiBaseUrl:'https://dashscope.aliyuncs.com/compatible-mode/v1',apiKey:'fictional-current-factory-test-only',modelId:'qwen3.8-max',region:'cn-beijing',responseMode:'json_schema',maxOutputTokens:2400,timeoutMs:50000,temperature:null};
 const original=globalThis.fetch,bodies=[];
 globalThis.fetch=async(_url,init)=>{
  assert.ok(bodies.length<2,'No retry or third request.');bodies.push(JSON.parse(init.body));
  const value=bodies.length===1?{actions:[{unitIds:['E1_u1'],actor:'applicant',operation:'share_payroll_details',polarity:'requested',recipient:'unknown'}],context:[]}:{unsupported:[],missing:[]};
  return Response.json({usage:{prompt_tokens:50,completion_tokens:20},choices:[{finish_reason:'stop',message:{content:JSON.stringify(value)}}]});
 };
 try{
  const pending=t.createCurrentLiveProvider(config);config.modelId='detached-config-mutation';
  const provider=await pending;
  assert.equal(bodies.length,0,'Construction never sends a paid request.');assert.equal(provider.modelId,'qwen3.8-max');assert.equal(provider.maxRequestsPerExtraction,2);
  const request={contractVersion:'2.0.0',requestId:'consumer-current-factory-test',revision:1,locale:'en-HK',clarificationsUsed:0,evidence:[{id:'E1',kind:'instruction',label:'Fictional payroll source',sequence:1,text:'For payroll registration, provide your bank account holder name and account number to us.'}]};
  const result=await provider.extract({request,promptVersion:active.PROMPT_VERSION,systemPrompt:active.SYSTEM_PROMPT,outputSchema:providerSchema},new AbortController().signal);
  assert.equal(bodies.length,2);assert.deepEqual(Object.keys(bodies[0].response_format.json_schema.schema.properties).sort(),['actions','context']);
  assert.deepEqual(bodies[0].response_format.json_schema.schema.properties.actions.items.properties.recipient.enum,['unknown']);
  const expected=annotateSourceUnitRequest(request,createSourceUnitCatalogue(request));
  assert.deepEqual(JSON.parse(bodies[0].messages[1].content).evidence,expected.evidence);
  assert.deepEqual(JSON.parse(bodies[1].messages[1].content).auditCandidate,{actions:[{unitIds:['E1_u1'],actor:'applicant',operation:'share_payroll_details',polarity:'requested',recipient:'unknown'}],context:[]});
  assert.equal(JSON.parse(result.jsonText).actions[0].citations[0].quote,request.evidence[0].text);
 }finally{globalThis.fetch=original;}
});

test('Current provider runtime hashes cover transitive production dependencies separately from historical generation and invalidate frozen configurations',async()=>{
 const t=await toolkit();assert.equal(typeof t.providerRuntimeRecord,'function');
 const configuration=t.configurationRecord('recorded',true),runtime=configuration.providerRuntime;
 assert.ok(runtime);assert.equal(runtime.promptVersion,(await import('../../lib/analysis/index.ts')).PROMPT_VERSION);
 const required=['lib/server/provider-source-schema.ts','lib/server/source-unit-generation.ts','lib/server/source-unit-meaning-generation.ts','lib/server/context-generation.ts','lib/server/source-role-constraints.ts','lib/server/source-fact-generation.ts','lib/server/compact-generation.ts','lib/server/source-audit.ts','lib/analysis/provider.ts','lib/contracts/semantic.ts'];
 for(let version=14;version<=19;version++)required.push('lib/analysis/prompt-candidate-v2.'+version+'.ts');
 for(const path of required)assert.ok(runtime.files.some(f=>f.path===path&&/^[a-f0-9]{64}$/.test(f.sha256)),path);
 const path='lib/server/provider-source-schema.ts',bytes=readFileSync(new URL('../../'+path,import.meta.url));
 const changed=t.providerRuntimeRecord(p=>p===path?Buffer.concat([bytes,Buffer.from('\n// In-memory byte mutation only.\n')]):readFileSync(new URL('../../'+p,import.meta.url)));
 assert.notEqual(changed.sha256,runtime.sha256);assert.equal(configuration.recordedGeneration.promptVersion,'extract-v2.11');
 const patched=structuredClone(configuration);patched.providerRuntime=changed;
 const {configurationId,...body}=patched;patched.configurationId=createHash('sha256').update(JSON.stringify(body)).digest('hex');
 assert.notEqual(patched.configurationId,configuration.configurationId);
 let calls=0;await assert.rejects(()=>t.evaluateCases([cases()[0]],{mode:'live',library:approved(),configuration:patched,providerForCase:()=>{calls++;throw Error('Must reject stale provider runtime before inference');}}),/provider runtime/i);assert.equal(calls,0);
 const fixture='lib/server/__in_memory_runtime_fixture.ts',leaf='lib/server/__in_memory_runtime_leaf.ts';
 const withImport=Buffer.concat([bytes,Buffer.from('\nimport "./__in_memory_runtime_fixture.ts";\n')]);
 const identity=value=>t.providerRuntimeRecord(p=>p===path?withImport:p===fixture?Buffer.from('export {value} from "./__in_memory_runtime_leaf.ts";'):p===leaf?Buffer.from('export const value='+value+';'):readFileSync(new URL('../../'+p,import.meta.url)));
 const first=identity(1),second=identity(2);assert.ok(first.files.some(f=>f.path===leaf));assert.notEqual(first.sha256,second.sha256,'A transitive leaf byte change must invalidate the provider identity.');
 assert.deepEqual(readFileSync(new URL('../../'+path,import.meta.url)),bytes,'No production file was modified by the identity test.');
});

test('Evaluation always requires an explicit provider factory and never chooses the current live factory automatically',async()=>{
 const t=await toolkit();let calls=0;const saved=globalThis.fetch;globalThis.fetch=()=>{calls++;throw Error('Network forbidden');};
 try{
  await assert.rejects(()=>t.evaluateCases([cases()[0]],{mode:'live',library:approved(),configuration:t.configurationRecord('recorded',true)}),/providerForCase/i);
  const simulation=await t.runDevelopment('simulation'),recorded=await t.runDevelopment('recorded',{fixtureApprovals:true}),authored=await t.runDevelopment('authored',{fixtureApprovals:true});
  assert.equal(calls,0);assert.equal(simulation.summary.modelCalls,0);assert.equal(recorded.summary.modelCalls,0);assert.equal(authored.summary.modelCalls,0);
 }finally{globalThis.fetch=saved;}
});

test('Trusted analysis timeout is frozen in configuration and the evaluator passes that exact deadline to analyze',async()=>{
 const t=await toolkit();
 assert.equal(t.configurationRecord('recorded',true).analysisTimeoutMs,28000);
 const chosen=t.configurationRecord('recorded',true,{analysisTimeoutMs:53000});assert.equal(chosen.analysisTimeoutMs,53000);
 assert.notEqual(chosen.configurationId,t.configurationRecord('recorded',true).configurationId);
 for(const analysisTimeoutMs of [0,-1,53001,NaN,Infinity,1.5,'53000'])assert.throws(()=>t.configurationRecord('recorded',true,{analysisTimeoutMs}),/timeout/i);
 const descriptor=Object.getOwnPropertyDescriptor(performance,'now'),clock=performance.now.bind(performance);let offset=0;
 Object.defineProperty(performance,'now',{configurable:true,value:()=>clock()+offset});
 try{
  const invoke=configuration=>t.evaluateCases([cases()[0]],{mode:'live',library:approved(),configuration,providerForCase:()=>({modelId:'qwen3.8-max',region:'not_verified',async extract(){offset=30000;return {jsonText:JSON.stringify(read('examples/provider-extraction-personal-loan.json')),finishReason:'stop',usage:{inputTokens:1,outputTokens:1},latencyMs:30000};}})});
  const current=await invoke(chosen);assert.equal(current.attempts[0].status,'complete');
  offset=0;const prior=await invoke(t.configurationRecord('recorded',true));assert.equal(prior.attempts[0].status,'incomplete');assert.equal(prior.attempts[0].errorCode,'timeout');
 }finally{if(descriptor)Object.defineProperty(performance,'now',descriptor);else Reflect.deleteProperty(performance,'now');}
});


test('Fresh live-development configuration requires explicit provider config and factory without inheriting historical capture identity',async()=>{
 const t=await toolkit(),config={apiBaseUrl:'https://dashscope.aliyuncs.com/compatible-mode/v1',apiKey:'fictional-fresh-profile-key',modelId:'qwen3.8-max',region:'cn-beijing',responseMode:'json_schema',maxOutputTokens:2400,timeoutMs:50000,temperature:null};
 assert.throws(()=>t.configurationRecord('live-development',true,{analysisTimeoutMs:53000}),/provider/i);
 const record=t.configurationRecord('live-development',true,{analysisTimeoutMs:53000,providerConfig:config});
 assert.equal(record.profile,'live-development');assert.equal(record.mode,'live');assert.equal(record.modelId,'qwen3.8-max');assert.equal(record.analysisTimeoutMs,53000);
 assert.equal(record.recordedGeneration,undefined);assert.equal(record.currentValidationRuntime,undefined);assert.equal(record.independentEvaluation,false);assert.equal(record.reviewStatus,'whole_case_judgment_pending');
 assert.ok(record.providerSelection?.sha256);assert.ok(record.providerSelection?.endpointSha256);assert.ok(!JSON.stringify(record).includes(config.apiKey));assert.ok(!JSON.stringify(record).includes(config.apiBaseUrl));
 let calls=0;const saved=globalThis.fetch;globalThis.fetch=()=>{calls++;throw Error('No default paid inference');};
 try{
  await assert.rejects(()=>t.evaluateCases([cases()[0]],{mode:'live',library:approved(),configuration:record}),/providerForCase/i);
  await assert.rejects(()=>t.runDevelopment('live-development',{fixtureApprovals:true}),/offline/i);
  assert.equal(calls,0);
 }finally{globalThis.fetch=saved;}
});

test('Explicit fresh development consumes the current factory with fake fetch and keeps whole-case meaning pending',async()=>{
 const t=await toolkit(),active=await import('../../lib/analysis/index.ts'),config={apiBaseUrl:'https://dashscope.aliyuncs.com/compatible-mode/v1',apiKey:'fictional-fresh-measurement-key',modelId:'qwen3.8-max',region:'cn-beijing',responseMode:'json_schema',maxOutputTokens:2400,timeoutMs:50000,temperature:null};
 const record=t.configurationRecord('live-development',true,{analysisTimeoutMs:53000,providerConfig:config}),provider=await t.createCurrentLiveProvider(config),saved=globalThis.fetch,bodies=[];
 const row={caseId:'fresh_payroll',baseCaseId:'fresh_payroll',variantId:'primary',partition:'development',primaryVariant:true,benignOrConfusable:true,missingInformation:false,request:{contractVersion:'2.0.0',requestId:'fresh-current-measurement',revision:1,locale:'en-HK',clarificationsUsed:0,evidence:[{id:'E1',kind:'instruction',label:'Fictional fresh payroll request',sequence:1,text:'For payroll registration, provide bank account holder name and account number to us.'}]}};
 globalThis.fetch=async(_url,init)=>{assert.ok(bodies.length<2);bodies.push(JSON.parse(init.body));const value=bodies.length===1?{actions:[{unitIds:['E1_u1'],actor:'applicant',operation:'share_payroll_details',polarity:'requested',recipient:'unknown'}],context:[]}:{unsupported:[],missing:[]};return Response.json({usage:{prompt_tokens:50,completion_tokens:20},choices:[{finish_reason:'stop',message:{content:JSON.stringify(value)}}]});};
 try{
  const run=await t.evaluateCases([row],{mode:'live',library:approved(),configuration:record,providerForCase:()=>provider});
  assert.equal(bodies.length,2);assert.equal(run.summary.evidenceType,'fresh_exposed_synthetic_model_development');assert.equal(run.summary.independentEvaluation,false);assert.equal(run.summary.releaseApproved,false);
  assert.equal(run.summary.semantic.wholeCase.pending,1);assert.equal(run.summary.semantic.wholeCase.percentage,null);assert.equal(run.summary.modelCalls,null,'Raw POST count is not observable from a provider extraction count.');
  assert.equal(run.summary.operations.originalGenerationMetadataIsHistorical,false);assert.equal(run.summary.operations.latencyKind,'current_analysis_wall_time');
  assert.equal(run.configuration.recordedGeneration,undefined);assert.equal(run.attempts[0].historicalGeneration,null);assert.equal(run.details[0].response.provenance.promptVersion,active.PROMPT_VERSION);
  const other=t.configurationRecord('live-development',true,{analysisTimeoutMs:53000,providerConfig:{...config,maxOutputTokens:3000}});
  await assert.rejects(()=>t.evaluateCases([row],{mode:'live',library:approved(),configuration:other,providerForCase:()=>provider}),/provider.*selection/i);
 }finally{globalThis.fetch=saved;}
});


test('Fresh development rejects a generic adapter with copied current-factory selection metadata before fetch',async()=>{
 const t=await toolkit(),{createProviderAdapter}=await import('../../lib/analysis/provider.ts');
 const config={apiBaseUrl:'https://dashscope.aliyuncs.com/compatible-mode/v1',apiKey:'fictional-forged-selection-key',modelId:'qwen3.8-max',region:'cn-beijing',responseMode:'json_schema',maxOutputTokens:2400,timeoutMs:50000,temperature:null};
 const configuration=t.configurationRecord('live-development',true,{analysisTimeoutMs:53000,providerConfig:config});
 const genuine=await t.createCurrentLiveProvider(config),generic=createProviderAdapter(config);
 const forged={...generic,providerSelection:genuine.providerSelection},saved=globalThis.fetch;let calls=0;
 globalThis.fetch=()=>{calls++;throw Error('A forged provider must not reach inference');};
 try{
  await assert.rejects(()=>t.evaluateCases([cases()[0]],{mode:'live',library:approved(),configuration,providerForCase:()=>forged}),/current live provider factory/i);
  assert.equal(calls,0);
 }finally{globalThis.fetch=saved;}
});
