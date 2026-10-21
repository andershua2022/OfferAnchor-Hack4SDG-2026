# Execution Reliability Component

`analysis-runner.mjs` remains an unchanged independent component. It exports `createAnalysisRunner` and `AnalysisFailure`, with immediate processing, delayed feedback at 20 seconds, a 30-second total deadline, cancellation, stale-run suppression and isolated result snapshots. Clock/request/validator are injected; no model, key or student interface is configured.

`request({signal})` returns output or a promise. `validate(output)` synchronously returns a usable object or throws. `start` returns a numeric run ID; `getState`, `cancel` and `dispose` manage lifecycle. States are `idle|processing|delayed|completed|incomplete`. `AnalysisFailure` permits only `provider_error|invalid_output|invalid_citation`; timeout/cancel are internal terminal reasons.

## Product integration boundary

**Do not pass a whole AnalyzeResponse into the generic success validator.** The runner accepts any returned object as `completed`; even a schema-valid `status: incomplete` envelope could therefore be treated as success. Renaming `completed` to `complete` does not fix this.

The OfferAnchor application uses the CS-owned typed API adapter/reducer in [integration-contract](../../docs/integration-contract.md): only a current matching API `status: complete` activates a result. Transport rejection, API incomplete and local network/cancel/timeout states have explicit mappings. Reuse runner timing ideas or wrap it only after proving those mappings; do not expand its errors silently.

Current product contract is **2.0.0**, including distinct raw-provider and canonical extraction. This component implements neither contract validation, exact occurrence resolution, policy, request/revision binding, server limits, semantic interpretation nor employer verification. Browser abort does not prove remote processing/billing stopped.

From the project root:

```powershell
node --test tests/analysis-runner.test.mjs
```

The 14 existing tests use fake clocks/synthetic component fixtures. Their validator is test-only. Product adapter/reducer checks and semantic evaluation remain future work; see [tests](../../tests/README.md), [architecture](../../docs/architecture.md) and [contracts](../../docs/contracts.md).
