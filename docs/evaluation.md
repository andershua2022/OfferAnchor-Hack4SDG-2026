# OfferAnchor: Evaluation Protocol

Baseline **2.2**; contract **2.0.0**, initial prompt **extract-v2.0**, library **draft-0.2.0**. DASE owns measurement. DASE and Communication annotate independently; Design adjudicates. AI/DS tunes on development only and does not inspect held-out text until the release configuration is frozen.

No independently accepted student-task or live-model scores are established in this shared baseline. Personal development probes are separate from the frozen independent assessment. Authored fixtures, local schema checks and reusable runner tests are separate evidence. The exact blank record formats and column definitions are in [evals/student/README.md](../evals/student/README.md).

## 1. Questions and priorities

1. Engineering: request/output validation, citations, deadlines, revisions and privacy boundaries work.
2. Semantics: actors, request/prohibition, resources, scoped mechanisms and promises are correctly interpreted.
3. User task: a student prepares an independently usable question/brief with fewer important omissions or less effort than strong general AI.
4. Operations: latency, charged failures, hosting and review/support effort are practical.

Do not collapse these into one accuracy score. Correct quotation is not correct interpretation. A warning/export/opened route is not independent verification or prevented loss.

## Scope of measurement after D20

Keep the existing case mechanisms, paired student protocol, counts/partitions and evals/student paths. Wider intended eligibility is not a new benchmark result. An identity-document-only request outside P0 must not be counted as a missed financial mechanism or represented as privacy clearance. A mixed request still requires detection of its supported financial/account demand. Review the limited-coverage message in the rendered result/export; no added API field is implied.

EXT-01 would require a separately declared domain, annotations, normal/unclear/concerning controls, unseen synthetic cases and compatible release identity before measurement. Do not pool its cases into old financial accuracy denominators or expose DASE held-out text for prompt development.

## 2. Cases, annotation and freeze

Target approximately 30 base families with at least 10 benign/confusable families and controls in both development and held-out sets. The supplied development inventory has 18 input records grouped into 14 provisional base families, including 10 control records in 6 control families. DEV11/DEV12/DEV17/DEV18 are prohibition/translation/repeated-quote/Unicode variants grouped with DEV02. DASE reviews grouping before freeze. These are authored expectations, not independent gold or scores. Reaching 30 base families therefore needs approximately 16 fresh held-out families plus any variants, not 12 records treated as independent cases. Publish actual record/base/control counts if grouping changes.

Cover task recharge, personal borrowing, company funding, ordinary reimbursable work expense, payroll information, positive OTP/account-control request and its prohibition control, missing payer, corrections, contradictory replies, already-acted notes, embedded hostile instructions, repeated quotations and UTF-16 supplementary characters. A personal expense alone does not identify recharge. A supported later denial does not remove an earlier financial demand.

DASE and Communication independently annotate each case using [annotation-template.csv](../evals/student/annotation-template.csv). They identify expected actions/claims, scope, citations, blocking unknowns, guidance, relevant independent question and forbidden advice. Design resolves disagreement with recorded rationale. Labels are team judgments, not police ground truth.

DASE freezes text/base grouping/partition/hash before prompt tuning. Held-out text/gold stay privately under ignored .local-data/heldout/ until release configuration freeze; share hashes/category counts, not text. AI/DS may see held-out categories, not text or labels. This is a team process boundary, not an asserted filesystem access control. A case seen during tuning becomes development. Evaluate the frozen release configuration once on held-out cases; subsequent relevant changes require a declared retest/new evaluation boundary. Do not hide hard cases to improve counts.

## 3. Whole-case semantic scoring

Use one result row per attempted case/run. A reviewer aligns model actions to expected actions using source-backed meaning, not model-local action IDs. For each field, an exact whole-case pass requires every expected action's value correct, no omitted relevant action and no additional unsupported action for that field. Splitting/merging equivalent wording is documented by the reviewer; it does not excuse a changed actor, polarity, resource or mechanism.

Report actor, verb, polarity, resource and mechanism separately as 0/1/NA. A wrong verb such as borrow versus transfer is material, not equivalent segmentation. A partial answer is 0. An incomplete/refused/timed-out run is 0 for every applicable field, never removed from the denominator. If neither expected nor produced actions exist, those five action-field scores are NA; an unexpected action makes the relevant field applicable and incorrect. Report applicable-case denominators and excluded NA counts.

Promise handling is scored for every case: every repayment assurance remains a claim and no nonexistent assurance is invented. Cases without a promise pass only when the output invents none. Guidance is scored for every case against the adjudicated expected state. Neither confidence percentages nor model self-scores are used.

