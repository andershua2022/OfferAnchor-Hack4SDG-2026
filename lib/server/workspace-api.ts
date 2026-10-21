import "../analysis/server-guard.ts";
import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import {createSharedState,type SharedState} from "./shared-state.ts";
import {readAuthConfig,verifyAccountIdentity} from "./account-api.ts";
import { analyze } from "../analysis/index.ts";
import {createSourceBoundProvider} from "./provider-source-schema.ts";
import type { ProviderAdapter, ProviderConfig } from "../analysis/provider.ts";
import { parseAnalyzeRequest } from "../contracts/index.ts";
import type { ErrorCode, TransportError } from "../contracts/index.ts";
import { loadReferenceLibrary } from "../knowledge/index.ts";
import type { ReferenceLibrary } from "../knowledge/index.ts";
import content from "../../knowledge/library.json";
import en from "../../locales/en-HK.json";
import zh from "../../locales/zh-Hant-HK.json";

type Environment=Record<string,string|undefined>;
export type AuxiliaryContext={mode:"live"|"simulation";signal:AbortSignal;providerConfig:ProviderConfig;library:ReferenceLibrary;environment:Environment;runPaid<T>(operation:()=>Promise<T>):Promise<T>};
export class AuxiliaryQuotaError extends Error {
 constructor(readonly retryAfter:number,readonly trialExhausted=false){super("Auxiliary allowance reached");this.name="AuxiliaryQuotaError";}
}
type Mode="simulation"|"live";
import type {WorkspaceStatus} from "../../app/workspace-status";
type AccessCredential={cohortId:string;expiresAt:number|null;trialAccount?:string};
type Reservation={ok:true;release:()=>Promise<void>}|{ok:false;retry?:number;trialExhausted?:boolean};
type Settings={trialEnabled:boolean;mode:Mode;origin:string;enabled:boolean;secret:string;code:string;ttl:number;provider:ProviderConfig;serverMs:number;sessionLimit:number;sessionWindow:number;sessionConcurrent:number;globalLimit:number;globalWindow:number;globalConcurrent:number};
const headers={"Cache-Control":"no-store","Referrer-Policy":"no-referrer"};
const cookieName="offeranchor_demo";
function reject(errorCode:TransportError["errorCode"],status:number,retryable=false,retryAfter?:number){
 return Response.json({contractVersion:"2.0.0",status:"rejected",errorCode,retryable} satisfies TransportError,
  {status,headers:{...headers,...(retryAfter?{"Retry-After":String(retryAfter)}:{})}});
}
function quotaResponse(retry?:number,trialExhausted=false){
 const response=reject("quota_exceeded",429,!trialExhausted,trialExhausted?undefined:retry);
 if(trialExhausted)response.headers.set("X-OfferAnchor-Trial-Exhausted","1");
 return response;
}
function integer(env:Environment,name:string,fallback:number,max:number){
 const raw=env[name];if(raw===undefined||raw==="")return fallback;
 if(!/^\d+$/.test(raw))throw Error("configuration");
 const n=Number(raw);if(!Number.isSafeInteger(n)||n<1||n>max)throw Error("configuration");return n;
}
function windowSeconds(env:Environment,name:string,minimum:number){
 const value=integer(env,name,minimum,86400);if(value<minimum)throw Error("configuration");return value;
}
function settings(env:Environment):Settings{
 const mode=env.OFFERANCHOR_MODE||"simulation";if(mode!=="live"&&mode!=="simulation")throw Error("configuration");
 const origin=env.APP_ORIGIN||"http://127.0.0.1:3000",url=new URL(origin);
 if(url.origin!==origin||!["http:","https:"].includes(url.protocol)||url.username||url.password||
  (url.protocol==="http:"&&!["127.0.0.1","localhost","[::1]"].includes(url.hostname)))throw Error("configuration");
 if(env.MODEL_CALLS_ENABLED!==undefined&&!["true","false"].includes(env.MODEL_CALLS_ENABLED))throw Error("configuration");
 return {trialEnabled:env.ACCOUNT_TRIAL_ENABLED==="true",mode,origin,enabled:env.MODEL_CALLS_ENABLED==="true",secret:env.APP_SESSION_SECRET||"",code:env.DEMO_ACCESS_CODE||"",
  ttl:integer(env,"DEMO_COOKIE_TTL_SECONDS",7200,7200),serverMs:integer(env,"SERVER_TIMEOUT_MS",53000,53000),
  sessionLimit:integer(env,"DEMO_CALL_LIMIT",5,5),sessionConcurrent:integer(env,"DEMO_MAX_IN_FLIGHT",1,1),sessionWindow:windowSeconds(env,"DEMO_CALL_WINDOW_SECONDS",600),
  globalLimit:integer(env,"GLOBAL_CALL_LIMIT",30,60),globalWindow:windowSeconds(env,"GLOBAL_CALL_WINDOW_SECONDS",3600),
  globalConcurrent:integer(env,"GLOBAL_MAX_IN_FLIGHT",2,2),
  provider:{apiBaseUrl:env.MODEL_API_BASE_URL||"",apiKey:env.MODEL_API_KEY||"",modelId:env.MODEL_ID||"",region:env.MODEL_REGION||"",
   responseMode:(env.MODEL_RESPONSE_MODE||"json_object") as ProviderConfig["responseMode"],
   maxOutputTokens:integer(env,"MODEL_MAX_OUTPUT_TOKENS",3000,8192),timeoutMs:integer(env,"MODEL_TIMEOUT_MS",50000,50000),temperature:null}};
}
function secretConfigured(c:Settings){return /^[\x21-\x7e]{32,2048}$/.test(c.secret);}
function authConfigured(c:Settings){return /^[\x21-\x7e]{32,2048}$/.test(c.secret)&&/^[\x21-\x7e]{8,256}$/.test(c.code);}
function hmac(c:Settings,value:string){return createHmac("sha256",c.secret).update(value).digest("base64url");}
function cohort(c:Settings){return hmac(c,"cohort:"+c.origin+":"+c.code);}
function equal(a:string,b:string){return timingSafeEqual(createHash("sha256").update(a).digest(),createHash("sha256").update(b).digest());}
function credential(request:Request,c:Settings,now:number):{cohortId:string;expiresAt:number}|null{
 if(!authConfigured(c))return null;
 const matches=(request.headers.get("cookie")||"").split(";").map(v=>v.trim()).filter(v=>v.startsWith(cookieName+"="));
 if(matches.length!==1)return null;
 const token=matches[0].slice(cookieName.length+1);if(token.length>1024)return null;
 const [encoded,signature,...extra]=token.split(".");if(extra.length||!encoded||!signature||!equal(signature,hmac(c,encoded)))return null;
 try{
  const value=JSON.parse(Buffer.from(encoded,"base64url").toString("utf8"));
  if(Object.keys(value).sort().join(",")!=="cohortId,expiresAt,issuedAt,origin"||value.origin!==c.origin||value.cohortId!==cohort(c)||
   !Number.isSafeInteger(value.issuedAt)||!Number.isSafeInteger(value.expiresAt)||value.issuedAt>now||value.expiresAt<=now||
   value.expiresAt-value.issuedAt!==c.ttl*1000)return null;
  return {cohortId:value.cohortId,expiresAt:value.expiresAt};
 }catch{return null;}
}
async function readBody(request:Request,max:number,signal:AbortSignal){
 if(request.headers.get("content-type")?.split(";")[0].trim().toLowerCase()!=="application/json"||!request.body)throw Error("input");
 const length=request.headers.get("content-length");if(length!==null&&(!/^\d+$/.test(length)||Number(length)>max))throw Error("input");
 const reader=request.body.getReader(),chunks:Uint8Array[]=[];let size=0;
 const cancel=()=>{void reader.cancel().catch(()=>{});};signal.addEventListener("abort",cancel,{once:true});
 try{
  signal.throwIfAborted();
  while(true){const item=await reader.read();signal.throwIfAborted();if(item.done)break;
   size+=item.value.byteLength;if(size>max)throw Error("input");chunks.push(item.value);
  }
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  return JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes)) as unknown;
 }finally{signal.removeEventListener("abort",cancel);cancel();reader.releaseLock();}
}
type Counter={started:number;calls:number;inFlight:number};
export function createWorkspaceApi(options:{
 environment?:()=>Environment;library?:()=>ReferenceLibrary;providerFactory?:(config:ProviderConfig)=>ProviderAdapter;now?:()=>number;fetch?:typeof fetch;
}={}){
 const environment=options.environment??(()=>process.env),getLibrary=options.library??(()=>loadReferenceLibrary(content,{"en-HK":en,"zh-Hant-HK":zh}));
 const makeProvider=options.providerFactory??createSourceBoundProvider,now=options.now??Date.now;
 const trialTotals=new Map<string,number>();
 const cohorts=new Map<string,Counter>();let global:Counter={started:0,calls:0,inFlight:0};
 let loginWindow={started:0,attempts:0};
 function live(c:Settings){
  if(!c.enabled)return {reason:"live_disabled",provider:null,library:null};
  if(!authConfigured(c)&&!(c.trialEnabled&&secretConfigured(c)&&readAuthConfig(environment())))return {reason:"access_configuration",provider:null,library:null};
  let library:ReferenceLibrary;
  try{
   library=getLibrary();
   if(library.status!=="approved"||[...library.cards,...library.routes].some(v=>v.approvalStatus!=="approved"||!v.humanReviewer?.trim()||!v.localizedMeaningApproved||!v.checkedOn.trim()))
    return {reason:"content_review",provider:null,library:null};
  }catch{return {reason:"content_review",provider:null,library:null};}
  try{return {reason:null,provider:makeProvider(c.provider),library};}catch{return {reason:"provider_configuration",provider:null,library:null};}
 }
 async function authorize(request:Request,c:Settings):Promise<{auth:AccessCredential|null;unavailable:boolean;finish:(response:Response)=>Response}>{
  const demo=c.mode==="live"?credential(request,c,now()):null;
  if(c.mode!=="live"||!c.trialEnabled)return {auth:demo as AccessCredential|null,unavailable:false,finish:(response:Response)=>response};
  if(!secretConfigured(c))return {auth:null,unavailable:true,finish:(response:Response)=>response};
  const identity=await verifyAccountIdentity(request,environment(),options.fetch);
  const account=identity.subject?hmac(c,"account:"+identity.subject):null;
  return {auth:account?{cohortId:account,trialAccount:account,expiresAt:null}:demo,unavailable:identity.unavailable&&!demo,finish:identity.finish};
 }
 async function reserve(c:Settings&{shared:SharedState|null},id:string,weight:1|2=1,signal?:AbortSignal,trialAccount?:string):Promise<Reservation>{
  if(weight!==1&&weight!==2)throw Error("configuration");
  const sessionWeight=trialAccount?1:weight,sessionLimit=trialAccount?5:c.sessionLimit,sessionWindow=trialAccount?600:c.sessionWindow;
  if(c.shared){
   const leaseId=crypto.randomUUID(),reply=await c.shared.call("paid_reserve",{id:leaseId,cohort:id,weight,sessionLimit,sessionWindow,sessionConcurrent:c.sessionConcurrent,globalLimit:c.globalLimit,globalWindow:c.globalWindow,globalConcurrent:c.globalConcurrent,...(trialAccount?{trialAccount,sessionWeight}:{})},signal);
   if(!reply.ok)return reply.reason==="trial_exhausted"?{ok:false,trialExhausted:true}:{ok:false,retry:reply.retry!};
   let released=false;
   return {ok:true as const,release:async()=>{if(released)return;released=true;try{await c.shared!.call("paid_release",{id:leaseId});}catch{/* A lost release holds its slot until the 60-second database lease expires. */}}};
  }
  if(trialAccount&&(trialTotals.get(trialAccount)??0)>=5)return {ok:false,trialExhausted:true};
  const time=now();let local=cohorts.get(id);
  if(!local){local={started:time,calls:0,inFlight:0};cohorts.set(id,local);}
  if(time-local.started>=sessionWindow*1000){local.started=time;local.calls=0;}
  if(time-global.started>=c.globalWindow*1000){global.started=time;global.calls=0;}
  const retry=Math.max(1,Math.ceil(Math.max(local.started+sessionWindow*1000-time,global.started+c.globalWindow*1000-time)/1000));
  if(local.inFlight>=c.sessionConcurrent||global.inFlight>=c.globalConcurrent||local.calls+sessionWeight>sessionLimit||global.calls+weight>c.globalLimit)return {ok:false as const,retry};
  local.inFlight++;local.calls+=sessionWeight;global.inFlight++;global.calls+=weight;
  if(trialAccount)trialTotals.set(trialAccount,(trialTotals.get(trialAccount)??0)+1);
  let released=false;
  return {ok:true as const,release:async()=>{if(!released){local!.inFlight--;global.inFlight--;released=true;}}};
 }
 function config(){try{const env=environment(),c=settings(env);return {...c,shared:c.mode==="live"?createSharedState(env,{fetch:options.fetch}):null};}catch{return null;}}
 async function status(request:Request){
  const c=config();if(!c)return Response.json({mode:"unavailable",accessRequired:false,authorized:false,ready:false,reason:"configuration_unavailable",expiresAt:null} satisfies WorkspaceStatus,{headers});
  const access=await authorize(request,c),auth=access.auth,gate=c.mode==="live"?live(c):{reason:null};
  return access.finish(Response.json({mode:c.mode,accessRequired:c.mode==="live"&&!auth?.trialAccount,authorized:c.mode==="simulation"||!!auth,ready:gate.reason===null&&!access.unavailable,reason:access.unavailable?"configuration_unavailable":gate.reason,expiresAt:auth?.expiresAt??null,...(c.mode==="live"&&c.trialEnabled?{trialPolicy:{limit:5 as const,period:"lifetime" as const,unit:"ai_action_attempt" as const}}:{})} satisfies WorkspaceStatus,{status:access.unavailable?503:200,headers}));
 }
 async function login(request:Request){
  const c=config();if(!c)return reject("configuration_unavailable",503);
  if(request.headers.get("origin")!==c.origin)return reject("unauthorized",403);
  if(c.mode!=="live"||!authConfigured(c))return reject("configuration_unavailable",503);
  if(c.shared){try{const allowance=await c.shared.call("demo_login",{},request.signal);if(!allowance.ok)return reject("quota_exceeded",429,true,allowance.retry!);}catch{return reject("configuration_unavailable",503);}}
  else{const time=now();if(time-loginWindow.started>=60000)loginWindow={started:time,attempts:0};if(++loginWindow.attempts>10)return reject("quota_exceeded",429,true,60);}
  const time=now();
  let body:unknown;try{body=await readBody(request,1024,AbortSignal.any([request.signal,AbortSignal.timeout(5000)]));}catch{return reject("invalid_input",400);}
  if(!body||typeof body!=="object"||Array.isArray(body)||Object.keys(body).length!==1||!("accessCode" in body)||typeof body.accessCode!=="string"||body.accessCode.length>256)return reject("invalid_input",400);
  if(!equal(body.accessCode,c.code))return reject("unauthorized",403);
  const payload=Buffer.from(JSON.stringify({cohortId:cohort(c),issuedAt:time,expiresAt:time+c.ttl*1000,origin:c.origin})).toString("base64url");
  const token=payload+"."+hmac(c,payload);
  return Response.json({authorized:true,expiresAt:time+c.ttl*1000},{headers:{...headers,"Set-Cookie":cookieName+"="+token+"; HttpOnly; SameSite=Strict; Path=/; Max-Age="+c.ttl+(c.origin.startsWith("https:")?"; Secure":"")}});
 }
 async function logout(request:Request){
  const c=config();if(!c)return reject("configuration_unavailable",503);
  if(request.headers.get("origin")!==c.origin)return reject("unauthorized",403);
  return Response.json({authorized:false},{headers:{...headers,"Set-Cookie":cookieName+"=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0"+(c.origin.startsWith("https:")?"; Secure":"")}});
 }
 async function post(request:Request){
  const c=config();if(!c)return reject("configuration_unavailable",503);
  if(request.headers.get("origin")!==c.origin)return reject("unauthorized",403);
  if(c.mode==="live"&&!c.enabled)return reject("configuration_unavailable",503);
  const access=await authorize(request,c);
  if(c.mode==="live"&&!access.auth)return access.finish(reject(access.unavailable?"configuration_unavailable":"unauthorized",access.unavailable?503:403));
  return access.finish(await postAuthorized(request,c,access.auth));
 }
 async function postAuthorized(request:Request,c:NonNullable<ReturnType<typeof config>>,auth:AccessCredential|null){
  const signal=AbortSignal.any([request.signal,AbortSignal.timeout(c.serverMs)]);
  let value:unknown;try{value=await readBody(request,96*1024,signal);}catch{return reject("invalid_input",400);}
  const parsed=parseAnalyzeRequest(value);if(!parsed.ok)return reject("invalid_input",400);
  const failure=(errorCode:ErrorCode,retryable=false)=>Response.json({contractVersion:"2.0.0",requestId:parsed.request.requestId,revision:parsed.request.revision,status:"incomplete",errorCode,retryable},
   {status:({configuration_unavailable:503,quota_exceeded:429,provider_error:502,invalid_output:502,invalid_citation:502,timeout:504,simulation_unsupported:422} as Partial<Record<ErrorCode,number>>)[errorCode]??200,headers});
  let provider:ProviderAdapter|null=null,library:ReferenceLibrary;
  if(c.mode==="live"){
   const gate=live(c);if(gate.reason||!gate.library||!gate.provider)return failure("configuration_unavailable");
   provider=gate.provider;library=gate.library;
  }else{try{library=getLibrary();}catch{return failure("configuration_unavailable");}}
  let ticket:Awaited<ReturnType<typeof reserve>>|null;
  try{ticket=c.mode==="live"?await reserve(c,auth!.cohortId,provider?.maxRequestsPerExtraction??1,signal,auth!.trialAccount):null;}catch{return failure("configuration_unavailable");}
  if(ticket&&!ticket.ok)return quotaResponse(ticket.retry,ticket.trialExhausted);
  try {
   const result=await analyze(parsed.request,{mode:c.mode,provider,library,signal,timeoutMs:c.serverMs});
   if(result.status==="incomplete")return failure(result.errorCode,result.retryable);
   return Response.json(result,{headers});
  }catch{return failure("configuration_unavailable");}
  finally{if(ticket?.ok)await ticket.release();}
 }
 async function auxiliary<T>(request:Request,validate:(value:unknown)=>T|null,operation:(input:T,context:AuxiliaryContext)=>Promise<Response>,maxBodyBytes=8192):Promise<Response>{
  const c=config();if(!c)return reject("configuration_unavailable",503);
  if(request.method!=="POST"||request.headers.get("origin")!==c.origin)return reject("unauthorized",403);
  if(c.mode==="live"&&!c.enabled)return reject("configuration_unavailable",503);
  const access=await authorize(request,c);
  if(c.mode==="live"&&!access.auth)return access.finish(reject(access.unavailable?"configuration_unavailable":"unauthorized",access.unavailable?503:403));
  return access.finish(await auxiliaryAuthorized(c,access.auth,request,validate,operation,maxBodyBytes));
 }
 async function auxiliaryAuthorized<T>(c:NonNullable<ReturnType<typeof config>>,auth:AccessCredential|null,request:Request,validate:(value:unknown)=>T|null,operation:(input:T,context:AuxiliaryContext)=>Promise<Response>,maxBodyBytes:number):Promise<Response>{
  const signal=AbortSignal.any([request.signal,AbortSignal.timeout(c.serverMs)]);
  if(!Number.isSafeInteger(maxBodyBytes)||maxBodyBytes<1||maxBodyBytes>3*1024*1024)return reject("configuration_unavailable",503);
  let parsed:T|null;
  try{parsed=validate(await readBody(request,maxBodyBytes,signal));}catch{return reject("invalid_input",400);}
  if(parsed===null)return reject("invalid_input",400);
  let library:ReferenceLibrary;
  if(c.mode==="live"){
   const gate=live(c);if(gate.reason||!gate.library)return reject("configuration_unavailable",503);
   library=gate.library;
  }else{try{library=getLibrary();}catch{return reject("configuration_unavailable",503);}}
  let attempted=false,release:()=>Promise<void>=async()=>{};
  const runPaid=async<R>(outbound:()=>Promise<R>):Promise<R>=>{
   signal.throwIfAborted();
   if(c.mode!=="live"||attempted)throw Error("configuration");
   attempted=true;
   const ticket=await reserve(c,auth!.cohortId,1,signal,auth!.trialAccount);
   if(!ticket.ok)throw new AuxiliaryQuotaError(ticket.retry??1,ticket.trialExhausted);
   release=ticket.release;
   return outbound();
  };
  try{
   signal.throwIfAborted();
   const result=await operation(parsed,{mode:c.mode,signal,providerConfig:c.provider,library,environment:environment(),runPaid});
   if(signal.aborted)return reject("configuration_unavailable",503);
   const safeHeaders=new Headers(result.headers);for(const [key,value]of Object.entries(headers))safeHeaders.set(key,value);
   return new Response(result.body,{status:result.status,headers:safeHeaders});
  }catch(error){return error instanceof AuxiliaryQuotaError?quotaResponse(error.retryAfter,error.trialExhausted):reject("configuration_unavailable",503);}
  finally{await release();}
 }
 return {status,login,logout,post,auxiliary};
}
export const workspaceApi=createWorkspaceApi();
