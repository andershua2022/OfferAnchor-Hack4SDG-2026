import {validateResearchResponse,type ResearchInput,type ResearchKind,type ResearchResponse} from '../../lib/research/contracts';
export type ResearchOutcome={ok:true;result:ResearchResponse}|{ok:false;errorCode:string};
export async function requestResearch(input:ResearchInput,kind:ResearchKind,mode:'live'|'simulation',signal:AbortSignal,send:typeof fetch=fetch):Promise<ResearchOutcome>{
 const deadline=AbortSignal.any([signal,AbortSignal.timeout(12000)]);
 try{
  const response=await send(kind==='knowledge'?'/api/knowledge/ask':'/api/research',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',cache:'no-store',signal:deadline,body:JSON.stringify(input)});
  if(response.status===429&&response.headers.get('X-OfferAnchor-Trial-Exhausted')==='1')return {ok:false,errorCode:'trial_exhausted'};
  const value:unknown=await response.json();deadline.throwIfAborted();
  if(validateResearchResponse(value,{requestId:input.requestId,revision:input.revision,kind,mode}))return {ok:true,result:value};
  const code=value&&typeof value==='object'&&'errorCode' in value?String(value.errorCode):'';
  return {ok:false,errorCode:['unauthorized','quota_exceeded','configuration_unavailable','invalid_input'].includes(code)?code:'invalid_output'};
 }catch{return {ok:false,errorCode:signal.aborted?'cancelled':deadline.aborted?'timeout':'provider_error'};}
}
