import assert from 'node:assert/strict';
import {test} from 'node:test';
import {randomBytes} from 'node:crypto';
import sharp from 'sharp';
import {createWorkspaceApi} from '../../lib/server/workspace-api';
import {loadReferenceLibrary} from '../../lib/knowledge/index.ts';
import content from '../../knowledge/library.json';
import en from '../../locales/en-HK.json';
import zh from '../../locales/zh-Hant-HK.json';
const modulePromise=import('../../lib/server/image-intake.ts').catch(()=>null);
const contractPromise=import('../../lib/api/image-intake.ts').catch(()=>null);
const origin='http://localhost:3000';
const picture=sharp(randomBytes(256*256*3),{raw:{width:256,height:256,channels:3}}).png().toBuffer();
const body=async()=>({contractVersion:'image-intake-1.0.0',requestId:'image-request-01',consent:true,image:'data:image/png;base64,'+(await picture).toString('base64')});
async function setup(options:{mode?:'live'|'simulation';enabled?:boolean;fetcher?:typeof fetch;responseMode?:'json_object'|'json_schema'}={}){
 const mod=await modulePromise;assert.ok(mod,'Image intake API must be implemented');
 const workspace=createWorkspaceApi({environment:()=>({OFFERANCHOR_MODE:options.mode??'live',MODEL_CALLS_ENABLED:'true',APP_ORIGIN:origin,DEMO_ACCESS_CODE:'synthetic-demo-code',APP_SESSION_SECRET:'synthetic-session-secret-only-1234567890',MODEL_API_BASE_URL:'https://dashscope.aliyuncs.com/compatible-mode/v1',MODEL_API_KEY:'synthetic-image-key',MODEL_RESPONSE_MODE:options.responseMode??'json_object',MODEL_ID:'qwen3.8-max',MODEL_REGION:'cn-beijing',VISION_READING_ENABLED:options.enabled===false?'false':'true',VISION_MODEL_ID:'qwen-vl-ocr-2025-11-20'}),library:()=>loadReferenceLibrary(content,{'en-HK':en,'zh-Hant-HK':zh})});
 const api=mod.createImageIntakeApi({workspace,fetch:options.fetcher??(async()=>{assert.fail('No outbound call expected');})});
 const login=await workspace.login(new Request(origin+'/api/session',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({accessCode:'synthetic-demo-code'})}));
 const cookie=login.headers.get('set-cookie')?.split(';')[0]??'';
 const request=(value:unknown,cookieValue=cookie,requestOrigin=origin)=>new Request(origin+'/api/intake/image',{method:'POST',headers:{Origin:requestOrigin,'Content-Type':'application/json',Cookie:cookieValue},body:JSON.stringify(value)});
 return {api,request};
}
const wire=(text='Please pay HK$800 from your own account.',finish='stop')=>Response.json({choices:[{finish_reason:finish,message:{role:'assistant',content:text}}],usage:{prompt_tokens:1024,completion_tokens:30}});
test('image intake uses a server-selected OCR model and accepts a bounded image larger than research text bodies',async()=>{
 let calls=0;const {api,request}=await setup({fetcher:async(url,init)=>{calls++;assert.equal(String(url),'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions');const v=JSON.parse(init!.body as string);assert.equal(v.model,'qwen-vl-ocr-2025-11-20');assert.equal(v.messages.length,1);assert.ok(v.messages[0].content.some((x:{type:string})=>x.type==='image_url'));assert.ok(!JSON.stringify(v).includes('filename'));return wire();}});
 const result=await(await api.post(request(await body()))).json();assert.equal(result.status,'complete');assert.equal(result.modelId,'qwen-vl-ocr-2025-11-20');assert.equal(result.text,'Please pay HK$800 from your own account.');assert.equal(calls,1);
 assert.ok(!JSON.stringify(result).includes('synthetic-image-key'));
});
test('foreign and unauthenticated image requests cannot reach the reader',async()=>{let calls=0;const {api,request}=await setup({fetcher:async()=>{calls++;return wire();}});assert.equal((await api.post(request(await body(),''))).status,403);assert.equal((await api.post(request(await body(),'','https://foreign.example'))).status,403);assert.equal(calls,0);});
test('remote URLs, extra fields, missing consent and MIME mismatches are rejected without outbound work',async()=>{
 let calls=0;const {api,request}=await setup({fetcher:async()=>{calls++;return wire();}}),v=await body();
 for(const invalid of [{...v,image:'https://example.com/private.png'},{...v,filename:'private-name.png'},{...v,consent:false},{...v,image:v.image.replace('image/png','image/jpeg')}]){const response=await api.post(request(invalid));assert.notEqual((await response.json()).status,'complete');}assert.equal(calls,0);
});
test('disabled and simulation image readers never call the model',async()=>{for(const options of [{enabled:false},{mode:'simulation' as const}]){const {api,request}=await setup(options);assert.notEqual((await(await api.post(request(await body()))).json()).status,'complete');}});
test('truncated, blank and untrusted structured outputs cannot become usable transcription',async()=>{for(const response of [wire('Partial text','length'),wire('   '),Response.json({choices:[{finish_reason:'stop',message:{role:'assistant',content:'Invented result',tool_calls:[]}}]})]){let calls=0;const {api,request}=await setup({fetcher:async()=>{calls++;return response;}});assert.notEqual((await(await api.post(request(await body()))).json()).status,'complete');assert.equal(calls,1);}});
test('image reader preserves uncertainty markers and does not retry provider errors',async()=>{let calls=0;const {api,request}=await setup({fetcher:async()=>{calls++;return wire('Please pay HK$[unreadable] before work.');}});const result=await(await api.post(request(await body()))).json();assert.equal(result.status,'complete');assert.ok(result.warnings.length>0);assert.ok(result.text.includes('[unreadable]'));assert.equal(calls,1);
 const failed=await setup({fetcher:async()=>{calls++;return new Response('private provider detail',{status:500});}});const error=await(await failed.api.post(failed.request(await body()))).json();assert.equal(error.errorCode,'provider_error');assert.ok(!JSON.stringify(error).includes('private provider detail'));assert.equal(calls,2);
});
test('image response validation binds request identity and rejects remote/executable payload fields',async()=>{const mod=await contractPromise;assert.ok(mod);const complete={contractVersion:'image-intake-1.0.0',requestId:'image-request-01',status:'complete',mode:'live',text:'Payment requested.',modelId:'qwen-vl-ocr-2025-11-20',warnings:[],usage:{inputTokens:10,outputTokens:5}};assert.ok(mod.validateImageResponse(complete,'image-request-01'));assert.equal(mod.validateImageResponse({...complete,requestId:'different-request'},'image-request-01'),false);assert.equal(mod.validateImageResponse({...complete,url:'https://example.com'},'image-request-01'),false);});

