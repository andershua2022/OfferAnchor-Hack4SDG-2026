# OfferAnchor: Public Contracts

**Current source notice — 19 October 2026:** This revision selects `extract-v2.29 / context-audit-1.8.0`, with unchanged source-role/event guards. [Current repair and rollout status](loan-funding-release-2026-10-19.md) records four private-gateway and two actual team Alibaba checks. Earlier dated failures remain historical evidence. Frontend format, public contract 2.0.0, team Alibaba configuration and five lifetime attempts per account remain unchanged. Source publication alone does not replace the website.

**Repository/hosted separation - 18 October:** This repository revision selects `extract-v2.28 / context-audit-1.7.0`. The existing hosted trial remains v24 and is not redeployed by this update. See [submission framework](submission-framework-2026-10-18.md) for current source verification. Product scope, public contract 2.0.0, five lifetime account attempts, frontend and service configuration are unchanged. Older dated runtime paragraphs below describe their recorded checkpoint.

Contract **2.0.0** | Baseline **2.2**; scope revision **11 October 2026**; original planning date **5 October 2026**. The shared local simulation endpoint is implemented; live endpoints and full product acceptance remain gated. Breaking changes from 1.0.0 are intentional: eight sources, typed mechanisms/unknowns/relationships, compact extraction, canonical quote resolver and preflight errors. AI owns schemas/validation; CS reviews consumers; DASE reviews fixture impact.

