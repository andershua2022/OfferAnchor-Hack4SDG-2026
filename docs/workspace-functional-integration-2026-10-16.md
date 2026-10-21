# Workspace functional integration — 16 October 2026

## Current state and authority

Local unpublished work in the single canonical OfferAnchor application. GitHub main was checked through the connected GitHub app at e83bbabe9e356e72b74b4933681fe08668267770. Design PR #10 targets the older CS branch and repeats the exact 103-key locale files already present in main: en-HK SHA-256 c7370d68255304d6d09c332432ca1e8868bf6076c34126a585b3aea07fb79bd6 and zh-Hant-HK SHA-256 1056d06f5122707e589a4bdb5d80af0b707c4e6c1d31eefbcfe3b744ac364a62. No duplicate merge was needed. Existing uncommitted landing/presentation work was preserved.

The representative authorized completion of existing functionality before visual redesign. This is bounded integration across the existing CS presentation/session and AI-owned module boundary, not a new extractor, product scope, provider choice or human approval. Baseline 2.2, contract 2.0.0, prompt extract-v2.11, eight authored simulations and both reviewed locale files remain unchanged. No GitHub commit/push, external communication, public deployment or paid model call occurred. AgentBoard MCP was unavailable; no board synchronization is claimed.

## Implemented workflows

- Initial instruction with optional advert/offer can be analysed directly. Material is validated before requests, with no silent truncation. Editing, deleting and reordering preserve stable source IDs and invalidate earlier results/briefs. Deleted IDs are never reused until a deliberately reset session.
- Corrections, later sender replies, additional context and contact/action reports append as labelled sources. Reports remain self-reported. A displayed clarification can be answered as a user_note retaining the original question. Its original evidence remains present.
- Question history and the two-question budget survive evidence/locale changes; accepted current results alone consume the budget. An answered question is not answered twice through the same control.
- The missing-payer to funding-note and task to denial examples have explicit, visible authored next-step controls. They append the exact registry source without replacing the session, refunding question count or fuzzy matching. General typed notes still return simulation_unsupported in simulation mode.
- Every action and claim has an original-passage inspector; Locate selects its exact UTF-16 range in the source editor. Relevant cards and official source/route links are inspectable; links open only on user action, with noreferrer. No link is automatically fetched or authenticated.
- Processing, delayed (20s), cancellation, deadline (30s), safe errors and explicit retry are connected. A cancelled/stale/expired response cannot restore a result, consume questions or enable exports. Aborted transports settle even if the underlying sender ignores its signal. No automatic retry occurs.
- Quote-inclusion preference survives reanalysis and example changes. Regenerated app text is not incorrectly labelled as a user edit. Full, short, manual and printed exports keep the same protected footer, actual mode/model and unknowns. Clipboard results cannot restore an obsolete edited draft.
- Page-memory only. No source material is written to browser storage, URL, cookies or product DB. Draft-loss warnings and existing clear-session controls remain.

## API and module map

- app/fixture-preview.ts: existing pure session reducer, validation helpers, authored registry view and deterministic brief/footer. It retains its legacy filename; do not create a competing session state machine during the visual pass.
- app/analysis-client.ts: sole browser response adapter. It validates current identity/revision and expected server-selected mode, preserves valid bound incomplete reasons on non-2xx responses, rejects non-2xx complete, and bounds cancellation/deadline.
- app/workspace-status.ts: public metadata shape and strict status reader. It contains no secrets or model host authority.
- lib/server/workspace-api.ts: server configuration, signed access, input limits and controlled single-process quotas. It calls the unchanged lib/analysis/index.ts and existing provider factory.
- app/api/analyze/route.ts: POST /api/analyze, unchanged public AnalyzeRequest/AnalyzeResponse contract. Client input cannot select mode, provider, fixture or host.
- app/api/session/route.ts: GET returns only mode, accessRequired, authorized, ready, reason and expiresAt. POST accepts only {accessCode}, sets the HttpOnly credential; DELETE locks access. POST/DELETE require the configured Origin.
- app/preview.tsx: current views and handlers; future templates should consume the same reducer/adapter and preserve all of the above. app/globals.css adds functional controls only. Landing composition was not redesigned.

## Access and model gates

Simulation remains the default. It never constructs/calls a paid provider, regardless of MODEL_CALLS_ENABLED. Arbitrary edited input never becomes an authored success.

A live configuration requires OFFERANCHOR_MODE=live and MODEL_CALLS_ENABLED=true; a valid access code/signing secret, provider configuration and recorded human approval of the active library/card/route/localized meaning are required. Before any model attempt, the workspace preflights all active reference content, so an unreviewed possible result cannot consume a paid call before failing. The current canonical library remains draft and therefore blocks live inference. The implementation did not edit approval flags, copy private credentials or infer translation approval.

The offeranchor_demo cookie is HttpOnly, SameSite=Strict, Path=/, valid at most two hours, Secure on HTTPS and bound to the configured origin. It contains signed cohort/timestamps, never evidence. New tabs/cookies using the same access code share quota. Defaults: one in-flight attempt and five attempts per 600s per access-code cohort; two concurrent and 30 attempts per 3600s globally. Failed attempts count; slots release when bounded server work finishes. Counts/concurrency can be reduced, not silently raised; rate windows cannot be shortened. Login attempts are also bounded. Restarting the process resets these in-memory counters: this is a controlled local/single-process implementation, not distributed/public-host enforcement.

Only environment/host secrets hold keys. Use .env.example and the existing reviewed provider handoff; do not place keys in NEXT_PUBLIC fields, source or messages. Runtime errors expose safe codes only. New functional UI wording still requires Communication meaning review before claims of reviewed release copy.

## Verification and remaining acceptance

Observed on the documented Node24.15.0 runtime: 34 integration/session/server tests and the existing 80 offline AI/reliability tests passed; production build and TypeScript passed. Both the original browser smoke suite and new workspace-browser suite passed in Chrome154, at desktop and a 390x844 viewport. The new suite exercises same-session authored clarification/denial, typed answers/replies/reports, exact source selection, reference links, quote preference, protected export parity, direct intake, cancellation/retry and a clearly synthetic live-labelled HTTP response. The live handler was separately tested with synthetic provider and synthetic approval objects; no canonical content was approved by those tests.

Native desktop/narrow screenshots were inspected. These observations establish engineering plumbing, not independent semantic accuracy, model effectiveness, real-device acceptance or actual human source review. See functional-workspace-checks.json for the exact distinction.

Commands: npm test; npm run test:ai; npm run typecheck; npm run build; npm run test:browser; npm run test:workspace-browser. Build first for both browser scripts. They explicitly select simulation; they must never run paid models.

Before actual live verification, two human-owned inputs remain: (1) real source/meaning approval through the existing review process, including new functional wording; (2) privately configured provider/access credentials and an explicit bounded synthetic-call allowance. Public hosting additionally needs its actual host/data-processing and distributed-limit acceptance. No new model search or visual framework rewrite is required.

## Guidance for the visual redesign

Keep the approved landing; choose the workspace layout independently. Preserve stable source IDs, the current result identity, original-passage actions, question/note provenance, delayed/cancel/retry states, limits, configuration/access failures and protected full/short/manual/print exports. Do not introduce fake findings, risk scores, automatic source visits or a second analysis path to fit a template. Review empty, processing, delayed, complete, incomplete, unsupported, answered, limit-full, manually edited, no-quotes and narrow states.
