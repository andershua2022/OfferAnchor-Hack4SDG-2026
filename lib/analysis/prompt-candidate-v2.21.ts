import {CANDIDATE220_SYSTEM_PROMPT} from './prompt-candidate-v2.20.ts';

export const CANDIDATE221_PROMPT_VERSION='extract-v2.21';
export const CANDIDATE221_AUDIT_VERSION='context-audit-1.2.0';
export const CANDIDATE221_SYSTEM_PROMPT=[
 'A source-described company operation using, spending or providing company funds is material even when no payment or transfer verb is stated. Use company_other_operation for that explicit described event; actor is the company performer (employer), polarity is described, and recipient still needs independent support. Do not invent pay/transfer or a recipient, and do not omit this event merely because it is normal company-funded work. A funding assertion alone does not prove a separate payment/transfer event or its performer.',
 CANDIDATE220_SYSTEM_PROMPT,
].join('\n\n');
export const CANDIDATE221_AUDIT_GUIDANCE=[
 CANDIDATE221_AUDIT_VERSION+': apply this coverage priority before the inherited audit instructions. First identify the retained representative earlier duty in the candidate. If one source-supported earlier advertised_duty already supports the retained comparison, an additional nonmaterial ordinary earlier duty or historical commission is optional, not missing merely because another early source is uncited. Do not require a row for every earlier source. Material earlier funding and contrary terms, financial actions, repayment and later denial/withdrawal still require coverage; they cannot be excused as an optional duty.',
 'Explicitly described company use, spending or provision of company funds supports company_other_operation when the source states no narrower pay/transfer event. Check for its omission as a material company-funded operation. Never require an invented pay/transfer verb to represent it, or infer a recipient from the company performer. Generic company context without an explicit operation does not itself establish another action.',
 'Keep source support strict: amounts, currency, applicant performer and unlock wording do not establish personal funding; unstated funding remains unresolved_*. Not required does not mean prohibited, and an independent sole current work request must remain. Actor is the explicit performer, independent of the bounded recipient vocabulary. Company funding alone does not prove the performer of a different payment/transfer. Conservative guidance is not evidence that slots or source coverage are correct.',
].join('\n\n');
