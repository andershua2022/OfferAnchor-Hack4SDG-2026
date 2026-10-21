# Adapter and scoring plan (DASE) — consumes AI/DS handoff

**Date:** 2026-10-13 (Asia/Shanghai)  
**Role:** DASE / WP10  
**Handoff source:** branch `handoff/ai-ds-dase-20261013`, draft [PR #6](https://github.com/andershua2022/OfferAnchor/pull/6), file `AI-DS-HANDOFF.md`

Evaluation must use the **same** product analyze entry that students will hit. DASE must **not** build an eval-only extractor, second model pipeline, or competing app. Until PR #6 is merged (DASE does not merge it), work from that handoff branch / checkout for offline tooling.

## Consume these artifacts (do not rewrite)

| Artifact | Location on handoff branch | DASE use |
|----------|----------------------------|----------|
| Analyze entry | `lib/analysis` (`lib/analysis/index.ts`) | Only invocation path for scored / simulated analysis |
| Runtime selection | `tests/analysis/module-handoff.json` | Selected prompt **extract-v2.7**; simulation **extract-v2.0**; public wire contract **2.0.0** |
| Development measurement adapter | `tools/evaluate-development.mjs` | Inventory, simulation, authored, and later `--score-run` |
| Development measurement notes | `tests/analysis/development-measurement.md` | Denominators; first-primary; failure handling |
| Sanitized probes | `tests/analysis/model-development-attempts-2026-10-12.csv` (12 rows) + related findings JSON | Context for known gaps only — **not** independent accuracy |

## Offline commands (from `AI-DS-HANDOFF.md`)

With Node available, from the **handoff branch root** (not necessarily `main`):

```text
node --test tests/analysis/consumer-smoke.test.mjs tests/analysis-runner.test.mjs
node lib/contracts/generate-types.mjs --check
node tools/evaluate-development.mjs --inventory
node tools/evaluate-development.mjs --profile simulation --output-run dase-simulation-01
node tools/evaluate-development.mjs --profile authored --output-run dase-authored-01 --fixture-approvals
```

Rules for these commands:

- Use a **new** `--output-run` name each time.
- Outputs go under ignored `.local-data/development-evaluation/<RUN>/` — no keys, no new model calls.
- **Do not** run the **recorded** profile from this packet (private fictional provider captures are excluded from Git).
- **Do not** make paid / live model calls from DASE for “preview scores”.
- Authored fixture / replay pass is **not** a live model score.
- After human reviews exist in `reviews.json` for a packet, score with:  
  `node tools/evaluate-development.mjs --score-run RUN`  
  Missing human judgments remain pending.

Passing smoke / contract / inventory checks proves **wiring**, not semantic accuracy.

## Evidence boundary (hard)

- The **12** extraction-probe rows and any “32 offline checks” style engineering suite are **not** independent accuracy.
- Do **not** copy those probe columns into root `model-results-template.csv` fields such as `complete_valid_shape`, semantic exact-match columns, `unsafe_advice`, or held-out score fields as if those observations were a full DASE evaluation.
- Root `model-results-template.csv` and `student-tasks-template.csv` stay **header-only** until a frozen `build_id` / `config_id` run and real participant sessions exist.
- Known development gaps to prioritize in later writeups: **unknown funding**; **later denial/cancellation**. Do not relax validators to raise acceptance.

## Adapter responsibilities (DASE)

1. Map `development-cases.json` request payloads → product analyze input via the shared tool (already implemented on the handoff branch).
2. Capture full responses (guidance, actions, promises, unknowns, citations, failure/timeout codes).
3. Write one row per **attempt** into a future filled `model-results` sheet only after a confirmed frozen configuration run.
4. Keep incomplete / refused / timed-out attempts as failures in the **denominator**.
5. Primary semantic counts: first attempt of one frozen **primary** variant per base family; variants are sensitivity / ops tables only.

## Forbidden

- Eval-only / reimplemented extractor.
- Second DASE judgment pipeline or competing frontend.
- Paid model API calls from DASE for preview scores.
- Filling observed columns from `authorExpectations` or from the 12 probe CSV.
- Sharing held-out case text or gold with AI/DS before freeze.
- Merging PR #6 from DASE authority (leave merge to repo owners / agreed process).

## Scoring rules (whole-case)

| Rule | Detail |
|------|--------|
| Match unit | Whole-case exact-match per `docs/evaluation.md` §3 and `evals/student/README.md` |
| Incomplete | Incomplete structured output = **0** for that attempt |
| Denominator | **All attempts** remain (timeouts, errors, empty) |
| Primary report | First attempt of the frozen primary variant per `config_id` / build |
| Variants | DEV11/12/17/18 are non-primary members of DEV02 unless a variant-specific slice is explicitly labeled |

## CSV discipline

| File | Now | When fillable |
|------|-----|---------------|
| `split-draft.csv` (this folder) | Development identity draft OK | Annotator / frozen / sha after real freeze |
| `annotation-draft.csv` (this folder) | DASE draft only | Gold after Communication + Design |
| Root `model-results-template.csv` | **Header only** | Real `build_id` + `config_id` runs |
| Root `student-tasks-template.csv` | **Header only** | Real participants + Design-run protocol |

## Next after offline adapter

1. Communication independent labels; Design adjudication.
2. Held-out: new families privately; categories already in `heldout-plan.md` / stub CSV.
3. Frozen single analyze/configuration before formal live assessment.
4. CS wires the **same** `lib/analysis` into the student app when ready.
