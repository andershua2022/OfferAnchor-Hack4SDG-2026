import '../analysis/server-guard.ts';
import {createServerClient,parseCookieHeader,serializeCookieHeader,type CookieOptions} from '@supabase/ssr';
import {isRecord} from '../contracts/schema.ts';
import {createSharedState,challengeId,emailStateKey,SharedStateUnavailable,type SharedState} from './shared-state.ts';
type Environment=Record<string,string|undefined>;
type AuthConfig={origin:string;url:string;key:string;secure:boolean;publicEmail:boolean};
export function readAuthConfig(env:Environment):AuthConfig|null{
 try{
  const origin=new URL(env.APP_ORIGIN||''),url=new URL(env.SUPABASE_URL||env.NEXT_PUBLIC_SUPABASE_URL||''),key=env.SUPABASE_PUBLISHABLE_KEY||env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';
  if(origin.origin!==origin.href.replace(/\/$/,'')||origin.username||origin.password||!(origin.protocol==='https:'||origin.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(origin.hostname)))return null;
  if(url.protocol!=='https:'||url.username||url.password||url.port||url.pathname!=='/'||url.search||url.hash||!/^[-a-z0-9]+\.supabase\.co$/.test(url.hostname))return null;
  if(!/^sb_publishable_[A-Za-z0-9_-]{12,300}$/.test(key))return null;
  return {origin:origin.origin,url:url.origin,key,secure:origin.protocol==='https:',publicEmail:env.EMAIL_SIGNUP_PUBLIC_ENABLED==='true'};
 }catch{return null;}
}
const privateHeaders={'Cache-Control':'private, no-cache, no-store, must-revalidate, max-age=0','Referrer-Policy':'no-referrer','Vary':'Cookie','Pragma':'no-cache'};
async function boundedBody(request:Request){
 if(!request.headers.get('content-type')?.startsWith('application/json'))throw Error('input');
 const reader=request.body?.getReader();if(!reader)throw Error('input');const timer=setTimeout(()=>{void reader.cancel();},5000);let text='',size=0;const decoder=new TextDecoder('utf-8',{fatal:true});
 try{for(;;){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>2048)throw Error('input');text+=decoder.decode(next.value,{stream:true});}return JSON.parse(text+decoder.decode());}finally{clearTimeout(timer);void reader.cancel().catch(()=>{});reader.releaseLock();}
}
function accountContext(request:Request,config:AuthConfig,fetcher:typeof fetch,timeoutMs=8000){
  const jar=new Map(parseCookieHeader(request.headers.get('cookie')||'').filter(c=>typeof c.value==='string').map(c=>[c.name,c.value!]));
  const pending=new Map<string,{name:string;value:string;options:CookieOptions}>();
  function set(name:string,value:string,opts:CookieOptions={}){const cookie={name,value,options:{...opts,path:'/',httpOnly:true,secure:config.secure,sameSite:'lax' as const}};pending.set(name,cookie);if(value)jar.set(name,value);else jar.delete(name);}
  const client=createServerClient(config.url,config.key,{cookieOptions:{path:'/',httpOnly:true,secure:config.secure,sameSite:'lax',maxAge:7*24*3600},cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:items=>{for(const item of items)set(item.name,item.value,item.options);}},global:{fetch:async(input,init)=>{
   const destination=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);if(destination.origin!==config.url||!destination.pathname.startsWith('/auth/v1/'))throw Error('auth endpoint');
   return fetcher(input,{...init,redirect:'error',cache:'no-store',signal:AbortSignal.any([request.signal,AbortSignal.timeout(destination.pathname==='/auth/v1/otp'?20000:timeoutMs)])});
  }}});
  function finish(response:Response){for(const [name,value] of Object.entries(privateHeaders))response.headers.set(name,value);for(const cookie of pending.values())response.headers.append('Set-Cookie',serializeCookieHeader(cookie.name,cookie.value,cookie.options));return response;}
  return {client,jar,set,finish};
 }