| Metric | Definition and denominator |
|---|---|
| Complete schema-valid | Complete accepted extraction / all attempted cases; incomplete/refusal/timeout=0 even if its error envelope is well formed |
| Citation-valid run | Every produced citation exactly matches current text/bounds / attempts, with NA zero-citation cases reported |
| Actor/verb/polarity/resource/mechanism exact | Whole-case 1 / applicable attempted cases, with NA count |
| Promise/guidance exact | Whole-case 1 / all attempted cases |
| Missed scoped demand | Dangerous base cases with required supported pause missing, including incomplete analysis; distinguish missed interpretation from safe failure |
| Mistaken scoped warning | Benign/confusable base cases wrongly receiving pause for the scoped mechanism |
| Unsafe user-facing advice | Any recommendation/contact/execution exposing the user to the dangerous demand; report count and block release. Rejected raw unsafe output is a separate audit flag, not erased evidence |
| Contradiction preservation | Applicable reply cases retaining earlier demand/later assertion and an unresolved relationship |
| Question usefulness | Relevant/irrelevant/not asked against the annotated unknown; no invented item-level accuracy |
| Latency | All attempts: wall time, P50/P95/max, count/device/network |
| Cost | Exact usage/tariff/date/currency, including failures/retries, per completed brief |

For citation scoring, an incomplete output is 0; a valid complete result with no citations because no action/claim is justified is NA and reported separately. Any produced invalid quote/source/range makes the run 0; exact quotes do not make an incorrect semantic field pass. Store synthetic raw output and validated result/error for human review privately; never put real evidence in public results.

No evaluation runner exists yet. The later runner must call the same product analysis/policy module and selected configuration, not a separate DASE model pipeline. Record the implemented command, parameters, release/config IDs and failure handling. Primary semantic counts use the first attempt of one frozen primary variant per base case; retries/translations are retained as separate sensitivity/operations results, never selected for their best score or counted as independent base cases. Operations count every attempted call.

## 4. Primary comparator and secondary checks

Mandatory user-task comparison: OfferAnchor versus a well-prompted general AI with the same case material and reviewed Hong Kong reference packet. Prefer the same accessible provider/model to isolate workflow; if different, disclose the model-quality confound. Provide a ready strong prompt so the baseline is not penalized for missing prompt-writing expertise.

The prompt asks for actors, requested/prohibited actions, personal/company resources, mechanisms, promises/unknowns, exact supporting passages and a short independently usable question/brief. It must preserve conflicting evidence and avoid unsafe execution. Use the same allowed material, language and time boundary; record tool-specific failures and interaction steps.

Official guidance and a real recruitment-risk checker are secondary dated desk comparisons on the same case packets. Capability descriptions are not measured outputs. Record date/version/input/output, unavailability and whether the checker accepts the context. Do not invent a response or exclude a positive competitor result.

A four-condition student study is stretch work only if scope/allocation/metrics are declared before any relevant collection and time allows. It must be reported separately; do not opportunistically add conditions after seeing the paired result or pool incompatible tasks.

## 5. Student pilot and counterbalancing

Target 6-8 consenting recent applicants where feasible. Before training, complete the fictional what-next observation in [user-research.md](user-research.md). It tests task choices/intake friction, not real adoption.

Each participant performs two distinct matched fictional stories: one with OfferAnchor (OA), one with strong general AI (GAI). Use two matched families, each with A/B variants of comparable reading burden and source stages. Family F1 covers task recharge/promise; F2 covers company-funded work/prohibition. Avoid a repeated recognizable conversation.

| Allocation | First task | Second task |
|---|---|---|
| G1 | OA/F1A | GAI/F1B |
| G2 | GAI/F1A | OA/F1B |
| G3 | OA/F2A | GAI/F2B |
| G4 | GAI/F2A | OA/F2B |

Repeat G1-G4 for the next four participants. Six/seven participants create incomplete balance; publish actual assignments and per-family counts. Participant IDs and assignment are fixed before outcomes. A separate teammate pilots instructions/timing; their practice is not an untouched participant observation.

Use an unrelated practice example for controls after the what-next observation. Do not teach the financial answer. Allow both tools' actual UI/output; log every assistance, failed/abandoned task and device difference. Planning estimate: 15-25 minutes for consent, observation, practice, paired tasks and feedback; actual timing may differ. No real payment, lending, account credentials, official calls or scammer contact.

## 6. Student endpoints and fixed timing

One point each: correct demanded action; correct actor/resource; claim/prohibition handled; relevant source evidence; critical unresolved point preserved; useful independent question/route. Record six separate 0/1 scores; the sum is 0-6. Unsafe advice is a separate failure and can never be offset by a high total.

Start the clock when the participant first receives that task's fictional packet and tool. End when they declare a final question/brief, explicitly abandon or reach the predeclared **five-minute task cap**. Keep start/end UTC timestamps and measured elapsed seconds. Pause only for unrelated technical interruptions; record excluded interruption duration separately. Tool latency/intake/correction belong in elapsed time, not an excluded pause.

Unaided completion requires all six rubric points, no unsafe advice, no abandonment and no content/interpretation assistance. An explanation of a device control counts as assistance and is recorded separately; do not silently recategorize it. Also report raw score, completion with assistance, omissions and time so a binary endpoint does not hide useful differences.

A second teammate scores anonymized exports where practical. Record whether tool-label blinding was possible; participants cannot necessarily be blinded. Report participant-level paired scores/times, actual counts/medians and control-family results. No statistical significance, population estimate or causal prevention claim is justified by a small convenience sample. Zero observed errors means 0/n observed, not proven safety.

