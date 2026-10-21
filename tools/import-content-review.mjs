import {readFileSync,writeFileSync,existsSync,lstatSync,mkdirSync,renameSync,unlinkSync} from 'node:fs';
import {resolve,dirname,relative,isAbsolute} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import {loadReferenceLibrary} from '../lib/knowledge/index.ts';
const root=fileURLToPath(new URL('../',import.meta.url));
const check=(v,message)=>{if(!v)throw Error(message);};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const hashKeys=['knowledge/library.json','locales/en-HK.json','locales/zh-Hant-HK.json','evals/student/development-cases.json'];
export function flattenLocale(value,prefix='',out={}){
 check(value&&typeof value==='object'&&!Array.isArray(value),'Invalid locale object');
 for(const [key,item]of Object.entries(value)){const path=prefix?prefix+'.'+key:key;if(typeof item==='string')out[path]=item;else flattenLocale(item,path,out);}
 return out;
}
export function localeGroupIds(locale){
 const groups=new Set();for(const key of Object.keys(flattenLocale(locale))){const parts=key.split('.');groups.add(parts[0]==='knowledge'?parts.slice(0,3).join('.'):parts[0]);}return [...groups];
}
function reviewer(v){return typeof v==='string'&&/^[A-Za-z0-9._ -]{1,80}$/.test(v)&&v.trim()===v&&!/^(?:agent|codex|fictional|test|ai(?:$|[-_ ])|chatgpt)/i.test(v);}
function validateRecord(record,view,role,ids,material){
 check(record?.project==='OfferAnchor'&&record.recordType==='human_self_report_'+view+'_review'&&record.reviewerRole===role,'Wrong record type or owner role');
 check(reviewer(record.reviewerId)&&record.humanReadingAttested===true,'An actual human self-report is required');
 check(record.humanIdentityIndependentlyVerified===false&&record.productionApprovalApplied===false&&record.independentEvaluation===false,'The record cannot claim independent identity or applied approval');
 check(typeof record.reviewedUtc==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(record.reviewedUtc)&&Number.isFinite(Date.parse(record.reviewedUtc)),'Invalid review date');
 check(record.checkpointId===material.checkpointId,'Stale review checkpoint');
 check(record.sourceHashes&&Object.keys(record.sourceHashes).sort().join('|')===hashKeys.slice().sort().join('|'),'Incomplete reviewed source identity');
 for(const path of hashKeys)check(record.sourceHashes[path]===material.sourceHashes[path]&&/^[a-f0-9]{64}$/.test(record.sourceHashes[path]),'Stale reviewed material');
 check(Array.isArray(record.rows)&&record.rows.length===ids.length,'Missing review groups');
 const rows=new Map();
 for(const row of record.rows){
  check(row&&ids.includes(row.id)&&!rows.has(row.id),'Unknown or duplicate review group');
  check(['accept_existing','needs_change','uncertain'].includes(row.decision),'Unfinished review decision');
  check(typeof row.note==='string'&&row.note.length<=6000&&(row.decision==='accept_existing'||!!row.note.trim()),'Non-acceptance requires a reason');
  rows.set(row.id,row);
 }
 return rows;
}
const designRecordPath='tests/analysis/team-inputs-2026-10-14/design-reviewed-copy/human-language-review.json';
function pinnedDesignRecord(){const bytes=readFileSync(resolve(root,designRecordPath));check(sha(bytes)==='2def645686ea50b5b0c6e49e6d36b3a585d231a67564379f2a2196c9b2d7057a','Pinned Design review identity mismatch');return JSON.parse(bytes.toString('utf8'));}
function validateDesignSelfReport(record,material){
 const pinned=pinnedDesignRecord();
 check(JSON.stringify(record)===JSON.stringify(pinned),'The Design record must be the exact pinned member self-report');
 check(record.recordType==='Design_actual_human_language_review'&&record.reviewerId==='Design'&&record.humanReadingAttested===true,'Missing actual Design language self-report');
 check(record.productionApprovalApplied===false&&record.sourceFactsApproved===false&&record.CommunicationReview==='pending','Language review cannot approve content or release');
 const en=flattenLocale(material.locales['en-HK']);
 check(Object.keys(en).length===record.candidatePairCount,'Incomplete Design candidate');
 for(const locale of ['en-HK','zh-Hant-HK'])check(material.sourceHashes['locales/'+locale+'.json']===record.candidateLocaleHashes[locale],'Changed Design-reviewed locale bytes');
 check(record.groups.every(g=>g.candidateDecision==='Design_human_meaning_accepted'),'Unaccepted Design group');
 const ids=localeGroupIds(material.locales['en-HK']);
 check(ids.every(id=>record.groups.some(g=>g.group===id)),'Unreviewed Design language group');
 return new Map(ids.map(id=>[id,{id,decision:'accept_existing',note:'Preserved exact Design member self-report; no new signature or source approval.'}]));
}
export function compileContentReviews(material,records){
 check(material&&/^[a-f0-9]{64}$/.test(material.checkpointId),'Invalid current checkpoint');
 const en=flattenLocale(material.locales['en-HK']),zh=flattenLocale(material.locales['zh-Hant-HK']);
 check(Object.keys(en).sort().join('|')===Object.keys(zh).sort().join('|'),'Locale keys differ');
 loadReferenceLibrary(material.content,material.locales);
 check(Array.isArray(records)&&records.length===2,'One content and one language record are required');
 const c=records.find(r=>r.recordType==='human_self_report_content_review'),l=records.find(r=>['human_self_report_language_review','Design_actual_human_language_review'].includes(r.recordType));
 check(c&&l&&c.reviewerId!==l.reviewerId,'Distinct actual owner self-reports are required');
 const content=structuredClone(material.content),items=[...content.cards,...content.routes];
 const cr=validateRecord(c,'content','Communication',items.map(x=>x.id),material);
 const lr=l.recordType==='Design_actual_human_language_review'?validateDesignSelfReport(l,material):validateRecord(l,'language','Design',localeGroupIds(material.locales['en-HK']),material);
 const sharedLanguageGroups=[...lr.values()].filter(x=>!x.id.startsWith('knowledge.'));
 const sharedLanguageAccepted=sharedLanguageGroups.every(x=>x.decision==='accept_existing');
 const decisions=[];
 for(const item of items){
  const language=lr.get(item.localeKey),source=cr.get(item.id);
  check(language,'Missing item language group');
  const accepted=source.decision==='accept_existing'&&language.decision==='accept_existing'&&sharedLanguageAccepted;
  item.approvalStatus=accepted?'approved':'draft';item.localizedMeaningApproved=language.decision==='accept_existing';
  item.humanReviewer=accepted?c.reviewerId+' / '+l.reviewerId:null;
  if(!accepted)item.localizedMeaningApproved=false;
  decisions.push({id:item.id,content:source.decision,language:language.decision,approved:accepted});
 }
 content.status=items.every(x=>x.approvalStatus==='approved')&&[...lr.values()].every(x=>x.decision==='accept_existing')?'approved':'draft';
 loadReferenceLibrary(content,material.locales);
 return {content,summary:{project:'OfferAnchor',checkpointId:material.checkpointId,approved:decisions.filter(x=>x.approved).length,blocked:decisions.filter(x=>!x.approved).length,
  humanIdentityIndependentlyVerified:false,productionApprovalApplied:false,independentEvaluation:false,modelCalls:0,
  languageReviewBasis:l.recordType==='Design_actual_human_language_review'?'pinned_Design_member_self_report_exact_candidate_bytes':'current_checkpoint_owner_self_report',sharedLanguageAccepted,nonAcceptedLanguageGroups:[...lr.values()].filter(x=>x.decision!=='accept_existing').map(x=>({id:x.id,decision:x.decision})),decisions}};
}
function checkedFile(path,base){
 const absolute=resolve(base,path),rel=relative(base,absolute);
 check(rel&&!isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('..\\')&&!rel.startsWith('../'),'Invalid record path');
 let current=base;check(!lstatSync(base).isSymbolicLink(),'Symbolic-link base');
 for(const part of rel.split(/[\\/]/)){current=resolve(current,part);check(!lstatSync(current).isSymbolicLink(),'Symbolic-link record path');}
 const info=lstatSync(absolute);check(info.isFile()&&info.size<=256*1024,'Invalid record size');return absolute;
}
export function readReviewedSources(directory){
 const sourceBytes=Object.fromEntries(hashKeys.map(path=>[path,readFileSync(checkedFile(path,directory))]));
 return {sourceBytes,sourceHashes:Object.fromEntries(hashKeys.map(path=>[path,sha(sourceBytes[path])]))};
}
export function assertReviewedSourcesUnchanged(directory,snapshot){
 for(const path of hashKeys)check(sha(readFileSync(checkedFile(path,directory)))===snapshot.sourceHashes[path],'Reviewed material changed before apply');
}
function currentMaterial(){
 const checkpoint=JSON.parse(readFileSync(resolve(root,'tests/analysis/acceptance-review-2026-10-14-r5/checkpoint.json'),'utf8'));
 const snapshot=readReviewedSources(root),read=path=>JSON.parse(snapshot.sourceBytes[path].toString('utf8'));
 return {...snapshot,content:read('knowledge/library.json'),locales:{'en-HK':read('locales/en-HK.json'),'zh-Hant-HK':read('locales/zh-Hant-HK.json')},checkpointId:checkpoint.checkpointSha256};
}
async function main(args){
 if(args.length===1&&args[0]==='--status'){
  const m=currentMaterial();const pending=[...m.content.cards,...m.content.routes].filter(x=>x.approvalStatus!=='approved'||!x.localizedMeaningApproved);
  process.stdout.write(JSON.stringify({project:'OfferAnchor',pending:pending.map(x=>x.id),libraryStatus:m.content.status,contentGateOpen:m.content.status==='approved'&&pending.length===0,modelCalls:0,productionApprovalApplied:false,DesignLanguageRecordAvailable:true,DesignLanguageRecord:designRecordPath})+'\n');return;
 }
 check((args.length===4||args.length===5&&args[4]==='--apply')&&args[0]==='--content-file'&&args[2]==='--language-file','Use --content-file NAME --language-file NAME [--apply]');
 const base=resolve(root,'.local-data/content-reviews');const records=[JSON.parse(readFileSync(checkedFile(args[1],base),'utf8')),args[3]==='design-reviewed-2026-10-14'?pinnedDesignRecord():JSON.parse(readFileSync(checkedFile(args[3],base),'utf8'))];
 const material=currentMaterial(),out=compileContentReviews(material,records);
 if(args[4]==='--apply'){
  // Explicitly applying real self-reports is distinct from merely checking their presence.
  const target=resolve(root,'knowledge/library.json');assertReviewedSourcesUnchanged(root,material);
  const folder=resolve(base,'applied-'+randomUUID());mkdirSync(folder,{recursive:false});
  writeFileSync(resolve(folder,'library-before.json'),material.sourceBytes['knowledge/library.json'],{flag:'wx'});
  writeFileSync(resolve(folder,'audit.json'),JSON.stringify({summary:out.summary,records},null,2),{flag:'wx'});
  const temporary=resolve(dirname(target),'.review-'+randomUUID()+'.tmp');
  writeFileSync(temporary,JSON.stringify(out.content,null,2)+'\n',{flag:'wx'});
  try{assertReviewedSourcesUnchanged(root,material);renameSync(temporary,target);}finally{if(existsSync(temporary))unlinkSync(temporary);}
  out.summary.productionApprovalApplied=true;
  out.summary.nextStep='Run tools/check-ai-ds.mjs; approval changes the evaluation/package identity. Existing ZIP/checkpoint is historical.';
 }
 process.stdout.write(JSON.stringify(out.summary,null,2)+'\n');
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)main(process.argv.slice(2)).catch(()=>{process.stderr.write('Review import blocked: verify complete owner records, source/checkpoint identities and unresolved decisions. No raw record is printed.\n');process.exitCode=1;});
