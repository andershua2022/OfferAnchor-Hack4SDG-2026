import '../analysis/server-guard.ts';
import type {AnalyzeRequest,ProviderExtraction} from '../contracts/index.ts';
import {ContractBoundaryError,requireContract} from '../contracts/errors.ts';
import {isRecord,matchesSchema,type Schema} from '../contracts/schema.ts';
import {createSourceUnitCatalogue,type SourceUnit} from './source-unit-generation.ts';
import {createContextGenerationSchema,resolveContextGeneration,type ContextAtoms} from './context-generation.ts';

type Recipient=ProviderExtraction['actions'][number]['recipient'];
type KnownRecipient=Exclude<Recipient,'unknown'>;
const word=(body:string)=>new RegExp('(?<![\\p{L}\\p{N}_])(?:'+body+')(?![\\p{L}\\p{N}_])','iu');
// Deliberate profile vocabulary, not universal semantic necessity or evidence of receiver binding.
// Exhaustive across the four known public recipient roles; identity and source roles remain unverified.
const markers:Record<KnownRecipient,readonly RegExp[]>={
 applicant:[word('applicant'),/求職者|求职者|申請人|申请人/u],
 employer:[
  word('employer'),/雇主|僱主/u,
  word('(?:our|the\\s+company(?:[\u0027’]s)?)\\s+(?:human\\s+resources|HR)\\s+(?:department|team|office)'),
  /(?:本公司|本企業|本企业)(?:的)?(?:人事部|人力資源部|人力资源部)/u,
 ],
 recruiter:[word('recruiter'),/招聘方|招聘人員|招聘人员|招聘者/u],
 third_party:[
  word('supplier|vendor|lender|third[ -]?party'),
  /供應商|供应商|貸款機構|贷款机构|第三方/u,
  /(?<![\p{L}\p{N}_])(?:to|from|with)\s+the\s+bank(?![\p{L}\p{N}_]|\s*(?:['’]s\s*)?[-–—]?\s*accounts?\b)/iu,
  /(?:向|由|給|给)\s*(?:該|该)?(?:銀行|银行)(?!\s*(?:的\s*)?(?:帳戶|账户|帳號|账号|戶口|户口))/u,
 ],
};
function hasMarker(text:string,role:KnownRecipient):boolean{return markers[role].some(pattern=>pattern.test(text));}
/** Lexical availability only; a permitted role still requires semantic receiver binding in the independent audit. */
export interface SourceRecipientRoleCapability{unitId:string;allowedRecipients:Recipient[];}
export function sourceRecipientRoleCapabilities(request:AnalyzeRequest,catalogue=createSourceUnitCatalogue(request)):SourceRecipientRoleCapability[]{
 const canonical=new Map(createSourceUnitCatalogue(request).map(unit=>[unit.id,unit])),seen=new Set<string>();
 const roles=Object.keys(markers) as KnownRecipient[];
 return catalogue.map(unit=>{
  const original=canonical.get(unit.id);
  requireContract(!seen.has(unit.id)&&original&&original.evidenceId===unit.evidenceId&&original.start===unit.start&&original.end===unit.end&&original.text===unit.text&&original.occurrence===unit.occurrence,'invalid_citation','citation_resolution');
  seen.add(unit.id);
  return {unitId:unit.id,allowedRecipients:['unknown',...roles.filter(role=>hasMarker(unit.text,role))]};
 });
}
export function sourceRecipientRoles(request:AnalyzeRequest):Recipient[]{
 const roles=Object.keys(markers) as KnownRecipient[];
 // Scan each original evidence body independently. Labels and adjacent-source fragments never qualify.
 return ['unknown',...roles.filter(role=>request.evidence.some(e=>hasMarker(e.text,role)))];
}
export function createRoleConstrainedContextSchema(request:AnalyzeRequest,catalogue=createSourceUnitCatalogue(request)):Schema{
 const schema=structuredClone(createContextGenerationSchema(request,catalogue));
 schema.properties!.actions.items!.properties!.recipient.enum=sourceRecipientRoles(request);
 return schema;
}
function parse(text:string):unknown{
 requireContract(typeof text==='string'&&!!text.trim()&&new TextEncoder().encode(text).byteLength<=96*1024,'invalid_output','raw_schema');
 try{return JSON.parse(text);}catch{throw new ContractBoundaryError('invalid_output','raw_schema');}
}
export function resolveRoleConstrainedContext(text:string,request:AnalyzeRequest,catalogue=createSourceUnitCatalogue(request)):{atoms:ContextAtoms;extraction:ProviderExtraction}{
 const value=parse(text),byId=new Map(catalogue.map(unit=>[unit.id,unit]));
 if(isRecord(value))for(const collection of ['actions','context'])if(Array.isArray(value[collection]))for(const row of value[collection])if(isRecord(row)){
  requireContract(Array.isArray(row.unitIds)&&row.unitIds.length>=1&&row.unitIds.length<=2&&row.unitIds.every(id=>typeof id==='string'),'invalid_citation','citation_shape');
  requireContract(row.unitIds.every(id=>byId.has(id)),'invalid_citation','citation_resolution');
 }
 requireContract(matchesSchema(value,createRoleConstrainedContextSchema(request,catalogue)),'invalid_output','raw_schema');
 const atoms=value as unknown as ContextAtoms;
 for(const action of atoms.actions)if(action.recipient!=='unknown'){
  const role=action.recipient;
  // A marker elsewhere in the request cannot justify this atom. Cooccurrence still does not prove binding.
  requireContract(action.unitIds.some(id=>hasMarker(byId.get(id)!.text,role)),'invalid_output','contract');
 }
 // No role is changed or repaired. The original wire is normalized and then independently audited as before.
 return resolveContextGeneration(text,request,catalogue);
}
