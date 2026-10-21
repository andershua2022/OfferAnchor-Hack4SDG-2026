import '../analysis/server-guard.ts';
import type {AnalyzeRequest,ProviderExtraction} from '../contracts/index.ts';
import {ContractBoundaryError} from '../contracts/errors.ts';
import type template from '../../contracts/provider-extraction.schema.json';
import {COMPACT_GENERATION_PROMPT_VERSION,createCompactGenerationSchema,expandCompactGenerationResult} from './compact-generation.ts';
import {CANDIDATE214_PROMPT_VERSION} from '../analysis/prompt-candidate-v2.14.ts';
import {CANDIDATE215_PROMPT_VERSION} from '../analysis/prompt-candidate-v2.15.ts';
import {CANDIDATE216_PROMPT_VERSION} from '../analysis/prompt-candidate-v2.16.ts';
import {CANDIDATE217_PROMPT_VERSION} from '../analysis/prompt-candidate-v2.17.ts';
import {CANDIDATE218_PROMPT_VERSION} from '../analysis/prompt-candidate-v2.18.ts';
import {CANDIDATE219_PROMPT_VERSION} from '../analysis/prompt-candidate-v2.19.ts';
import {CANDIDATE220_PROMPT_VERSION,CANDIDATE220_AUDIT_VERSION,CANDIDATE220_AUDIT_GUIDANCE} from '../analysis/prompt-candidate-v2.20.ts';
import {CANDIDATE221_PROMPT_VERSION,CANDIDATE221_AUDIT_VERSION,CANDIDATE221_AUDIT_GUIDANCE} from '../analysis/prompt-candidate-v2.21.ts';
import {CANDIDATE222_PROMPT_VERSION,CANDIDATE222_AUDIT_VERSION,CANDIDATE222_AUDIT_SYSTEM_PROMPT} from '../analysis/prompt-candidate-v2.22.ts';
import {CANDIDATE223_PROMPT_VERSION} from '../analysis/prompt-candidate-v2.23.ts';
import {CANDIDATE224_PROMPT_VERSION,CANDIDATE224_AUDIT_VERSION,CANDIDATE224_AUDIT_SYSTEM_PROMPT} from '../analysis/prompt-candidate-v2.24.ts';
import {CANDIDATE225_PROMPT_VERSION,CANDIDATE225_AUDIT_VERSION,CANDIDATE225_AUDIT_SYSTEM_PROMPT} from '../analysis/prompt-candidate-v2.25.ts';
import {CANDIDATE228_PROMPT_VERSION,CANDIDATE228_AUDIT_VERSION,CANDIDATE228_AUDIT_SYSTEM_PROMPT} from '../analysis/prompt-candidate-v2.28.ts';
import {CANDIDATE229_PROMPT_VERSION} from '../analysis/prompt-candidate-v2.29.ts';
import {createSamePaymentHints,assertNoDuplicateSamePayment} from './same-payment-events.ts';
import {assertRepaymentCoverage,assertPromiseFundingConsistency} from './repayment-coverage.ts';
import {createRoleConstrainedContextSchema,resolveRoleConstrainedContext,sourceRecipientRoleCapabilities} from './source-role-constraints.ts';
import {CONTEXT_CATALOGUE_LIMIT,createContextGenerationSchema,resolveContextGeneration,createContextAuditSchema,CONTEXT_AUDIT_SYSTEM_PROMPT,CONTEXT_AUDIT_VERSION,validateContextAudit} from './context-generation.ts';
import {createSourceUnitMeaningSchema,resolveSourceUnitMeanings,createSourceUnitMeaningAuditSchema,SOURCE_UNIT_MEANING_AUDIT_SYSTEM_PROMPT,SOURCE_UNIT_MEANING_AUDIT_VERSION,validateSourceUnitMeaningAudit} from './source-unit-meaning-generation.ts';
import {createSourceUnitCatalogue,annotateSourceUnitRequest,createSourceUnitSchema,resolveSourceUnits,createSourceUnitAuditSchema,SOURCE_UNIT_AUDIT_SYSTEM_PROMPT,SOURCE_UNIT_AUDIT_VERSION,validateSourceUnitAudit} from './source-unit-generation.ts';

