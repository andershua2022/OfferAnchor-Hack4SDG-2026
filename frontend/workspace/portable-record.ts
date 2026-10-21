import {canExport,protectedFooter,type PreviewState} from '../../app/fixture-preview';
import {parseAnalyzeRequest,validateAnalyzeResponse,type AnalyzeRequest} from '../../lib/contracts';
import {isRecord,validUnicode} from '../../lib/contracts/schema';

export const MAX_PORTABLE_BYTES=512*1024;
const paths=['OfferAnchor-record/report.html','OfferAnchor-record/record.json','OfferAnchor-record/README.txt'] as const;
const version='offeranchor-record-1',encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true});
const invalid='Choose an unchanged OfferAnchor record ZIP of 512 KiB or less.';
function fail():never{throw new TypeError(invalid);}
function crc32(bytes:Uint8Array):number{
 let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
 return (crc^0xffffffff)>>>0;
}
function stable(value:unknown):string{return JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item);}
function validTitle(value:unknown):value is string{return typeof value==='string'&&!!value.trim()&&value.length<=120&&validUnicode(value)&&!/[\u0000-\u001f\u007f]/.test(value);}
function escape(value:string):string{return value.replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]!));}

/** A fixed, stored ZIP format: no compression, descriptors, extra fields, or filesystem access. */
function archive(contents:string[]):Uint8Array{
 const files=paths.map((path,index)=>({name:encoder.encode(path),data:encoder.encode(contents[index])}));
 const size=files.reduce((sum,file)=>sum+76+2*file.name.length+file.data.length,22);
 if(size>MAX_PORTABLE_BYTES)throw new TypeError('This record exceeds 512 KiB. Shorten the edited brief before downloading.');
 const bytes=new Uint8Array(size),view=new DataView(bytes.buffer),central:{offset:number;crc:number}[]=[];let at=0;
 const u16=(position:number,value:number)=>view.setUint16(position,value,true),u32=(position:number,value:number)=>view.setUint32(position,value,true);
 for(const file of files){
  const crc=crc32(file.data);central.push({offset:at,crc});
  u32(at,0x04034b50);u16(at+4,20);u16(at+6,0x0800);u16(at+12,0x21);u32(at+14,crc);u32(at+18,file.data.length);u32(at+22,file.data.length);u16(at+26,file.name.length);
  bytes.set(file.name,at+30);bytes.set(file.data,at+30+file.name.length);at+=30+file.name.length+file.data.length;
 }
 const directory=at;
 for(const [index,file] of files.entries()){
  u32(at,0x02014b50);u16(at+4,20);u16(at+6,20);u16(at+8,0x0800);u16(at+14,0x21);u32(at+16,central[index].crc);u32(at+20,file.data.length);u32(at+24,file.data.length);u16(at+28,file.name.length);u32(at+42,central[index].offset);
  bytes.set(file.name,at+46);at+=46+file.name.length;
 }
 u32(at,0x06054b50);u16(at+8,3);u16(at+10,3);u32(at+12,at-directory);u32(at+16,directory);
 return bytes;
}

