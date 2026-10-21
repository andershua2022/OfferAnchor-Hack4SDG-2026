import '../analysis/server-guard.ts';
import {requireContract} from '../contracts/errors.ts';
import {COMPACT_OPERATIONS} from './compact-generation.ts';
import type {ContextAtoms} from './context-generation.ts';
import type {SourceUnit} from './source-unit-generation.ts';

export const REPAYMENT_COVERAGE_VERSION='repayment-coverage-1.0.0';
// Bounded rejection vocabulary, not an exhaustive or semantic promise detector.
const explicitFutureRepayment=[
 /(?<![\p{L}\p{N}_])we(?:\s+will|['’]ll)\s+(?:refund|repay|return\s+(?:the\s+)?(?:amount|money|funds|payment))(?![\p{L}\p{N}_])/iu,
 /(?:我們|我们|我哋|本公司|公司)\s*(?:將會|将会|將|将|會|会)\s*(?:退款|退還|退还|退回|退返|償還|偿还|還款|还款)/u,
];
/** Checks validated original atoms only. Nothing is added, rewritten, downgraded or linked here.
 * Quotation/negation or unrelated events may cause conservative false abstention. Missing vocabulary
 * remains possible; same-event support and all other source coverage still require the unchanged audit.
 */
export function assertRepaymentCoverage(atoms:ContextAtoms,catalogue:readonly SourceUnit[]):void{
 const active=new Set(atoms.actions.flatMap((action,index)=>{
  const verb=COMPACT_OPERATIONS[action.operation].verb;
  return (action.polarity==='requested'||action.polarity==='uncertain')&&['borrow','pay','transfer'].includes(verb)?[index]:[];
 }));
 if(!active.size)return;
 for(const unit of catalogue)if(explicitFutureRepayment.some(marker=>marker.test(unit.text))){
  requireContract(atoms.context.some(row=>row.meaning==='repayment_promise'&&row.unitIds.includes(unit.id)&&row.targets.some(index=>active.has(index))),'invalid_output','contract');
 }
}


export const PROMISE_FUNDING_GUARD_VERSION='promise-funding-1.0.0';
const explicitRepaymentPledges=[
 /(?<![\p{L}\p{N}_])(?:we|the\s+company)\s+(?:promise|guarantee|undertake)s?\b[\s\S]{0,160}\b(?:repay|refund|reimburse|repayment|loan)\b/iu,
 /(?:公司|本公司|我們|我们|我哋)\s*(?:承諾|承诺|保證|保证)[\s\S]{0,160}(?:清還|清还|償還|偿还|還款|还款|本金|利息|貸款|贷款)/u,
];
/** Reject a loan-funding assertion sourced solely from an explicit future repayment pledge.
 * Mixed clauses and unlisted wording can escape detection or conservatively abstain; no truth is inferred.
 */
export function assertPromiseFundingConsistency(atoms:ContextAtoms,catalogue:readonly SourceUnit[]):void{
 const promises=new Set(catalogue.filter(unit=>[...explicitFutureRepayment,...explicitRepaymentPledges].some(marker=>marker.test(unit.text))).map(unit=>unit.id));
 for(const row of atoms.context)if(row.meaning==='funds_company'&&row.unitIds.length&&row.unitIds.every(id=>promises.has(id))){
  const conflicts=row.targets.some(index=>{
   const action=atoms.actions[index];
   return action&&(action.polarity==='requested'||action.polarity==='uncertain')&&COMPACT_OPERATIONS[action.operation].resource==='personal_borrowing';
  });
  requireContract(!conflicts,'invalid_output','contract');
 }
}