import {createSourceFactSchema,resolveSourceFacts,SOURCE_FACT_AUDIT_VERSION,SOURCE_FACT_AUDIT_SCHEMA,SOURCE_FACT_AUDIT_SYSTEM_PROMPT,validateSourceFactAudit,type SourceFacts} from './source-fact-generation.ts';
import {AnalysisFailure,type SafeUsage} from '../analysis/failure.ts';
import {resolveProviderExtraction} from '../analysis/validate.ts';
import {SOURCE_AUDIT_VERSION,SOURCE_AUDIT_SCHEMA,SOURCE_AUDIT_SYSTEM_PROMPT,validateSourceAudit} from './source-audit.ts';
export const SOURCE_SCHEMA_VERSION='source-constraints-1.0.0';
type SourceSchema={properties:Pick<typeof template.properties,'claims'|'comparisons'|'relationships'>};
// Only remove structures that the existing semantic validator already forbids.
function sourceConstraints<T extends SourceSchema>(schema:T,request:AnalyzeRequest):T{
 const out=structuredClone(schema),advertised=request.evidence.filter(e=>e.kind==='advertisement'||e.kind==='offer');
 if(!advertised.length)out.properties.claims.items.properties.kind.enum=out.properties.claims.items.properties.kind.enum.filter(kind=>kind!=='advertised_duty');
 if(!advertised.some(earlier=>request.evidence.some(later=>later.sequence>earlier.sequence)))out.properties.comparisons.maxItems=0;
 if(new Set(request.evidence.map(e=>e.sequence)).size<2)out.properties.relationships.maxItems=0;
 return out;
}
function providerCompatibleSchema<T>(schema:T):T{
 const out=structuredClone(schema);
 // Alibaba strict mode rejects uniqueItems; local/canonical validation retains it.
 function supported(node:unknown):void{if(!node||typeof node!=='object')return;if(Array.isArray(node)){node.forEach(supported);return;}const record=node as Record<string,unknown>;delete record.uniqueItems;Object.values(record).forEach(supported);}
 supported(out);
 return out;
}
export function constrainSourceSchema(schema:typeof template,request:AnalyzeRequest):typeof template{
 return providerCompatibleSchema(sourceConstraints(schema,request));
}
function combinedUsage(first:SafeUsage,audit:SafeUsage|null):SafeUsage{
 if(audit===null)return first;
 const add=(a:number|null,b:number|null)=>{if(a===null||b===null)return null;const total=a+b;return Number.isSafeInteger(total)?total:null;};
 return {inputTokens:add(first.inputTokens,audit.inputTokens),outputTokens:add(first.outputTokens,audit.outputTokens)};
}
import {createProviderAdapter,type ProviderConfig,type ProviderAdapter} from '../analysis/provider.ts';
export function createSourceBoundProvider(config:ProviderConfig):ProviderAdapter{
 const stableConfig={...config},base=createProviderAdapter(stableConfig);
 return Object.freeze({modelId:base.modelId,region:base.region,maxRequestsPerExtraction:2 as const,async extract(input:Parameters<ProviderAdapter['extract']>[0],signal:AbortSignal){
  if(input.promptVersion===CANDIDATE229_PROMPT_VERSION)return extractContextProfile(stableConfig,input,signal,true,28);
  if(input.promptVersion===CANDIDATE228_PROMPT_VERSION)return extractContextProfile(stableConfig,input,signal,true,28);
  if(input.promptVersion===CANDIDATE225_PROMPT_VERSION)return extractContextProfile(stableConfig,input,signal,true,25);
  if(input.promptVersion===CANDIDATE224_PROMPT_VERSION)return extractContextProfile(stableConfig,input,signal,true,24);
  if(input.promptVersion===CANDIDATE223_PROMPT_VERSION)return extractContextProfile(stableConfig,input,signal,true,23);
  if(input.promptVersion===CANDIDATE222_PROMPT_VERSION)return extractContextProfile(stableConfig,input,signal,true,22);
  if(input.promptVersion===CANDIDATE221_PROMPT_VERSION)return extractContextProfile(stableConfig,input,signal,true,21);
  if(input.promptVersion===CANDIDATE220_PROMPT_VERSION)return extractContextProfile(stableConfig,input,signal,true,20);
  if(input.promptVersion===CANDIDATE219_PROMPT_VERSION)return extractContextProfile(stableConfig,input,signal,true);
  if(input.promptVersion===CANDIDATE218_PROMPT_VERSION)return extractContextProfile(stableConfig,input,signal);
  if(input.promptVersion===CANDIDATE217_PROMPT_VERSION)return extractSourceUnitMeaningProfile(stableConfig,input,signal);
  if(input.promptVersion===CANDIDATE216_PROMPT_VERSION)return extractSourceUnitProfile(stableConfig,input,signal);
  const factProfile=input.promptVersion===CANDIDATE215_PROMPT_VERSION;
  const verified=factProfile||input.promptVersion===CANDIDATE214_PROMPT_VERSION;
  if(!verified&&input.promptVersion!==COMPACT_GENERATION_PROMPT_VERSION)
   return base.extract({...input,outputSchema:constrainSourceSchema(input.outputSchema as typeof template,input.request)},signal);
  if(!verified){
   const strictSchema=sourceConstraints(createCompactGenerationSchema(input.outputSchema as typeof template),input.request);
   const result=await base.extract({...input,outputSchema:providerCompatibleSchema(strictSchema)},signal);
   return expandCompactGenerationResult(result,strictSchema);
  }
  if(signal.aborted)throw new AnalysisFailure('cancelled');
  const started=performance.now(),controller=new AbortController(),cancel=()=>controller.abort();
  const attempt={...input,request:structuredClone(input.request)};
  const strictCompact=factProfile?null:sourceConstraints(createCompactGenerationSchema(input.outputSchema as typeof template),attempt.request);
  const strictSchema=factProfile?createSourceFactSchema(attempt.request):strictCompact!;
  let generationSchema:object;
  if(strictCompact){
   const fields=strictCompact.properties.actions.items.properties;
   strictCompact.properties.actions.items.properties={id:fields.id,citations:fields.citations,actor:fields.actor,operation:fields.operation,polarity:fields.polarity,recipient:fields.recipient,purpose:fields.purpose};
   const {$schema:_dialect,title:_title,...withoutMetadata}=providerCompatibleSchema(strictCompact);generationSchema=withoutMetadata;
  }else generationSchema=providerCompatibleSchema(strictSchema);
  signal.addEventListener('abort',cancel,{once:true});
  if(signal.aborted)cancel();
  const timer=setTimeout(()=>controller.abort(),25000);
  let stage:'generation'|'audit'='generation',firstUsage:SafeUsage={inputTokens:null,outputTokens:null},auditUsage:SafeUsage={inputTokens:null,outputTokens:null};
  try{
   const first=await createProviderAdapter({...stableConfig,timeoutMs:Math.min(stableConfig.timeoutMs,22000)}).extract({...attempt,outputSchema:generationSchema},controller.signal);
   firstUsage=first.usage;
   if(first.finishReason!=='stop')throw new AnalysisFailure('invalid_output',firstUsage);
   let expanded:Awaited<ReturnType<ProviderAdapter['extract']>>,auditCandidate:unknown;
   if(factProfile){
    const resolved=resolveSourceFacts(first.jsonText,attempt.request);
    expanded={...first,jsonText:JSON.stringify(resolved.extraction)};auditCandidate=resolved.facts;
   }else{
    expanded=expandCompactGenerationResult(first,strictSchema);auditCandidate=JSON.parse(expanded.jsonText) as ProviderExtraction;
    // Reject invalid extraction before spending the independent audit call.
    resolveProviderExtraction(auditCandidate,attempt.request);
   }
   if(signal.aborted)throw new AnalysisFailure('cancelled');
   const remaining=Math.floor(25000-(performance.now()-started));
   if(controller.signal.aborted||remaining<1)throw new AnalysisFailure('timeout');
   stage='audit';
   const audit=await createProviderAdapter({...stableConfig,maxOutputTokens:650,timeoutMs:Math.min(stableConfig.timeoutMs,7000,remaining)}).extract({request:attempt.request,systemPrompt:factProfile?SOURCE_FACT_AUDIT_SYSTEM_PROMPT:SOURCE_AUDIT_SYSTEM_PROMPT,outputSchema:providerCompatibleSchema(factProfile?SOURCE_FACT_AUDIT_SCHEMA:SOURCE_AUDIT_SCHEMA),promptVersion:factProfile?SOURCE_FACT_AUDIT_VERSION:SOURCE_AUDIT_VERSION,auditCandidate},controller.signal);
   auditUsage=audit.usage;
   if(audit.finishReason!=='stop')throw new AnalysisFailure('invalid_output',auditUsage);
   if(factProfile)validateSourceFactAudit(audit.jsonText,attempt.request,auditCandidate as SourceFacts);
   else validateSourceAudit(audit.jsonText,attempt.request,auditCandidate as ProviderExtraction);
   if(signal.aborted)throw new AnalysisFailure('cancelled');
   if(controller.signal.aborted||performance.now()-started>=25000)throw new AnalysisFailure('timeout');
   return {...expanded,usage:combinedUsage(firstUsage,auditUsage),phaseUsage:{generation:firstUsage,audit:auditUsage},latencyMs:performance.now()-started};
  }catch(error){
   if(error instanceof AnalysisFailure){
    const known=stage==='generation'?firstUsage:auditUsage;
    const observed={inputTokens:error.usage.inputTokens??known.inputTokens,outputTokens:error.usage.outputTokens??known.outputTokens};
    if(stage==='generation')firstUsage=observed;else auditUsage=observed;
   }
   const code=signal.aborted?'cancelled':controller.signal.aborted||performance.now()-started>=25000?'timeout':error instanceof AnalysisFailure||error instanceof ContractBoundaryError?error.errorCode:'provider_error';
   throw Object.assign(new AnalysisFailure(code,combinedUsage(firstUsage,stage==='audit'?auditUsage:null)),{phaseUsage:{generation:firstUsage,audit:stage==='audit'?auditUsage:null}});
  }finally{clearTimeout(timer);signal.removeEventListener('abort',cancel);controller.abort();}
 }});
}

