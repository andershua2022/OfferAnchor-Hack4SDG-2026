# OfferAnchor: Setup and Operations

**Current team guide — 18 October:** Read [current product and shared facts](current-product.md) and [released trial evidence](trial-release-2026-10-18.md) first. The live trial uses official team Beijing qwen3.8-max, extract-v2.24 / context-audit-1.4.0, contract 2.0.0 and five lifetime AI action attempts per account. Knowledge/image/optional search and real Google/eight-digit email login are implemented; cloud query history is not. Earlier dated checkpoints below retain their historical meaning.

**Current release record — 18 October:** [Controlled trial, observed tests and remaining limits](trial-release-2026-10-18.md) is the current runtime/deployment authority. Active source uses extract-v2.24 / context-audit-1.4.0 with unchanged source, recipient and repayment guards; contract 2.0.0 and original fixtures/gold remain unchanged. The v24 controlled free trial is now published at offeranchor-hk.vercel.app with lifetime five-action gating; the owner accepts the original QQ sender temporarily. Portable downloads restore material for a new reading; cloud history is not implemented. The final same-six official v24 comparison has five complete results and one refusal, not an accuracy estimate. Earlier dated checkpoints below remain historical.

**18 October release review:** [Current readiness, complex live result and packaging boundary](release-readiness-2026-10-18.md) supersede historical runtime claims below. Local Google/email login is owner-confirmed. A new official model call returned HTTP200 but failed the output contract; paid tools remain disabled for quality/release acceptance. This is a controlled-demo release candidate, not unrestricted public-release approval.

