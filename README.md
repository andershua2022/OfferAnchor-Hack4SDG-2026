# OfferAnchor — functional source review kit

**Understand the offer. Check the next step.**

OfferAnchor helps Hong Kong jobseekers inspect recruitment/onboarding requests
involving personal payments, borrowing and bank-account control, with exact source
words, explicit uncertainty and questions for independent checking.

Hack4SDG 2026 · Team 1068 · Track 4: Future Work & Enterprises

**Try the complete prototype:** [offeranchor-hk.vercel.app](https://offeranchor-hk.vercel.app)

## What this repository contains

This is a deliberately scoped public technical review kit, not the full visual
source of the hosted website. The original landing page, dashboard skin, original
brand marks, custom fonts, animations and design mockups are withheld. The hosted
product and the team's complete private development source are unchanged.

The AI/API/contract/knowledge core is preserved byte-for-byte from the published
19 October release. A plain browser reference client exercises the same server
entry and prepared examples. Functional adapters for files, cancellation, state,
account handling and portable records remain reviewable. The reference client
does not reproduce all product screens or wire every retained adapter into its UI.
Pending local finals-code changes are not part of this kit.

## Start without credentials

Use the pinned Node/npm versions in `package.json`, then:

```sh
npm ci
npm run dev
```

Open [localhost:3000/check](http://localhost:3000/check). Choose a case, inspect the
request JSON, run the server simulation or choose the explicitly fixed prepared
example. JSON may be edited; unregistered cases are never assigned fabricated
simulation answers. No account or API key is needed for simulation.

The complete production interface is on the hosted link, not included as hidden
bundles, screenshots, font resources or CSS in this repository.

## Technical review route

| Location | Review focus |
| --- | --- |
| `lib/analysis/`, `lib/server/` | Source-bound generation, audit, role/event/repayment guards, auth and quotas |
| `contracts/`, `lib/contracts/` | Public contract 2.0.0 and runtime validation |
| `lib/research/`, `knowledge/`, `locales/` | Governed source retrieval, 24 published records, seven reviewed core guides |
| `app/api/` | Analysis, optional knowledge/web/image and account routes |
| `app/analysis-client.ts`, `app/fixture-preview.ts`, `frontend/workspace/*.ts` | Nonvisual browser behavior and protected export/reimport logic |
| `app/check/`, `app/login/` | Plain review-only display shells |
| `examples/`, `evals/`, `tests/` | Authored demonstrations, exposed development evidence and regression checks |
| `supabase/migrations/` | Explicit auth/quota state migrations; never applied automatically |

[Public scope and evidence limits](docs/publication-scope.md) ·
[API review guide](docs/public-api-guide.md) ·
[Publication manifest](publication-manifest.json)

## Verify

```sh
npm test
npm run test:ai
npm run typecheck
npm run build -- --webpack
npm run start -- --port 4311
# In a second terminal:
REVIEW_BASE_URL=http://localhost:4311 npm run test:review-browser
```

For PowerShell use `$env:REVIEW_BASE_URL="http://localhost:4311"` before the browser
command. The browser checks use simulation and make no paid model calls. Historical
full-product visual/interaction and design-intake suites are intentionally omitted
from this reduced kit; their original results are not claimed as new kit results.

Core `extract-v2.29 / context-audit-1.8.0`, team Alibaba deployment policy, five
lifetime account AI actions, fixed examples and public contract remain unchanged.
Remote live mode needs your own server configuration and shared state. This kit
contains no production keys, access codes, user database, mail credentials, raw
private conversations or account sessions. Do not connect a public fork to team
services. Git-triggered production deployment remains disabled.

Fresh publication checks: **442 integration tests, 90 AI offline tests, typechecks,
production build and the isolated browser workflow passed**. All 78 selected core,
contract, knowledge and nonvisual adapter files match the published baseline bytes.
No paid model requests were made. [Receipt and limitations](docs/publication-verification-2026-10-21.json).

## Evidence, originality and permissions

Observed synthetic development checks are not independent accuracy estimates.
Earlier incomplete outputs and limits remain in their dated technical records.
Do not imply that a prepared demonstration is a new live-model success.

The [official competition rules](https://www.hack4sdg.com/eligibility-rules/) require
a working prototype and pitch, not publication of all source or visual assets.
This kit supports inspection; it does not claim an automatic scoring benefit.

Public visibility is not a blanket open-source/commercial reuse license. No new
license is granted by this scope change. Original product visual assets are not
included or licensed here; third-party code retains its own notices. See
[rights and third-party notices](THIRD-PARTY-NOTICES.md).
