import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createSharedState,SharedStateUnavailable} from '../../lib/server/shared-state.ts';
const key='sb_secret_synthetic_transport_tests_only',url='https://synthetic-project.supabase.co';
const env={APP_ORIGIN:'https://product.example',SUPABASE_URL:url,SUPABASE_SERVER_KEY:key};
test('shared transport rejects unsafe configuration and cannot use public or browser key aliases',()=>{
 assert.equal(createSharedState({APP_ORIGIN:'http://localhost:3000'}),null);
 for(const overrides of [{SUPABASE_SERVER_KEY:''},{SUPABASE_SERVER_KEY:'sb_publishable_synthetic_tests_only'},{SUPABASE_SERVER_KEY:'',NEXT_PUBLIC_SUPABASE_SERVER_KEY:key},{SUPABASE_URL:'https://synthetic-project.supabase.co.evil.example'},{SUPABASE_URL:url+'/other'},{SUPABASE_URL:'http://synthetic-project.supabase.co'},{APP_ORIGIN:'https://product.example',RUNTIME_STATE_MODE:'local'},{RUNTIME_STATE_MODE:'invalid'}]){
  assert.throws(()=>createSharedState({...env,...overrides}),SharedStateUnavailable);
 }
});
test('RPC transport uses one fixed endpoint and apikey only, with no redirect or retry',async()=>{
 let calls=0;const state=createSharedState(env,{fetch:async(input,init)=>{calls++;assert.equal(String(input),url+'/rest/v1/rpc/offeranchor_runtime_state');assert.equal(init?.redirect,'error');assert.equal(init?.cache,'no-store');const headers=new Headers(init?.headers);assert.equal(headers.get('apikey'),key);assert.equal(headers.get('authorization'),null);return Response.json({ok:true});}})!;
 assert.deepEqual(await state.call('demo_login',{}),{ok:true});assert.equal(calls,1);
});
test('wrong media type, oversized body, private extras and provider errors are rejected without leaking detail',async()=>{
 for(const response of [new Response('{"ok":true}',{headers:{'content-type':'application/json.evil'}}),Response.json({ok:true,private:'PRIVATE DETAIL'}),new Response('PRIVATE DETAIL',{status:503}),Response.json({ok:true},{headers:{'content-length':'5000'}}),new Response(' '.repeat(5000),{headers:{'content-type':'application/json'}}),Response.json({ok:false,retry:0}),Response.json({ok:false,reason:'private error',retry:1})]){
  let calls=0;const state=createSharedState(env,{fetch:async()=>{calls++;return response;}})!;
  await assert.rejects(state.call('demo_login',{}),error=>error instanceof SharedStateUnavailable&&!error.message.includes('PRIVATE')&&!error.message.includes(key));assert.equal(calls,1);
 }
});
test('a hanging RPC is bounded and is never automatically retried',async()=>{
 let calls=0;const state=createSharedState(env,{fetch:async()=>{calls++;return new Promise<Response>(()=>{});}})!;
 const started=Date.now();await assert.rejects(state.call('demo_login',{}),SharedStateUnavailable);assert.ok(Date.now()-started<3500);assert.equal(calls,1);
});
test('pre-aborted work never sends a reservation and lease ids must match the request',async()=>{
 let calls=0;const state=createSharedState(env,{fetch:async()=>{calls++;return Response.json({ok:true,leaseId:'b3a90ba7-2006-4192-a9a0-61aba63f7e3a'});}})!;
 await assert.rejects(state.call('demo_login',{},AbortSignal.abort()),SharedStateUnavailable);assert.equal(calls,0);
 await assert.rejects(state.call('paid_reserve',{id:'a3a90ba7-2006-4192-a9a0-61aba63f7e3a'}),SharedStateUnavailable);assert.equal(calls,1);
});

test('legacy service-role JWTs use a JWT Authorization header and anon JWTs cannot become admin credentials',async()=>{
 const jwt=(role:string)=>[Buffer.from('{"alg":"HS256"}').toString('base64url'),Buffer.from(JSON.stringify({role})).toString('base64url'),'synthetic_signature_at_least_16_chars'].join('.');
 const service=jwt('service_role');let calls=0;
 const state=createSharedState({...env,SUPABASE_SERVER_KEY:service},{fetch:async(_input,init)=>{calls++;assert.equal(new Headers(init?.headers).get('authorization'),'Bearer '+service);return Response.json({ok:true});}})!;
 await state.call('demo_login',{});assert.equal(calls,1);
 assert.throws(()=>createSharedState({...env,SUPABASE_SERVER_KEY:jwt('anon')}),SharedStateUnavailable);
});
