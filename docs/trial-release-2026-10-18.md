# Trial release checkpoint — 18 October 2026

**Hosted-release record:** This file records the existing v24 public trial. Repository code may be newer; read [the v28 submission status](submission-framework-2026-10-18.md). Updating source does not update the public deployment.

This is the current release-status reference. Earlier checkpoints remain historical evidence; they do not establish the readiness of a later source revision. The [public contract](contracts.md) remains **2.0.0**.

## Current public deployment

[OfferAnchor](https://offeranchor-hk.vercel.app) now runs **v24 code**, Vercel state **READY**, deployment ID `dpl_686TaXrbCjx7sN33nC2GVftZoZCo`. **Guarded paid tools are enabled for the free trial.** The owner previously confirmed Google and email-code sign-in at this public origin on v22; both login entrances are enabled after v24 publication. This release did not repeat owner consent or email-code entry.

The source now includes the **v24 audit-coverage alignment**, the unchanged v23 repayment-promise guard and the strict OCR configuration-conflict fix, with **10 focused tests passing**. This source is now published as the controlled trial. The lifetime-trial feature and its cloud migration are implemented. The final local production build passed; 320 integration tests, 93 AI compatibility tests, type checking, and workspace/account/attachment browser checks passed. These checks are separate from model quality. The owner subsequently reviewed the frontend and authorized publication of the controlled free trial after critical checks. This supersedes the earlier publication hold; limited hosted v24 checks are recorded below.

**A controlled, quota-limited trial is intended. Readiness for unrestricted public paid use has not been established.**

## Observed evidence

These are exposed development cases and source-backed developer reviews. Independent manual review, independent held-out evaluation, and participant testing are absent; no accuracy percentage or user-effectiveness claim follows.

| Evidence | Observed result | Boundary |
|---|---|---|
| release24official — fresh official v24 analysis | 3 attempts, 6 requests, no retries; 2 complete, 1 audit refusal. Complex loan/proceeds/OTP-prohibition case completes with exact action projection. | DEV15 refuses over an additional ordinary duty despite one representative duty retained; preserve incomplete. Company control contains a supported extra prohibition. Developer review, not independent accuracy. |
| v24 recorded usage | 18,493 tokens; estimated CNY 0.320556; 14/14 accepted citations match source slices. | Six HTTP200/stop model responses do not mean three accepted product results. |
| `final23official` — fresh official v23 analysis | 3 attempts, 6 raw requests, no automatic retries; 2 complete, 1 exact action projection. DEV15 completes with the typed, linked repayment assurance. | Company control's extra own-money prohibition is supported by the source; its unchanged exact projection remains false. Complex is incomplete after an audit rejection judged overstrict by the developer review; a useful raw candidate is not a completed result. |
| v23 citations and usage | All 11 citations in the two complete results match their source slices. The three attempts use 17,777 recorded tokens, estimated CNY 0.264156. | Citation matching is mechanical evidence. Cost is a usage estimate, not an invoice; the rejected attempt still consumes both requests. |
| `final22official` — earlier complex attempt | Complete; 6,299 tokens, estimated CNY 0.102204. | Separate historical attempt. It cannot replace the fresh v23 failure or be pooled into its success count or cost. |
| `frozen22gateway` — exposed 18-case run | 18 complete envelopes; source review judges 15 supported, 1 defective, 2 disputed. | Completion is not semantic correctness. These judgments are not independent accuracy or a new v23 run. |
| `replay23.json` — offline captured-v22 replay | Zero network requests; rejects the old DEV15 omission, while the other 17 captured guard outcomes remain accepted. | Reject-only regression evidence. It does not establish new generation quality or resolve earlier disputes. |
| `aux-live23` — real composed server modules | Source Q&A completes with 1 reference; optional search returns 3 sources. Initial OCR returns incomplete `not_configured`. | Synthetic question/image and generic public query; no hosted-browser acceptance is inferred. |
| `aux-live23-ocr-fix` — real OCR after fix | Complete: 207 characters, 415 input + 47 output tokens, one request, about 1.66 seconds. | One synthetic image, no retries; this does not establish broad OCR quality or hosted trial readiness. |

A separate actual local production-build HTTP check of DEV15 returned incomplete invalid_output in about 26.2 seconds. It made no automatic retry and produced no exportable report; provider usage is not exposed by the public endpoint. This failure is retained beside the successful direct-module observation, rather than replaced by it. It shows that runtime delivery is not a guarantee of reliable completion, and strengthens the limit to supervised trial review.

The detailed source review is retained privately under `final23official/semantic-review.md`; the named run records remain separate. No earlier attempt, rejection, or gold label is rewritten.

## Trial decision and remaining work

The owner selected **five AI action attempts total per account, for the account lifetime, with no daily reset**. This is an attempt allowance, not five guaranteed successful results. An action attempt and a raw provider request are different accounting units.

| Item | Current state |
|---|---|
| Server-verified account gating and shared lifetime allowance | Implemented. Eleven isolated real database checks across 17 HTTP requests passed; no real-user counters or model calls were used. Hosted lifetime-policy exposure is verified; real-account exhaustion was not repeated on a user account. |
| Trial global budget | Local trial configuration: 30 raw requests per 24 hours and at most 2 in flight. A check reserves up to two raw calls but one account action. Public trial tools are now enabled with the same global budget; legacy team access remains bounded. |
| Cloud migration and final source build | Both passed. The initial trial-RPC transport failure is preserved separately; no production-user allowance was reset. |
| New production deployment and hosted trial checks | Published after critical checks. Public visitor/example/download/login-entry checks and one synthetic hosted model request passed. Actual provider consent and six-attempt exhaustion were not repeated. |
| Final artifact scan | Current runtime source, static client assets and both Desktop deliverables passed the approved local exact-credential scan with zero matches. Private configurations, dependencies and build caches are absent from the delivered folders. |

The latest owner instruction authorizes the controlled trial after critical checks and accepts the original QQ sender temporarily. Hosted trial acceptance remains required; sender replacement is deferred by the explicit mailbox decision. Keep APP_SESSION_SECRET and the canonical origin stable: account hashes depend on the secret, and quota scope depends on the origin. This trial does not provide a payment system or five guaranteed successful readings.

The email **From** identity still shows the original QQ address, now explicitly accepted by the owner for this release. The dedicated project QQ mailbox exists, but its official security page prohibits SMTP until **1 November 2026, 14:22 Asia/Shanghai**, because activation is less than fourteen days old. No credentials or sender settings were changed to bypass that provider restriction; replacement remains a later task.


## Product and data boundaries

- The knowledge source set contains **7 approved cards across 4 routes**, with published cases labelled as such. Retrieval-guided answers and published cases do not verify an employer or establish that a proposed action is safe.
- Search is optional and requires a user action; it can be skipped or fail. The application does not automatically visit suspicious links found in submitted material.
- Cloud job history is not implemented; this is a feature boundary, not exhausted Supabase capacity. Browser history remains manual and simulation-only. A current complete live or simulated reading can also be downloaded as a plaintext ZIP (maximum 512 KiB), with report.html, record.json and README.txt. Reimport validates only the request, restores editing material and never activates the old result or calls AI automatically. A new live reading uses the same account allowance. Authentication and quota records do not constitute cloud job history; enabled provider features still send their required request material to the relevant external service.
- All **8 original simulations** and the **18 frozen development records / 14 base families** remain intact. The fixtures and frozen gold are unchanged. Only a current complete result can enable product export; incomplete or stale results cannot.

See the [project entry point](../README.md) and [privacy and safety boundaries](privacy-and-safety.md).

## Rejected thinking-budget diagnostic

The final private bounded23thinking1536 diagnostic changed only generation thinking from 1024 to 1536 tokens; the source audit stayed at 768 and the shared provider deadline stayed at 50 seconds. Its three attempts dispatched six raw requests: DEV15 and the complex case timed out during audit, while the company control completed with exactly the same extraction as the default profile, taking about 43.0 rather than 35.2 seconds. This supplies no measured content improvement. The override is rejected; the canonical generation budget remains 1024, with no runtime or hosted configuration change and no further planned model calls.

Recorded usage is a lower bound of 14,275 tokens and estimated CNY 0.246540. Two timed-out audit requests have unknown usage and charges; they are not counted as zero. This separate, exposed-case experiment is neither pooled into the default v23 result nor used to replace an earlier refusal. Its request/response/raw records and source review are included in the demo evidence package.

## Derived-package verification

The earlier v23 source snapshot independently built and ran on port3180 using temporarily reused installed dependencies. Landing-to-workspace navigation, a fixed task example and a390px viewport passed with no external browser calls or page errors. Its guest state inherited no credentials. Temporary dependency link/build cache were removed, and exact next.config.ts was restored. This is not a fresh npm ci, a physical Mac/phone test, a hosted trial test or a model-quality result.

## Latest bounded fixes and portable records

The Learn question panel is retired on account scope changes; pending imports also retire across account transitions, including A-to-B-to-A. Permanent lifetime-quota exhaustion is distinguished from temporary service limits in image reading, knowledge Q&A and public search. A readable static HTML report escapes source text and edited prose, includes the protected notice, and allows no script or external resources. ZIP import is stored-only with exactly three fixed paths, a 512 KiB limit, strict local/central metadata and CRC checks; no filesystem extraction, compressed payload or imported complete response is accepted. Incomplete/stale export rejection and account quotas remain in force.

The owner accepted the existing frontend and authorized portable records before release. The shared contract stays 2.0.0, simulation registry stays eight, frozen development stays eighteen records/fourteen families. No cloud history claim is made.

## Historical v25 candidate probe — not adopted

The owner selected a time-limited controlled free trial rather than waiting for a perfect classifier. The final v25 development probe is fixed before execution to six scenarios: DEV15, complex-credential-prohibition, company-en, task-zh, DEV03 and DEV14. It includes known false refusals, a complex risk, a company-funded control, Chinese task payment, unstated funding and a positive OTP-control request. All outcomes will be retained; no automatic retry, provider switching or selected-best-run score is permitted. Passing code tests is separate from case semantics, and neither establishes independent ninety-percent accuracy.

V25 changes only the internal audit representation: once one typed representative ordinary duty is retained, another ordinary duty is optional, while missing material funding/contrary terms remain reportable through a distinct material_context category. Unsupported retained duties and every returned finding still reject the result. Public contract, core generation, source audit gates and the 1024/768 thinking/50-second budgets remain unchanged. V24/v23 failed records remain historical evidence.

## Final same-six comparison and release choice

The same predeclared six-case v24 comparison returned five complete readings and one audit refusal from twelve raw requests, with no retries. Company funding, Chinese task payment, an unspecified payer and positive OTP control are included; DEV15 also completes. The complex case remains incomplete. All outcomes remain separate from earlier successes and from v25. Recorded use is 33,674 tokens, estimated CNY 0.441768. Source-backed developer review and exact citations are recorded separately; no independent accuracy percentage follows.

V25 is **not adopted**: its separate same-six batch returned three complete results, three refusals and eleven raw requests. Its internal optional audit category remains an inactive, tested development candidate. The active source returns to extract-v2.24 / context-audit-1.4.0. This is a controlled, quota-limited MVP trial with explicit failure handling, not acceptance of a ninety-percent accuracy claim. No further model or prompt changes are planned for this release.

## Published trial and actual-host check

Published on 18 October 2026 at https://offeranchor-hk.vercel.app, deployment dpl_686TaXrbCjx7sN33nC2GVftZoZCo (READY). Official team Beijing configuration is verified. Anonymous policy status reports limit 5 / lifetime / ai_action_attempt; public login is configured, with Google and email-code entrances enabled. Earlier owner-confirmed Google/email successes remain the provider-login evidence; this run sent no new email and did not perform consent on the owner behalf.

The public fixed task example generated zero analysis API calls and produced a downloadable ZIP. The narrow 390-pixel viewport had no horizontal overflow. A separate team-access synthetic OTP request returned HTTP200/complete, extract-v2.24, qwen3.8-max, pause_requested_action, with its citation matching source text, in about 29 seconds. No real user allowance was consumed. The public endpoint does not expose token usage, so its raw usage and cost remain unknown rather than zero.

The project mailbox cannot yet enable SMTP; the owner explicitly retained the original QQ sender. No cloud job-history database or account synchronization is claimed. The pre-upload runtime-source receipt is preserved privately; subsequent manifest changes only record this observed publication, and do not represent another deployment or runtime code change.
