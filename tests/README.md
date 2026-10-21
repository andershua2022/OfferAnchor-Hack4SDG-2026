# OfferAnchor: Checks and Product Acceptance Boundaries

**Current assembled project checks:** use the pinned runtime and commands in [setup](../docs/setup-and-operations.md). `npm test` checks the app/API adapter; `npm run test:ai` checks the shared analysis/runner; type/build/browser checks are separate. [15 October evidence](../docs/integration-verification-2026-10-15.json) supersedes older availability statements below. No offline or authored-fixture pass is model accuracy.

Baseline **2.2**, contract **2.0.0**. From the project root with Node.js 20+:

```powershell
node --test tests/analysis-runner.test.mjs
```

The existing 14 component tests check generic execution timing, cancellation, supersession, result isolation and safe errors with fake clocks/synthetic fixtures. No provider key, model call or participant data is used. The test validator is not the product validator, and a pass does not establish a working student app.

## Required future contract/integration checks

CS and AI use the same [frozen integration contract](../docs/integration-contract.md), schemas and [simulation fixtures](../examples/simulation-fixtures.json). Future test paths/commands must be added only after implementation and actual execution.

| Area | Required checks |
|---|---|
| Input/preflight | Malformed JSON, missing IDs, 96 KiB limit, eight entries, UTF-16 bounds, same-origin/access/quota before provider |
| Raw/canonical extraction | Both schemas, unique references/order, exact one-based overlapping occurrence, duplicate/absent quote, emoji and unpaired surrogate |
| Policy | Loan/recharge/control pause; company-funded prohibition; ordinary-expense distinction; scoped unknown; later denial preserves hazard |
| API/page adapter | Only complete succeeds; every incomplete/rejected error, mismatched ID/revision/version, HTML/network loss, cancel/stale result |
| Questions/corrections | Remaining budget, no repeated counting on render/retry, original evidence preserved, entry-limit behavior |
| Simulation | Exact approved match/locale/count; edited input unsupported; no paid call even with kill switch true; export mode retained |
| Brief/locales | Current result only; edited body separated; locked footer; reviewed locale keys, no English/machine fallback |
| Operations/privacy | Atomic credential/global limits, deadlines/kill switch, no raw evidence/keys in logs/cache/bundle |

These are requirements, not observed passes. Semantic actor/polarity/mechanism/relationship correctness needs independent annotations; exact citation validity alone cannot prove it. [Evaluation](../docs/evaluation.md) defines developer/held-out scenarios, actual model results and student comparisons; no product benchmark runner or app build command exists yet.
