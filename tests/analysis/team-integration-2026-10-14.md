# AI/DS teammate integration — 14 October 2026, r5

**Historical intake:** [15 October r7](team-sync-2026-10-15.md) now owns current reference/version instructions. The original findings below describe their dated source; DEV03 is resolved in Design-v2 and imported by AI/DS.

**Use one complete selection: contract 2.0.0, live extraction v2.11, simulation v2.0 and draft-0.2.0 reference library.** This change integrates teammate inputs; it does not expand the product domain or replace the CS application.

## Imported and checked

Design PR #8 is pinned at bf082c30f87c32a45986b001ffbd08242816a688. The two root locale files are byte-identical to its 103 accepted pairs: six replacement keys and 31 additional keys. Preserve [the member self-report](team-inputs-2026-10-14/design-reviewed-copy/human-language-review.json), [accepted changes](team-inputs-2026-10-14/design-reviewed-copy/accepted-language-changes.json), [27-state mapping](team-inputs-2026-10-14/design-reviewed-copy/state-control-locale.csv) and [interaction specification](team-inputs-2026-10-14/design-reviewed-copy/interaction-spec.md). This acceptance concerns exact source strings; it does not establish source facts, app rendering, identity authentication or case-result prose approval. No DEV-ID-triggered canned result prose is used.

The [immutable exposed development reference](team-inputs-2026-10-14/frozen-development-annotations-v1/README.md) has 18 records, 28 expected action rows and 14 base families, with ten control records across six control families. Original exact file hashes, grouping, source statements and member-reported confirmation are retained. AI/DS has actually imported and structurally checked it; this is not a DASE consumer acknowledgement or an unseen test. Original independent/draft rounds and held-out texts were not opened.

## One known adjudication disagreement

[DEV03_UNSPECIFIED_FUNDS](team-inputs-2026-10-14/integration-issues.json) preserves the actual disputed source and version. DEV03 requires a payment to unlock tasks but does not identify the money's origin. Frozen v1 expects personal_money/task_recharge/pause; v2.11 preserves unknown funds/unclear/clarify and asks whose funds are involved. This is a standards disagreement requiring Design/DASE adjudication. Do not silently infer ownership, edit v1, remove this case from the denominator or claim an overall accuracy percentage. Any adopted correction needs a new reference version and rationale. A pause while asking for clarification may be appropriate, but does not establish personal funding.

## Run without credentials or model spending

```text
node tools/check-team-integration.mjs
node tools/evaluate-development.mjs --inventory
node --test tests/analysis/consumer-smoke.test.mjs tests/analysis/meaning-regression.test.mjs tests/analysis/development-evaluation.test.mjs tests/analysis/team-integration.test.mjs tests/analysis/content-review-import.test.mjs
node lib/contracts/generate-types.mjs --check
node tools/evaluate-development.mjs --profile recorded --output-run dase-r5-replay --fixture-approvals
```

The inventory now reads the frozen exposed reference rather than the provisional author grouping. evaluate-development exports frozenDevelopmentCases() for the same evaluateCases/analyze entry. These cases preserve exact canonical input identity and include expected action counts and explicit reference-blocked status; they do not generate judgments. The existing replay uses eight historical model captures from five other development families, not 18 model runs. Fixture approvals are fictional in-memory metadata only. Replay under new locale bytes is current post-processing of historical model output, not a fresh end-to-end live-model observation. The root draft profile makes no provider call and stays incomplete. Semantic and safety judgments remain unfilled until actual reviewers record them.

DASE PR #7 is pinned at 25b6f094b4b89cd018c153bd1cdb2e4517994c58. Its v2.7/no-recorded instructions are historical and superseded for this selection; original drafts remain untouched. DASE retains ownership of evaluation and should record its actual import, resolve DEV03 with Design, and prepare fresh independent cases after the agreed release configuration freeze. Do not change a measured configuration mid-round or mix v2.7 and v2.11 validators.

## Remaining actual owner evidence

Communication still needs to review sources/content on [the current r5 page](acceptance-review-2026-10-14-r5/README.md). Design's exact source-string approval need not be repeated, but new changes would invalidate its byte binding. CS must integrate the analysis module and these locale keys/state behaviors into its actual app and inspect mobile, cancellations, stale results, incomplete outputs and export. DASE must run genuine independent measurements and participant tasks. AI/DS responds to the resulting defects and coordinates the frozen version. None of those observations is inferred from this import or from a stub/checklist.

The observed [verification record](team-integration-checks-2026-10-14.json) will state commands and outcomes. No model calls, main merge, deployment, independent accuracy or other-role human signatures are produced by this integration. Old dated artifacts remain historical; this entry supersedes their current-version instructions.