async function extractSourceUnitProfile(config:ProviderConfig,input:Parameters<ProviderAdapter['extract']>[0],signal:AbortSignal){
 if(signal.aborted)throw new AnalysisFailure('cancelled');
 const started=performance.now(),total=Math.min(config.timeoutMs,50000),controller=new AbortController(),cancel=()=>controller.abort();
 const request=structuredClone(input.request),catalogue=createSourceUnitCatalogue(request),boundRequest=annotateSourceUnitRequest(request,catalogue);
 signal.addEventListener('abort',cancel,{once:true});if(signal.aborted)cancel();
 const timer=setTimeout(()=>controller.abort(),total);
 let stage:'generation'|'audit'='generation',firstUsage:SafeUsage={inputTokens:null,outputTokens:null},auditUsage:SafeUsage={inputTokens:null,outputTokens:null};
 try{
  const first=await createProviderAdapter({...config,maxOutputTokens:2400,thinkingBudget:1024,timeoutMs:Math.min(38000,total)}).extract({...input,request:boundRequest,outputSchema:providerCompatibleSchema(createSourceUnitSchema(request,catalogue))},controller.signal);
  firstUsage=first.usage;
  if(first.finishReason!=='stop')throw new AnalysisFailure('invalid_output',firstUsage);
  const resolved=resolveSourceUnits(first.jsonText,request,catalogue);
  if(signal.aborted)throw new AnalysisFailure('cancelled');
  const remaining=Math.floor(total-(performance.now()-started));
  if(controller.signal.aborted||remaining<1)throw new AnalysisFailure('timeout');
  stage='audit';
  const audit=await createProviderAdapter({...config,maxOutputTokens:1536,thinkingBudget:512,timeoutMs:Math.min(12000,remaining)}).extract({request:boundRequest,systemPrompt:SOURCE_UNIT_AUDIT_SYSTEM_PROMPT,outputSchema:providerCompatibleSchema(createSourceUnitAuditSchema(catalogue)),promptVersion:SOURCE_UNIT_AUDIT_VERSION,auditCandidate:resolved.atoms},controller.signal);
  auditUsage=audit.usage;
  if(audit.finishReason!=='stop')throw new AnalysisFailure('invalid_output',auditUsage);
  validateSourceUnitAudit(audit.jsonText,request,resolved.atoms,catalogue);
  if(signal.aborted)throw new AnalysisFailure('cancelled');
  if(controller.signal.aborted||performance.now()-started>=total)throw new AnalysisFailure('timeout');
  return {...first,jsonText:JSON.stringify(resolved.extraction),usage:combinedUsage(firstUsage,auditUsage),phaseUsage:{generation:firstUsage,audit:auditUsage},latencyMs:performance.now()-started};
 }catch(error){
  if(error instanceof AnalysisFailure){
   const known=stage==='generation'?firstUsage:auditUsage,observed={inputTokens:error.usage.inputTokens??known.inputTokens,outputTokens:error.usage.outputTokens??known.outputTokens};
   if(stage==='generation')firstUsage=observed;else auditUsage=observed;
  }
  const code=signal.aborted?'cancelled':controller.signal.aborted||performance.now()-started>=total?'timeout':error instanceof AnalysisFailure||error instanceof ContractBoundaryError?error.errorCode:'provider_error';
  throw Object.assign(new AnalysisFailure(code,combinedUsage(firstUsage,stage==='audit'?auditUsage:null)),{phaseUsage:{generation:firstUsage,audit:stage==='audit'?auditUsage:null}});
 }finally{clearTimeout(timer);signal.removeEventListener('abort',cancel);controller.abort();}
}

