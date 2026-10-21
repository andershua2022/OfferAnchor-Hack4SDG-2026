# Connected workspace — 17 October 2026

**Latest local status, 17 October:** [Product login and release gates](authentication-2026-10-17.md) supersede earlier demo-only account statements. Google/email server integration is implemented; new personal product consent and public email delivery remain unverified. Open localhost:3000 (old localhost:4330 links redirect). Live paid tools are temporarily held after official Alibaba logs reported Arrearage; fixed examples and local functionality remain available. This is not a public release.

## Current team service activation — 17 October, 17:10 HKT

This section supersedes the earlier pending-team-key and simulation-only local-state statements below. It does not change baseline 2.2, core contract 2.0.0, the frozen producer handoff, the source-content approval record or publication status.

The representative created an official Alibaba Cloud Model Studio Beijing team API key, stored it only in ignored .env.local, and approved continued product implementation. Local mode is now live, MODEL_CALLS_ENABLED is true, and qwen3.8-max uses extract-v2.11 through the existing server adapter. The official Beijing DashScope compatible endpoint was used for this acceptance. No original private gateway credential is used. Simulation remains the clean-clone and independent offline-preview default.

Observed end-to-end acceptance used exposed fictional development cases only:

| Check | Observed result |
|---|---|
| Landing to live check | Get Started opened the canonical workspace; access-code login and explicit Beijing processor consent preceded the call |
| Task payment | HTTP 200; complete contract-valid live reading; expected pause guidance; 9.2 seconds |
| Personal loan | HTTP 200; complete contract-valid live reading; expected pause guidance; 12.0 seconds |
| Company-funded control | HTTP 200; complete contract-valid live reading; no scoped personal financial request identified; 10.1 seconds; not employer clearance |
| Original words and brief | Actual quote dialog opened; manual export contained live provenance and the protected notice |
| Knowledge question | HTTP 200; complete, valid research response citing approved K_PERSONAL_BORROWING; 1.8 seconds |
| Public sources | Actual protected product HTTP route returned three ADCC official-domain snippets in 1.8 seconds; no generated answer or employer verification |
| Narrow viewport | 390 by 844 CSS pixels; document width 390; no horizontal overflow or page errors; not a physical-phone study |

This activation used four model requests and one Firecrawl search, without automatic retries, plus the earlier minimal model-connectivity request (29 input / 5 output tokens). These observations do not establish accuracy, independent semantics, deployment readiness or participant acceptance. Private receipts and screenshots are under ignored .local-data/integration-oct17-team/. No user communications were used.

Final local checks also passed: 60 integration tests, 80 AI/component tests, TypeScript checking, production build, landing browser smoke and workspace browser smoke. The shared verifier checked 364 local links with no broken links or ownership gaps. Exact-secret scanning checked 27 browser assets with no matches for current model/search/session credentials or the old gateway credential.

Native screenshot review exposed a narrow-screen collision between the page title and the live connection badge. A geometric browser regression failed before the CSS sizing correction and passed afterwards. The final 390px live-service page was checked again without another paid request. Header controls remain accessible and long page names truncate instead of overlapping.

### Prepared examples and paid checks — representative update

The representative requested that existing Try examples retain their fixed results. The canonical workspace now opts into exact local fixture matching before any live-access or processor-consent gate. An unchanged registered request returns its validated simulation response without a server analysis request or model charge. Request ID and revision are rebound; all evidence fields, order, locale and clarification state must match. The visible result and exported footer retain simulation provenance and modelId=null.

New text, edited evidence and unregistered context/replies do not reuse the old answer. They use the original server-controlled analysis path, including demo access, processor consent, validation, cost limits and explicit unavailable/failure states. The public server API still never silently substitutes a fixture for a live request. The browser's optional local example path is explicit and distinct from that API; contract 2.0.0 remains unchanged. Explicit source questions/search remain separate user actions.

Subsequent checks passed 63 integration tests and 80 AI/component tests (143 total), type checking, production build and the workspace browser suite. Actual localhost verification confirmed that a prepared task example completes as simulation with zero analysis requests even before live access is unlocked; editing it instead requests live access. No additional real model or search call was made for this change.

The earlier three live model observations above remain historical acceptance of the real service. They do not mean current unchanged Try examples call the model. Developer checks use synthetic transports to verify the subsequent paid-input path without another actual model request.

### Opening and account distinction

Open http://localhost:4330/landing/index.html, then Get Started. If the connection badge requests access, open .local-data/local-service-access.txt locally and use its demo access code; do not paste it into chat or Git. This shared service code protects paid local access and is separate from Alibaba RAM login and the UI's demo profiles.

