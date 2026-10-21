import '../analysis/server-guard.ts';
import {workspaceApi,AuxiliaryQuotaError} from './workspace-api.ts';
import {parseResearchInput,validateResearchResponse,RESEARCH_VERSION} from '../research/contracts.ts';
import type {ResearchInput,ResearchKind,ResearchResponse,ResearchReference,ResearchErrorCode} from '../research/contracts.ts';
import type {AuxiliaryContext} from './workspace-api.ts';
import {retrieveReferences} from '../research/retrieval.ts';
import {answerWithSources,privateSearchQuery,searchPublicGuidance} from '../research/providers.ts';
import {ResearchFailure} from '../research/remote.ts';
export function createResearchApi(options:{workspace?:Pick<typeof workspaceApi,'auxiliary'>;fetch?:typeof fetch;now?:()=>number}={}){
 const workspace=options.workspace??workspaceApi,fetcher=options.fetch??fetch,now=options.now??Date.now;
 function response(input:ResearchInput,context:AuxiliaryContext,kind:ResearchKind,result:{status:'complete';answer:string;references:ResearchReference[]}|{status:'sources_only';answer:null;references:ResearchReference[]}|{status:'incomplete';answer:null;references:ResearchReference[];errorCode:ResearchErrorCode}){
  const value:ResearchResponse={contractVersion:RESEARCH_VERSION,requestId:input.requestId,revision:input.revision,kind,mode:context.mode,...result};
  if(!validateResearchResponse(value))return Response.json({contractVersion:RESEARCH_VERSION,requestId:input.requestId,revision:input.revision,kind,mode:context.mode,status:'incomplete',answer:null,references:[],errorCode:'invalid_output'} satisfies ResearchResponse);
  return Response.json(value);
 }
 async function run(input:ResearchInput,context:AuxiliaryContext,kind:ResearchKind){
  let references:ResearchReference[]=[];
  const incomplete=(errorCode:ResearchErrorCode)=>response(input,context,kind,{status:'incomplete',answer:null,references,errorCode});
  try{
   if(context.signal.aborted)return incomplete('cancelled');
   if(kind==='knowledge'){
    // Audited public passages have separate provenance; unreviewed drafts remain excluded.
    const approvedOnly=context.mode==='live'&&context.environment.KNOWLEDGE_QA_ENABLED==='true';
    references=retrieveReferences(context.library,input.question!,input.locale,input.topicIds,approvedOnly,approvedOnly);
    if(references.length===0)return incomplete('insufficient_evidence');
    if(context.mode==='simulation'||context.environment.KNOWLEDGE_QA_ENABLED!=='true')return response(input,context,kind,{status:'sources_only',answer:null,references});
    references=references.filter(r=>r.reviewStatus==='approved'||r.reviewStatus==='source_checked');
    if(references.length===0)return incomplete('insufficient_evidence');
    const answer=await context.runPaid(()=>answerWithSources(input,references,context.providerConfig,context.signal,fetcher));
    return answer?response(input,context,kind,{status:'complete',...answer}):incomplete('insufficient_evidence');
   }
   if(context.mode==='simulation')return incomplete('simulation_unavailable');
   if(privateSearchQuery(input.query!))return incomplete('private_query');
   if(context.environment.WEB_SEARCH_ENABLED!=='true')return incomplete('feature_disabled');
   const key=context.environment.FIRECRAWL_API_KEY;
   if(!key||!/^[\x21-\x7e]{1,2048}$/.test(key))return incomplete('not_configured');
   references=await context.runPaid(()=>searchPublicGuidance(input.query!,key,context.providerConfig,context.signal,fetcher,new Date(now()).toISOString().slice(0,10)));
   return references.length?response(input,context,kind,{status:'sources_only',answer:null,references}):incomplete('insufficient_evidence');
  }catch(error){if(error instanceof AuxiliaryQuotaError)throw error;return incomplete(error instanceof ResearchFailure?error.errorCode:'provider_error');}
 }
 return {knowledge:(request:Request)=>workspace.auxiliary(request,value=>parseResearchInput(value,'knowledge'),(input,context)=>run(input,context,'knowledge')),web:(request:Request)=>workspace.auxiliary(request,value=>parseResearchInput(value,'web'),(input,context)=>run(input,context,'web'))};
}
export const researchApi=createResearchApi();
