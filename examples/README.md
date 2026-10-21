# Authored Shared Fixtures

All complete outputs here are **human/AI-assisted authored synthetic simulations**, not model runs, real conversations or passed semantic benchmarks. Human review remains pending. [Registry](simulation-fixtures.json) lists eight exact supported simulation journeys. File paths in the registry resolve relative to this directory.

CS loads the whole canonical request from an example selector; server matches every evidence field, locale and clarificationsUsed, ignoring only requestId/revision. Rebase only those two fields in response. Changed material produces simulation_unsupported, never an invented analysis. Chinese fixture text and localization are allowed product-language resources; general repo prose stays English.

The loan raw provider extraction demonstrates `{evidenceId,quote,occurrence}`. Its canonical response demonstrates computed UTF-16 offsets. Timeout is a bound incomplete example; invalid-input transport error is unbound. Use [contracts](../docs/contracts.md), [integration handoff](../docs/integration-contract.md) and [shared matrix](../docs/integration-test-matrix.md), not a private response shape.

Every fixture consumer must validate structure, exact references/order/quotes, policy and live/simulation provenance. A fixture passing those checks cannot establish whether an actual model will infer it. Preserve mode and unresolved checks when exporting.