Nothing requires product users to supply an API key. RAM permissions are for the team to inspect cloud usage and billing. The representative verified the earlier 34-token model request from the RAM user's model-log view; this is observed access to that record, not acceptance for all other team users or every billing page.

Real Google and restricted email sign-in passed earlier separate service probes. The later authentication and image-intake extensions implement product sessions and optional OCR with the limits recorded above. Simulation-only browser history remains local; cloud history, public email, independent evaluation and participant tests remain unaccepted. The release scope deliberately keeps guest checking and page-memory live evidence.

A fresh local credential audit found no original gateway key in 369 shareable active-source files and confirmed that the active model key differs. An old key value remains in a separate personal experiment configuration outside this repository. That historical file is not read by the active product; platform-side revocation was not checked and no old-key request was made.

This is the current local implementation record. Baseline 2.2 and the core analysis contract 2.0.0 remain unchanged. This work does not publish the repository, deploy a public service, establish model accuracy or complete independent/participant acceptance.

## Open and run

The canonical application is the OfferAnchor repository. The approved presentation is maintained in frontend/workspace and compiled by Next.js; it no longer depends on a teammate's template directory. The independent Frontend-Preview folder remains an offline simulation consumer, not the live server.

From the repository with its existing dependencies installed, run:

    npm run open

Open http://localhost:3000/landing/index.html and choose Get Started, or open http://localhost:3000/check. The local ignored configuration now uses that exact origin. The team template remains simulation by default; a clean clone does not receive private configuration. Use the same hostname consistently: localhost and 127.0.0.1 are different configured origins.

For this machine only, .local-data/local-service-access.txt contains the shared demo code and local opening instructions. Click the connection badge to enter it. This code only unlocks the bounded team demonstration; it is not a model API key or personal account. Do not share the private configuration or access-code file through Git.

## What is connected

| Surface | Actual behavior |
|---|---|
| Check a request | POST /api/analyze uses the one existing extractor, citation validation and application-owned policy. The browser validates the response mode and current request/revision. |
| Model ownership | The server supplies credentials. The local candidate is qwen3.8-max with extract-v2.11, 2,400 output tokens and a 25-second provider deadline. No user-supplied model keys, automatic model switching, voting or retries. |
| Source questions | POST /api/knowledge/ask retrieves at most three relevant items from the existing source collection. Live answers select exact sentences from approved passages and cite them; unsupported answers are refused. This conservative first version does not claim unrestricted conversational reasoning. |
| Public sources | POST /api/research accepts the visible, user-submitted general query. Firecrawl web search returns at most three official-domain snippets. It does not open user-submitted suspicious links, scrape inboxes or verify an employer. Missing configuration is an explicit unavailable state. |
| Files | DOCX, text-only PDF, TXT and Markdown are read locally; short text is ready without mandatory confirmation. Optional consented image/scanned-PDF transcription uses the separate guarded Beijing OCR route. Chips remain in memory after checking. See [intake details and evidence](image-intake-2026-10-17.md). |
| Results and follow-up | Original passages, up to two clarifications, corrections, later replies, editable brief, protected notices, manual copy and print use the existing state and contract. Editing retires the old result. Research cannot activate export or replace the reading. |
| History | Existing manual local history remains limited to exact registered simulations. Live readings can be copied or printed; live persistence, account-backed storage and cloud sync are not implemented. Save check is disabled for live results with an explanation. |
| Accounts | Real Google/email Supabase server sessions now supply both avatar entrances; fallback demo profiles are labelled and only offered in unconfigured builds. Demo paid-tool access remains separate. No cloud evidence/history database is implemented. See the authentication record above. |

## Shared safety and cost controls

All live analysis and optional source tools require the same configured origin, reviewed library, server configuration and signed HttpOnly demo credential. The cohort has one in-flight paid request and at most five paid attempts per ten minutes; the process-wide cap is two in flight and thirty attempts per hour. Failure counts. Local-only, disabled or unconfigured research responses do not consume paid-call allowance. There is no automatic retry.

These in-memory counters reset on process restart and are shared only within one server process. A public or multi-instance deployment still needs an atomic external limiter and a provider account spend cap. This local work is not approval to deploy publicly.

The browser does not receive server configuration or secrets. Untrusted text is rendered as text, and source URLs are checked. Web snippets remain unreviewed search results. They are not user evidence E1–E8 and never become a core analysis response.

## Sources, approval and model limits