export type VerifiedAccountIdentity={subject:string|null;unavailable:boolean;finish:(response:Response)=>Response};
/** The server verifies the subject with getUser; browser session claims and profile fields never authorize work. */
export async function verifyAccountIdentity(request:Request,env:Environment,fetcher:typeof fetch=fetch):Promise<VerifiedAccountIdentity>{
 const config=readAuthConfig(env),plain=(response:Response)=>response;
 if(!config)return {subject:null,unavailable:true,finish:plain};
 const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
 const bound=new Request(request.url,{headers:request.headers,signal:AbortSignal.any([request.signal,controller.signal])}),ctx=accountContext(bound,config,fetcher,4000);
 try{
  const timeout=new Promise<never>((_resolve,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('identity unavailable'));},4000);});
  const {data,error}=await Promise.race([ctx.client.auth.getUser(),timeout]);
  if(error){const status=Number(error.status);return {subject:null,unavailable:![400,401,403].includes(status),finish:ctx.finish};}
  if(!data.user)return {subject:null,unavailable:false,finish:ctx.finish};
  const id=data.user.id;if(typeof id!=='string'||!(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).test(id))return {subject:null,unavailable:true,finish:ctx.finish};
  return {subject:id.toLowerCase(),unavailable:false,finish:ctx.finish};
 }catch{return {subject:null,unavailable:true,finish:ctx.finish};}
 finally{if(timer)clearTimeout(timer);controller.abort();}
}

