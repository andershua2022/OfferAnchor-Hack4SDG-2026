import assert from 'node:assert/strict';
import {test} from 'node:test';
import {crc32} from 'node:zlib';
import {chromium} from '@playwright/test';
import {initialState,previewFixture,previewReducer,protectedFooter,type PreviewState} from '../../app/fixture-preview';
import type {AnalyzeRequest} from '../../lib/contracts';
const modulePromise=import('../../frontend/workspace/portable-record').catch(()=>null);
const names=['OfferAnchor-record/report.html','OfferAnchor-record/record.json','OfferAnchor-record/README.txt'];
async function api(){const value=await modulePromise;assert.ok(value,'Portable records must be implemented');return value;}
function complete(fixtureId='task-en',live=false){
 let state=previewReducer(initialState(),{type:'load',fixtureId});
 state=previewReducer(state,{type:'start',requestId:'portable_test_0001',now:0});
 const request=structuredClone(state.request) as AnalyzeRequest,outcome=previewFixture(request);
 assert.equal(outcome.status,'complete');if(outcome.status!=='complete')throw Error('Fixture missing');
 if(live)Object.assign(outcome.response,{mode:'live',provenance:{...outcome.response.provenance,promptVersion:'extract-v2.23',modelId:'synthetic-model'}});
 state=previewReducer(state,{type:'finish',requestId:request.requestId,revision:request.revision,outcome,now:1});
 return {state,request};
}
function entries(bytes:Uint8Array):[string,Uint8Array][]{
 const data=Buffer.from(bytes),result:[string,Uint8Array][]=[];let at=0;
 while(data.readUInt32LE(at)===0x04034b50){const size=data.readUInt32LE(at+18),length=data.readUInt16LE(at+26),extra=data.readUInt16LE(at+28),start=at+30+length+extra;
  result.push([data.toString('utf8',at+30,at+30+length),data.subarray(start,start+size)]);at=start+size;}
 assert.equal(data.readUInt32LE(at),0x02014b50);return result;
}
// Independent fixtures use Node's CRC and Buffer ZIP fields, not the browser parser.
function zip(files:[string,Uint8Array][]):Uint8Array{
 const local:Buffer[]=[],central:Buffer[]=[];let offset=0;
 for(const [name,bytes] of files){const filename=Buffer.from(name),data=Buffer.from(bytes),header=Buffer.alloc(30),index=Buffer.alloc(46),crc=crc32(data);
  header.writeUInt32LE(0x04034b50);header.writeUInt16LE(20,4);header.writeUInt16LE(0x0800,6);header.writeUInt16LE(0x21,12);header.writeUInt32LE(crc,14);header.writeUInt32LE(data.length,18);header.writeUInt32LE(data.length,22);header.writeUInt16LE(filename.length,26);
  index.writeUInt32LE(0x02014b50);index.writeUInt16LE(20,4);index.writeUInt16LE(20,6);index.writeUInt16LE(0x0800,8);index.writeUInt16LE(0x21,14);index.writeUInt32LE(crc,16);index.writeUInt32LE(data.length,20);index.writeUInt32LE(data.length,24);index.writeUInt16LE(filename.length,28);index.writeUInt32LE(offset,42);
  local.push(header,filename,data);central.push(index,filename);offset+=header.length+filename.length+data.length;
 }
 const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
 return Buffer.concat([...local,directory,end]);
}
const text=(bytes:Uint8Array)=>new TextDecoder().decode(bytes);

test('standard stored ZIP roundtrip preserves live and simulation source text and only restores editing material',async()=>{
 const mod=await api();assert.ok(mod.MAX_PORTABLE_BYTES<=512*1024);
 for(const live of [false,true]){const {state,request}=complete('missing-payer-en',live),bytes=mod.createPortableArchive(state,request,'My local record');
  assert.equal(new DataView(bytes.buffer,bytes.byteOffset).getUint32(0,true),0x04034b50);const files=entries(bytes);assert.deepEqual(files.map(([name])=>name),names);
  for(const [name,data] of files)assert.ok(data.length>0,name);
  const restored=mod.readPortableArchive(bytes);assert.deepEqual(restored,{title:'My local record',request:state.request});
  assert.deepEqual(Object.keys(restored).sort(),['request','title']);assert.equal('response' in restored,false);
  const json=JSON.parse(text(files[1][1]));assert.deepEqual(Object.keys(json).sort(),['request','savedAt','title','version']);assert.equal(json.version,'offeranchor-record-1');assert.equal(new Date(json.savedAt).toISOString(),json.savedAt);
  assert.ok(text(files[2][1]).includes('plaintext'));assert.ok(text(files[2][1]).includes('not encrypted'));assert.ok(text(files[0][1]).includes(protectedFooter(state).split('\n')[0]));
 }
});

