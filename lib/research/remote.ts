import '../analysis/server-guard.ts';
import type {ResearchErrorCode} from './contracts.ts';
export class ResearchFailure extends Error {
 constructor(readonly errorCode:ResearchErrorCode){super('Research did not complete');this.name='ResearchFailure';}
}
export async function fetchBoundedJson(fetcher:typeof fetch,url:string,init:RequestInit,parent:AbortSignal,timeoutMs:number):Promise<unknown>{
 const controller=new AbortController(),signal=AbortSignal.any([parent,controller.signal]);
 const timer=setTimeout(()=>controller.abort(),Math.min(timeoutMs,8000));
 let onAbort=()=>{};
 const aborted=new Promise<never>((_,reject)=>{onAbort=()=>reject(new ResearchFailure(parent.aborted?'cancelled':'timeout'));signal.addEventListener('abort',onAbort,{once:true});if(signal.aborted)onAbort();});
 const work=async()=>{
  if(signal.aborted)throw new ResearchFailure(parent.aborted?'cancelled':'timeout');
  const response=await fetcher(url,{...init,signal,redirect:'error',cache:'no-store'});
  if(signal.aborted){void response.body?.cancel().catch(()=>{});throw new ResearchFailure(parent.aborted?'cancelled':'timeout');}
  if(!response.ok){void response.body?.cancel().catch(()=>{});throw new ResearchFailure('provider_error');}
  const length=response.headers.get('content-length');
  if(!response.body||(length!==null&&(!/^\d+$/.test(length)||Number(length)>65536))){void response.body?.cancel().catch(()=>{});throw new ResearchFailure('invalid_output');}
  const reader=response.body.getReader(),decoder=new TextDecoder('utf-8',{fatal:true});let size=0,text='';
  const cancel=()=>{void reader.cancel().catch(()=>{});};signal.addEventListener('abort',cancel,{once:true});
  try{
   for(;;){if(signal.aborted)throw new ResearchFailure(parent.aborted?'cancelled':'timeout');const item=await reader.read();if(signal.aborted)throw new ResearchFailure(parent.aborted?'cancelled':'timeout');if(item.done)break;
    size+=item.value.byteLength;if(size>65536)throw new ResearchFailure('invalid_output');try{text+=decoder.decode(item.value,{stream:true});}catch{throw new ResearchFailure('invalid_output');}}
   try{return JSON.parse(text+decoder.decode()) as unknown;}catch{throw new ResearchFailure('invalid_output');}
  }finally{signal.removeEventListener('abort',cancel);cancel();reader.releaseLock();}
 };
 try{return await Promise.race([work(),aborted]);}
 catch(error){if(error instanceof ResearchFailure)throw error;if(signal.aborted)throw new ResearchFailure(parent.aborted?'cancelled':'timeout');throw new ResearchFailure('provider_error');}
 finally{clearTimeout(timer);signal.removeEventListener('abort',onAbort);controller.abort();}
}