async function extractSourceUnitMeaningProfile(config:ProviderConfig,input:Parameters<ProviderAdapter['extract']>[0],signal:AbortSignal){
 if(signal.aborted)throw new AnalysisFailure('cancelled');
 const started=performance.now(),total=Math.min(config.timeoutMs,50000),controller=new AbortController(),cancel=()=>controller.abort();
 const request=structuredClone(input.request),catalogue=createSourceUnitCatalogue(request),boundRequest=annotateSourceUnitRequest(request,catalogue);
 signal.addEventListener('abort',cancel,{once:true});if(signal.aborted)cancel();
 const timer=setTimeout(()=>controller.abort(),total);
 let stage:'generation'|'audit'='generation',firstUsage:SafeUsage={inputTokens:null,outputTokens:null},auditUsage:SafeUsage={inputTokens:null,outputTokens:null};
 try{
  const first=await createProviderAdapter({...config,maxOutputTokens:2400,thinkingBudget:1024,timeoutMs:Math.min(38000,total)}).extract({...input,request:boundRequest,outputSchema:providerCompatibleSchema(createSourceUnitMeaningSchema(request,catalogue))},controller.signal);
  firstUsage=first.usage;
  if(first.finishReason!=='stop')throw new AnalysisFailure('invalid_output',firstUsage);
  const resolved=resolveSourceUnitMeanings(first.jsonText,request,catalogue);
  if(signal.aborted)throw new AnalysisFailure('cancelled');
  const remaining=Math.floor(total-(performance.now()-started));
  if(controller.signal.aborted||remaining<1)throw new AnalysisFailure('timeout');
  stage='audit';
  const audit=await createProviderAdapter({...config,maxOutputTokens:1536,thinkingBudget:512,timeoutMs:Math.min(12000,remaining)}).extract({request:boundRequest,systemPrompt:SOURCE_UNIT_MEANING_AUDIT_SYSTEM_PROMPT,outputSchema:providerCompatibleSchema(createSourceUnitMeaningAuditSchema(catalogue)),promptVersion:SOURCE_UNIT_MEANING_AUDIT_VERSION,auditCandidate:resolved.atoms},controller.signal);
  auditUsage=audit.usage;
  if(audit.finishReason!=='stop')throw new AnalysisFailure('invalid_output',auditUsage);
  validateSourceUnitMeaningAudit(audit.jsonText,request,resolved.atoms,catalogue);
  if(signal.aborted)throw new AnalysisFailure('cancelled');
  if(controller.signal.aborted||performance.now()-started>=total)throw new AnalysisFailure('timeout');
  return {...first,jsonText:JSON.stringify(resolved.extraction),usage:combinedUsage(firstUsage,auditUsage),phaseUsage:{generation:firstUsage,audit:auditUsage},latencyMs:performance.now()-started};
 }catch(error){
  if(error instanceof AnalysisFailure){
   const known=stage==='generation'?firstUsage:auditUsage,observed={inputTokens:error.usage.inputTokens??known.inputTokens,outputTokens:error.usage.outputTokens??known.outputTokens};
   if(stage==='generation')firstUsage=observed;else auditUsage=observed;
  }
  const code=signal.aborted?'cancelled':controller.signal.aborted||performance.now()-started>=total?'timeout':error instanceof AnalysisFailure||error instanceof ContractBoundaryError?error.errorCode:'provider_error';
  throw Object.assign(new AnalysisFailure(code,combinedUsage(firstUsage,stage==='audit'?auditUsage:null)),{phaseUsage:{generation:firstUsage,audit:stage==='audit'?auditUsage:null}});
 }finally{clearTimeout(timer);signal.removeEventListener('abort',cancel);controller.abort();}
}

