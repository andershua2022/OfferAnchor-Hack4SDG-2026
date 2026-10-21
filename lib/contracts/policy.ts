import type {CanonicalExtraction, Guidance} from './generated.ts';
import {potentiallyFinancial,needsScopeClarification} from './semantic.ts';
// Browser-safe: selector and response validation share this one deterministic policy.
export function selectPolicyReferences(
 extraction: CanonicalExtraction,
 cards: readonly {id: string; routeIds: readonly string[]}[],
): {guidance: Guidance; referenceIds: string[]; routeIds: string[]} {
 let guidance: Guidance='no_personal_financial_request_identified',primary='LABOUR_GUIDANCE';
 let referenceIds: string[]=[];
 for(const [mechanism,card] of [['task_recharge','K_TASK_RECHARGE'],['personal_borrowing','K_PERSONAL_BORROWING'],['credential_control','K_PAYROLL']])
  if(extraction.actions.some(a=>a.actor==='applicant'&&a.polarity==='requested'&&a.mechanism===mechanism))referenceIds.push(card);
 if(referenceIds.length){guidance='pause_requested_action';primary='ADCC_18222';}
 else if(extraction.unknowns.some(u=>u.priority==='blocking'&&['actor','resource','payment_condition','contradiction'].includes(u.kind)&&u.relatedActionIds.some(id=>extraction.actions.some(a=>a.id===id&&potentiallyFinancial(a)&&(needsScopeClarification(a)||u.kind==='contradiction'))))){
  guidance='clarify_before_action';referenceIds=['K_UNKNOWN'];
 }else referenceIds=[extraction.actions.some(a=>a.mechanism==='company_funded_work')?'K_COMPANY_PAID':
  extraction.actions.some(a=>a.mechanism==='payroll_information')?'K_PAYROLL':
  extraction.actions.some(a=>a.mechanism==='ordinary_work_expense')?'K_ORDINARY_EXPENSE':'K_UNKNOWN'];
 if(extraction.claims.some(c=>c.kind==='completed_action'&&c.status==='user_reported'&&c.relatedActionIds.some(id=>extraction.actions.some(a=>a.id===id&&a.actor==='applicant'&&['task_recharge','personal_borrowing','credential_control'].includes(a.mechanism)))))referenceIds.push('K_ALREADY_ACTED');
 referenceIds=[...new Set(referenceIds)].slice(0,6);
 const routeIds=[...new Set([primary,...referenceIds.flatMap(id=>cards.find(c=>c.id===id)?.routeIds??[])])].slice(0,6);
 return {guidance,referenceIds,routeIds};
}
