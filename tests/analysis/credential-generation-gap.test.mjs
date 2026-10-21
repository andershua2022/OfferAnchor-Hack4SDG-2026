import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveProviderExtraction} from '../../lib/analysis/validate.ts';
import {selectPolicyReferences} from '../../lib/contracts/policy.ts';
import {createProviderAdapter} from '../../lib/analysis/provider.ts';
import {constrainSourceSchema} from '../../lib/server/provider-source-schema.ts';
import {CANDIDATE211_SYSTEM_PROMPT} from '../../lib/analysis/prompt-candidate-v2.11.ts';

const read=p=>JSON.parse(readFileSync(new URL('../../'+p,import.meta.url),'utf8'));
const schema=read('contracts/provider-extraction.schema.json');
const cards=read('knowledge/library.json').cards;
const words='Never share an online-banking password or a login OTP with us.';
function control(polarity='prohibited',verb='share_otp',resource='account_control',mechanism='credential_control'){
 const source=polarity==='requested'?'Share the login OTP with us.':words;
 const request={contractVersion:'2.0.0',requestId:'credential-rule-regression',revision:1,locale:'en-HK',clarificationsUsed:0,evidence:[{id:'E1',kind:'instruction',label:'Authored credential control',sequence:1,text:source}]};
 const raw={actions:[{id:'A1',actor:'applicant',verb,polarity,resource,mechanism,recipient:'employer',purpose:source,citations:[{evidenceId:'E1',quote:source,occurrence:1}]}],claims:[],comparisons:[],relationships:[],unknowns:[{id:'U1',issue:'Sender authority is unverified.',kind:'employer_authorization',priority:'context',relatedActionIds:['A1']}],questions:[]};
 return {request,raw};
}

test('prohibited credential verb other remains invalid under the frozen semantic contract',()=>{
 const {request,raw}=control('prohibited','other');
 assert.throws(()=>resolveProviderExtraction(raw,request),error=>error.name==='ContractBoundaryError'&&error.ruleId==='mechanism');
});

test('requested and prohibited credentials retain the same valid verb/resource/mechanism tuple',()=>{
 for(const [polarity,expected] of [['requested','pause_requested_action'],['prohibited','no_personal_financial_request_identified']]){
  const {request,raw}=control(polarity);
  const extraction=resolveProviderExtraction(raw,request);
  assert.equal(extraction.actions[0].polarity,polarity);
  assert.equal(selectPolicyReferences(extraction,cards).guidance,expected);
 }
 const {request,raw}=control('prohibited','share_account_details');
 assert.doesNotThrow(()=>resolveProviderExtraction(raw,request));
});

test('ordinary payroll information stays separate from credential control',()=>{
 const {request,raw}=control('requested','share_account_details','account_information','payroll_information');
 request.evidence[0].text='For payroll, provide your account holder name and account number.';
 raw.actions[0].purpose=request.evidence[0].text;
 raw.actions[0].citations[0].quote=request.evidence[0].text;
 const extraction=resolveProviderExtraction(raw,request);
 assert.equal(selectPolicyReferences(extraction,cards).guidance,'no_personal_financial_request_identified');
});

test('candidate reaches the real provider request with explicit credential prohibition rules and unchanged schema bounds',async()=>{
 const candidate=await import('../../lib/analysis/prompt-candidate-v2.12.ts').catch(()=>null);
 assert.ok(candidate,'The bounded credential-generation candidate must exist before activation.');
 const original=globalThis.fetch,{request,raw}=control();let calls=0;
 globalThis.fetch=async(_url,init)=>{
  calls++;const wire=JSON.parse(init.body),system=wire.messages[0].content;
  assert.equal(wire.response_format.type,'json_object');
  assert.ok(system.startsWith(CANDIDATE211_SYSTEM_PROMPT),'Preserve prior extraction rules.');
  assert.match(system,/requested, prohibited, described and uncertain/);
  assert.match(system,/share_otp \+ account_control \+ credential_control/);
  assert.match(system,/share_account_details \+ account_control \+ credential_control/);
  assert.match(system,/Never use verb other for credential_control/);
  assert.match(system,/Never share[^\n]+share_otp[^\n]+prohibited/);
  const outgoing=JSON.parse(system.split('\nRequired output JSON schema:\n')[1]);
  assert.equal(outgoing.properties.actions.maxItems,4);
  assert.ok(outgoing.properties.actions.items.properties.verb.enum.includes('other'),'Other remains available for supported noncredential actions.');
  assert.equal(outgoing.properties.comparisons.maxItems,0);
  assert.equal(outgoing.properties.relationships.maxItems,0);
  return Response.json({choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(raw)}}]});
 };
 try{
  const provider=createProviderAdapter({apiBaseUrl:'https://dashscope.aliyuncs.com/compatible-mode/v1',apiKey:'synthetic-generation-rule-only',modelId:'qwen3.8-max',region:'cn-beijing',timeoutMs:25000,maxOutputTokens:2400,responseMode:'json_object',temperature:0});
  const result=await provider.extract({request,systemPrompt:candidate.CANDIDATE212_SYSTEM_PROMPT,promptVersion:candidate.CANDIDATE212_PROMPT_VERSION,outputSchema:constrainSourceSchema(schema,request)},new AbortController().signal);
  assert.doesNotThrow(()=>resolveProviderExtraction(JSON.parse(result.jsonText),request));
  assert.equal(calls,1);
 }finally{globalThis.fetch=original;}
});
