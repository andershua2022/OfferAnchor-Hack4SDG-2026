# Main integration — 15 October 2026

The representative explicitly requested consolidation into main after CS submission. One existing OfferAnchor source is used; no competing app or second extractor is created. All four delivery heads are retained in Git ancestry: AI/DS PR6, DASE PR7, Design PR8 and CS PR9. Exact source heads are in the manifest/check record. CS's later d1738ef merge of main is also included: it preserves its runtime/tests and corrects setup baseline/provider wording; the current setup keeps those corrections. Personal worktree, keys/configs, model experiments, participant records and held-out text are excluded.

## Available implementation

The CS Next.js app now sends selected fictional input to /api/analyze. It calls the existing lib/analysis/index.ts in fixed simulation mode with provider null, then the browser validates the current response through lib/contracts/index.ts before the reducer may export it. The route reads no model credentials/configuration, has no live switch and makes no model request. Origin is an exact server-owned HTTP-loopback APP_ORIGIN, default http://127.0.0.1:3000; request Host is not authority. JSON and actual streamed-body bounds are checked before analysis. Unknown material returns simulation_unsupported; failed/non-JSON/mismatched responses cannot become a complete result.

The existing eight examples, original quotations, Design's exact103 locale pairs, frozen-v1 and frozen-v2 are preserved. Developer reference defaults to v2; DEV03 remains a payment request with unknown funds/unclear mechanism/clarify. DASE's updated DEV03 demo direction is included; no repeated adjudication is requested. Older evaluation adapter instructions remain historical, superseded by the current AI/DS handoff. The original CS view remains the interface; the Design Figma, new landing wording and graphics remain source references rather than a claim that all75 reference views were implemented.

The old scaffold metadata/footer and JSON-derived preview types were reconciled with documentation2.2/public contract2.0.0. Shared docs/fixture verifier now agrees that payment using borrowed proceeds is within personal_borrowing. Interface fields/enums and the v2.11 runtime are unchanged. Exact-byte language/source approval is not manufactured; eleven content items remain draft. Role-owned original files and independent annotation provenance remain intact; raw original annotation content was not semantically reviewed.

## Start and verify

Read [setup](setup-and-operations.md) for pinned Node24.15.0/npm11.12.1 and actual commands. Run npm ci, npm run dev, then open http://127.0.0.1:3000 and load a named simulation. No key is required. For another local origin, set APP_ORIGIN explicitly. Check npm test, npm run test:ai, npm run typecheck, npm run build and npm run test:browser. The [verification record](integration-verification-2026-10-15.json) owns observed outcomes, not planned acceptance.

## Remaining gates and owners

CS plus AI/DS: actual live access/provider adaptation, cost controls and the full correction/reply/time-budget lifecycle. This local simulation endpoint deliberately does not activate the planned live path. Communication: actual content/source/new-prose decisions; Design: connected interface and physical-device review. DASE: consume the complete assembled revision, reconcile its old adapter instructions and conduct fresh independent model/student comparisons on a declared configuration. Communication owns the final deck and submission material; the representative coordinates the final evidenced version. None of these tasks is marked finally accepted by merging files.

The completed engineering and browser checks establish a runnable integrated local simulation, not independent model accuracy, physical-phone testing, new student observations, a public deployment or an approved release. The18 exposed developer cases and historical model captures are not held-out results. No paid calls or external contacts were made by this integration.

## Provenance and recovery

The original main/source heads and all role commits are preserved. Only bounded integration glue, current entry documents and compatibility fixes differ. A main update is performed only after checks/review and with expected-head comparison; no forced update or branch deletion. Local pre-edit originals and verbose logs remain ignored. Source-language exceptions in the manifest are explicit immutable member-artifact hashes; new shared documentation stays English. Do not use old desktop ZIPs or the archived SafePause folder as current development source.
