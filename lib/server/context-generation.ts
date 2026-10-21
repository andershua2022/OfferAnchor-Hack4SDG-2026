import '../analysis/server-guard.ts';
import type {AnalyzeRequest,ProviderExtraction} from '../contracts/index.ts';
import {ContractBoundaryError,requireContract} from '../contracts/errors.ts';
import {isRecord,matchesSchema,type Schema} from '../contracts/schema.ts';
import {createSourceUnitCatalogue,type SourceUnit} from './source-unit-generation.ts';
import {createSourceUnitMeaningSchema,resolveSourceUnitMeanings,createSourceUnitMeaningAuditSchema,SOURCE_UNIT_MEANING_AUDIT_SYSTEM_PROMPT,type SourceUnitMeaningAtoms} from './source-unit-meaning-generation.ts';

type Statement=SourceUnitMeaningAtoms['statements'][number];
type CurrentWork=SourceUnitMeaningAtoms['work'][number]&{meaning:'current_work'};
// Active live-profile processing bound; source text is rejected, never truncated.
export const CONTEXT_CATALOGUE_LIMIT=192;
export interface ContextAtoms{actions:SourceUnitMeaningAtoms['actions'];context:(Statement|CurrentWork)[];}
export function createContextGenerationSchema(request:AnalyzeRequest,catalogue=createSourceUnitCatalogue(request)):Schema{
 const previous=structuredClone(createSourceUnitMeaningSchema(request,catalogue)).properties!;
 const alternatives:Schema[]=[previous.statements.items!];
 if(previous.work.maxItems!==0){
  const work=previous.work.items!;
  alternatives.push({type:'object',additionalProperties:false,required:['unitIds','meaning','actor','polarity'],properties:{unitIds:work.properties!.unitIds,meaning:{type:'string',const:'current_work'},actor:work.properties!.actor,polarity:work.properties!.polarity}});
 }
 // The alternatives are disjoint by meaning and required fields; no empty enum/work branch is sent.
 return {type:'object',additionalProperties:false,required:['actions','context'],properties:{
  actions:previous.actions,
  context:{type:'array',maxItems:catalogue.length?4:0,items:{oneOf:alternatives}},
 }};
}
function parse(text:string):unknown{
 requireContract(typeof text==='string'&&!!text.trim()&&new TextEncoder().encode(text).byteLength<=96*1024,'invalid_output','raw_schema');
 try{return JSON.parse(text);}catch{throw new ContractBoundaryError('invalid_output','raw_schema');}
}
function checkUnitReferences(value:unknown,catalogue:SourceUnit[]):void{
 if(!isRecord(value))return;const known=new Set(catalogue.map(unit=>unit.id));
 for(const collection of ['actions','context'])if(Array.isArray(value[collection]))for(const row of value[collection])if(isRecord(row)){
  requireContract(Array.isArray(row.unitIds)&&row.unitIds.length>=1&&row.unitIds.length<=2&&row.unitIds.every(id=>typeof id==='string'),'invalid_citation','citation_shape');
  requireContract(row.unitIds.every(id=>known.has(id)),'invalid_citation','citation_resolution');
 }
}
export function resolveContextGeneration(text:string,request:AnalyzeRequest,catalogue=createSourceUnitCatalogue(request)):{atoms:ContextAtoms;extraction:ProviderExtraction}{
 const value=parse(text);checkUnitReferences(value,catalogue);
 requireContract(matchesSchema(value,createContextGenerationSchema(request,catalogue)),'invalid_output','raw_schema');
 const atoms=structuredClone(value) as ContextAtoms,statements:SourceUnitMeaningAtoms['statements']=[],work:SourceUnitMeaningAtoms['work']=[];
 // Every validated context row enters exactly one existing collection. No row is dropped or merged.
 for(const row of atoms.context){
  if(row.meaning==='current_work'){const {meaning:_meaning,...item}=row;work.push(item);}
  else statements.push(row);
 }
 const resolved=resolveSourceUnitMeanings(JSON.stringify({actions:atoms.actions,statements,work}),request,catalogue);
 return {atoms,extraction:resolved.extraction};
}
export const CONTEXT_AUDIT_VERSION='context-audit-1.0.0';
export function createContextAuditSchema(request:AnalyzeRequest,catalogue=createSourceUnitCatalogue(request),coverageCandidate?:ContextAtoms):Schema{
 const schema=structuredClone(createSourceUnitMeaningAuditSchema(catalogue));
 schema.properties!.unsupported.items!.properties!.collection.enum=['actions','context'];
 if(coverageCandidate){
  const kind=schema.properties!.missing.items!.properties!.kind;
  kind.enum=[...kind.enum!,'material_context'];
  if(coverageCandidate.context.some(row=>row.meaning==='advertised_duty'))kind.enum=kind.enum.filter(value=>value!=='advertised_duty');
 }
 return schema;
}
export const CONTEXT_AUDIT_SYSTEM_PROMPT=[
 'The ORIGINAL candidate has exactly actions and context arrays. Each context row is either a statement {unitIds,meaning,targets} or current work {unitIds,meaning:"current_work",actor,polarity}. Unsupported findings must use collection actions/context and its ORIGINAL zero-based row index, never an internally split statement/work index. Check only fields actually present on that row.',
 'There are at most FOUR context rows total. Preserve material denial/withdrawal, repayment and earlier duty/funding terms; prioritize them over optional history, duplicated assurances and optional ordinary work beside finance. Do not demand an optional fifth context row. Sole current work and applicant-work/described-third-party-loan contrasts remain required; they cannot be omitted merely to fit optional context. A source-supported combined unit may retain its complete wording without duplicate context rows. The application never drops or merges a row after generation.',
 SOURCE_UNIT_MEANING_AUDIT_SYSTEM_PROMPT,
].join('\n\n');
export function validateContextAudit(text:string,request:AnalyzeRequest,atoms:ContextAtoms,catalogue=createSourceUnitCatalogue(request),candidateCoverage=false):void{
 const value=parse(text),known=new Set(catalogue.map(unit=>unit.id));
 if(isRecord(value)&&Array.isArray(value.missing))for(const row of value.missing)if(isRecord(row))requireContract(typeof row.unitId==='string'&&known.has(row.unitId),'invalid_citation','citation_resolution');
 requireContract(matchesSchema(value,createContextAuditSchema(request,catalogue,candidateCoverage?atoms:undefined)),'invalid_output','raw_schema');
 const audit=value as {unsupported:{collection:keyof ContextAtoms;index:number;field:string}[];missing:unknown[]};
 requireContract(audit.unsupported.every(row=>row.index<atoms[row.collection].length&&Object.hasOwn(atoms[row.collection][row.index],row.field)),'invalid_output','reference');
 requireContract(!audit.unsupported.length&&!audit.missing.length,'invalid_output','contract');
}