async function extractContextProfile(config:ProviderConfig,input:Parameters<ProviderAdapter['extract']>[0],signal:AbortSignal,constrainRecipientRoles=false,semanticProfile:20|21|22|23|24|25|28|null=null){
 if(signal.aborted)throw new AnalysisFailure('cancelled');
 const started=performance.now(),total=Math.min(config.timeoutMs,50000),controller=new AbortController(),cancel=()=>controller.abort();
 const request=structuredClone(input.request),catalogue=createSourceUnitCatalogue(request);
 if(catalogue.length>CONTEXT_CATALOGUE_LIMIT)throw new AnalysisFailure('invalid_input');
 const boundRequest=annotateSourceUnitRequest(request,catalogue);
 const samePaymentHints=semanticProfile===28?createSamePaymentHints(request,catalogue):[];
 const capabilitySuffix=semanticProfile===28?'\nSERVER_SOURCE_CAPABILITIES_JSON:\n'+JSON.stringify({recipientCapabilities:sourceRecipientRoleCapabilities(request,catalogue),samePaymentHints})+'\nEND_SERVER_SOURCE_CAPABILITIES':'';
 signal.addEventListener('abort',cancel,{once:true});if(signal.aborted)cancel();
 const timer=setTimeout(()=>controller.abort(),total);
 let stage:'generation'|'audit'='generation',firstUsage:SafeUsage={inputTokens:null,outputTokens:null},auditUsage:SafeUsage={inputTokens:null,outputTokens:null};
 try{
  const first=await createProviderAdapter({...config,maxOutputTokens:3000,thinkingBudget:constrainRecipientRoles?1024:1536,timeoutMs:Math.min(38000,total)}).extract({...input,request:boundRequest,systemPrompt:input.systemPrompt+capabilitySuffix,outputSchema:providerCompatibleSchema(constrainRecipientRoles?createRoleConstrainedContextSchema(request,catalogue):createContextGenerationSchema(request,catalogue))},controller.signal);
  firstUsage=first.usage;
  if(first.finishReason!=='stop')throw new AnalysisFailure('invalid_output',firstUsage);
  const resolved=constrainRecipientRoles?resolveRoleConstrainedContext(first.jsonText,request,catalogue):resolveContextGeneration(first.jsonText,request,catalogue);
  if(semanticProfile===23||semanticProfile===24||semanticProfile===25||semanticProfile===28)assertRepaymentCoverage(resolved.atoms,catalogue);
  if(semanticProfile===28){assertPromiseFundingConsistency(resolved.atoms,catalogue);assertNoDuplicateSamePayment(resolved.atoms,samePaymentHints);}
  if(signal.aborted)throw new AnalysisFailure('cancelled');
  const remaining=Math.floor(total-(performance.now()-started));
  if(controller.signal.aborted||remaining<1)throw new AnalysisFailure('timeout');
  stage='audit';
  const auditPrompt=semanticProfile===28?CANDIDATE228_AUDIT_SYSTEM_PROMPT:semanticProfile===25?CANDIDATE225_AUDIT_SYSTEM_PROMPT:semanticProfile===24?CANDIDATE224_AUDIT_SYSTEM_PROMPT:semanticProfile===22||semanticProfile===23?CANDIDATE222_AUDIT_SYSTEM_PROMPT:semanticProfile===21?CANDIDATE221_AUDIT_GUIDANCE+'\n\n'+CONTEXT_AUDIT_SYSTEM_PROMPT:semanticProfile===20?CONTEXT_AUDIT_SYSTEM_PROMPT+'\n\n'+CANDIDATE220_AUDIT_GUIDANCE:CONTEXT_AUDIT_SYSTEM_PROMPT;
  const auditVersion=semanticProfile===28?CANDIDATE228_AUDIT_VERSION:semanticProfile===25?CANDIDATE225_AUDIT_VERSION:semanticProfile===24?CANDIDATE224_AUDIT_VERSION:semanticProfile===22||semanticProfile===23?CANDIDATE222_AUDIT_VERSION:semanticProfile===21?CANDIDATE221_AUDIT_VERSION:semanticProfile===20?CANDIDATE220_AUDIT_VERSION:CONTEXT_AUDIT_VERSION;
  const currentAudit=semanticProfile!==null&&semanticProfile>=21;
  const audit=await createProviderAdapter({...config,maxOutputTokens:1536,thinkingBudget:currentAudit?768:512,timeoutMs:Math.min(currentAudit?25000:15000,remaining)}).extract({request:boundRequest,systemPrompt:auditPrompt+capabilitySuffix,outputSchema:providerCompatibleSchema(createContextAuditSchema(request,catalogue,semanticProfile===25?resolved.atoms:undefined)),promptVersion:auditVersion,auditCandidate:resolved.atoms},controller.signal);
  auditUsage=audit.usage;
  if(audit.finishReason!=='stop')throw new AnalysisFailure('invalid_output',auditUsage);
  validateContextAudit(audit.jsonText,request,resolved.atoms,catalogue,semanticProfile===25);
  if(signal.aborted)throw new AnalysisFailure('cancelled');
  if(controller.signal.aborted||performance.now()-started>=total)throw new AnalysisFailure('timeout');
  return {...first,jsonText:JSON.stringify(resolved.extraction),usage:combinedUsage(firstUsage,auditUsage),phaseUsage:{generation:firstUsage,audit:auditUsage},latencyMs:performance.now()-started};
 }catch(error){
  if(error instanceof AnalysisFailure){
   const known=stage==='generation'?firstUsage:auditUsage,observed={inputTokens:error.usage.inputTokens??known.inputTokens,outputTokens:error.usage.outputTokens??known.outputTokens};
   if(stage==='generation')firstUsage=observed;else auditUsage=observed;
  }
  const code=signal.aborted?'cancelled':controller.signal.aborted||performance.now()-started>=total?'timeout':error instanceof AnalysisFailure||error instanceof ContractBoundaryError?error.errorCode:'provider_error';
  throw Object.assign(new AnalysisFailure(code,combinedUsage(firstUsage,stage==='audit'?auditUsage:null)),{phaseUsage:{generation:firstUsage,audit:stage==='audit'?auditUsage:null}});
 }finally{clearTimeout(timer);signal.removeEventListener('abort',cancel);controller.abort();}
}

