import assert from 'node:assert/strict';
import {test} from 'node:test';
import {requestResearch} from '../../frontend/workspace/research-client';
import {requestImageText} from '../../frontend/workspace/image-client';

const input={contractVersion:'research-1.0.0',requestId:'research-trial0001',revision:1,locale:'en-HK',question:'Why check the payer?'} as const;
const response=(status:number,headers:Record<string,string>={})=>new Response(JSON.stringify({errorCode:'quota_exceeded'}),{status,headers:{'Content-Type':'application/json',...headers}});
const send=(value:Response):typeof fetch=>async()=>value;

test('research treats only a marked 429 as lifetime trial exhaustion',async()=>{
 const permanent=await requestResearch(input,'knowledge','live',new AbortController().signal,send(response(429,{'X-OfferAnchor-Trial-Exhausted':'1'})));
 assert.deepEqual(permanent,{ok:false,errorCode:'trial_exhausted'});
 const temporary=await requestResearch(input,'web','live',new AbortController().signal,send(response(429)));
 assert.deepEqual(temporary,{ok:false,errorCode:'quota_exceeded'});
 const misleading=await requestResearch(input,'knowledge','live',new AbortController().signal,send(response(503,{'X-OfferAnchor-Trial-Exhausted':'1'})));
 assert.deepEqual(misleading,{ok:false,errorCode:'quota_exceeded'});
});

test('image reader gives the shared trial message only for a marked 429',async()=>{
 const permanent=await requestImageText('data:image/jpeg;base64,AAAA',new AbortController().signal,send(response(429,{'X-OfferAnchor-Trial-Exhausted':'1'}))).then(()=>null,error=>error.message);
 assert.equal(permanent,'Your trial allowance is used up. Prepared examples are still available.');
 const temporary=await requestImageText('data:image/jpeg;base64,AAAA',new AbortController().signal,send(response(429))).then(()=>null,error=>error.message);
 assert.equal(temporary,'The shared call limit was reached. Wait before reading more images.');
 const misleading=await requestImageText('data:image/jpeg;base64,AAAA',new AbortController().signal,send(response(503,{'X-OfferAnchor-Trial-Exhausted':'1'}))).then(()=>null,error=>error.message);
 assert.equal(misleading,'The image response could not be validated.');
});
