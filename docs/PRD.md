# OfferAnchor: Product Requirements Document

**Current source notice — 19 October 2026:** This revision selects `extract-v2.29 / context-audit-1.8.0`, with unchanged source-role/event guards. [Current repair and rollout status](loan-funding-release-2026-10-19.md) records four private-gateway and two actual team Alibaba checks. Earlier dated failures remain historical evidence. Frontend format, public contract 2.0.0, team Alibaba configuration and five lifetime attempts per account remain unchanged. Source publication alone does not replace the website.

**Repository/hosted separation - 18 October:** This repository revision selects `extract-v2.28 / context-audit-1.7.0`. The existing hosted trial remains v24 and is not redeployed by this update. See [submission framework](submission-framework-2026-10-18.md) for current source verification. Product scope, public contract 2.0.0, five lifetime account attempts, frontend and service configuration are unchanged. Older dated runtime paragraphs below describe their recorded checkpoint.

**Current team guide — 18 October:** Read [current product and shared facts](current-product.md) and [released trial evidence](trial-release-2026-10-18.md) first. The live trial uses official team Beijing qwen3.8-max, extract-v2.24 / context-audit-1.4.0, contract 2.0.0 and five lifetime AI action attempts per account. Knowledge/image/optional search and real Google/eight-digit email login are implemented; cloud query history is not. Earlier dated checkpoints below retain their historical meaning.

**Current release record — 18 October:** [Controlled trial, observed tests and remaining limits](trial-release-2026-10-18.md) is the current runtime/deployment authority. Active source uses extract-v2.24 / context-audit-1.4.0 with unchanged source, recipient and repayment guards; contract 2.0.0 and original fixtures/gold remain unchanged. The v24 controlled free trial is now published at offeranchor-hk.vercel.app with lifetime five-action gating; the owner accepts the original QQ sender temporarily. Portable downloads restore material for a new reading; cloud history is not implemented. The final same-six official v24 comparison has five complete results and one refusal, not an accuracy estimate. Earlier dated checkpoints below remain historical.

**Historical staged checkpoint, 18 October:** active source-bound profile `extract-v2.20 / context-audit-1.1.0`; generation 1,024 tokens, audit 512, at most two model calls; timeouts 50s model / 53s server / 58s browser / 20s delayed response. Inputs above 192 source units fail closed, never truncate. The 18-case gateway evaluation is underway: the first three cases produced structurally complete exact projections, awaiting semantic review; 15 remain. No final result is claimed. `MODEL_CALLS_ENABLED=false` remains under quality hold. Local Google/eight-digit email sign-in is owner-confirmed; Supabase public callback persistence is verified. Shared Supabase coordination passed 34 checks/61 HTTP requests and holds temporary auth/quota metadata only. Vercel project/domain exist and encrypted production variables are saved, but code is not deployed. Opt-in history is local; cloud history/sync and source-material storage are not implemented. Earlier paragraphs below are historical observations, not current profile or release status.

**Historical checkpoint, 17 October:** [Product login and release gates](authentication-2026-10-17.md) record the state at that date. Its billing observation and release details do not describe the current profile; see the 18 October checkpoint above.

**17 October intake extension:** [current file/image workflow](image-intake-2026-10-17.md) is implemented in the canonical composer. Short readable attachments need neither extra typed text nor a confirmation click; optional cloud OCR uses separate consent. The existing financial/account scope and text analysis contract are unchanged.

**D23 supplement — 16 October:** [intake/model/pitch authority](intake-model-and-pitch.md) defines the approved composer design and optional local file convenience. The shared analysis input remains selected text. The design preview is implemented separately; cloud image reading, accounts and unrelated privacy/rights assessment are not release dependencies.

Version **2.2** | Scope revision **11 October 2026** | Original planning baseline **5 October 2026** | Authority for product scope and acceptance.

