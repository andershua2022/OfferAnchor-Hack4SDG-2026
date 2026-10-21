# OfferAnchor: Frozen Integration Handoff

**Current source notice — 19 October 2026:** This revision selects `extract-v2.29 / context-audit-1.8.0`, with unchanged source-role/event guards. [Current repair and rollout status](loan-funding-release-2026-10-19.md) records four private-gateway and two actual team Alibaba checks. Earlier dated failures remain historical evidence. Frontend format, public contract 2.0.0, team Alibaba configuration and five lifetime attempts per account remain unchanged. Source publication alone does not replace the website.

**Repository/hosted separation - 18 October:** This repository revision selects `extract-v2.28 / context-audit-1.7.0`. The existing hosted trial remains v24 and is not redeployed by this update. See [submission framework](submission-framework-2026-10-18.md) for current source verification. Product scope, public contract 2.0.0, five lifetime account attempts, frontend and service configuration are unchanged. Older dated runtime paragraphs below describe their recorded checkpoint.

**Current team guide — 18 October:** Read [current product and shared facts](current-product.md) and [released trial evidence](trial-release-2026-10-18.md) first. The live trial uses official team Beijing qwen3.8-max, extract-v2.24 / context-audit-1.4.0, contract 2.0.0 and five lifetime AI action attempts per account. Knowledge/image/optional search and real Google/eight-digit email login are implemented; cloud query history is not. Earlier dated checkpoints below retain their historical meaning.

**Current release record — 18 October:** [Controlled trial, observed tests and remaining limits](trial-release-2026-10-18.md) is the current runtime/deployment authority. Active source uses extract-v2.24 / context-audit-1.4.0 with unchanged source, recipient and repayment guards; contract 2.0.0 and original fixtures/gold remain unchanged. The v24 controlled free trial is now published at offeranchor-hk.vercel.app with lifetime five-action gating; the owner accepts the original QQ sender temporarily. Portable downloads restore material for a new reading; cloud history is not implemented. The final same-six official v24 comparison has five complete results and one refusal, not an accuracy estimate. Earlier dated checkpoints below remain historical.

**17 October intake update:** [current intake contract and limits](image-intake-2026-10-17.md) supersede D23 mandatory-confirmation/unconnected-image wording. Ready attachments map once to stable evidence IDs. Image bytes use a separate guarded route; AnalyzeRequest remains text-only.

**D23 compatibility note — 16 October:** [intake/model/pitch](intake-model-and-pitch.md) changes no wire fields, module exports or source limits. Typed text and each confirmed attachment become separate evidence entries; binaries/filenames do not enter AnalyzeRequest. The recorded qwen3.8-max candidate is not an approved live release. The current preview file UI is not automatically present in the canonical CS runtime.

**Current local implementation:** [16 October functional work](workspace-functional-integration-2026-10-16.md) adds the connected question/note/reply and guarded server-access paths; actual human/live acceptance remains pending.

**Historical 15 October implementation evidence (superseded by the Historical staged runtime checkpoint — 18 October below):** [15 October integration](main-integration-2026-10-15.md) implements the local simulation path. Full live access, correction/reply/device/user acceptance below remain requirements. Loan-funded pay and advertised-duty source guards now match the selected v2.11 module without changing wire fields.