**Scope revision D20:** baseline 2.2 broadens the intended audience; public contract 2.0.0, enums, limits, callable interfaces and fixtures remain unchanged. Financial/account guidance does not assess all personal-data or employment-rights requests. EXT-01 is gated roadmap work, not an authorized enum/policy extension. Read [PRD coverage](PRD.md#31-current-coverage-and-conditional-extensions).

## Authority and vocabulary

JSON schemas own field names/types/enums. This document owns their mandatory cross-field meaning. [Integration contract](integration-contract.md) owns internal calls, policy and lifecycle. No localized-purpose keywords drive policy.

Evidence is exact selected text. An action is a cited actor/verb/polarity/resource/mechanism interpretation. A claim is something a source states, not established truth. Comparisons link earlier claims to later actions; relationships retain contradictions/clarifications/repetition. Unknowns identify unresolved issues. A brief is an editable, protected snapshot, not a certificate.

IDs: evidence `E1`-`E8`; actions `A`, claims `C`, comparisons `D`, relationships `R`, unknowns `U`, questions `Q`, each followed by a positive integer. All IDs are unique within kind/current extraction. Evidence IDs stay stable for the tab session; IDs are never credentials. `requestId` identifies an attempt; `revision` identifies current evidence/locale.

## AnalyzeRequest

`POST /api/analyze`, JSON; [request schema](../contracts/analyze-request.schema.json).

| Field | Meaning |
|---|---|
| `contractVersion` | Exactly `2.0.0` |
| `requestId` | New 8-64-character ASCII `[A-Za-z0-9_-]` ID per attempt |
| `revision` | Integer >=1; increment on evidence/order/locale change |
| `locale` | `en-HK` or `zh-Hant-HK` |
| `clarificationsUsed` | 0-2 page UX counter, never a security permission |
| `evidence` | 1-8 exact entries, unique IDs/sequences, total <=12,000 UTF-16 units |

Entry: `id`, `kind` (`advertisement|offer|instruction|reply|user_note`), `label` (1-120 units), `sequence` (1-8), `text` (1-4,000 units). At least one instruction/reply required; absent context has no placeholder source. Max decoded JSON body 96 KiB is enforced before provider access.

CRLF -> LF before display and submission. No later whitespace/Unicode normalization. Runtime checks enforce UTF-16 limits on **every bounded string**, non-whitespace text, no unpaired surrogate, unique IDs/order and total size. JSON Schema counts code points and alone is insufficient for these requirements.

Notes preserve originals and invalidate the result. The exact eight-ID allocation/exhaustion rule is in the integration contract. A contact report is `user_note`, a copied external reply is `reply`; neither proves verification. Clients cannot add mode, fixture selector, provider host, results or tool permissions to this strict shape.

## Extraction: raw provider vs canonical

The model returns [provider-extraction.schema.json](../contracts/provider-extraction.schema.json). The application resolves citations and exposes [extraction.schema.json](../contracts/extraction.schema.json). No provider-authored guidance/contact/response envelope.

| Collection | Bounds | Essential fields |
|---|---|---|
| `actions` | 0-4 | `id, actor, verb, polarity, resource, recipient, purpose, mechanism, citations` |
| `claims` | 0-4 | `id, kind, text, status, relatedActionIds, citations` |
| `comparisons` | 0-3 | `id, earlierClaimId, laterActionId, explanation` |
| `relationships` | 0-4 | `id, kind, earlierItemId, laterItemId, explanation` |
| `unknowns` | 1-5 | `id, kind, relatedActionIds, issue, priority` |
| `questions` | 0-2 | `id, unknownId, text` |

Every action/claim has 1-2 citations, each quote <=200 UTF-16 units. Maximum total citations 20 (current per-item maxima are tighter). Prioritize complete representation of the current financial/control demand and relevant counter-evidence; do not quietly truncate omitted demands. Provider truncation is invalid output. A 3,000-token candidate cap still needs long/Chinese probes.

Mechanisms: `task_recharge`, `personal_borrowing`, `credential_control`, `ordinary_work_expense`, `company_funded_work`, `payroll_information`, `none`, `unclear`. These are model inferences supported by citations. Ordinary reimbursable work expense is not equivalent to payment to unlock work/earnings. `purpose` is localized explanation; never an executable instruction/URL or policy keyword channel.

Claims include `instruction_denial` alongside duty/identity/repayment/completed-action/other. Repayment stays `repayment_promise`/`stated_in_input`, regardless of reassurance. Completed action from a note stays `user_reported`. Claims carry `relatedActionIds` referencing existing actions (empty when not action-linked). A reported financial/control action links its relevant action; a reported call or completed spreadsheet does not automatically become financial exposure. Relationships use `contradicts|clarifies|repeats`, reference existing A/C items, and preserve both sources; they do not revoke earlier demands automatically.

Unknown kinds: `actor|resource|payment_condition|contradiction|employer_authorization|repayment_verification|other`. `blocking` is permitted only for the first four with relevant existing `relatedActionIds`; `context` for identity/repayment/other issues. Employer authorization remains a context unknown for selected-text input. A question references an existing critical unknown; no bank account/password/OTP request.

## Exact citation resolver

Raw citation: `{evidenceId, quote, occurrence}`. `occurrence` is **one-based**, counting all exact literal matches left-to-right, including overlapping matches. A quote occurring once requires occurrence 1. Server computes canonical UTF-16 `{evidenceId,start,end,quote}` for that occurrence. No provider offsets and no fuzzy repair are accepted. Wrong source, absent quote, invalid occurrence or unpaired surrogate => `invalid_citation`.

Canonical invariant: `0 <= start < end <= text.length` and `text.slice(start,end) === quote`. Repeat/emoji examples belong to the [shared matrix](integration-test-matrix.md). Raw occurrence selection can be semantically wrong despite exact matching; independent annotation evaluates that. Raw/canonical records are separate for synthetic evaluation; canonicalization is never counted as model-provided correct offsets.

## Cross-field rules

1. All identifiers/references unique and current; valid order and bounded strings.
2. Claims/actions cite exact evidence. Comparison earliest claim source must precede later action source; relationship earlier item source precedes later item. Within-entry contradictions use separate cited items plus a contradiction unknown, not an invalid same-sequence relationship. No self-reference. An item's earliest cited sequence defines its order for this check.
3. Mechanism/resource compatibility: task recharge => pay/transfer + personal_money; borrowing => borrow/transfer/pay + personal_borrowing; control => share_otp/share_account_details + account_control; company funded => company_money; payroll => share_account_details + account_information. A described/prohibited action may carry the same mechanism without triggering pause. `unclear` remains allowed for unresolved scope; do not invent a resource.
4. Reverse invariants are mandatory: `share_otp` requires account_control AND credential_control; personal_borrowing resource requires personal_borrowing mechanism with borrow/transfer/pay; account_control resource requires credential_control with share_otp/share_account_details. Requested/uncertain applicant financial actions cannot use `none` when resource is personal_money/personal_borrowing/account_control: classify the supported mechanism or use `unclear` plus a blocking action-linked unknown. Unknown actor/resource or unclear mechanism on a potentially scoped requested/uncertain financial verb also requires an appropriate blocking unknown. Inconsistent output is invalid_output, never a benign result. `share_otp` cannot mean normal payroll information. Cited prohibitions cannot be recast as requests; semantic correctness is separately tested.
5. Blocking unknown references a relevant action and a permitted kind; contextual identity alone cannot drive clarification. Contradictions retain both A/C items and their evidence; a missing recipient cannot downgrade supported borrowing to clarify.
6. Validate all proposed questions first; application keeps at most `2 - clarificationsUsed`, records safe excess removal, and emits none for pause/no-scoped-demand. Ask no confidential field or external execution.
7. Select only existing library IDs. Live use requires named human approval of selected cards/routes and corresponding localized text; draft allowed only in labelled simulation. No automatic suspicious-link visits.
8. Current request/version/revision must match. Live provenance model ID must be nonempty and server-configured; simulation model ID must be null. No null live model/fake fallback.

Automated structure does not establish correct actor, polarity, mechanism or promise meaning. Those remain semantic measures and correctable interpretations.

## Responses and transport

[AnalyzeResponse](../contracts/analyze-response.schema.json) is either bound complete or bound incomplete; these never overlap.

Complete: version/request/revision, `status:complete`, server `mode:live|simulation`, canonical extraction, guidance, application-selected reference/route IDs, and provenance `{modelId,promptVersion,libraryVersion}`. No financial execution or contact status.

Incomplete: version/request/revision, `status:incomplete`, `errorCode`, boolean `retryable`; no result/guidance/route fields. Ten codes: invalid_input, unauthorized, quota_exceeded, configuration_unavailable, provider_error, timeout, invalid_output, invalid_citation, cancelled, simulation_unsupported.

[TransportError](../contracts/transport-error.schema.json): version, `status:rejected`, preflight error code, retryable; **no invented request ID/revision**. Used before a valid request can be bound (auth, malformed/oversized JSON, invalid IDs or early quota/config gate). After successful request parsing, return bound incomplete. Client binds a transport error only to the still-active local attempt, never to a server-invented analysis result. Non-JSON/network/host errors also become local incomplete. HTTP 200 + incomplete cannot activate success.

| Code | HTTP | `retryable` | User action |
|---|---|---|---|
| invalid_input | 400; 413 for body size | false | Edit input |
| unauthorized | 401/403 | false | Use authorized demo access |
| quota_exceeded | 429 + Retry-After | true | Wait, then manual retry |
| configuration_unavailable | 503 | false | Operator fixes config; static guidance |
| provider_error | 502 | true | Manual retry |
| timeout | 504 or local deadline | true | Manual retry; suppress late success |
| invalid_output / invalid_citation | 502 | true | Manual retry; no raw output |
| cancelled | Local terminal state; no HTTP required | true | Explicit new attempt |
| simulation_unsupported | 422 | false | Load an exact named example or switch to authorized live setup |

Retryable means a same-input retry **may** be appropriate after the indicated condition, never automatic retries. Operational logs contain safe codes/usage/timing only. Browser success/error conversion is owned by the integration contract, not the generic runner's `completed` label.

## Version and handoff

Breaking schema/envelope changes increment major version and update raw/canonical schemas, fixtures, manifest, locale keys, shared matrix and consuming owners together. Strict schema optional additions still require coordination. Do not keep v1 and v2 parallel product types. The current authored fixtures establish only compatibility expectations, not model accuracy or a working endpoint.
