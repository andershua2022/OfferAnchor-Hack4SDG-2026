import '../analysis/server-guard.ts';
import type template from '../../contracts/provider-extraction.schema.json';
import type {ProviderExtraction} from '../contracts/index.ts';
import {ContractBoundaryError, requireContract} from '../contracts/errors.ts';
import {matchesSchema, type Schema} from '../contracts/schema.ts';
import {validateCitationShapes} from '../contracts/semantic.ts';
import {AnalysisFailure} from '../analysis/failure.ts';
import type {ProviderAdapter} from '../analysis/provider.ts';

export const COMPACT_GENERATION_PROMPT_VERSION = 'extract-v2.13';
export const COMPACT_GENERATION_VERSION = 'compact-operations-1.0.0';
type Tuple = Pick<ProviderExtraction['actions'][number], 'verb' | 'resource' | 'mechanism'>;
// This bounded generation vocabulary covers the scoped operations, not every public-schema tuple.
const operations = {
 task_pay: {verb:'pay',resource:'personal_money',mechanism:'task_recharge'},
 task_transfer: {verb:'transfer',resource:'personal_money',mechanism:'task_recharge'},
 borrow_personally: {verb:'borrow',resource:'personal_borrowing',mechanism:'personal_borrowing'},
 pay_loan_proceeds: {verb:'pay',resource:'personal_borrowing',mechanism:'personal_borrowing'},
 transfer_loan_proceeds: {verb:'transfer',resource:'personal_borrowing',mechanism:'personal_borrowing'},
 share_login_otp: {verb:'share_otp',resource:'account_control',mechanism:'credential_control'},
 share_bank_control: {verb:'share_account_details',resource:'account_control',mechanism:'credential_control'},
 share_payroll_details: {verb:'share_account_details',resource:'account_information',mechanism:'payroll_information'},
 company_pay: {verb:'pay',resource:'company_money',mechanism:'company_funded_work'},
 company_transfer: {verb:'transfer',resource:'company_money',mechanism:'company_funded_work'},
 company_other_operation: {verb:'other',resource:'company_money',mechanism:'company_funded_work'},
 ordinary_expense_pay: {verb:'pay',resource:'personal_money',mechanism:'ordinary_work_expense'},
 ordinary_expense_transfer: {verb:'transfer',resource:'personal_money',mechanism:'ordinary_work_expense'},
 own_money_prohibition: {verb:'pay',resource:'personal_money',mechanism:'none'},
 own_money_transfer_prohibition: {verb:'transfer',resource:'personal_money',mechanism:'none'},
 own_funds_unresolved_pay: {verb:'pay',resource:'personal_money',mechanism:'unclear'},
 own_funds_unresolved_transfer: {verb:'transfer',resource:'personal_money',mechanism:'unclear'},
 unresolved_pay: {verb:'pay',resource:'unknown',mechanism:'unclear'},
 unresolved_transfer: {verb:'transfer',resource:'unknown',mechanism:'unclear'},
 unresolved_borrow: {verb:'borrow',resource:'unknown',mechanism:'unclear'},
 unresolved_share_details: {verb:'share_account_details',resource:'unknown',mechanism:'unclear'},
 nonfinancial_work: {verb:'perform_work',resource:'none',mechanism:'none'},
 nonfinancial_other: {verb:'other',resource:'none',mechanism:'none'},
} as const satisfies Record<string,Tuple>;
export {operations as COMPACT_OPERATIONS};
type CompactExtraction = Omit<ProviderExtraction,'actions'> & {
 actions:(Omit<ProviderExtraction['actions'][number],keyof Tuple> & {operation:keyof typeof operations})[];
};
export function createCompactGenerationSchema(schema:typeof template){
 const out=structuredClone(schema),action=out.properties.actions.items;
 const {id,actor,verb:_verb,resource:_resource,mechanism:_mechanism,...remaining}=action.properties;
 return {...out,title:'OfferAnchor internal compact operations 1.0.0',properties:{...out.properties,actions:{...out.properties.actions,items:{
  ...action,required:['id','actor','operation','polarity','recipient','purpose','citations'],
  properties:{id,actor,operation:{type:'string',enum:Object.keys(operations)},...remaining},
 }}}};
}
export function expandCompactGenerationResult(
 result:Awaited<ReturnType<ProviderAdapter['extract']>>,schema:Schema,
):Awaited<ReturnType<ProviderAdapter['extract']>>{
 // The caller retains refusal/truncation handling; unfinished content is never parsed or repaired.
 if(result.finishReason!=='stop')return result;
 try{
  requireContract(typeof result.jsonText==='string'&&!!result.jsonText.trim()&&new TextEncoder().encode(result.jsonText).byteLength<=96*1024,'invalid_output','raw_schema');
  const raw:unknown=JSON.parse(result.jsonText);
  validateCitationShapes(raw,'raw');
  requireContract(matchesSchema(raw,schema),'invalid_output','raw_schema');
  const value=raw as CompactExtraction;
  const expanded:ProviderExtraction={...value,actions:value.actions.map(({operation,...action})=>({...action,...operations[operation]}))};
  return {...result,jsonText:JSON.stringify(expanded)};
 }catch(error){
  throw new AnalysisFailure(error instanceof ContractBoundaryError?error.errorCode:'invalid_output',result.usage);
 }
}