**OfferAnchor is a Hong Kong recruitment and onboarding request-checking assistant.** It helps jobseekers, part-time applicants and people newly entering a role understand a selected instruction before committing personal money, taking personal debt or handing over bank-account control. University students, recent graduates and early-career applicants are the initial validation audience, not an eligibility restriction. The first useful result needs only the latest instruction; advertisement/offer context is optional. Positioning: **Check recruitment and onboarding requests before you act.** Initial coverage: personal payments, borrowing and bank-account control.

## 1. Why this problem and this product

Hong Kong Police recorded **4,095 online employment fraud cases in 2025; 96.5% were task scams**. These are territory-wide counts, not student incidence. [Police review](https://www.police.gov.hk/ppp_tc/01_about_us/cp_ye.html), [ADCC statistics](https://www.adcc.gov.hk/en-hk/statistic.html).

ADCC's 30 March warning describes a first-year student's internship search redirected into commission tasks, onboarding, early payments and nearly HK$190,000 lost. Its April warning documents adult recruitment cases involving personal borrowing and company-repayment assurances. These support mechanisms, not our effectiveness or student borrowing prevalence. [Student case](https://www.adcc.gov.hk/zh-cn/alerts-detail/alerts-2038471984935432194.html), [borrowing warning](https://www.adcc.gov.hk/zh-cn/alerts-detail/alerts-2044683469105754113.html).

The product makes the relationship visible, connects it to an exact passage, permits correction and turns it into a question for an independently chosen reviewer. Competitors already offer reports, quoted passages, conversation intake and next steps. **Our proposed advantage is fewer important verification omissions with acceptable effort**; a strong general AI may equal or outperform it. The comparative task, not the feature list, decides that claim. [Sources and competition](research-and-sources.md).

Adjacent privacy evidence is real: PCPD reported 42 complaints in two weeks about fake construction vacancies soliciting workers' identity/qualification documents on 29 January 2026. These are construction-worker complaints, not student incidence, and cannot be added to annual police cases. They support a bounded future personal-data-request capability, not a current detection or legal-compliance claim. [PCPD warning](https://www.pcpd.org.hk/tc_chi/news_events/media_statements/press_20260129.html).

## 2. Users, timing and hypotheses

Intended product users are English/Traditional Chinese reading Hong Kong jobseekers, internship/part-time applicants and newly onboarded workers **before** acting on a scoped request. The initial reachable validation cohort remains consenting university students, recent graduates and early-career applicants. No student status, university email, real victim record or institutional access is required to use the planned workflow. A recipient can be a trusted person or independent adviser receiving a brief through an existing channel; no recipient account is required.

**Competition continuity (D22):** retain student recruitment/onboarding financial exposure as the submitted problem, first demonstration and initial validation. Wider intended eligibility is prospective extension, not a replacement with all-worker rights/privacy analysis. The 4 October submitted report stays historical. [The source record](research-and-sources.md#submission-continuity-and-organizer-listing---12-october-2026) separates organizer rules from our interpretation; [D22](decisions.md#12-october-submission-continuity-and-shared-publication-d22) preserves scope, names and existing interfaces.

Product eligibility, participants actually tested and future market reach are separate. A classmate study supports only its observed cohort/tasks; it does not establish usability or effectiveness for all ages, occupations or Hong Kong jobseekers. Broader adult cohorts require later language/accessibility/task validation. The 4,095 cases establish a mechanism-level problem, not a count of customers or student cases.

| ID | Hypothesis | Evidence that could defeat it |
|---|---|---|
| H01 | A recent applicant initiates a second check at the instruction checkpoint | Tool is not opened, opened too late, or intake is abandoned |
| H02 | Structured relationships improve verification | Strong generic AI/checklist gives an equally useful answer with less effort |
| H03 | Short question and expandable brief help a recipient | Recipient finds it unclear, misleading or unnecessarily long |
| H04 | Selected bilingual text is sufficient for the initial audience | Required context cannot be provided without unsupported intake |
| H05 | A support service could sponsor a bounded pilot | No need, procurement path or budget is established |

No observed adoption, interviews, live-model accuracy, partnerships or willingness to pay is established by this document.

## 3. Release scope

| ID | P0 requirement | Acceptance |
|---|---|---|
| P0-01 | Paste one latest instruction; optional context | Preview/edit/delete labelled evidence; invalid input makes no paid call |
| P0-02 | Actor/action/resource interpretation | Requested vs prohibited; personal/company/unknown; exact selectable passages |
| P0-03 | Supported change and contradiction | Earlier context only when supplied; promise remains claim; denial does not erase earlier demand |
| P0-04 | Correct or clarify | Original evidence preserved; labelled user notes; at most two displayed clarification questions per tab session |
| P0-05 | Short question plus editable full brief | First complete result has a copyable app-owned verification question; copy/manual fallback/print (including short-question copy) include the same essential protected footer |
| P0-06 | Same-session reply/outcome | Append source, increment revision, reanalyse current evidence; outcomes user-reported |
| P0-07 | Safe failure and protection of submitted data | No stale/incomplete success; clear-session; processor notice; controlled server access |
| P0-08 | Evidence of working usefulness | Shared acceptance cases, independent semantics, strong AI comparison, actual phones/cost/failures |

Scoped mechanisms: applicant-funded payment/recharge to obtain tasks or earnings; recruiter-directed personal borrowing or transfer of its proceeds. A supported banking OTP/account-control request triggers an additional safety guard. Normal payroll details, company-funded purchasing, ordinary reimbursable expenses and changes of duties are controls, not automatic fraud findings.

Optional local TXT/Markdown/DOCX/text-PDF intake and separately consented cloud image transcription are implemented in the released workspace. They prepare inspectable text before the unchanged analysis contract and preserve source/API limits. They do not verify a document or image; voice/hardware remains outside the release. See [input implementation](image-intake-2026-10-17.md).

Google and eight-digit email-code sign-in are implemented. Guests can use fixed examples; live free-trial actions require a verified account and the shared lifetime allowance. Authentication does not create cloud query history.

Excluded: passive call/inbox/chat access, contact uploads, automatic suspicious-link visits/outreach, employer certification, loan/payment/account operations, legal/credit advice, recovery promises, native apps, training/vector infrastructure, persistent/cross-device evidence history, family/radar workflows and institution APIs. The existing cloud auth/quota coordination database is operational metadata, not an evidence/history database.

### 3.1 Current coverage and conditional extensions

| Layer | Status for the 18 October submission | Boundary |
|---|---|---|
| Product audience | Approved broadening in D20 | Hong Kong jobseekers/part-time applicants/new entrants; initial validation remains students/recent graduates/early-career applicants |
| Financial/account core | Existing P0 and WP01-WP15 | Task-unlock personal payment, recruiter-directed personal borrowing/proceeds transfer, supported banking OTP/account-control requests, and normal/confusable controls |
| Requirement/context explanation | Existing P0 | Use only supplied advertisements/offers/replies; distinguish duties, demands, prohibitions and promises; no complete offer/contract review |
| EXT-01 personal-data requests | Conditional roadmap; no active implementation assignment | One bounded text-request family, such as identity-document collection; no real document upload or general privacy/legality verdict |
| EXT-02 employment-term comparison | Post-submission roadmap | Source-backed discrepancies in supplied pay/duty/fee text; legal entitlements, liability and contract validity remain outside scope |
| General student finance/rights | Excluded | Investment, housing, consumer disputes, credit suitability and general legal advice |

P0 does not classify every employment fee, deposit, payroll-document request or data request. The account-control safety guard is already scoped; it must not be advertised as a completed general personal-data assessment. Protecting submitted data (P0-07) and analysing a recruiter's personal-data demand (EXT-01) are distinct requirements.

**EXT-01 activation requires a separate recorded change before the 15 October feature freeze:** (1) the existing financial/account workflow is connected and core regressions are resolved; (2) Communication supplies scoped official sources and actual human meaning review; (3) AI/DS, CS, Design and DASE agree any interface, policy, notice and evaluation changes; (4) normal, unclear and concerning synthetic controls plus independently reviewed unseen cases are exercised with the actual model, with costs/failures reported; (5) tested guidance does not recommend unsafe disclosure or assert comprehensive safety/legality; (6) the representative approves the exact scope and consumers acknowledge the compatible handoff. A prior call allowance is not renewed by this plan. If these gates are unmet, EXT-01 remains a labelled roadmap/educational proposal and does not delay P0. No teammate may activate it merely from this document.

### 3.2 Guidance outside current coverage

`no_personal_financial_request_identified` means only that the selected material contains no identified request within the financial/account mechanisms above. It cannot clear an identity-document request, a job, a recruiter or a contract. Entry/result/brief wording must state the current coverage. For an identity-document-only example, retain the limited financial result with its coverage notice; do not manufacture an unsupported privacy verdict or invent a new public enum. This documentation revision changes no contract field, enum, source limit or callable interface.

## 4. Required journeys and shared simulations

| Journey | User-visible outcome | Shared fixture |
|---|---|---|
| J01 student task escalation | Earlier work/commission claims contrasted with personally funded task payment; pause the payment | `task-en`, `task-zh` |
| J02 company-funded/prohibition | Same vocabulary, different payer/polarity; no scoped request identified, identity unresolved | `company-en`, `company-zh` |
| J03 missing payer | Critical payer/resource unknown; bounded clarification | `missing-payer-en` |
| J04 interpretation correction | User clarifies an ambiguous funding source; preserve source and user-note provenance | `funding-note-en` |
| J05 denial reply | Earlier task payment and later denial shown separately; earlier supported demand still warrants pause | `task-denial-en` |
| J06 personal borrowing | Applicant borrower, nominated transfer, repayment as promise | `loan-en` |
| J07 already acted | User-reported note; independent bank/official help, no automated remedy | Development seed, live evaluation required |

The [fixture registry](../examples/simulation-fixtures.json) specifies actual authored coverage. Fixtures are synthetic, not model-generated or independently annotated results. Simulation supports only exact listed requests; arbitrary pasted/edited messages require live analysis or an explicit unsupported result. Every export retains the mode.

## 5. Input, state and clarification

- Live working evidence stays in page memory and is deliberately sent only for the selected disclosed processor feature. Reload/end can lose work; offer deliberate export. Optional browser history is limited to prepared simulations. Readable ZIP download/import is implemented, but cloud query history is not. Never place evidence in URLs, analytics or the operational database.
- Up to **eight** sources `E1`-`E8`, each at most **4,000 UTF-16 units**, at most **12,000 total**, body at most **96 KiB**. Limits are engineering decisions. No silent truncation, model summary replacing evidence, or automatic removal of a prior demand.
- One instruction/reply is required. Initial fields: latest instruction; optional advertisement and offer. Notes/replies append into remaining slots. A full set blocks further appends with explicit export/new-session guidance. A deliberate deletion warns about lost comparison context.
- Normalize CRLF to LF before display/submission; afterwards no fuzzy/Unicode/whitespace normalization. IDs never get reused in that tab session; sequence expresses relative order. The exact [allocation rule](integration-contract.md#5-evidence-and-session-events) handles slot exhaustion.
- English and Traditional Chinese display; original quotations stay unchanged. Locale changes invalidate analysis without resetting clarification budget.
- Evidence changes, notes, reordering or locale change increment revision, cancel best-effort and invalidate result/draft. Retry creates a new request ID without changing evidence revision.
- Correction, clarification answers and contact/action reports use `user_note`. A copied alleged-recruiter reply uses `reply`. A note is not independent verification.
- Two clarification questions total per tab session, consumed only when accepted current output first displays them. No render/retry/stale-response double count. Unknowns remain when the budget is used. The app-owned independent-verification question is separate from that budget.

Exact rules/types/state transitions: [contracts](contracts.md), [integration handoff](integration-contract.md). Neither developer may choose a different interpretation locally.

## 6. Guidance and claim boundaries

| State | Meaning | Does not establish |
|---|---|---|
| `pause_requested_action` | Supported scoped personal financial/control demand; pause that action | Police fraud finding or legal liability |
| `clarify_before_action` | Relevant actor/funds/payment condition remains unclear/conflicting | Low risk |
| `no_personal_financial_request_identified` | No scoped request found in selected material | Safe job, authentic recruiter, personal-data clearance, fair contract or permission to disclose credentials |
| `incomplete` | No usable validated result for this run | Partial/previous success is current |

Policy is application-owned and ordered **pause > relevant clarification > no scoped demand**. Mechanism is a cited model interpretation, not a verified fact. Authorization and repayment unknowns remain context; they cannot alone turn every normal instruction into a blocking alert. Later reassurance/denial does not automatically clear earlier supported demands. No confidence/fraud score, invented contacts, or link authentication.

## 7. Brief and export

First result: concise action/resource explanation, exact supporting passage, short independent question and applicable reviewed route. Expandable full brief includes source stages, comparisons, promises, corrections, contradictions and unresolved checks.

The body is editable. A **noneditable outer footer** is assembled on every copy/print from the current result: product/baseline/contract/revision/mode, selected-material boundary, unverified claim/identity boundary, unresolved checks and whether the body was edited. User edits do not gain evidence badges; original validated passages remain accessible. Quote inclusion is optional for privacy, footer is mandatory. A changed revision disables old draft/export until a current result exists.

Copy success, print dialog, opened link and self-reported contact are distinct. None establishes delivery or official verification. The default question is for an independently chosen adviser/company channel, not negotiating with a suspected recruiter. No real official calls during fictional tests.

## 8. Release acceptance and impact

| ID | Criterion | Required observation |
|---|---|---|
| AC-01 | Exact current citations and valid references | Literal resolver, repeated quote, emoji and revision cases |
| AC-02 | Correct actor/polarity/resource/mechanism/promise | Independent case annotations; citation validity scored separately |
| AC-03 | Bounded processing | Immediate status, delayed 20s, server deadline 53s and browser deadline 58s; manual retry under the same allowance |
| AC-04 | Failure/cancel/stale isolation | All API/preflight errors and reducer/network cases; only complete activates export |
| AC-05 | No dangerous recommendation/fabricated contact | One observed violation blocks release |
| AC-06 | Data minimization | Processor review, no raw logs/storage/client keys; clear-session tested |
| AC-07 | Useful protected export | Copy fallback/print; edited body, unknowns, provenance/mode retained |
| AC-08 | Accessible target phones | Labels/focus/non-color status, 200% zoom, actual iOS/Android |
| AC-09 | Comparative usefulness | Strong general-AI paired tasks; actual counts, time/help/omissions/failures |
| AC-10 | Honest reproducible demo | Runnable current build, explicit simulation/recording, exact release identity |

Visible processing within one second and median valid result within ten seconds are targets, not guarantees; report attempt count/P95/failures. Outcome claims start with understanding, omissions and verification readiness. Loss prevention requires later longitudinal evidence; institutional sponsorship remains a hypothesis.

## 9. Authority

Scope/acceptance: this PRD. Public shapes: JSON schemas plus [contracts](contracts.md). Callable modules/state/policy: [integration contract](integration-contract.md). Responsibility/dependencies/paths: [work packages](publication-scope.md#excluded-material). Version/role/admin gates: [project manifest](project-manifest.json). Decisions must update all affected consumers before integration. The submitted interim/PDF is historical and is not rewritten by this baseline.