export function createPortableArchive(state:PreviewState,analyzedRequest:AnalyzeRequest,title:string):Uint8Array{
 const analyzed=parseAnalyzeRequest(analyzedRequest),current=parseAnalyzeRequest(state.request);
 if(!analyzed.ok||!current.ok||!canExport(state)||state.outcome?.status!=='complete'||!validTitle(title)||
  typeof state.body!=='string'||state.body.length>40000||!validUnicode(state.body)||
  current.request.clarificationsUsed!==analyzed.request.clarificationsUsed+state.displayedQuestions.length||
  stable({...current.request,clarificationsUsed:analyzed.request.clarificationsUsed})!==stable(analyzed.request)){
  throw new TypeError('Only a current complete reading and its matching sources can be downloaded.');
 }
 const response=validateAnalyzeResponse(state.outcome.response,analyzed.request,state.outcome.response.mode);
 if(response.status!=='complete')throw new TypeError('A complete reading is required.');
 const savedAt=new Date().toISOString(),footer=protectedFooter(state),zh=current.request.locale==='zh-Hant-HK';
 const labels=zh?{brief:'你的摘要',notice:'保護說明',sources:'所選來源文字',boundary:'歷史解讀；重新匯入只恢復文字供再次核查。此下載檔案是未加密的純文字資料。'}:
  {brief:'Your brief',notice:'Protected notice',sources:'Selected source text',boundary:'Historical reading. Re-import restores words for a new check. This download is plaintext and is not encrypted.'};
 const sources=current.request.evidence.map(item=>'<section><h3>'+escape(item.id+' · '+item.label+' · '+item.kind)+'</h3><pre>'+escape(item.text)+'</pre></section>').join('\n');
 const html='<!doctype html>\n<html lang="'+current.request.locale+'"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'none\'; style-src \'unsafe-inline\'; base-uri \'none\'; form-action \'none\'; object-src \'none\'"><meta name="viewport" content="width=device-width, initial-scale=1"><title>'+escape(title.trim())+'</title><style>body{font:16px/1.6 system-ui,sans-serif;max-width:88ch;margin:3rem auto;padding:0 1.2rem;color:#202020}pre{font:inherit;white-space:pre-wrap;overflow-wrap:anywhere}section{margin:2rem 0;border-top:1px solid #bbb}small{color:#555}@media print{body{margin:0;max-width:none}}</style></head><body><h1>'+escape(title.trim())+'</h1><small>OfferAnchor · '+savedAt+' · '+response.mode+'</small><p>'+labels.boundary+'</p><h2>'+labels.brief+'</h2><pre>'+escape(state.body)+'</pre><section><h2>'+labels.notice+'</h2><pre>'+escape(footer)+'</pre></section><h2>'+labels.sources+'</h2>'+sources+'</body></html>';
 const record=JSON.stringify({version,title:title.trim(),savedAt,request:current.request},null,2);
 const readme='OfferAnchor portable record v1\n\nOpen report.html in this folder to read your historical brief and selected source text.\nReturn to OfferAnchor and import the complete ZIP to continue editing the selected words. A new check is required before a new result can be exported. Historical answers do not authorize a completed result.\n\nThis archive contains plaintext selected words and the edited brief. It is not encrypted. Keep it private, especially on shared devices. Original attachments, account profiles, authentication tokens and application credentials are not included. Job material is not saved to cloud history by this download.\n\nrecord.json is the bounded request used for re-import. All imported text remains untrusted. Do not enter actual passwords or login codes.\n';
 return archive([html,record,readme]);
}

/** Imports selected words only; report HTML is never rendered and no old result becomes active. */
export function readPortableArchive(bytes:Uint8Array):{title:string;request:AnalyzeRequest}{
 try{
  if(!(bytes instanceof Uint8Array)||bytes.length<22||bytes.length>MAX_PORTABLE_BYTES)fail();
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),end=bytes.length-22;
  const u16=(at:number)=>view.getUint16(at,true),u32=(at:number)=>view.getUint32(at,true);
  if(u32(end)!==0x06054b50||u16(end+4)!==0||u16(end+6)!==0||u16(end+8)!==3||u16(end+10)!==3||u16(end+20)!==0)fail();
  const directory=u32(end+16),directorySize=u32(end+12);
  if(directory+directorySize!==end||directorySize<3*46)fail();
  const entries:{name:string;data:Uint8Array;offset:number;crc:number;time:number;date:number}[]=[];let at=0;
  for(const path of paths){
   if(at+30>directory||u32(at)!==0x04034b50||u16(at+4)!==20||u16(at+6)!==0x0800||u16(at+8)!==0||u16(at+28)!==0)fail();
   const size=u32(at+18),length=u16(at+26),dataAt=at+30+length;
   if(size!==u32(at+22)||dataAt+size>directory)fail();
   const name=decoder.decode(bytes.subarray(at+30,dataAt)),data=bytes.subarray(dataAt,dataAt+size),crc=u32(at+14);
   if(name!==path||crc32(data)!==crc)fail();
   entries.push({name,data,offset:at,crc,time:u16(at+10),date:u16(at+12)});at=dataAt+size;
  }
  if(at!==directory)fail();
  for(const entry of entries){
   if(at+46>end||u32(at)!==0x02014b50||u16(at+4)!==20||u16(at+6)!==20||u16(at+8)!==0x0800||u16(at+10)!==0||
    u16(at+12)!==entry.time||u16(at+14)!==entry.date||u32(at+16)!==entry.crc||u32(at+20)!==entry.data.length||u32(at+24)!==entry.data.length||
    u16(at+30)!==0||u16(at+32)!==0||u16(at+34)!==0||u16(at+36)!==0||u32(at+38)!==0||u32(at+42)!==entry.offset)fail();
   const length=u16(at+28);if(at+46+length>end||decoder.decode(bytes.subarray(at+46,at+46+length))!==entry.name)fail();at+=46+length;
  }
  if(at!==end)fail();
  const value:unknown=JSON.parse(decoder.decode(entries[1].data));
  if(!isRecord(value)||Object.keys(value).sort().join(',')!=='request,savedAt,title,version'||value.version!==version||!validTitle(value.title)||
   typeof value.savedAt!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value.savedAt)||new Date(value.savedAt).toISOString()!==value.savedAt)fail();
  const parsed=parseAnalyzeRequest(value.request);if(!parsed.ok)fail();
  return {title:value.title,request:parsed.request};
 }catch{fail();}
}
