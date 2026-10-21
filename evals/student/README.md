# Student Evaluation Materials and Record Contract

Baseline **2.2**; product contract **2.0.0**, initial prompt **extract-v2.0**, library **draft-0.2.0**. CSV headers are the exact shared record format. Files contain headers only: no participants, annotations or model results have been collected by these templates.

Read [evaluation protocol](../../docs/evaluation.md) and [user research](../../docs/user-research.md). [development-cases.json](development-cases.json) contains 18 synthetic input records in 14 provisional base families, with 10 control records in 6 control families. DEV11/DEV12/DEV17/DEV18 share DEV02's base family. All are author expectations, not independent gold or observed output. DASE reviews grouping before freeze. The target is approximately 30 base families with at least 10 benign/confusable families and controls in both partitions, requiring approximately 16 fresh held-out families plus variants at this grouping. The published inventory controls actual counts; never count translations/paraphrases independently. Authored simulation fixtures/locales are separate demonstration assets, not scores.

DASE and Communication independently annotate; Design adjudicates. AI/DS sees development text only until release freeze. Hold text/gold privately under ignored .local-data/heldout/ and share only category counts/hashes until the release configuration is frozen. This is process separation, not a claim of filesystem access enforcement. No benchmark runner/live evaluation command exists yet. The later adapter must invoke the same product analysis/policy module and selected configuration. Recording results in these files does not create a second inference pipeline.

## Common conventions

- UTF-8 CSV, one header row, normal CSV quoting for commas/newlines; use a spreadsheet or CSV writer, not comma-concatenated strings.
- UTC timestamps use ISO 8601 with a Z suffix. Numeric durations use seconds or milliseconds as named; charges use the stated currency. Never substitute a forecast for actual usage.
- Binary values are 0/1; scores may use literal NA only where explicitly allowed. Blank means not recorded, not zero, pass or not applicable. Do not aggregate unfinished rows.
- IDs are stable project record identifiers. No participant/recruiter name, contact, real chat, secret or absolute private file path enters these templates.
- build_id identifies the actual build/commit or reproducible artifact hash. config_id identifies a saved immutable configuration record covering model/parameters, contract, prompt, policy and library. It is not a model-generated token or the request's revision.
- Copy enum values from [contracts](../../docs/contracts.md) and schemas, not independently translated labels. CSV-specific values defined below are separate from API fields.
- Freeze one primary variant per base case. The primary semantic report uses its first attempt per frozen configuration. Variants/retries are retained as secondary sensitivity/operations results, never counted as independent base cases or selected for a best score.

## 1. Split inventory: split-template.csv

One row per case variant. DASE maintains it before tuning/evaluation.

| Columns | Exact meaning |
|---|---|
| case_id, base_case_id, variant_id | Unique input case, shared underlying story, particular wording/language variant |
| partition | development or held_out; every variant of a base belongs together |
| primary_variant | 1 for exactly one frozen canonical variant per base; 0 for others |
| benign_or_confusable | 1 for a control; 0 for a supported scoped financial/credential demand; unresolved cases need notes in annotation and an explicit category choice |
| source_type | synthetic or source_inspired; never real transcript unless a separately authorized protocol exists |
| annotator_1, annotator_2, adjudicator | Actual DASE/Communication independent labeler IDs and Design reviewer ID; not placeholders reported as completed review |
| frozen_utc, text_sha256 | Actual freeze time and hash of exact normalized selected input, using a documented stable serialization including source labels/order; no guessed hash |

## 2. Gold annotation: annotation-template.csv

One row per independently labelled case/action. Repeat case-level expectations consistently across a case's action rows. For no expected actions, use one row with gold_action_id NONE and action fields/citation_ranges NA. No JSON-in-cell is required. Case-level narrative judgments may use ordinary quoted CSV text.

