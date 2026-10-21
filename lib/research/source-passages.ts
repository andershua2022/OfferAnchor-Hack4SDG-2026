import '../analysis/server-guard.ts';
import {createHash} from 'node:crypto';
import cases from '../../knowledge/published-cases.json';
import catalog from '../../knowledge/research-passages.json';
import core from '../../knowledge/library.json';
import {plainText,safeReferenceUrl} from './contracts.ts';
import type {ResearchReference} from './contracts.ts';

type SourceCase=(typeof cases.cases)[number];
const normalized=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/[-‐‑‒–—]+/g,' ').replace(/\s+/g,' ').trim();
export function sourceCheckedReference(item:SourceCase,locale:'en-HK'|'zh-Hant-HK'):ResearchReference|null{
 const entry=catalog.records.find(r=>r.id===item.id);
 if(catalog.reviewKind!=='agent_source_checked'||catalog.humanApprovalGranted!==false||!catalog.ownerAuthorizedScope||!entry||
    createHash('sha256').update(JSON.stringify(item)).digest('hex')!==entry.sourceDigest||!safeReferenceUrl(item.source.url,'knowledge'))return null;
 const title=locale==='zh-Hant-HK'?entry.zhTitle:item.title;
 const excerpt=locale==='zh-Hant-HK'?entry.zhExcerpt:[item.summary,item.notice,item.limitation].join(' ');
 if(!plainText(title,220)||!plainText(excerpt,1200))return null;
 const sourceIds=core.sources.filter(s=>s.url===item.source.url).map(s=>s.id);
 return {id:item.id,sourceIds:sourceIds.length?sourceIds:[item.id],title,url:item.source.url,excerpt,contentType:'published_case_summary',reviewStatus:'source_checked',checkedOn:catalog.checkedOn};
}
export function checkedPublicPassages(query:string,locale:'en-HK'|'zh-Hant-HK'):{reference:ResearchReference;score:number}[]{
 const text=normalized(query),namedCompanies=catalog.records.filter(r=>r.companyAliases.some(alias=>text.includes(normalized(alias)))).map(r=>r.id);
 return cases.cases.flatMap(item=>{
  const entry=catalog.records.find(r=>r.id===item.id);
  if(!entry||item.kind==='company_practice'&&namedCompanies.length>0&&!namedCompanies.includes(item.id)||!entry.matchGroups.every(group=>group.some(alias=>text.includes(normalized(alias)))))return [];
  // A generic question cannot silently inherit an unrelated company's policy.
  if(item.kind==='company_practice'&&item.id!=='P_HKEX_PAYROLL'&&!namedCompanies.includes(item.id))return [];
  const reference=sourceCheckedReference(item,locale);if(!reference)return [];
  const matches=entry.matchGroups.flat().filter(alias=>text.includes(normalized(alias))).length;
  return [{reference,score:matches+entry.matchGroups.length*3+(entry.priorityTerms.some(alias=>text.includes(normalized(alias)))?6:0)}];
 }).sort((a,b)=>b.score-a.score);
}
export function hasNamedPublicCompany(query:string):boolean{
 const text=normalized(query);return catalog.records.some(r=>r.companyAliases.some(alias=>text.includes(normalized(alias))));
}
export function isCheckedAnswerReference(reference:ResearchReference,locale:'en-HK'|'zh-Hant-HK'):boolean{
 const item=cases.cases.find(r=>r.id===reference.id);if(!item)return false;
 const expected=sourceCheckedReference(item,locale);if(!expected)return false;
 return (Object.keys(expected) as (keyof ResearchReference)[]).every(k=>JSON.stringify(reference[k])===JSON.stringify(expected[k]));
}
