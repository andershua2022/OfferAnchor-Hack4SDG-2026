import '../analysis/server-guard.ts';
import {createHash} from 'node:crypto';

type Environment=Record<string,string|undefined>;
export type StateOperation='auth_start'|'demo_login'|'challenge_create'|'challenge_revoke'|'challenge_claim'|'challenge_check'|'challenge_finish'|'paid_reserve'|'paid_release';
export type StateReply={ok:true;email?:string;leaseId?:string}|{ok:false;reason?:'email_send_wait'|'rate_limited'|'code_expired'|'trial_exhausted';retry?:number};
export interface SharedState {call(operation:StateOperation,input:Record<string,unknown>,signal?:AbortSignal):Promise<StateReply>;}
export class SharedStateUnavailable extends Error {
 constructor(){super('Shared runtime state is unavailable');this.name='SharedStateUnavailable';}
}
const operations=new Set<StateOperation>(['auth_start','demo_login','challenge_create','challenge_revoke','challenge_claim','challenge_check','challenge_finish','paid_reserve','paid_release']);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function challengeId(value:string|undefined):string|null{return value&&uuid.test(value)?value.toLowerCase():null;}
export function emailStateKey(value:string):string{return createHash('sha256').update(value).digest('hex');}
function keys(value:Record<string,unknown>,expected:string){return Object.keys(value).sort().join(',')===expected;}
function checkedReply(operation:StateOperation,value:unknown,input:Record<string,unknown>):StateReply{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new SharedStateUnavailable();
 const v=value as Record<string,unknown>;
 if(v.ok===true){
  if(operation==='challenge_claim'){
   if(!keys(v,'email,ok')||typeof v.email!=='string'||v.email.length>254||!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(v.email))throw new SharedStateUnavailable();
  }else if(operation==='paid_reserve'){
   if(!keys(v,'leaseId,ok')||v.leaseId!==input.id)throw new SharedStateUnavailable();
  }else if(!keys(v,'ok'))throw new SharedStateUnavailable();
  return v as StateReply;
 }
 if(v.ok!==false)throw new SharedStateUnavailable();
 const retry=Number.isSafeInteger(v.retry)&&Number(v.retry)>=1&&Number(v.retry)<=86400;
 if(operation==='paid_reserve'){
  if(v.reason==='trial_exhausted'){if(!keys(v,'ok,reason')||typeof input.trialAccount!=='string'||!(/^[A-Za-z0-9_-]{43}$/).test(input.trialAccount))throw new SharedStateUnavailable();}
  else if(!keys(v,'ok,retry')||!retry)throw new SharedStateUnavailable();
 }else if(operation==='auth_start'||operation==='demo_login'||operation==='challenge_create'){
  if(!keys(v,'ok,reason,retry')||!retry||!['rate_limited',...(operation==='auth_start'?['email_send_wait']:[])].includes(String(v.reason)))throw new SharedStateUnavailable();
 }else if(operation==='challenge_claim'){
  if(!keys(v,'ok,reason')||!['rate_limited','code_expired'].includes(String(v.reason)))throw new SharedStateUnavailable();
 }else if(operation==='challenge_check'||operation==='challenge_finish'){
  if(!keys(v,'ok,reason')||v.reason!=='code_expired')throw new SharedStateUnavailable();
 }else throw new SharedStateUnavailable();
 return v as StateReply;
}
function serverKey(value:string){
 if(/^sb_secret_[A-Za-z0-9_-]{12,300}$/.test(value))return true;
 if(!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{16,1024}$/.test(value))return false;
 try{return JSON.parse(Buffer.from(value.split('.')[1],'base64url').toString('utf8')).role==='service_role';}catch{return false;}
}
async function abortable<T>(work:Promise<T>,signal:AbortSignal):Promise<T>{
 signal.throwIfAborted();let cancel!:()=>void;
 const aborted=new Promise<never>((_resolve,reject)=>{cancel=()=>reject(new SharedStateUnavailable());signal.addEventListener('abort',cancel,{once:true});});
 try{return await Promise.race([work,aborted]);}finally{signal.removeEventListener('abort',cancel);}
}
async function body(response:Response,signal:AbortSignal){
 if(response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json'||!response.body)throw new SharedStateUnavailable();
 const length=response.headers.get('content-length');if(length!==null&&(!/^\d+$/.test(length)||Number(length)>4096))throw new SharedStateUnavailable();
 const reader=response.body.getReader(),decoder=new TextDecoder('utf-8',{fatal:true});let size=0,text='';
 try{for(;;){const next=await abortable(reader.read(),signal);if(next.done)break;size+=next.value.byteLength;if(size>4096)throw new SharedStateUnavailable();text+=decoder.decode(next.value,{stream:true});}signal.throwIfAborted();return JSON.parse(text+decoder.decode());}
 finally{void reader.cancel().catch(()=>{});reader.releaseLock();}
}

/** Local loopback development retains the bounded in-memory implementation. Remote hosts always require shared state. */
export function createSharedState(env:Environment,options:{fetch?:typeof fetch}={}):SharedState|null{
 try{
  const mode=env.RUNTIME_STATE_MODE;
  if(mode!==undefined&&!['local','shared'].includes(mode))throw new SharedStateUnavailable();
  const rawOrigin=env.APP_ORIGIN||'http://127.0.0.1:3000',origin=new URL(rawOrigin);
  if(origin.origin!==rawOrigin||origin.username||origin.password||!['http:','https:'].includes(origin.protocol))throw new SharedStateUnavailable();
  const loopback=['localhost','127.0.0.1','[::1]'].includes(origin.hostname);
  const required=mode==='shared'||env.VERCEL!==undefined||!loopback;
  if(!required)return null;
  if(mode==='local'||(!loopback&&origin.protocol!=='https:')||(env.VERCEL!==undefined&&!env.APP_ORIGIN))throw new SharedStateUnavailable();
  const url=new URL(env.SUPABASE_URL||env.NEXT_PUBLIC_SUPABASE_URL||''),key=env.SUPABASE_SERVER_KEY||'';
  if(url.protocol!=='https:'||url.username||url.password||url.port||url.pathname!=='/'||url.search||url.hash||!/^[-a-z0-9]+\.supabase\.co$/.test(url.hostname)||!serverKey(key))throw new SharedStateUnavailable();
  const endpoint=url.origin+'/rest/v1/rpc/offeranchor_runtime_state',scope=emailStateKey(origin.origin),fetcher=options.fetch??fetch;
  const headers:Record<string,string>={apikey:key,'Content-Type':'application/json'};if(!key.startsWith('sb_secret_'))headers.Authorization='Bearer '+key;
  return {async call(operation,input,signal){
   let timer:ReturnType<typeof setTimeout>|undefined;const controller=new AbortController(),cancel=()=>controller.abort();
   try{
    if(!operations.has(operation)||Object.hasOwn(input,'scope'))throw new SharedStateUnavailable();
    if(operation==='paid_reserve'){
     if(Object.hasOwn(input,'sessionWeight')&&(!Number.isSafeInteger(input.sessionWeight)||!Number.isSafeInteger(input.weight)||Number(input.sessionWeight)<1||Number(input.sessionWeight)>Number(input.weight)))throw new SharedStateUnavailable();
     if(Object.hasOwn(input,'trialAccount')&&(typeof input.trialAccount!=='string'||!(/^[A-Za-z0-9_-]{43}$/).test(input.trialAccount)))throw new SharedStateUnavailable();
    }
    if(signal?.aborted)throw new SharedStateUnavailable();
    signal?.addEventListener('abort',cancel,{once:true});timer=setTimeout(cancel,2000);
    const wire=JSON.stringify({p_operation:operation,p_input:{...input,scope}});
    if(Buffer.byteLength(wire)>4096)throw new SharedStateUnavailable();
    const response=await abortable(fetcher(endpoint,{method:'POST',redirect:'error',cache:'no-store',headers,body:wire,signal:controller.signal}),controller.signal);
    if(!response.ok){void response.body?.cancel().catch(()=>{});throw new SharedStateUnavailable();}
    return checkedReply(operation,await body(response,controller.signal),input);
   }catch{throw new SharedStateUnavailable();}
   finally{if(timer)clearTimeout(timer);signal?.removeEventListener('abort',cancel);controller.abort();}
  }};
 }catch{throw new SharedStateUnavailable();}
}
