# AI/DS current status — 15 October 2026, r7

**Shared main integration:** [current assembled application record](../../docs/main-integration-2026-10-15.md) now owns availability. The included CS simulation uses this same module through the shared API. The original dated producer handoff below remains provenance; live/human/independent acceptance is still pending.

Engineering implementation and current Design intake are prepared. This status does not mark WP03/WP05/WP08 finally accepted or sign another owner’s review.

Current runtime **extract-v2.11**, simulation **extract-v2.0**, contract **2.0.0**, documentation **2.2**. Active exposed reference is **frozen-v2**. DEV03 is resolved by Design and actually imported by AI/DS; original v1 is preserved.

Read [current team intake](team-sync-2026-10-15.md), [runtime handoff](module-handoff.md), [selection manifest](module-handoff.json) and [observed checks](team-sync-checks-2026-10-15.json). Verified checks:384 offline tests, generated/strict types,41 unchanged runtime files; zero new model calls, historical total66. These are engineering checks, not independent model accuracy.

Pending: CS actual app/build/acceptance; Communication content/source and new prose review; DASE exact v2 import and independent measurements; connected device/student observations. Eleven content items remain draft. No other-role acceptance, model promotion or main merge follows from this update.

```text
node tools/check-team-integration.mjs
node tools/evaluate-development.mjs --inventory
node tools/import-content-review.mjs --status
```

Publication is tracked separately: this r7 update targets the existing draft [PR #6](https://github.com/andershua2022/OfferAnchor/pull/6). Previous verified head3d324e6 is historical. Credentials, private provider files, experiments and participant data remain excluded.