**18 October local authentication update:** [Current opening instructions, email-code flow and retry repair](authentication-2026-10-17.md#current-checkpoint-18-october-email-retry-repair) supersede earlier login/sender status below. Actual Google sign-in and email-code sign-in into the local workspace are owner-confirmed; public deployment and wider-account delivery acceptance remain separate. Use http://localhost:3000/check or run `npm run open` in the canonical OfferAnchor folder. The paid-model billing hold remains active.

**Latest local status, 17 October:** [Product login and release gates](authentication-2026-10-17.md) supersede earlier demo-only account statements. Google/email server integration is implemented; new personal product consent and public email delivery remain unverified. Open localhost:3000 (old localhost:4330 links redirect). Live paid tools are temporarily held after official Alibaba logs reported Arrearage; fixed examples and local functionality remain available. This is not a public release.

Baseline **2.2** | Contract **2.0.0** | Current local functional integration: **16 October 2026** (unpublished; based on shared main15October). CS owns normal app/hosting work; the representative explicitly authorized this cross-role main integration.

## Current clone and validation procedure — 18 October

Use the commands in [README](../README.md#run-a-safe-local-clone) with Node24.15.0/npm11.12.1. Copy only the safe environment template; do not copy another machine's .env.local. Open localhost:3000/landing/index.html or /check. A clean clone runs the eight exact examples with model calls disabled. For another port, set APP_ORIGIN to that exact localhost origin before starting it. Do not restart a teammate service.

Run npm run typecheck, npm test, npm run test:ai and npm run build in an isolated workspace. Build invokes the pinned local PDF reader bundler and writes that workspace's public/workspace/assets/pdf-local.js and .next; keep it away from a teammate's active tree. The Python structural verifier additionally needs jsonschema and referencing, as described in [tools](../tools/README.md).

Browser smoke starts its own simulation server on3100; workspace-browser uses3110. Confirm both ports are free before running them. Account and attachment scripts accept AUTH_TEST_ORIGIN and INTAKE_TEST_ORIGIN; point them to an isolated simulation server. Never point synthetic mutation checks at production. Test routes use fixture responses, not real mail, Google consent, model calls or database mutations. Record exact checks and limitations in [the synchronization receipt](team-sync-2026-10-18.md).

Live deployment setup is in [Vercel/shared runtime](vercel-deployment.md) and [authentication](authentication-2026-10-17.md). Both additive migrations are shipped, but this sync does not apply them. Credentials remain server-only. Read [current facts](current-product.md) before interpreting earlier holds or defaults below.

## Historical 16–18 October setup and implementation notes

The following dated command/configuration observations are retained for history; they are not the current public runtime or a fresh release gate. The clone instructions and current-product guide above take precedence.

## 1. Commands and observed implementation

```powershell
npm ci --cache .local-data/npm-cache --no-audit --no-fund
npm run dev
```

Open http://127.0.0.1:3000. Load a named fictional example and select Analyse. The browser sends selected material to the local `/api/analyze`, which calls the shared `lib/analysis/index.ts` in explicit simulation mode. Only the unchanged eight registered examples complete; arbitrary material returns simulation_unsupported. Simulation supplies provider=null and makes no provider calls. A server-owned live adapter now exists behind signed demo access, configuration, quota and actual content-review gates; see [the functional integration](workspace-functional-integration-2026-10-16.md). The canonical library remains draft, so real inference is still blocked.

```powershell
npm test
npm run test:ai
npm run typecheck
npm run build
npm run test:browser
npm run test:workspace-browser
```

Build before the browser check. Its production server uses port3100, an explicit APP_ORIGIN and installed Chrome (or PLAYWRIGHT_CHANNEL). It starts/stops only its own server. This is an emulated narrow desktop viewport, not a physical-phone result. `npm run start` serves the existing production build on loopback. Keep Node24.15.0 and npm11.12.1 as pinned by CS; package-lock.json remains the only lockfile.

APP_ORIGIN defaults to http://127.0.0.1:3000 and is server-owned. If using a different local port/origin, set its exact HTTP loopback origin before starting Next. The simulation endpoint rejects other Origin values, malformed or oversized input and client mode fields. It uses no-store. No model credentials or public deployment are activated. Signed demo access and controlled single-process quotas are implemented; distributed/host protections and actual live acceptance remain open. The existing frozen provider implementation is reused.

See [integration evidence](integration-verification-2026-10-15.json). Original CS WP02 preparation is preserved at [its source commit](https://github.com/andershua2022/OfferAnchor/blob/d1738ef18300354aa16625f72e54d89edabcda9c/docs/setup-and-operations.md). New source supersedes its browser-only/no-API instruction.

## 2. Bootstrap and frozen integration

Continue the single existing Next.js/TypeScript app. Do not scaffold a second app or overwrite docs, contracts, examples, library, locales, lib or tests. Preserve its pinned framework/Node/dependency set and actual lockfile. Record observed commands and new changes; commit/push/deploy require their own authorization.

Consume `lib/analysis/index.ts` and shared types from `lib/contracts/index.ts` using [integration-contract](integration-contract.md). CS creates the single API adapter and typed reducer. Only current complete responses activate/export; transport rejection, API incomplete and network/HTML failure all terminate processing safely. Do not pass a whole AnalyzeResponse through the generic runner's success validator.

Static hosting alone cannot serve the POST backend. No product database/accounts/voice integration is required. Screenshots are deferred until after 18 October. Root `knowledge/library.json` is canonical; actual displayed text uses reviewed locale keys, with no runtime machine translation.

## 3. Server environment and mode behavior

[.env.example](../.env.example) contains implemented inactive defaults. Actual secrets belong in ignored `.env.local` or host secrets. All fields below are server owned; never use `NEXT_PUBLIC_*` for secrets or endpoint authority.

| Variable | Meaning/default |
|---|---|
| `OFFERANCHOR_MODE` | `simulation` initially; only server can select mode |
| `MODEL_CALLS_ENABLED` | `false`; in live this prevents calls and returns configuration_unavailable |
| `MODEL_API_BASE_URL` | Verified official account endpoint; blank until gate closes |
| `MODEL_API_KEY` | Correct application API key class/region; blank template |
| `MODEL_ID` | Exact probed model/version; blank until selected |
| `MODEL_REGION` | Exact account/model region; blank until selected |
| `APP_ORIGIN` | Exact allowed HTTP loopback origin; implemented default http://127.0.0.1:3000 |
| `MODEL_RESPONSE_MODE` | Initial json_object candidate; record actually supported mode |
| `MODEL_MAX_OUTPUT_TOKENS` | Default3000 output cap; test long/Chinese output and reject truncation |
| `MODEL_TIMEOUT_MS` | 25000 including response read/parsing |
| `SERVER_TIMEOUT_MS` | 28000 end-to-end server budget |
| `DEMO_ACCESS_CODE` | Server-validated controlled access, not a user account |
| `APP_SESSION_SECRET` | Signing secret; blank until generated by authorized owner |
| `DEMO_COOKIE_TTL_SECONDS` | 7200; two-hour issued demo credential |
| `DEMO_MAX_IN_FLIGHT` | 1 per credential/cohort |
| `DEMO_CALL_LIMIT` / `DEMO_CALL_WINDOW_SECONDS` | 5 per 600 seconds |
| `GLOBAL_MAX_IN_FLIGHT` | 2 globally |
| `GLOBAL_CALL_LIMIT` / `GLOBAL_CALL_WINDOW_SECONDS` | 30 per 3600 seconds |

Validate booleans/enums, positive safe-integer budgets, allowed endpoint host, keys and mode before provider work. Invalid live config is a safe incomplete result; no raw config/error is shown. Raising limits requires recorded review, not a silent deployment override.

Simulation never calls the paid provider, even if `MODEL_CALLS_ENABLED=true`. Match an approved request/locale/clarification state from [simulation-fixtures](../examples/simulation-fixtures.json); unsupported input returns `simulation_unsupported`, not a generic example labelled analyzed. Exact matching and envelope semantics live in the integration contract.

## 4. Fixed request, access and concurrency controls

Contract limits are constants: 96 KiB request body, eight entries with `E1`-`E8`, 4000 UTF-16 units per entry and 12000 total. Do not expose these as independently adjustable environment variables. Reject before provider work; do not silently truncate.

Same-origin POST and a short-lived signed HttpOnly/SameSite demo credential are required; Cookie name is offeranchor_demo; HttpOnly, SameSite=Strict, Path=/, Max-Age7200, Secure on HTTPS. Sign server-issued cohortId/issuedAt/expiresAt with the configured secret; expiry and signature checked server-side. APP_ORIGIN is server configured, never trusted from user Host alone; Origin must match on POST. Allow local HTTP only for explicit localhost development. Issued cookies for the same shared code belong to one quota cohort; replacing a cookie/tab does not replenish its cohort limit. No product evidence enters the cookie. A shared code is cost protection, not individual identification. Budgets must attach to the issued credential/cohort; opening a new tab/cookie must not silently bypass a shared quota.

Reserve quota/concurrency atomically before a model attempt; count attempted paid calls including failure/refusal/truncation. Release the slot when server/provider work ends or the bounded cleanup runs, not merely when the browser cancels. No background paid retry.

The defaults assume server-enforced limits with a shared store or equivalent host gate for distributed execution. A process-local counter is only sufficient for a documented controlled single-process test. Do not expose a public endpoint until tested protection and a provider account cap/kill switch are in place.

The browser starts feedback immediately, displays delayed status at 20 seconds and stops at 30 seconds. Server/provider budgets leave time for safe response handling; actual host/runtime capability still needs verification.

## 5. Provider and host gate

Model Studio/Qwen was the original planning candidate, not a selected shared live dependency. Consume the existing personal provider handoff instead of assuming a new model search is required. Record actual account access, key class, endpoint/model region, permitted geography, response mode, timeout/cap, current prices/currency, retention/training/logging and subprocessors. Test only synthetic inputs until sensitive-processing approval.

Host review must cover Node POST support, duration/body/concurrency limits, no-store response/cache behavior, logs, regions, cookie/access protection and quota coordination. A marketing free tier is not capacity evidence. No subscription or deployment has been purchased/created.

Before release identify build, contract 2.0.0, live prompt extract-v2.11 (authored simulation extract-v2.0), selected model/parameters and approved library/version/locales. Verify exact resolver, semantic controls, transport/incomplete mapping, all principal fixtures, keys/logs, quotas, copy/print, locked footer and actual phones. Keep commands/device/results in [status](status-and-evidence.md).

## 6. Runbook and handoff

Provider outage/quota: stop new paid calls as needed, preserve editable evidence and show incomplete/static reviewed routes. Do not silently switch to a fixture; a user-chosen supported simulation remains labelled simulation.

Invalid-output surge: preserve synthetic raw/canonical failures privately, suspend unsupported claims, investigate prompt/model/length/quote changes and rerun affected cases. Any model/config/library meaning change requires principal semantic controls.

Key exposure: disable calls; account owner rotates/restricts the secret. Never print it. Raw-evidence log exposure: stop the affected use and review host/log settings; no claim that clear-session deletes it.

CS hands off exact environment names, build/start/check/recovery commands, tested host limits and unresolved gates. AI supplies provider/model/usage evidence. Communication supplies approved cards/locales/claims. Counts include failed calls; no account spend cap, user outcome, sponsor or final release is inferred from this guide.


## 17 October local connected workspace

Use [the current runtime record](connected-workspace-2026-10-17.md) for exact local opening/configuration and observed checks. The approved frontend is compiled in the canonical Next.js application. Local model credentials are excluded from Git; a clean clone defaults to simulation. Optional knowledge/search tools use the same access and cost guards. Real account sessions are now implemented as described above; cloud evidence/history storage is not enabled.
