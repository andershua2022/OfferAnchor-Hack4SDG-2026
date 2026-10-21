import {CANDIDATE211_SYSTEM_PROMPT} from './prompt-candidate-v2.11.ts';

// Generation-only candidate; the frozen validator and active prompt are unchanged.
export const CANDIDATE212_PROMPT_VERSION = 'extract-v2.12';
export const CANDIDATE212_SYSTEM_PROMPT = CANDIDATE211_SYSTEM_PROMPT + `

Action compatibility amendment: these verb + resource + mechanism rules apply to requested, prohibited, described and uncertain actions alike. Negation changes polarity, never the operation's verb or compatible resource/mechanism:
* Sharing a login OTP: share_otp + account_control + credential_control.
* Sharing a banking password or other bank-account control/access details without an OTP: share_account_details + account_control + credential_control.
* Sharing ordinary payroll account holder name/account number: share_account_details + account_information + payroll_information. This is not bank-account control.
* Applying for a personal loan: borrow + personal_borrowing + personal_borrowing. Transferring/paying explicitly linked loan proceeds keeps transfer/pay + personal_borrowing + personal_borrowing.
* Paying/transferring own money to unlock work/tasks/earnings: pay/transfer + personal_money + task_recharge. Keep both the personal-funding and unlock conditions in the citations.
Never use verb other for credential_control, even when sharing is prohibited. For example, "Never share an online-banking password or a login OTP with us." can be one share_otp action with polarity prohibited, resource account_control and mechanism credential_control; the mention of both password and OTP does not require a duplicate action. "Share the login OTP with us." uses the same tuple with polarity requested. A prohibition is never a requested action. Keep the complete original negation in its citation.
Before returning, verify all three fields together for EVERY action, including prohibited controls. Do not replace an explicit borrow, transfer, pay, share_otp or share_account_details operation with other just because it is negated. Do not turn payroll information into account control or omit an earlier supported financial demand to make these fields fit.`;
