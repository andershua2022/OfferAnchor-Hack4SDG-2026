import {CANDIDATE228_SYSTEM_PROMPT} from './prompt-candidate-v2.28.ts';

export const CANDIDATE229_PROMPT_VERSION='extract-v2.29';
export const CANDIDATE229_SYSTEM_PROMPT=[
 'Separate the source of money USED FOR AN OPERATION from a promise to SETTLE ITS COST LATER. For a personal loan and its linked proceeds, the resource remains personal_borrowing even when the company promises to cover the borrowed amount, supplier transfer, principal or interest. That whole assurance is repayment_promise targeting the original borrowing AND the proceeds transfer when it covers both. Do not add funds_company for the same assurance: covering or bearing a loan-funded cost later does not say the money used for that transfer was company-owned. A withdrawal does not change the historical funds source or remove that promise.',
 'funds_company requires a source assertion that the money used for the same operation belongs to the company, such as using funds in its business expense account. The assertion is still unverified. A future scheduled transfer can use company funds when that ownership is explicit; future tense alone does not make it repayment. If a separately asserted company-funding statement actually conflicts with an earlier personal-loan demand, retain that material conflict; never convert the earlier loan, erase it, or treat the funding assertion as verified. Preserve independently stated company-funding clarifications and all explicit prohibitions.',
 CANDIDATE228_SYSTEM_PROMPT,
].join('\n\n');
