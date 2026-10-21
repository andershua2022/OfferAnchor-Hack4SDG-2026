import {CANDIDATE223_SYSTEM_PROMPT} from './prompt-candidate-v2.23.ts';
import {CANDIDATE222_AUDIT_VERSION,CANDIDATE222_AUDIT_SYSTEM_PROMPT} from './prompt-candidate-v2.22.ts';

export const CANDIDATE224_PROMPT_VERSION='extract-v2.24';
export const CANDIDATE224_AUDIT_VERSION='context-audit-1.4.0';
export const CANDIDATE224_SYSTEM_PROMPT=CANDIDATE223_SYSTEM_PROMPT;
export const CANDIDATE224_AUDIT_SYSTEM_PROMPT=[
 CANDIDATE222_AUDIT_SYSTEM_PROMPT.replace(CANDIDATE222_AUDIT_VERSION,CANDIDATE224_AUDIT_VERSION),
 'Apply this bounded coverage rule consistently with generation: Repeated reassurance of the same already retained repayment promise about the same original financial event does not require another repayment_promise row. The original promise must already be typed repayment_promise and linked to the relevant original financial actions. A full source unit retained for a correctly targeted denial/withdrawal can also retain repeated assurance wording without a duplicate context row. Do not report that repetition alone as missing. This never excuses a missing first promise, a distinct assurance, a new or changed material repayment term, payer, amount or condition, or an assurance about another event. Preserve material differences and return findings for their omission, unsupported meanings or wrong-event targets. A retained denial never substitutes for the original typed promise. All assurances, including no-risk wording, remain unverified; they cannot prove funding, repayment, authority or safety.',
].join('\n\n');