**Historical baseline (superseded by the 18 October current workspace profile below):** Baseline **2.2** | Contract **2.0.0** | Live prompt **extract-v2.11**; authored simulation **extract-v2.0** | Library **draft-0.2.0**. This document freezes module interfaces, policy and lifecycle. A local AI implementation handoff exists; shared application integration and consumer acceptance remain pending. See [current status](status-and-evidence.md). Schemas own enums/types, [PRD](PRD.md) owns scope, [work packages](publication-scope.md#excluded-material) own writers. Changes require producer and consumer acknowledgement before integration.

**Scope revision D20:** baseline 2.2 broadens the intended audience; public contract 2.0.0, enums, limits, callable interfaces and fixtures remain unchanged. Financial/account guidance does not assess all personal-data or employment-rights requests. EXT-01 is gated roadmap work, not an authorized enum/policy extension. Read [PRD coverage](PRD.md#31-current-coverage-and-conditional-extensions).

## 18 October earlier workspace profile — historical v19

This section preserves the earlier v19 handoff; use [current-product](current-product.md) for the active v24 profile. The earlier live profile was `extract-v2.19` through `createSourceBoundProvider` in `lib/server/provider-source-schema.ts`. DASE can explicitly construct that same adapter with `await createCurrentLiveProvider(config)` from `tools/evaluate-development.mjs`. Construction is pure and snapshots the supplied config. The direct generic `createProviderAdapter` is the legacy canonical-wire primitive; it does not supply the catalogue, internal wire or second audit required by profile 19. The public request, six extraction arrays and response remain contract 2.0.0.

The current workspace supplies provider `config.timeoutMs: 50000`, trusted `AnalysisContext.timeoutMs: 53000` and a 58000 ms browser deadline. The historical browser deadline was 30000 ms. The trusted analysis timeout is optional (legacy default 28000), must be an integer from 1 through 53000 and comes from server/evaluator configuration, never evidence or a client model choice. `configurationRecord(profile, fixtureApprovals, {analysisTimeoutMs: 53000})` freezes the evaluator deadline; `evaluateCases` passes that exact value to `analyze`. `providerForCase` remains explicitly required. `runDevelopment` retains its simulation, authored and historical recorded mocks without network calls; constructing the current factory does not select a paid execution.

Fresh exposed synthetic model development is available only through the explicit programmatic `live-development` profile. Supply `providerConfig` to `configurationRecord`, construct the current factory and inject it through `providerForCase`; the exact object must come from this module's current factory and its safe selection identity must match the frozen record. Copied selection metadata does not make a generic adapter eligible. Credentials and the endpoint URL are omitted from records (the endpoint is bound by hash). This profile uses evidence type `fresh_exposed_synthetic_model_development`, starts with whole-case meaning judgments pending and never inherits `recordedGeneration` v2.11 metadata. `runDevelopment` and its CLI reject this profile and remain offline. Raw POST counts and charged-token totals are `null` here because this consumer does not observe the outer request ledger; per-attempt provider-reported usage remains available. Fresh development is neither held-out accuracy nor release approval.

```javascript
const config = {...serverConfig, timeoutMs: 50000};
const provider = await createCurrentLiveProvider(config); // Pure construction.
const configuration = configurationRecord('live-development', false, {
  providerConfig: config, analysisTimeoutMs: 53000,
});
// This explicit execution can make paid requests; syntheticCases are supplied deliberately.
await evaluateCases(syntheticCases, {
  mode: 'live', library, configuration, providerForCase: () => provider,
});
```

`configuration.providerRuntime` separately binds the actual production adapter/analysis local import closure, including source-unit/context/role normalization, provider code, schemas and candidate prompts 14–19. Its byte hashes participate in `configurationId` and are checked again before inference and aggregation. `providerSelection` records the supplied base factory configuration; profile-specific request overrides are bound by `providerRuntime` source hashes, not enumerated as an actual POST ledger. Historical `selectedFiles`/`buildId` retain their original meaning, and `recordedGeneration` continues to identify the unchanged v2.11 capture bytes and prompt independently of the current validation runtime.

This profile permits at most two model requests, with no retry: generation is bounded by 38 seconds and the total configured budget; audit uses at most 15 seconds of the remainder, within a shared maximum of 50 seconds. More than 192 original source units produces `invalid_input` before any model request; input is never truncated. The recipient vocabulary is a conservative representation limit using original text and selected units, not proof of identity or receiver binding. Valid paraphrases can fall outside it; `unknown` is not automatically correct. The independent source audit can still miss errors. Valid schemas, empty audit findings, mocks and exposed development cases do not establish independent accuracy or release acceptance.

## 1. Public module exports

AI owns `lib/contracts/index.ts`. Export `AnalyzeRequest`, `CanonicalExtraction`, `ProviderExtraction`, `AnalyzeResponse`, `CompleteResponse`, `IncompleteResponse`, `TransportError`, `ErrorCode`, `Locale`, `Guidance` derived from the five root JSON schemas. Also export:

```typescript
parseAnalyzeRequest(value: unknown):
  { ok: true; request: AnalyzeRequest } | { ok: false; errorCode: 'invalid_input' };
validateAnalyzeResponse(value: unknown, request: AnalyzeRequest, expectedMode: 'live' | 'simulation'): AnalyzeResponse;
```

The contracts module is browser-safe: schema/runtime/string checks and the public library ID allowlist only; never import server-only analysis/provider code or secrets. Runtime types are generated/checked from the schemas, not an independent hand-maintained alternate shape. The parser enforces schema AND runtime string/total/order rules. The validator rejects version/ID/revision/shape mismatch, complete mode different from expectedMode, illegal complete provenance and canonical citation/reference issues. The public library ID allowlist is loaded from the sole root JSON as safe public content; live approval enforcement remains server-owned. It returns incomplete as incomplete; it never upgrades it. Invalid output throws a safe `ContractBoundaryError` with `errorCode: invalid_output|invalid_citation`, no input/output text. CS validates TransportError against its own schema and never passes it as AnalyzeResponse.

AI owns server-only `lib/analysis/index.ts`:

```typescript
export async function analyze(
  request: AnalyzeRequest,
  context: AnalysisContext
): Promise<AnalyzeResponse>;

export interface AnalysisContext {
  signal: AbortSignal;
  mode: 'live' | 'simulation';
  provider: ProviderAdapter | null;
  library: ReferenceLibrary;
  onObservation?: (event: AnalysisObservation) => void;
}
```

Precondition: parseAnalyzeRequest succeeded. Analyze rechecks at its public boundary; an unbindable programmer input throws only safe ContractBoundaryError/invalid_output, never fabricates IDs. Bindable invalid input produces invalid_input incomplete. Operational/model/library failures produce incomplete, not rejected promises or raw provider exceptions. A throwing telemetry callback must not affect response.

The module does not read request-controlled environment, fetch official routes, create HTTP responses, persist evidence, or choose a client-specified mode/model. Server config supplies mode/provider; AI supplies prompt and schema. CS route supplies access/quotas, validated request, abort/deadline, library and safe telemetry. DASE calls this same entry/configuration; only an external test wrapper may record synthetic raw output privately.

### Construction and exports (AI owns)

`lib/analysis/provider.ts` exports `ProviderConfig`, `ProviderAdapter`, `createProviderAdapter` and safe `ProviderConfigurationError`; the analysis index re-exports their types plus AnalysisContext/AnalysisObservation. `lib/knowledge/index.ts` exports ReferenceLibrary/LibraryContent/LibraryConfigurationError and loader/selector. CS supplies actual server configuration; no caller invents a model/client key.

```typescript
interface ProviderConfig {
  apiBaseUrl: string;
  apiKey: string;
  modelId: string;
  region: string;
  responseMode: 'json_object' | 'json_schema';
  maxOutputTokens: number;
  timeoutMs: number;
  temperature: number | null; // omit provider parameter if unsupported/null
}
createProviderAdapter(config: ProviderConfig): ProviderAdapter;
loadReferenceLibrary(content: unknown, localeFiles: Record<Locale, unknown>): ReferenceLibrary;
selectReferences(extraction: CanonicalExtraction, library: ReferenceLibrary,
  locale: Locale, mode: 'live' | 'simulation'):
  { guidance: Guidance; referenceIds: string[]; routeIds: string[] };
```

ProviderConfig is built from the recorded server endpoint/key/model/region/mode/cap/timeout; temperature comes from the recorded selected-provider decision (no undocumented env default). Creation is pure configuration validation, with no billable call. Missing/invalid/unsupported configuration throws safe ProviderConfigurationError/configuration_unavailable. LibraryContent is the exact root JSON shape (including localeKey/localizedMeaningApproved); loader validates it and creates a read-only view plus flattened locale strings. Invalid shape/IDs/locale keys throw LibraryConfigurationError/configuration_unavailable. Loader does not mark drafts approved. Selector implements the table below; unapproved selected live content throws the same safe error. Analyze catches these as bound incomplete. CS calls loader once from server config/public content and catches construction errors before provider work; mode is set only by server. No raw config text is exposed.

Server-rendered bootstrap passes only safe mode, baseline/contract versions and public reviewed strings to the browser. No key, endpoint credential, shared code or provider config enters client props. Browser uses that mode as expectedMode; a mode mismatch is invalid_output.

### ProviderAdapter (AI owns)

```typescript
interface ProviderAdapter {
  readonly modelId: string;          // nonempty configured model, not source text
  readonly region: string;           // configured region, no privacy guarantee
  extract(input: {
    request: AnalyzeRequest;
    systemPrompt: string;            // server-owned extraction instructions
    outputSchema: object;            // provider-extraction schema
    promptVersion: string;
  }, signal: AbortSignal): Promise<{
    jsonText: string;
    finishReason: 'stop' | 'length' | 'refusal' | 'other';
    usage: { inputTokens: number | null; outputTokens: number | null };
    latencyMs: number;
  }>;
}
```

Adapter serializes source blocks as data and makes exactly one request. No old browser result or evaluator gold passed to provider. It enforces25s across connection/read, honors cancellation best-effort and converts provider exceptions to safe failure codes. `length`, empty/refusal/non-JSON output => invalid_output; provider transport/429 => provider_error (server-local quota is quota_exceeded). Non-JSON/schema-compatible provider modes need observed probes. No fabricated usage numbers when provider omits them. `modelId` in complete provenance equals adapter.modelId.

### ReferenceLibrary and observations

`lib/knowledge/index.ts` exports `loadReferenceLibrary` and `selectReferences`. It imports **only** `knowledge/library.json` plus locale key maps; no second card/route dataset. `ReferenceLibrary` is a read-only validated view of `{libraryVersion,status,humanApprovalRequiredForLiveUse,sources,cards,routes}`. Each source has id/url; every card/route follows the actual root JSON shape and references valid source/route/locale keys. Global libraryVersion covers every entry. Live selection requires each selected item to have `approvalStatus:approved`, nonempty humanReviewer and checkedOn, `localizedMeaningApproved:true` and complete localeKey coverage; otherwise configuration_unavailable. Simulation permits draft with explicit mode. The top-level draft state may include individually approved items; it is not blanket approval of the remaining library.

`AnalysisObservation` has exactly requestId, revision, mode, promptVersion, libraryVersion, modelId (nullable simulation), status (`complete|incomplete`), errorCode (nullable), latencyMs, inputTokens/outputTokens (nullable), citationsResolved count and questionsDropped count. No raw text, quotes, labels, URLs supplied by users, prompt, cookie, key or raw exception. One final event/attempt; CS owns private cost/timing storage. Evaluation wrappers may privately preserve **synthetic** raw/canonical results separately, not add a different policy.

## 2. Canonicalization and bounded questions

Raw citations are evidenceId/quote/one-based occurrence. Count exact literal matches including overlapping matches, then use that occurrence's UTF-16 positions. No fuzzy matching, old-source substitution, translated quote or whitespace normalization. Missing/wrong occurrence rejects output. A unique match always requires1. Source emoji is preserved; positions are JavaScript code units. Canonical quotes are validated again against current request.

Validate raw collections/reference relations/strings first, resolve citations, validate canonical output, then application policy. Questions exceeding remaining UI budget are safely clipped **after** validation, with questionsDropped observed. Only blocking unknowns for clarify guidance may produce clarification questions; emit none for pause/no-scoped-demand. A short independent-verification question comes from localized reviewed card text, never counts as a model clarification or fabricated external verification.

## 3. Policy: first matching row wins

All row inputs are canonical cited interpretations, not independent truth. `purpose`, unknown issue wording, company names, money amounts and keyword occurrence never directly drive this table.

| Priority | Structured condition | Guidance and references |
|---|---|---|
| 1 | Any applicant/requested task_recharge action with pay/transfer + personal_money | pause_requested_action; K_TASK_RECHARGE; primary ADCC_18222 |
| 1 | Any applicant/requested personal_borrowing action with borrow/transfer/pay + personal_borrowing | pause_requested_action; K_PERSONAL_BORROWING; primary ADCC_18222 |
| 1 | Any applicant/requested credential_control action with share_otp/share_account_details + account_control | pause_requested_action; K_PAYROLL; primary ADCC_18222 |
| 2 | No row1; blocking actor/resource/payment_condition/contradiction unknown related to an action that could change scoped financial exposure | clarify_before_action; K_UNKNOWN; primary LABOUR_GUIDANCE |
| 3 | No row1/2 | no_personal_financial_request_identified; contextual card and primary LABOUR_GUIDANCE |

Reverse field compatibility in contracts.md is enforced before this table: wrong mechanism on explicit borrowing/control rejects output; it cannot fall through to no-scoped-demand. For row2, a relevant action is requested/uncertain, verb borrow/transfer/pay/share_otp/share_account_details, and either unclear mechanism/resource/actor or an action-linked contradiction unknown. Within one source entry, keep the conflicting cited items and unknown without creating a relationship that violates source order. A routine employer-authority or repayment-context unknown does not qualify. A missing recipient does not downgrade a supported row1. Prohibited/described actions never trigger row1. A known ordinary expense without task/earnings prerequisite does not trigger row1; retain context and do not certify reimbursement.

Keep earlier cited requests in the extraction even after a later denial/reassurance; add relationship and unresolved issue. A later claim does not erase them or downgrade row1. Correcting a model misreading of a prohibition can remove the erroneous requested interpretation in a new revision, because the original text never supported it; an unverified note cannot erase an explicit earlier personal demand.

Reference selection is exact: for row1 select only the detected dangerous cards in task/borrowing/control order; display all unknowns in extraction but do not append K_UNKNOWN merely for identity or contradiction. Row2 selects K_UNKNOWN. Append K_ALREADY_ACTED only when a user_reported completed_action claim links through relatedActionIds to an applicant action with a scoped task_recharge/personal_borrowing/credential_control mechanism and the matching financial/control verb/resource. Contact, finished work, ordinary-expense or unlinked notes do not trigger it. For row3 context card choose company-funded, payroll-information, ordinary-expense, then K_UNKNOWN in that order. Dedupe, max6; route order primary as table then selected-card reviewed routes, deduped max6. No selected route => configuration_unavailable live, not a model contact. Company's e-Search and Scameter are optional context links, not certification. Already acted adds independent bank-contact guidance, never a model-generated bank number. The first independent question uses the primary card's localized question, except row3/K_UNKNOWN uses guidance.noScopedQuestion to avoid inventing a payer/borrowing issue in routine nonfinancial work. No action/claim means no fabricated citation: show the no-scoped-demand statement and inspectable selected input.

## 4. HTTP/API/client conversion

CS owns `lib/session/analysis-controller.ts` and pure `lib/session/reducer.ts`. Use a typed reducer/adapter, **not** createAnalysisRunner with identity/object validation. No AnalyseResponse incomplete may become success because an HTTP call resolved.

| Received event | Accept condition | Reducer result |
|---|---|---|
| Bound complete | Schema/runtime valid; HTTP2xx; still processing/delayed; active requestId AND revision; revision current; monotonic deadline not passed | complete; save result identity, retire active ID atomically; enable current export |
| Bound incomplete | Valid version/IDs for still-pending active run, any HTTP incl200; monotonic deadline not passed | incomplete with original safe errorCode/retryable; result null; retire active ID atomically |
| TransportError | Valid rejected schema and same pending fetch/active run | incomplete, preserve code; bind only locally |
| Network/non-JSON/host error | Still active attempt | incomplete/provider_error, retryable true |
| Wrong shape/version/ID/revision | Active attempt got incompatible response | incomplete/invalid_output, retryable true; no raw display |
| Response from retired run | Not active, cancelled, edited, deadline expired | Ignore completely; no questions/errors/labels replaced |
| Browser deadline58s (legacy baseline: 30s) | Still processing/delayed | incomplete/timeout; abort best-effort |
| Cancel | Still processing/delayed | incomplete/cancelled; abort best-effort |

HTTP non2xx with complete envelope is invalid_output; never successful analysis. Error severity/retry boolean follows contracts.md. The pending run stores a monotonic deadline at start. Before accepting any response/question/error, compare elapsed time even if the timer callback was delayed or the phone resumed; expired pending runs become timeout and retire. Every terminal state retires the active ID, so duplicate success cannot reinitialize an edited brief. Delay20s is not failure. A retry uses fresh ID and current revision; no automatic paid retries. Local fetch error texts never render.

## 5. Evidence and session events

Session reducer shape: evidence[], revision>=1, locale, clarificationsUsed, shownQuestionKeys set, nextEvidenceId counter, run state (`editing|processing|delayed|complete|incomplete`), active requestId or null, accepted result or null, safe error or null, brief draft or null. No persistent browser storage. Counter/set are tab-local; another tab is a separate session, not shared identity or rate authority.

Initial evidence receives E1..E3 in entered source order (advert, offer, latest instruction when present), sequence1..n. Later add receives next unused E counter through E8; do not reuse deleted IDs. Recompute contiguous sequences1..n after deliberate deletion/reorder; IDs remain stable. Exhaustion when current count8 **or** next ID>8 blocks appends; user exports/clears/new session. This conservative limit avoids tombstone identity reuse. Never silently compress/delete evidence or summarize it into a replacement source.

| Event | Mandatory changes |
|---|---|
| Add/edit/delete/reorder/note/reply/locale | Increment revision; abort/retire run; result,error,draft=null; editing; retain question counter |
| Start/retry | Fresh requestId, snapshot request, processing; accepted result/draft=null |
| Current complete | Accept only pending before monotonic deadline; save result ID/revision separately and retire active ID; initialize body once; first-display accepted questions consumes budget |
| Current incomplete/cancel/deadline | Retire active ID; null result/draft; show safe incomplete; retain evidence/question counter |
| First accepted question display | Key = unknown.kind + sorted stable evidence IDs cited by related actions + exact question text; atomically drop already-shown keys, take remaining budget, add/increment before display (cap2) |
| Rerender/stale-response/locale switch | No repeated count; locale switch invalidates as above without refund |
| Clarification answer | Append one labelled user_note per answer; revision change; original question provenance retained in label/text |
| User correction | Append labelled user_note; preserve all original messages; no direct action-field overwrite |
| Outcome note | Append user_note labelled contact/action report; statements user-reported; no automatic verified badge |
| Load initial fictional example | Deliberate replacement/new-session notice; retire old run, reset evidence IDs/revision/question history, load full canonical example; clearly fictional simulation |
| Load authored later-stage example | Deliberate replacement notice; reset working session, seed canonical evidence/revision/clarificationsUsed as registry metadata; label seeded fictional prior state, not observed prior display/contact |
| Clear/end | Retire run/reset working state/counters with deliberate loss notice; no processor/export deletion promise |

Question IDs are revision-local, so Q1/requestId alone is not a stable deduplication key. Serialize the three key components as a JSON array to avoid delimiter collisions. Count is updated atomically before display, not in repeated component effects. Browser stale suppression happens before counting. Repeated same-key proposals across retries do not redisplay/consume; a translated different text can consume the remaining budget without resetting it. Two displayed questions need not be answered; context can remain unknown.

## 6. Brief state and bilingual content

CS deterministic renderer consumes current complete response + request + locales + selected approved library entries. The editable body and the locked footer are separate fields; concatenate both for clipboard/manual fallback/print. Essential footer: product/baseline/contract/revision/mode, selected-input boundary, identity/promises unverified, unresolved checks, edited-body flag. It is regenerated, not a user-editable textarea. The short-question copy uses the same essential locked footer fields as the full brief; it does not silently omit versions or unresolved checks. Only the body is shorter. Quotation omission hides passages/identifiers, never claim/provenance/unknown boundaries. A new revision discards old draft; deliberately exported old copy cannot be recalled.

Design owns actual `locales/en-HK.json`/`zh-Hant-HK.json`; same keys required. Groups: app, input, state, guidance, brief, privacy, errors, knowledge.cards/knowledge.routes. Communication reviews financial/source meaning; no runtime machine translation or silent English fallback for an essential missing key. Source quotations do not use locale maps. Initial authored locale files are drafts, not completed human language review. Strings require placeholder agreement; CS renders approved text, not private wording lists.

## 7. Simulation matching

Registry: [simulation-fixtures.json](../examples/simulation-fixtures.json), containing eight named authored request/response pairs. Match contractVersion, locale, clarificationsUsed and **all ordered evidence fields** (id,kind,label,sequence,text), exactly. Ignore only requestId/revision; rebase only those two response fields. No fuzzy matching or hidden fixture selector. Load-name UI must load the complete canonical example and indicate synthetic material, using the explicit initial/seeded session events above. Stage fixtures seed only authored demo history; a real live session never seeds consumed questions. When continuing an exact missing-payer simulation, the authored funding-note stage can match current consumed count1; arbitrary notes do not match. Unknown input => bound simulation_unsupported, retryable false; no model call. Live mode never silently returns a fixture. Complete simulation modelId=null and mode/provenance/footer remain explicit.

## 8. Producer/consumer gate

AI and CS consume [the same matrix](integration-test-matrix.md) and actual fixtures. First prove one callable import + validated response; next prove task/company/loan, failure and revision isolation in **one connected build**. No independent local green checks close a handoff until the consuming owner records acceptance with actual build/config/result. Availability and actual consuming-owner acceptance are recorded in [current status](status-and-evidence.md); the local AI handoff must be consumed rather than independently rebuilt.


Historical 9 October coordination clarification (team-2026-10-09): AI/DS leads overall integration and task dispatch; CS implements its application adapter/build. This changes no field, enum, signature, source limit, prompt, library, question policy or module ownership. Producer/consumer review remains required.


## 17 October optional research boundary

The core public AnalyzeRequest/AnalyzeResponse remain 2.0.0. Source tools use the separate strict research-1.0.0 request/response types in lib/research/contracts.ts, with requestId, revision, kind and mode binding. A ResearchResponse is never accepted as an AnalyzeResponse and cannot enable brief export. See [the connected implementation](connected-workspace-2026-10-17.md).