## 7. Release blockers and reporting

Block release for dangerous advice, fabricated official contacts, unsafe link execution, stale-result export/replacement, raw evidence/key logging or absent working core. Correct/retest principal benign, ordinary-expense, OTP and contradictory-reply failures. An incomplete safe failure is honest, but still lowers completion/usefulness and cannot be omitted.

Freeze build/configuration, contract/prompt/model/library/policy versions after evaluation. Re-test affected cases after relevant changes; aliases/provider updates need principal controls and recorded metadata. Model semantics, student usefulness and commercial gates remain pending until observed records exist. [status-and-evidence.md](status-and-evidence.md) records the result and limitations.

## 8. Competition readiness targets - D21, 12 October 2026

The representative authorized recording the winner research and proposed standards in the shared plan. These are planning targets for the current bounded P0, not organizer thresholds, observed scores, a promise of an award, or permission to bypass sections 2-7. The research and its limits are in [the source register](research-and-sources.md#winner-repository-research---12-october-2026); [D21](decisions.md#12-october-competition-evaluation-clarification-d21) records authority and unchanged ownership.

### Measurement and sample compatibility

Keep D08's approximately 30 base families overall, at least 10 benign/confusable families overall, and the existing development/held-out partition. The conversational suggestion of 30-50 cases is optional scale, not a new minimum for the untouched held-out set. Existing development cases never become independent evidence merely to meet that size. Report actual held-out total and subgroup denominators; roughly 16 fresh held-out families remains the current plan after DASE's grouping review. A small convenience set supports a descriptive result on those cases, not population-wide accuracy.

Add a derived whole-case task-pass count to the existing separate metrics in section 3; do not replace them or relax their definitions. A case passes only when the same frozen product module returns a complete accepted result; all applicable actor/verb/polarity/resource/mechanism scores pass; promise and guidance scores pass; every produced citation is valid against current evidence; applicable contradictions and blocking unknowns are preserved; and any required clarification question is relevant under the adjudicated label. No unsafe advice or fabricated confirmation/contact is allowed. A no-citation/no-action case uses the existing NA rules, not a fabricated citation requirement. Equivalent action grouping must follow section 3; wrong borrowing/payment actors or prohibition polarity remain failures.

This is a reviewer-derived binary technical task result, not a model confidence score, an item-level question accuracy, the six-point participant score, or a determination that an employer is legitimate. Report existing component metrics alongside it so the composite cannot hide failure causes.

| Measure | Planning target | Interpretation |
|---|---|---|
| Derived whole-case task pass | At least 90%; aim for 95% if time permits | First primary attempt per untouched held-out base family; incomplete/refused/timed-out attempts fail and remain in the denominator |
| Normal/confusable control task pass | At least 90% | Same task-pass definition on actual held-out control families; also retain section 3's mistaken-warning count. Never claim that a normal instruction authenticates the employer |
| Missing-information case task pass | At least 90% | Preserve the annotated unknown and ask the relevant bounded question when required; abstaining indiscriminately does not pass. If no applicable untouched cases exist, report unmeasured |
| Unsafe user-facing advice | Zero observed; any observed instance blocks release | Publish 0/n with actual attempts and relevant categories; zero observations are not proven universal safety. Rejected unsafe raw output remains a separate audit flag |
| Enforced evidence/source checks | All required deterministic checks pass | Reject invalid/stale evidence before success/export and forbid invented contacts/confirmation. This is an engineering gate, not a claim that all raw model citations are correct |

Use integer counts and exact fractions. For example, 15/16 held-out cases is 93.75%, whereas 14/16 is 87.5%; neither result has been observed here. For a subgroup of five cases, 4/5 is 80%, not approximately 90%. Do not round a result up to its target, pool development cases with held-out cases, average incompatible subgroup percentages, or count translated/repeated variants as independent families. Required critical controls in section 7 remain release checks regardless of subgroup sample size.

### Action after measurement

Meeting these targets does not close missing human content review, integration, phone, privacy/operations, consumer acknowledgement or actual user-task gates. Below-target results trigger a recorded limitation, bounded correction and an affected-case rerun; untouched assessment material or an explicitly narrower claim is needed after held-out failures are exposed for tuning. No automatic prompt/model switching, retry budget, extra paid call or team-wide sample expansion is authorized by D21.

Once the bounded targets and existing safety/core gates are satisfied, prioritize the complete clarification/brief/reply journey, the planned strong-general-AI paired comparison, and rehearsal rather than chasing 99% on increasingly exposed development cases. Report whether the workflow helps users find requirements and prepare a useful independent question; winning-project descriptions alone do not establish that advantage. If a target remains unmet at submission, present the actual fictional/restricted prototype and limits honestly; do not declare acceptance, conceal a blocker or remove a difficult case.

EXT-01 remains gated roadmap under D20. Any later activated personal-data domain needs separately annotated and reported normal/unclear/concerning cases; financial scores cannot establish privacy, legal, all-worker or employer-authentication accuracy. This supplement records no new model calls, benchmark execution or achieved result.