test('readable report escapes hostile source/title/edited brief and cannot execute or request resources',async()=>{
 const mod=await api(),{state,request}=complete(),hostile='<script>globalThis.__portableExecuted=1</script><img src="https://private.invalid/x" onerror="globalThis.__portableExecuted=1">';
 request.evidence.push({id:'E8',kind:'user_note',sequence:8,label:'Private <b>label</b>',text:hostile+'\n原文 & exact quotation'});
 state.request=structuredClone(request);state.body=hostile+'\nUser edited brief';const bytes=mod.createPortableArchive(state,request,'<b>Hostile title</b>'),html=text(entries(bytes)[0][1]);
 assert.ok(html.includes('&lt;b&gt;Hostile title&lt;/b&gt;'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('&lt;img'));assert.ok(html.includes('User edited brief'));assert.ok(html.includes('edited: true'));assert.ok(html.includes('Content-Security-Policy'));assert.ok(html.includes("default-src 'none'"));assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img '));
 assert.deepEqual(mod.readPortableArchive(bytes).request.evidence,request.evidence);
 const browser=await chromium.launch({channel:'chrome',headless:true});try{const page=await browser.newPage();let requests=0;await page.route('**/*',route=>{requests++;return route.abort();});await page.setContent(html);assert.equal(await page.evaluate(()=>Reflect.get(globalThis,'__portableExecuted')),undefined);assert.equal(requests,0);assert.ok((await page.locator('body').innerText()).includes(hostile));}finally{await browser.close();}
});

test('export refuses incomplete, changed input, stale binding and invalid complete output while permitting edited brief',async()=>{
 const mod=await api(),{state,request}=complete();
 const bad:PreviewState[]=[{...state,phase:'editing'},{...state,outcome:{status:'incomplete',errorCode:'timeout',retryable:true}},{...state,request:{...state.request,revision:99}},{...state,request:{...state.request,evidence:state.request.evidence.map((e,i)=>i?e:{...e,text:e.text+' changed'})}},{...state,request:{...state.request,clarificationsUsed:2}},{...state,body:'broken\ud800'}];
 for(const value of bad)assert.throws(()=>mod.createPortableArchive(value,request,'Test'));
 assert.throws(()=>mod.createPortableArchive(state,{...request,requestId:'different_00001'},'Test'));
 const invalid=structuredClone(state);if(invalid.outcome?.status==='complete')invalid.outcome.response.extraction.actions[0].citations[0].quote='unsupported invented quote';assert.throws(()=>mod.createPortableArchive(invalid,request,'Test'));
 assert.throws(()=>mod.createPortableArchive(state,request,' '));assert.throws(()=>mod.createPortableArchive(state,request,'x'.repeat(121)));
 assert.ok(mod.createPortableArchive({...state,body:'My edited summary'},request,'Test').length>0);
});

test('CRC tampering in every file and mismatched local/central metadata is rejected',async()=>{
 const mod=await api(),{state,request}=complete(),archive=mod.createPortableArchive(state,request,'Test'),files=entries(archive);
 for(let i=0;i<3;i++){const damaged=Uint8Array.from(archive),needle=files[i][1],start=Buffer.from(archive).indexOf(Buffer.from(needle));assert.ok(start>=0);damaged[start]^=1;assert.throws(()=>mod.readPortableArchive(damaged));}
 const end=archive.length-22,central=new DataView(archive.buffer,archive.byteOffset).getUint32(end+16,true);
 for(const [position,value] of [[6,1],[8,8],[22,0x7fffffff],[central+42,1],[central+8,1],[central+10,8],[end+4,1],[end+8,2]]){
  const changed=Uint8Array.from(archive),view=new DataView(changed.buffer);if(position===22||position===central+42)view.setUint32(position,value,true);else view.setUint16(position,value,true);assert.throws(()=>mod.readPortableArchive(changed));
 }
});

test('own-format parser rejects traversal, duplicates, foreign entries and oversized or truncated archives',async()=>{
 const mod=await api(),{state,request}=complete(),archive=mod.createPortableArchive(state,request,'Test'),files=entries(archive);
 for(const renamed of ['../record.json','/record.json','OfferAnchor-record/../record.json','OfferAnchor-record\\record.json',names[0],'foreign.txt']){
  assert.throws(()=>mod.readPortableArchive(zip(files.map((item,i)=>i===1?[renamed,item[1]]:item))));
 }
 assert.throws(()=>mod.readPortableArchive(zip(files.slice(0,2))));assert.throws(()=>mod.readPortableArchive(zip([...files,['extra.txt',new Uint8Array([1])]])));
 assert.throws(()=>mod.readPortableArchive(new Uint8Array(mod.MAX_PORTABLE_BYTES+1)));assert.throws(()=>mod.readPortableArchive(archive.subarray(0,archive.length-1)));assert.throws(()=>mod.readPortableArchive(Buffer.concat([archive,Buffer.from([0])])));assert.throws(()=>mod.readPortableArchive(new Uint8Array([80,75,3,4])));
});

test('import validates the JSON request and envelope and never trusts a forged historical response',async()=>{
 const mod=await api(),{state,request}=complete(),files=entries(mod.createPortableArchive(state,request,'Test')),record=JSON.parse(text(files[1][1]));
 for(const changed of [{...record,version:'foreign-v1'},{...record,title:''},{...record,savedAt:'2026-02-31'},{...record,response:{status:'complete'}},{...record,request:{...request,account:'forged'}},{...record,request:{...request,evidence:[]}}]){
  const rewritten=files.map((item,i):[string,Uint8Array]=>i===1?[item[0],new TextEncoder().encode(JSON.stringify(changed))]:item);assert.throws(()=>mod.readPortableArchive(zip(rewritten)));
 }
 const restored=mod.readPortableArchive(zip(files));restored.request.evidence[0].text='Changed after import';assert.notEqual(mod.readPortableArchive(zip(files)).request.evidence[0].text,'Changed after import');
});
