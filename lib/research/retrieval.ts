import '../analysis/server-guard.ts';
import {requireLoadedLibrary} from '../knowledge/index.ts';
import type {ReferenceLibrary} from '../knowledge/index.ts';
import published from '../../knowledge/published-cases.json';
import {safeReferenceUrl,plainText} from './contracts.ts';
import type {ResearchReference} from './contracts.ts';
import {checkedPublicPassages,hasNamedPublicCompany} from './source-passages.ts';

type Passage={reference:ResearchReference;topics:readonly string[];search:string};
const topicTerms:Record<string,RegExp>={
 K_TASK_RECHARGE:/recharge|unlock|commission|withdraw|task|任務|任务|充值|取款|佣金/i,
 K_PERSONAL_BORROWING:/borrow|loan|debt|lender|repay|借貸|借贷|借款|貸款|贷款|還款|还款|欠債|欠债/i,
 K_COMPANY_PAID:/company[ -](?:paid|funded|pays)|company pays|prohibit|no personal payment|公司.*(?:支付|付款)|禁止|不得借貸|不得借贷/i,
 K_PAYROLL:/payroll|salary|otp|password|account control|出糧|出粮|薪金|工资|工資|戶口|户口|密碼|密码|驗證碼|验证码/i,
 K_UNKNOWN:/payer.*(?:missing|unknown|not specified)|who pays|付款人不明|誰付款|谁付款|未說明.*付款|未说明.*付款/i,
 K_ALREADY_ACTED:/already (?:paid|borrowed|acted|sent)|already transferred|已付款|已轉賬|已转账|已轉帳|已借貸|已借贷|已經|已经/i,
 K_ORDINARY_EXPENSE:/transport|travel|expense|reimburse|交通|車費|车费|報銷|报销|開支|开支/i,
};
const stop=new Set('the and for are you your why how what who when where with this that from through does can should have has into their them they our own not work job text about money need asks asked'.split(' '));
function tokens(value:string){const latin=(value.toLowerCase().match(/[a-z]{3,}/g)??[]).filter(t=>!stop.has(t));const chinese=(value.match(/[\u3400-\u9fff]{2,}/g)??[]).flatMap(run=>Array.from({length:run.length-1},(_,i)=>run.slice(i,i+2)));return [...new Set([...latin,...chinese])];}
function corpus(library:ReferenceLibrary,locale:'en-HK'|'zh-Hant-HK'):Passage[]{
 requireLoadedLibrary(library);
 const cards=library.cards.flatMap(card=>{
  const source=card.sourceIds.map(id=>library.sources.find(s=>s.id===id)).find(s=>s&&safeReferenceUrl(s.url,'knowledge'));
  if(!source)return [];
  const title=library.localeStrings[locale][card.localeKey+'.title']||card.title;
  // Use reviewed localized wording; relationship annotations currently exist in English only.
  const excerpt=(locale==='zh-Hant-HK'?[library.localeStrings[locale][card.localeKey+'.question']]:[library.localeStrings[locale][card.localeKey+'.question'],...card.dangerousRelationships,...card.benignControls]).filter(Boolean).join(' ').slice(0,1200);
  const reference:ResearchReference={id:card.id,sourceIds:[...card.sourceIds],title,url:source.url,excerpt,contentType:'team_synthesis',reviewStatus:card.approvalStatus,checkedOn:card.checkedOn};
  return plainText(title,220)&&plainText(excerpt,1200)?[{reference,topics:[card.id],search:[card.title,title,excerpt,...card.tags].join(' ').toLowerCase()}]:[];
 });
 const reports=published.cases.flatMap(item=>{
  if(!safeReferenceUrl(item.source.url,'knowledge'))return [];
  const sourceIds=library.sources.filter(s=>s.url===item.source.url).map(s=>s.id);
  const excerpt=[item.summary,item.notice,item.limitation].join(' ').slice(0,1200);
  const reference:ResearchReference={id:item.id,sourceIds:sourceIds.length?sourceIds:[item.id],title:item.title,url:item.source.url,excerpt,contentType:'published_case_summary',reviewStatus:'draft',checkedOn:item.source.checkedOn};
  return plainText(reference.title,220)&&plainText(excerpt,1200)?[{reference,topics:item.relatedTopics,search:[item.title,excerpt,...item.stages,item.question].join(' ').toLowerCase()}]:[];
 });
 return [...cards,...reports];
}
export function retrieveReferences(library:ReferenceLibrary,question:string,locale:'en-HK'|'zh-Hant-HK',topicIds:readonly string[]=[],approvedOnly=false,includeSourceChecked=false):ResearchReference[]{
 if(includeSourceChecked)return retrieveGoverned(library,question,locale,topicIds,approvedOnly);
 const words=tokens(question),matched=Object.entries(topicTerms).filter(([,pattern])=>pattern.test(question)).map(([id])=>id);
 return corpus(library,locale).filter(p=>!approvedOnly||p.reference.reviewStatus==='approved').map(p=>{
  const lexical=words.filter(t=>p.search.includes(t)).length;
  const topical=p.topics.reduce((sum,t)=>sum+(topicIds.includes(t)?20:matched.includes(t)?6:0),0);
  return {...p,score:topical+lexical,eligible:topical>0||lexical>=2};
 }).filter(p=>p.eligible).sort((a,b)=>b.score-a.score||(a.reference.contentType==='team_synthesis'?-1:1)).slice(0,3).map(p=>p.reference);
}


function retrieveGoverned(library:ReferenceLibrary,question:string,locale:'en-HK'|'zh-Hant-HK',topicIds:readonly string[],approvedOnly:boolean):ResearchReference[]{
 requireLoadedLibrary(library);
 const words=tokens(question),matched=Object.entries(topicTerms).filter(([,p])=>p.test(question)).map(([id])=>id);
 const namedCompany=hasNamedPublicCompany(question);
 const primary=corpus(library,locale).filter(p=>p.reference.contentType==='team_synthesis'&&(!approvedOnly||p.reference.reviewStatus==='approved')).map(p=>{
  const lexical=words.filter(t=>p.search.includes(t)).length;
  const topical=p.topics.reduce((n,t)=>n+(topicIds.includes(t)?20:matched.includes(t)?6:0),0);
  const eligible=namedCompany?matched.some(t=>p.topics.includes(t)):topical>0||lexical>=2;
  return {...p,score:topical+lexical,eligible};
 }).filter(p=>p.eligible).sort((a,b)=>b.score-a.score).map(p=>p.reference);
 const supplementary=library.status==='approved'?checkedPublicPassages(question,locale).map(p=>p.reference):[];
 if(!supplementary.length)return primary.slice(0,3);
 // Reserve relevant core distinctions; a case cannot crowd out the policy being explained.
 const selected=primary.slice(0,2);return [...selected,...supplementary.slice(0,3-selected.length)];
}