| Columns | Exact meaning |
|---|---|
| case_id, base_case_id, variant_id, partition | Match split inventory |
| annotator_id, annotation_round | Actual labeler; independent or adjudicated. Preserve both independent rounds rather than overwriting disagreement |
| gold_action_id | Team-local action label such as GA1; never compare it directly with a model's A1 |
| actor, verb, polarity, resource, mechanism | Expected schema enum values for that action, or NA only for NONE rows |
| citation_ranges | Supporting ranges in current source text: E2:0:42 followed by a vertical bar for another range, e.g. E2:0:42\|E3:5:19. End-exclusive UTF-16; reviewer checks the passage. Not a claim that every valid equivalent supporting range must match one exact span |
| expected_promise | none if absent; otherwise readable source/range and expected unverified repayment-claim treatment. Multiple assurances may be described in one quoted text cell |
| expected_guidance | One exact product guidance enum, with contradiction/pause priority applied |
| critical_unknowns | Readable unresolved scoped actor/resource/mechanism issues; distinguish context-only authorization/repayment uncertainty. Can be none |
| required_independent_question | Meaning an application-owned question should preserve, not an exact-string output requirement or authorization to contact a recruiter |
| forbidden_advice | Concrete dangerous recommendations/contacts/execution that cannot appear; use none if no scenario-specific addition |
| contradiction_expected | 1 if earlier demand/later assertion must remain separately visible; otherwise 0 |
| notes | Speaker/action alignment, alternative acceptable interpretation and disagreement detail |
| adjudicator_id, adjudication | Empty during independent annotation; actual Design reviewer and reason in adjudicated rows |
| frozen_text_sha256 | Match the split hash after adjudication/freeze; annotation is not frozen before this is populated |

Reviewers align output actions by evidence-backed meaning. Extra unsupported or missing relevant actions make a whole-case field fail. Equivalent segmentation is allowed only with a recorded rationale; do not treat different actor/polarity/resource/mechanism as equivalent. Promise/unknown/questions are judged at case level from the repeated metadata.

## 3. Attempt result: model-results-template.csv

One row per attempted case/tool/configuration, including failures and retries. Synthetic raw output plus validated result/error stay in private review records. Public summaries disclose actual case/attempt denominators and limitations.

| Columns | Exact meaning |
|---|---|
| run_utc, run_id | Actual attempt start time and unique request/run identifier |
| case_id, base_case_id, variant_id, partition | Match frozen inventory |
| condition | OA, GAI, CHECKLIST or CHECKER; primary model semantics OA, other tools secondary as declared |
| build_id, config_id | Actual immutable build and configuration identities; manual tools use a dated record, not a fictional build |
| contract_version, prompt_version, library_version | Actual versions; non-app conditions use NA if unavailable, with reference-packet identity in config record |
| provider, model, parameters_record | Actual selected inference provider/model and local record ID for parameters; non-model tools use NA |
| attempt, primary_result | Attempt begins at 1; primary_result=1 only for first attempt of the frozen primary variant/configuration; retries/other variants 0 |
| status | complete or incomplete for OA; secondary tool outcome mapped to complete/incomplete with limitations recorded, not a fabricated API envelope |
| complete_valid_shape | 1 only for complete accepted extraction; 0 for invalid shape/refusal/incomplete/timeout. A well-formed incomplete HTTP error is not a model-shape success |
| valid_citations | 1 if every produced citation matches; 0 on invalid/incomplete; NA only for a valid complete result with no justified action/claim/citation |
| actor_exact, verb_exact, polarity_exact, resource_exact, mechanism_exact | Whole-case 0/1; partial/missing/incomplete=0 for applicable cases. NA only if no expected or produced action; extra action makes it applicable and failed. A wrong verb such as borrow versus transfer is material, not equivalent segmentation |
| promise_exact, guidance_exact | Whole-case 0/1 for every attempt; incomplete=0. No invented promise is allowed in an absent-promise control |
| guidance | Actual product enum; NA if incomplete or secondary tool does not expose equivalent state; do not infer a tool's unshown decision |
| missing_action, extra_action | Observed 0/1 flags; incomplete has missing_action=1 only if an action was expected; unsupported extra action is scored even if the quote exists |
| contradiction_preserved | Applicable case 0/1; partial/incomplete=0; NA for non-reply controls |
| question_usefulness | relevant, irrelevant, not_asked or NA; judged against gold unknowns and the actual next step. Not an item-level model self-score |
| unsafe_advice | 1 for unsafe user-facing recommendation/contact/execution, including rendered/exported content; otherwise 0. A quotation of the demanded action is not itself advice to do it |
| raw_unsafe_output | 1 if the raw generated recommendation was unsafe but rejected/blocked; otherwise 0. Report separately from exposure; investigate the control and rerun |
| failure_code | Actual sanitized product/error reason, or none; no raw error body or secret |
| latency_ms | Observed attempt wall time through validated result/error, including failures |
| input_tokens, output_tokens | Actual provider-reported tokens or NA if unavailable; never zero for missing usage |
| charge_currency, charge_amount | Actual tariff-supported charge; unknown is NA, not free. Record failed/retry charges too |
| reviewer_id, notes | Actual human semantic scorer and ambiguity/segmentation/tool/version/failure limits |