The AI/DS representative explicitly approved the seven knowledge cards and four routes on 17 October. See [the exact review record](content-review-2026-10-17.md). The final basic source/grammar pass added the HSBC official source S11 for independently contacting a bank and corrected one English sentence without changing its meaning. The unchanged libraryVersion draft-0.2.0 is a composition identifier retained for fixture compatibility; item approvalStatus and the dated record state the actual review status.

This approval covers the reviewed advice, scope and bilingual meanings. It does not approve all other UI translations, the six published-case editorial drafts, model outputs, measured effectiveness or production processing terms. Published summaries remain labelled separately and are excluded from generated answers until approved.

Earlier custom-gateway tests did not establish upstream identity or region. The current local product instead uses the official team Alibaba Beijing endpoint and still requests fictional/redacted development material with a processor disclosure. Do not claim absolute secrecy or that material never reaches a model provider.

## Required configuration

See [.env.example](../.env.example) for the complete safe template. Live analysis needs the model base URL/key/ID/region, enabled mode, exact APP_ORIGIN, APP_SESSION_SECRET and DEMO_ACCESS_CODE. KNOWLEDGE_QA_ENABLED activates optional model-assisted source selection. WEB_SEARCH_ENABLED plus a server FIRECRAWL_API_KEY enables public search. A developer MCP connection does not configure product search. Never use NEXT_PUBLIC_* for model/search keys.

Earlier bounded development checks reused the user's private gateway. That key is detached from the product; the current local service is activated with separate team credentials, while the shared configuration template defaults to simulation. The proposed team route is official Alibaba Cloud Model Studio, China (Beijing), qwen3.8-max, standard pay-as-you-go. No purchase/account creation is performed by this change. Product Firecrawl credentials are configured locally; the one provider-connectivity probe is recorded below. Live product-session use of research still requires the shared activated server gate.

## Verification record

Observed commands and bounded live-call results follow. Synthetic provider/browser tests are plumbing evidence; developer model smoke tests are not an independent accuracy study. No participant or physical-device result is inferred.


## 17 October knowledge-first source policy

Interpret the selected request using the core model and the existing approved project knowledge first. The knowledge-answer model selects supported passages; it has no browsing tool. Missing evidence stays unknown. Do not infer employer legitimacy from general model memory.

Offer public search only when the collection cannot answer the question or a current public fact needs checking. The default UI starts with Knowledge. A user can explicitly select Public sources and confirm the visible general query; do not automatically send private evidence or fall back to web requests after a model error.

Firecrawl failure, timeout, rate limiting or no useful results may be skipped. Report that no supplementary sources were obtained; preserve the original analysis, unresolved questions and brief. Do not retry automatically, manufacture references or report independent verification.

### Observed final checks — 17 October

- npm run test:all: **60 integration tests and 80 AI/component tests passed**, zero failures. Synthetic providers only. Original producer/frozen material remains pinned; the explicitly approved content overlay is separately checked.
- npm run typecheck and npm run build passed.
- npm run test:browser and npm run test:workspace-browser passed in installed Chrome 155, including actual simulation HTTP, consent under a labelled live stub, exact original passage, protected export, file-text confirmation, cancellation/retry, source-tool failure/skip, centered knowledge dialog, favicon, reduced motion and 390px no-overflow. These are viewport tests, not physical-phone or participant acceptance.
- python -X utf8 tools/verify-project.py passed: 362 local links checked, no broken links and no ownership gaps/overlaps at that check.
- Prior private-gateway development observations: task-en, loan-en and company-en each returned a validated live response with expected guidance in 9.3, 11.0 and 8.6 seconds. These are three exposed smoke cases, not an accuracy estimate.
- Knowledge research-extract-1.0.2 returned an exact, server-formatted cited answer in 1.9 seconds after two failed route attempts and one diagnostic attempt. All failures remain in the private ledger. The subsequent research-extract-1.0.3 only clarifies knowledge-first/optional-search policy; no further private model call was made after the user requested a team account.
- One Firecrawl provider-adapter query returned three ADCC official-domain snippets in 2.4 seconds. This validates provider connectivity; an end-to-end live product-session search remains pending team model activation because it uses the common access/configuration guard.

The private development ledger contains seven model/gateway attempts in this integration pass (three core and four research, including failures/diagnosis) and one public-search provider attempt. Original model messages, receipts and credentials are excluded from Git. No private conversation, held-out case or participant record was used.

## 17 October optional image intake

The [current intake record](image-intake-2026-10-17.md) owns image model, consent, file readiness, source-bound schema and fresh verification details. Earlier manual-image-only statements are superseded. Core contract, covered risk domains and independent acceptance gates remain unchanged.
