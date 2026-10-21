# OfferAnchor: UX and Content Specification

**Current team guide — 18 October:** Read [current product and shared facts](current-product.md) and [released trial evidence](trial-release-2026-10-18.md) first. The live trial uses official team Beijing qwen3.8-max, extract-v2.24 / context-audit-1.4.0, contract 2.0.0 and five lifetime AI action attempts per account. Knowledge/image/optional search and real Google/eight-digit email login are implemented; cloud query history is not. Earlier dated checkpoints below retain their historical meaning.

**Current composer specification — D23, 16 October:** follow [intake/model/pitch](intake-model-and-pitch.md#2-one-visible-composer-separate-sources): attachment cards above typed text, in-place review, circular paperclip, no separate import dialog. Preserve original words, separate source IDs, pending-file export protection and removal/cancellation. The independent design preview is the current visual sample; CS remains the canonical application writer.

Baseline **2.2**; contract **2.0.0**. Design owns UI/string resources; Communication reviews equivalent meaning; CS implements. Knowledge cards/routes have one source of truth in knowledge/library.json. Authored locale/demo material is not human-approved copy or a working interface.

## User promise and immediate value

Help the jobseeker or newly onboarded worker understand a new job instruction and prepare a useful independent question before using personal resources. Require only the latest selected instruction. Advertisement/offer are optional behind Add context; no login, full-chat export, inbox connection or financial account setup.

The first complete result shows the supported demanded action, actor/resource and exact quote, followed by one short application-owned independent-verification question. Expanded evidence, prior context, unknowns and the editable full brief remain available without blocking first value. Do not turn this into a long chat transcript or fraud score.

Screenshot intake is deferred beyond 18 October. No image upload/sharing/permission flow is a release requirement.

## Audience and coverage copy: D20

Use the product promise **Check recruitment and onboarding requests before you act**, with initial coverage stated as personal payments, borrowing and bank-account control. Avoid a student-only eligibility gate. Student examples remain appropriate for the first validation cohort; original quotations/localized fixtures retain their language.

Entry/result/brief notices must not imply that no financial demand means a safe identity-document request or a fair contract. Keep this limit visible near the result, including on a standalone exported brief. Product data protection and analysis of a recruiter's privacy request are different. Do not add an active identity-document checker or privacy score/tab before EXT-01 activation. Communication reviews meaning; Design supplies reviewed copy/keys; CS implements in its existing paths. No runtime locale file is changed by this documentation task.

## Screens, controls and terminal states

| Screen/state | Required content | Error/empty behavior |
|---|---|---|
| Entry | Latest instruction; language; Add context; preview/edit/delete; selected-material/processor notice; fictional examples | Empty/whitespace/unpaired-surrogate/over-limit text blocked before paid request |
| Processing | Current evidence remains visible; processing/delayed status; cancel | Delay at 20 seconds; terminal incomplete at 30; explicit manual retry |
| First result | Guidance, action/actor/resource, exact source quote and short independent question | No scoped demand identified is not safe-employer certification |
| Expanded result | Optional earlier-vs-later relationships, claims, mechanisms, contradictions, typed unknowns | Absent earlier context stated; repayment/authorization unknown alone does not force clarification |
| Correction | Interpretation correction/clarification answer/outcome as labelled user_note; originals preserved | Revision increments; previous result and edited brief invalidated; two-question budget retained |
| Brief | Editable body; immutable provenance/uncertainty/claim-boundary footer; minimal/full quotation choices; copy/fallback/print | Footer is always exported; no badges assigned to user-written claims |
| Reply | Add later reply; reanalyse all current selected sources | Prior supported financial demand remains after later denial; no verified badge |
| Clear/end | Deliberate clear/export choice | Browser state loss explained; no claim to delete processor/exported data |

A cost-protection demo gate is not user account signup. Live/simulation mode is displayed before results and survives every export.

## Input and session agreement

Up to eight sources E1-E8, each at most 4,000 UTF-16 units and at most 12,000 total, with labelled kinds/order. The initial instruction is required; optional contexts and later replies/notes use remaining slots. These are engineering bounds, not measured optimal reading lengths. Never truncate silently.

Normalize CRLF to LF before editor and submitted text agree; then preserve exact text for citations. Evidence edits, corrections, locale changes or added replies increment revision and cancel/invalidate the previous run and brief draft.

Model clarification questions and the application-owned independent-verification question are different features. The clarification budget is at most two questions per tab. Accept a current response once; the reducer removes already displayed keys, selects the remaining allowance and increments atomically before display. A dedupe key combines unknown kind, sorted stable source IDs cited by its related actions and exact question text; changing request/Q IDs alone does not consume another question. Reruns, evidence edits and locale changes never reset/refund the budget. A translated different question can consume the remaining allowance. Follow the authoritative lifecycle in [integration-contract.md](integration-contract.md). Unknowns may remain after the budget. The independent question is a deterministic application-owned next step, not another question the model can execute.

Question answers, corrections and user-reported external outcomes are user_note evidence with their purpose label; no new outcome source kind. A reporter's assertion never becomes independent confirmation.

## Student-relevant demonstration

Use the authored fictional task journey in [examples](../examples/README.md): internship/role context -> onboarding/early commission claim -> new instruction asking for personal product payment/recharge. The result reveals the personal funding relationship and why an assurance is still a claim.

Use a matched company-funded/prohibited-payment fixture to demonstrate the same familiar vocabulary with a different actor/resource/polarity. Add the contradictory task reply to show preservation of earlier supported demands. Personal borrowing is the secondary scenario. Fictional source-inspired material is never described as a real victim transcript or observed model output.

The requested action is distinct from the guidance state. Show account information for payroll separately from banking OTP/account-control disclosure. An ordinary reimbursable taxi expense is not automatically classified as task recharge. If actor/payer or a scoped request remains genuinely unresolved, show bounded clarification; general unknown employer authorization cannot by itself label every message blocking.

## Evidence, correction and brief editing

A quote chip highlights the exact current source range and stage label. Original quotations are not translated. Unknown values are explicit; source statements and application interpretations use distinct wording without a complex training legend.

Any source edit makes prior results stale and non-exportable. A user correction preserves originals and triggers reanalysis; it cannot directly rewrite a model field while retaining an old evidence badge. Contradictory earlier/later evidence stays separately inspectable.

The brief body may be edited. Label edited content and retain a locked external footer stating product/version/revision/mode, preparation from selected material, remaining uncertainty and the boundary between promises/user reports and independent confirmation. Footer text comes from application-owned reviewed strings. All copy/manual fallback/print paths include the body and footer; copying the short question keeps its relevant mode/boundary notice.

A later revision invalidates the edited draft. Previously exported copies cannot be recalled or updated. A copy/print/link event is not delivery, contact or verification.

## Localization authority

Shared locale IDs are en-HK and zh-Hant-HK. Quotations stay in the original language. Actual locale resources are authored starter material; Design owns keys/states and Communication approves meaning. Do not create a second Chinese feature scope, duplicate knowledge text in frontend code or silently approve draft source cards.

Review short labels for personal borrowing, company funds, request/prohibition, promise, unknown, ordinary expense, payroll information and independent verification. Essential guidance, failure messages, buttons and locked export footer require equivalent meaning. Product jargon such as agents, schemas and retrieval does not belong in the decision flow unless needed for uncertainty.

Contract/policy status strings remain shared internal enums. Guidance priority is pause for a supported scoped demand, otherwise clarify for a critical scoped actor/resource uncertainty, otherwise no identified scoped demand. No green safe badge or confidence percentage.

## Accessibility and physical phones

Use common smartphone widths, a 390-pixel layout check and 200% zoom without clipping important controls. Label inputs/buttons, maintain visible keyboard focus/live status, and use text plus color. Aim for 44-pixel interactive targets. Pause guidance and uncertainties must not hide behind tooltips.

Record actual iOS Safari/Android Chrome device/OS/browser, copy permission/fallback, print and locked footer, source highlight, network interruption, background/resume, back/forward, revision invalidation and clear-session. Desktop emulation is only layout evidence.

## Required handoff

Design supplies every screen/state, bilingual key/string mapping, input bounds, short question/full brief examples, locked footer, correction/reply/revision behavior, tab-question budget, keyboard order and mobile acceptance tasks. Communication reviews meanings/source boundaries; CS reviews implementability. Link each item to PRD/contract/work-package IDs. A screenshot alone is not enough for another teammate to implement behavior consistently.