export function createAccountApi(options:{environment?:()=>Environment;fetch?:typeof fetch;now?:()=>number}={}){
 const environment=options.environment??(()=>process.env),fetcher=options.fetch??fetch,now=options.now??Date.now;
 const counters={email:[] as number[],google:[] as number[]},emailAttempts=new Map<string,number>();
 // Loopback development only; remote hosts use the shared RPC below.
 const challenges=new Map<string,{email:string;expires:number;attempts:number;busy:boolean}>(),verificationAttempts:number[]=[];
 function pruneChallenges(){for(const [id,entry] of challenges)if(entry.expires<=now())challenges.delete(id);}
 async function forgetChallenge(id:string|undefined,shared:SharedState|null){if(shared){const valid=challengeId(id);if(valid)await shared.call('challenge_revoke',{id:valid});}else if(id)challenges.delete(id);}

 function retryAfter(method:'email'|'google',config:AuthConfig){const window=method==='email'?3600000:60000,limit=method==='email'?(config.publicEmail?20:2):20;counters[method]=counters[method].filter(t=>t>now()-window);return counters[method].length>=limit?Math.max(1,Math.ceil((counters[method][0]+window-now())/1000)):0;}
 function waiting(error:string,status:number,seconds:number){const response=bad(error,status);response.headers.set('Retry-After',String(seconds));return response;}
 function sendFailure(error:unknown){const value=error as {status?:number;code?:string}|null,status=Number(value?.status)||0,code=value?.code;const reason=code==='email_address_invalid'?'invalid_email':code==='email_address_not_authorized'?'email_sender_unavailable':status===429?'email_send_wait':status===0?'provider_unavailable':'email_unavailable';console.warn('[OfferAnchor email send]',JSON.stringify({reason,providerStatus:status}));return waiting(reason,reason==='invalid_email'?400:reason==='email_sender_unavailable'?503:status===429?429:502,60);}
 function bad(error:string,status=400){return Response.json({status:'error',error},{status,headers:privateHeaders});}
 const context=(request:Request,config:AuthConfig)=>accountContext(request,config,fetcher);
 async function start(request:Request){
  const config=readAuthConfig(environment());if(!config)return bad('not_configured',503);
  if(request.method!=='POST'||request.headers.get('origin')!==config.origin)return bad('unauthorized',403);
  let body:unknown;try{body=await boundedBody(request);}catch{return bad('invalid_input');}
  if(!isRecord(body)||!['google','email'].includes(String(body.method))||Object.keys(body).some(k=>!['method','email','popup'].includes(k))||body.popup!==undefined&&typeof body.popup!=='boolean'||body.method==='google'&&body.email!==undefined)return bad('invalid_input');
  if(body.method==='email'&&(typeof body.email!=='string'||body.email.length>254||! /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(body.email)))return bad('invalid_email');
  const method=body.method as 'google'|'email',email=method==='email'?(body.email as string).toLowerCase():'';
  let shared:SharedState|null;try{shared=createSharedState(environment(),{fetch:fetcher});}catch{return bad('not_configured',503);}
  const ctx=context(request,config),previousId=challengeId(ctx.jar.get('oa_email_challenge'));
  if(shared){
   try{const allowance=await shared.call('auth_start',{method,emailKey:email?emailStateKey(email):'',publicEmail:config.publicEmail,previousId},request.signal);if(!allowance.ok)return waiting(allowance.reason!,429,allowance.retry!);}
   catch{return bad('provider_unavailable',503);}
  }else{
   for(const [address,time] of emailAttempts)if(time<=now()-60000)emailAttempts.delete(address);
   const last=emailAttempts.get(email);if(method==='email'&&last!==undefined)return waiting('email_send_wait',429,Math.max(1,Math.ceil((last+60000-now())/1000)));
   const wait=retryAfter(method,config);if(wait)return waiting('rate_limited',429,wait);
   counters[method].push(now());if(method==='email')emailAttempts.set(email,now());
  }
  const redirectTo=config.origin+'/auth/callback';ctx.set('oa_auth_window',body.popup?'popup':'page',{maxAge:600});
  try{
   if(method==='google'){
    const {data,error}=await ctx.client.auth.signInWithOAuth({provider:'google',options:{redirectTo,scopes:'openid email profile',skipBrowserRedirect:true}});
    if(error||!data.url)return ctx.finish(bad('provider_unavailable',502));const target=new URL(data.url);if(target.origin!==config.url||target.pathname!=='/auth/v1/authorize')return ctx.finish(bad('provider_unavailable',502));
    await forgetChallenge(ctx.jar.get('oa_email_challenge'),shared);ctx.set('oa_email_challenge','',{maxAge:0});return ctx.finish(Response.json({status:'redirect',url:data.url}));
   }
   if(!shared){pruneChallenges();if(challenges.size>=100&&!challenges.has(ctx.jar.get('oa_email_challenge')||''))return bad('rate_limited',429);}
   const {error}=await ctx.client.auth.signInWithOtp({email,options:{emailRedirectTo:redirectTo,shouldCreateUser:true}});
   if(error)return sendFailure(error);
   const id=crypto.randomUUID();
   if(shared){const created=await shared.call('challenge_create',{id,previousId,email},request.signal);if(!created.ok)return waiting('rate_limited',429,created.retry!);}
   else{await forgetChallenge(ctx.jar.get('oa_email_challenge'),null);challenges.set(id,{email,expires:now()+600000,attempts:0,busy:false});}
   ctx.set('oa_email_challenge',id,{maxAge:600});
   const response=Response.json({status:'email_sent',delivery:config.publicEmail?'public':'restricted'});response.headers.set('Retry-After','60');return ctx.finish(response);
  }catch(error){if(error instanceof SharedStateUnavailable)return bad('provider_unavailable',503);return method==='email'?sendFailure(null):ctx.finish(bad('provider_unavailable',502));}
 }
 async function verifyEmail(request:Request){
  const config=readAuthConfig(environment());if(!config)return bad('not_configured',503);
  if(request.method!=='POST'||request.headers.get('origin')!==config.origin)return bad('unauthorized',403);
  let body:unknown;try{body=await boundedBody(request);}catch{return bad('invalid_input');}
  if(!isRecord(body)||Object.keys(body).length!==1||typeof body.code!=='string'||!/^\d{8}$/.test(body.code))return bad('invalid_input');
  let shared:SharedState|null;try{shared=createSharedState(environment(),{fetch:fetcher});}catch{return bad('not_configured',503);}
  if(shared){
   const ctx=context(request,config),id=challengeId(ctx.jar.get('oa_email_challenge'));if(!id)return bad('code_expired',410);
   const claimId=crypto.randomUUID();let claimed=false,finished=false;
   try{
    const claim=await shared.call('challenge_claim',{id,claimId},request.signal);
    if(!claim.ok)return bad(claim.reason!,claim.reason==='code_expired'?410:429);
    claimed=true;
    const {error}=await ctx.client.auth.verifyOtp({email:claim.email!,token:body.code,type:'email'});
    if(error){
     const released=await shared.call('challenge_finish',{id,claimId,consume:false},request.signal);finished=true;
     if(!released.ok)return bad('code_expired',410);
     if(Number(error.status)===429)return bad('rate_limited',429);
     return bad(!Number(error.status)||Number(error.status)>=500?'provider_unavailable':'invalid_code',!Number(error.status)||Number(error.status)>=500?502:400);
    }
    const current=await shared.call('challenge_check',{id,claimId},request.signal);if(!current.ok)return bad('code_expired',410);
    const {data,error:lookup}=await ctx.client.auth.getUser();
    const consumed=await shared.call('challenge_finish',{id,claimId,consume:true},request.signal);finished=true;
    if(!consumed.ok)return bad('code_expired',410);
    if(lookup||!data.user||data.user.email?.toLowerCase()!==claim.email)return bad('verification_failed',502);
    const destination=ctx.jar.get('oa_auth_window')==='popup'?'/auth/complete':'/check';ctx.set('oa_email_challenge','',{maxAge:0});ctx.set('oa_auth_window','',{maxAge:0});
    return ctx.finish(Response.json({status:'signed_in',returnTo:destination}));
   }catch(error){return bad('provider_unavailable',error instanceof SharedStateUnavailable?503:502);}
   finally{if(claimed&&!finished)try{await shared.call('challenge_finish',{id,claimId,consume:false});}catch{/* A failed release remains bounded by the database claim expiry. */}}
  }
  pruneChallenges();const ctx=context(request,config),id=ctx.jar.get('oa_email_challenge')||'',entry=challenges.get(id);
  if(!entry||entry.attempts>=5)return bad('code_expired',410);
  while(verificationAttempts.length&&verificationAttempts[0]<=now()-600000)verificationAttempts.shift();
  if(entry.busy||verificationAttempts.length>=30)return bad('rate_limited',429);
  entry.busy=true;entry.attempts++;verificationAttempts.push(now());
  const current=()=>challenges.get(id)===entry&&entry.expires>now();
  try{
   const {error}=await ctx.client.auth.verifyOtp({email:entry.email,token:body.code,type:'email'});
   if(!current())return bad('code_expired',410);
   if(error){if(entry.attempts>=5){challenges.delete(id);return bad('code_expired',410);}if(Number(error.status)===429)return bad('rate_limited',429);return bad(!Number(error.status)||Number(error.status)>=500?'provider_unavailable':'invalid_code',!Number(error.status)||Number(error.status)>=500?502:400);}
   const {data,error:lookup}=await ctx.client.auth.getUser();
   if(!current())return bad('code_expired',410);
   challenges.delete(id);
   if(lookup||!data.user||data.user.email?.toLowerCase()!==entry.email)return bad('verification_failed',502);
   const destination=ctx.jar.get('oa_auth_window')==='popup'?'/auth/complete':'/check';ctx.set('oa_email_challenge','',{maxAge:0});ctx.set('oa_auth_window','',{maxAge:0});
   return ctx.finish(Response.json({status:'signed_in',returnTo:destination}));
  }catch{return bad('provider_unavailable',502);}finally{entry.busy=false;}
 }
 async function callback(request:Request){
  const config=readAuthConfig(environment());if(!config)return bad('not_configured',503);
  const url=new URL(request.url),ctx=context(request,config),hasVerifier=[...ctx.jar].some(([name,value])=>name.endsWith('-code-verifier')&&value.length>=16);
  const failed=(reason:string,stage:string,status?:number)=>{console.warn('[OfferAnchor auth callback]',JSON.stringify({reason,stage,hasCode:url.searchParams.has('code'),hasVerifier,originMatches:url.origin===config.origin,...(status!==undefined?{providerStatus:status}:{})}));return new Response(null,{status:303,headers:{...privateHeaders,Location:config.origin+'/login?error='+reason}});};
  const unavailable=(error:unknown)=>!isRecord(error)||!Number(error.status)||![400,401,403,422].includes(Number(error.status));
  if(request.method!=='GET'||url.origin!==config.origin)return failed('unauthorized','request');
  if(url.searchParams.has('error'))return failed('provider_rejected','provider_return');
  if(url.searchParams.getAll('code').length!==1)return failed('callback_invalid','code');
  if(!hasVerifier)return failed('browser_mismatch','browser_state');
  const code=url.searchParams.get('code')!;if(!/^[A-Za-z0-9_.~-]{8,2048}$/.test(code))return failed('callback_invalid','code');
  let stage='exchange';
  try{const {data:exchanged,error}=await ctx.client.auth.exchangeCodeForSession(code);if(error)return failed(unavailable(error)?'provider_unavailable':'expired',stage,Number(error.status)||0);stage='verify';const {data,error:lookup}=await ctx.client.auth.getUser();if(lookup||!data.user?.id||data.user.id!==exchanged.user?.id)return failed(lookup&&unavailable(lookup)?'provider_unavailable':'verification_failed',stage,lookup?Number(lookup.status)||0:undefined);const destination=ctx.jar.get('oa_auth_window')==='popup'?'/auth/complete':'/check';ctx.set('oa_auth_window','',{maxAge:0});return ctx.finish(new Response(null,{status:303,headers:{Location:config.origin+destination}}));}catch{return failed('provider_unavailable',stage);}

 }
 async function session(request:Request){
  const config=readAuthConfig(environment());if(!config)return Response.json({configured:false,authenticated:false,user:null,emailDelivery:'unavailable'},{headers:privateHeaders});
  const ctx=context(request,config),base={configured:true,emailDelivery:config.publicEmail?'public':'restricted'};
  try{const {data,error}=await ctx.client.auth.getUser();if(error&&(!('status' in error)||!Number(error.status)||![400,401,403].includes(Number(error.status))))return ctx.finish(Response.json({...base,authenticated:false,user:null,unavailable:true},{status:503}));if(error||!data.user)return ctx.finish(Response.json({...base,authenticated:false,user:null}));
   const user=data.user,name=typeof user.user_metadata?.full_name==='string'?user.user_metadata.full_name:typeof user.user_metadata?.name==='string'?user.user_metadata.name:user.email?.split('@')[0]||'Your account';
   return ctx.finish(Response.json({...base,authenticated:true,user:{id:user.id,name:name.replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,80)||'Your account',email:user.email||null,provider:user.app_metadata?.provider==='google'?'google':'email'}}));
  }catch{return ctx.finish(Response.json({...base,authenticated:false,user:null,unavailable:true},{status:503}));}
 }
 async function signOut(request:Request){
  const config=readAuthConfig(environment());if(!config)return bad('not_configured',503);if(request.method!=='POST'||request.headers.get('origin')!==config.origin)return bad('unauthorized',403);
  let body:unknown;try{body=await boundedBody(request);}catch{return bad('invalid_input');}if(!isRecord(body)||Object.keys(body).length)return bad('invalid_input');
  let shared:SharedState|null;try{shared=createSharedState(environment(),{fetch:fetcher});}catch{return bad('not_configured',503);}
  const ctx=context(request,config);try{const {error}=await ctx.client.auth.signOut({scope:'local'});if(error)return ctx.finish(bad('signout_unavailable',502));await forgetChallenge(ctx.jar.get('oa_email_challenge'),shared);ctx.set('oa_email_challenge','',{maxAge:0});ctx.set('oa_auth_window','',{maxAge:0});return ctx.finish(Response.json({status:'signed_out'}));}catch(error){return error instanceof SharedStateUnavailable?bad('signout_unavailable',503):ctx.finish(bad('signout_unavailable',502));}
 }
 return {start,verifyEmail,callback,session,signOut};
}
export const accountApi=createAccountApi();