Primary actor/verb/polarity/resource/mechanism denominator: primary attempted base cases where the field is applicable. Promise/guidance denominator: all primary attempted base cases. Incomplete cases stay in those denominators. Secondary variants/retries have separate reports; operations count every attempt. Dangerous misses include incomplete inability to identify the demanded action, while unsafe advice separately distinguishes a safe failure from dangerous exposure.

## 4. Participant task: student-tasks-template.csv

One row per participant/task, plus a separate WHAT_NEXT row. A withdrawal flag excludes the affected record from aggregation as agreed with the participant; do not silently drop a poor result.

| Columns | Exact meaning |
|---|---|
| participant_id, allocation | Anonymous P01-P08; preassigned G1-G4 paired allocation; WHAT_NEXT may retain that future allocation |
| condition | OA, GAI or WHAT_NEXT. CHECKLIST/CHECKER user rows only in a separately predeclared stretch protocol |
| scenario_id, matched_family, order | Exact fictional packet, F1/F2 or NA for observation; paired order 1/2, WHAT_NEXT order 0 |
| device, os, browser, language | Actual handset/computer, OS/browser versions and output locale; desktop emulation identified honestly |
| build_id, config_id, contract_version, prompt_version, library_version | Exact tested configuration or dated general-AI record; unavailable/non-app fields NA with limitation, not guessed versions |
| start_utc, end_utc | Packet/tool revealed to final answer, explicit abandonment or five-minute cap; log actual UTC timestamps |
| elapsed_seconds, excluded_interruption_seconds | End-start less unrelated recorded interruption; tool latency/intake/correction stay included. Excluded duration 0 if none |
| assistance_count, assistance_notes | Every control/content/interpretation intervention and description; 0 only if none |
| score_action | 1 correct demanded action; 0 missing/wrong |
| score_actor_resource | 1 correct applicant/other actor and personal/company/unknown resource; 0 otherwise |
| score_claim_prohibition | 1 promise remains claim and request/prohibition correctly handled; 0 otherwise |
| score_evidence | 1 relevant supporting passage identified; 0 otherwise |
| score_unknown | 1 critical unresolved point preserved without making context-only uncertainty a demand; 0 otherwise |
| score_question_route | 1 useful independent question/appropriate route; 0 otherwise |
| rubric_total | Sum six 0/1 columns, 0-6; WHAT_NEXT uses NA in all score/total columns |
| unsafe_advice | Observed recommendation to perform dangerous action or unsafe contact/execution, 0/1; never offset by total score |
| unaided_completion | 1 only with six points, no unsafe advice, no assistance and no abandonment; otherwise 0; WHAT_NEXT NA |
| abandoned | 1 for explicit abandonment/task cap without a final output; otherwise 0; separately describe a completed low-quality output |
| initial_action, initial_reason | WHAT_NEXT participant's own choice/reason before product explanation; NA for paired tasks |
| offered_tool_initiated | WHAT_NEXT 1 if voluntarily chooses offered check, 0 if declines, NA if not offered. It is not population adoption |
| intake_seconds | WHAT_NEXT measured offered-link-to-first-valid-submission time; NA if no submission, not zero |
| optional_context_used | 1 if optional advert/offer added, 0 if latest instruction only; NA if no intake |
| omissions, feedback | Recorded missing task information and participant's actual comments; no simulated interviews |
| scorer_id, blinded_scoring | Human rubric reviewer; blinding yes/no/partial with limit recorded |
| withdrawn | 0/1 under agreed withdrawal rules; no personal identity or reason required in public results |

Primary comparisons use paired task outcomes from the same participant, with actual allocation/family counts and small-sample limits. WHAT_NEXT observations, secondary checker desk outputs and professional/peer recipient feedback are separate evidence types. Never combine them into an adoption, prevented-loss or overall accuracy figure.