test('OCR shares the existing paid-attempt quota and does not make a sixth provider call',async()=>{let calls=0;const {api,request}=await setup({fetcher:async()=>{calls++;return wire();}});const value=await body();for(let i=0;i<5;i++)assert.equal((await(await api.post(request({...value,requestId:'quota-image-'+i}))).json()).status,'complete');const blocked=await api.post(request({...value,requestId:'quota-image-last'}));assert.equal(blocked.status,429);assert.equal(calls,5);});
test('oversized decoded dimensions cannot reach OCR even when compressed bytes are small',async()=>{let calls=0;const {api,request}=await setup({fetcher:async()=>{calls++;return wire();}});const png=await sharp({create:{width:3000,height:3000,channels:3,background:'white'}}).png().toBuffer();const value={...await body(),image:'data:image/png;base64,'+png.toString('base64')};assert.equal((await(await api.post(request(value))).json()).errorCode,'invalid_image');assert.equal(calls,0);});

test('strict structured text configuration does not disable the independent plain-text OCR transport',async()=>{let calls=0;const {api,request}=await setup({responseMode:'json_schema',fetcher:async(_url,init)=>{calls++;const body=JSON.parse(String(init?.body));assert.equal(body.model,'qwen-vl-ocr-2025-11-20');assert.equal(body.response_format,undefined);return wire();}});const r=await api.post(request(await body()));assert.equal((await r.json()).status,'complete');assert.equal(calls,1);});
