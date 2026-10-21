import {isRecord,validUnicode} from '../contracts/schema.ts';

export const RESEARCH_VERSION='research-1.0.0' as const;
export const TOPIC_IDS=['K_TASK_RECHARGE','K_PERSONAL_BORROWING','K_COMPANY_PAID','K_PAYROLL','K_UNKNOWN','K_ALREADY_ACTED','K_ORDINARY_EXPENSE'] as const;
export const WEB_DOMAINS=['adcc.gov.hk','police.gov.hk','jobs.gov.hk','labour.gov.hk','pcpd.org.hk','cr.gov.hk'] as const;
const localDomains=[...WEB_DOMAINS,'cyberdefender.hk','ocbc.com.hk','hkex.com.hk','teekay.com','hays.com.hk','cathaypacific.com','archive.fdic.gov','ic3.gov','hsbc.com.hk'];
export type ResearchKind='knowledge'|'web';
export type ResearchMode='live'|'simulation';
type ResearchBase={contractVersion:typeof RESEARCH_VERSION;requestId:string;revision:number;locale:'en-HK'|'zh-Hant-HK'};
export type ResearchInput=ResearchBase & ({question:string;topicIds?:string[];query?:never}|{query:string;question?:never;topicIds?:never});
export type ResearchReference={id:string;sourceIds:string[];title:string;url:string;excerpt:string;contentType:'team_synthesis'|'published_case_summary'|'search_snippet';reviewStatus:'draft'|'approved'|'source_checked'|'unreviewed';checkedOn:string};
export type ResearchErrorCode='feature_disabled'|'not_configured'|'simulation_unavailable'|'insufficient_evidence'|'private_query'|'provider_error'|'invalid_output'|'timeout'|'cancelled';
export type ResearchBinding={requestId:string;revision:number;kind:ResearchKind;mode:ResearchMode};
type ResponseBase=ResearchBinding & {contractVersion:typeof RESEARCH_VERSION;references:ResearchReference[]};
export type ResearchResponse=ResponseBase & ({status:'complete';answer:string}|{status:'sources_only';answer:null}|{status:'incomplete';answer:null;errorCode:ResearchErrorCode});
const errors:ResearchErrorCode[]=['feature_disabled','not_configured','simulation_unavailable','insufficient_evidence','private_query','provider_error','invalid_output','timeout','cancelled'];
export function plainText(value:unknown,max:number):value is string {
 return typeof value==='string'&&value.trim().length>0&&value.length<=max&&validUnicode(value)&&!/[\u0000-\u0008\u000b-\u001f\u007f<>]/u.test(value);
}
function fields(value:Record<string,unknown>,required:string[],optional:string[]=[]){return required.every(k=>Object.hasOwn(value,k))&&Object.keys(value).every(k=>required.includes(k)||optional.includes(k));}
function identifier(value:unknown):value is string{return typeof value==='string'&&/^[A-Za-z0-9_-]{8,64}$/.test(value);}
export function safeReferenceUrl(value:unknown,kind:ResearchKind):value is string {
 if(typeof value!=='string'||value.length>2048)return false;
 try{
  const u=new URL(value),domains=kind==='web'?WEB_DOMAINS:localDomains;
  return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!u.hash&&
   domains.some(d=>u.hostname===d||u.hostname.endsWith('.'+d))&&
   ![...u.searchParams.keys()].some(k=>/(?:token|secret|password|otp|authorization|session|signature|api.?key|^code$|^key$|^auth$|^sid$|jwt|credential)/i.test(k));
 }catch{return false;}
}
export function parseResearchInput(value:unknown,kind:ResearchKind):ResearchInput|null {
 if(!isRecord(value)||!fields(value,['contractVersion','requestId','revision','locale',kind==='knowledge'?'question':'query'],kind==='knowledge'?['topicIds']:[])||
  value.contractVersion!==RESEARCH_VERSION||!identifier(value.requestId)||!Number.isSafeInteger(value.revision)||(value.revision as number)<1||
  !['en-HK','zh-Hant-HK'].includes(value.locale as string)||!plainText(value[kind==='knowledge'?'question':'query'],kind==='knowledge'?500:300))return null;
 if(Object.hasOwn(value,'topicIds')&&(!Array.isArray(value.topicIds)||value.topicIds.length>3||new Set(value.topicIds).size!==value.topicIds.length||!value.topicIds.every(id=>TOPIC_IDS.includes(id as typeof TOPIC_IDS[number]))))return null;
 return value as ResearchInput;
}
function reference(value:unknown,kind:ResearchKind):value is ResearchReference {
 if(!isRecord(value)||!fields(value,['id','sourceIds','title','url','excerpt','contentType','reviewStatus','checkedOn'])||
  typeof value.id!=='string'||!/^[A-Z][A-Z0-9_]{1,63}$/.test(value.id)||!Array.isArray(value.sourceIds)||value.sourceIds.length<1||value.sourceIds.length>8||
  new Set(value.sourceIds).size!==value.sourceIds.length||!value.sourceIds.every(id=>typeof id==='string'&&/^(?:S\d{2}|W[1-3]|P_[A-Z0-9_]{1,60})$/.test(id))||
  !plainText(value.title,220)||!plainText(value.excerpt,1200)||!safeReferenceUrl(value.url,kind)||
  typeof value.checkedOn!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value.checkedOn)||!Number.isFinite(Date.parse(value.checkedOn))||new Date(value.checkedOn).toISOString().slice(0,10)!==value.checkedOn)return false;
 return kind==='web'?/^W[1-3]$/.test(value.id)&&value.contentType==='search_snippet'&&value.reviewStatus==='unreviewed':
  /^(?:K_|P_)/.test(value.id)&&['team_synthesis','published_case_summary'].includes(value.contentType as string)&&
  (['draft','approved'].includes(value.reviewStatus as string)||/^P_/.test(value.id)&&value.contentType==='published_case_summary'&&value.reviewStatus==='source_checked');
}
export function validateResearchResponse(value:unknown,expected?:ResearchBinding):value is ResearchResponse {
 if(!isRecord(value)||!['complete','sources_only','incomplete'].includes(value.status as string)||!fields(value,['contractVersion','requestId','revision','kind','mode','status','answer','references'],value.status==='incomplete'?['errorCode']:[])||
  value.contractVersion!==RESEARCH_VERSION||!identifier(value.requestId)||!Number.isSafeInteger(value.revision)||(value.revision as number)<1||
  !['knowledge','web'].includes(value.kind as string)||!['simulation','live'].includes(value.mode as string)||
  !Array.isArray(value.references)||value.references.length>3||!value.references.every(r=>reference(r,value.kind as ResearchKind))||new Set(value.references.map(r=>r.id)).size!==value.references.length)return false;
 if(expected&&Object.entries(expected).some(([key,item])=>value[key]!==item))return false;
 if(value.status==='incomplete')return value.answer===null&&errors.includes(value.errorCode as ResearchErrorCode);
 if(value.references.length===0)return false;
 if(value.status==='sources_only')return value.answer===null;
 return value.kind==='knowledge'&&value.mode==='live'&&plainText(value.answer,1600)&&value.references.every(r=>r.reviewStatus==='approved'||r.reviewStatus==='source_checked'&&r.contentType==='published_case_summary'&&r.id.startsWith('P_'));
}


