import { previewFixture, type PreviewRequest } from "./fixture-preview";
import {ANALYSIS_TIMEOUT_MS} from "./analysis-timing";
import { parseAnalyzeRequest, validateAnalyzeResponse, ContractBoundaryError } from "../lib/contracts/index.ts";
import { matchesSchema, schemas } from "../lib/contracts/schema.ts";
import type { AnalyzeRequest, AnalyzeResponse, ErrorCode, TransportError } from "../lib/contracts/index.ts";

function withAbort<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
 return new Promise<T>((resolve,reject)=>{
  const aborted=()=>{signal.removeEventListener("abort",aborted);reject(signal.reason);};
  signal.addEventListener("abort",aborted,{once:true});
  work.then(value=>{signal.removeEventListener("abort",aborted);resolve(value);},
    error=>{signal.removeEventListener("abort",aborted);reject(error);});
  if(signal.aborted)aborted();
 });
}
export async function requestAnalysis(request:AnalyzeRequest,signal:AbortSignal,send:typeof fetch=fetch,
 expectedMode:"live"|"simulation"="simulation",preferExamples=false):Promise<AnalyzeResponse>{
 const failure=(errorCode:ErrorCode,retryable=true):AnalyzeResponse=>({contractVersion:"2.0.0",requestId:request.requestId,revision:request.revision,status:"incomplete",errorCode,retryable});
 const parsed=parseAnalyzeRequest(request);if(!parsed.ok)return failure("invalid_input",false);
 if(signal.aborted)return failure("cancelled");
 // Explicit example mode only accepts complete, exact registered evidence and context.
 if(preferExamples){const example=previewFixture(parsed.request as PreviewRequest);if(example.status==="complete")return example.response;}
 const started=performance.now(),deadline=AbortSignal.any([signal,AbortSignal.timeout(ANALYSIS_TIMEOUT_MS)]);
 const interrupted=()=>signal.aborted?"cancelled" as const:deadline.aborted||performance.now()-started>=ANALYSIS_TIMEOUT_MS?"timeout" as const:null;
 let response:Response;
 try{
  deadline.throwIfAborted();
  response=await withAbort(send("/api/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(parsed.request),signal:deadline,cache:"no-store",credentials:"same-origin"}),deadline);
 }catch{return failure(interrupted()??"provider_error");}
 let value:unknown;try{value=await withAbort(response.json(),deadline);}catch{return failure(interrupted()??"invalid_output");}
 const stopped=interrupted();if(stopped)return failure(stopped);
 if(!response.ok){
  if(matchesSchema(value,schemas["transport-error.schema.json"])){const error=value as TransportError;return failure(error.errorCode,error.retryable);}
  if(value&&typeof value==="object"&&"status" in value&&value.status==="incomplete"){
   try{return validateAnalyzeResponse(value,parsed.request,expectedMode);}
   catch{return failure("invalid_output");}
  }
  return failure("invalid_output");
 }
 try{return validateAnalyzeResponse(value,parsed.request,expectedMode);}
 catch(error){return failure(error instanceof ContractBoundaryError?error.errorCode:"invalid_output");}
}
