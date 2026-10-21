# Run and failure-analysis framework (after AI handoff)

**Date:** 2026-10-13 (HKT)  
**Status:** Protocol only. No model-results rows are filled in this pack.  
**Rule:** Call the **existing product analyze entry** and selected configuration only. Do **not** rebuild AI, App, or a second DASE judgment pipeline.  
**Handoff:** Draft tooling is on `handoff/ai-ds-dase-20261013` / PR #6 (`tools/evaluate-development.mjs`, `lib/analysis`). Use offline simulation/authored/inventory now; freeze `build_id`/`config_id` before claiming scored results.

## When scored runs start

Offline adapter work can start from the draft handoff (see `adapter-and-scoring-plan.md` and `handoff-checklist.md`). **Filled `model-results` rows and release-facing semantic claims** wait until AI/DS + team freeze build/config identity (and Communication/Design gold where required).

Until freeze / real scored runs:

- Leave `evals/student/model-results-template.csv` empty (header only in the repo).
- Do not invent accuracy, pass rates, or participant counts.

## How to run

1. Freeze (or receive frozen) release configuration identity.
2. Use adjudicated gold where available; for development probes before freeze, score against adjudicated or clearly labeled draft expectations — **never** silently treat authorExpectations as observed results.
3. Invoke the **same** analyze module the product will use (adapter/eval tool from AI/DS).
4. Record one result row per attempted case/run in `model-results-template.csv` columns.
5. Incomplete / refused / timed-out attempts: status failure, applicable fields = 0, **remain in the denominator**.
6. Primary semantic counts: first attempt of one frozen **primary** variant per base family.
7. Retries, translations, and non-primary variants: separate sensitivity/ops tables — never pick the best score as primary.

## Metrics to report separately (never one collapsed accuracy)

| Metric | Notes |
|--------|-------|
| schema-valid / complete accepted shape | Engineering gate; not semantic pass |
| citation-valid | Exact match to current text/bounds |
| actor exact | Whole-case |
| verb exact | e.g. borrow vs transfer is material |
| polarity exact | request vs prohibit |
| resource exact | personal / company / unknown / control |
| mechanism exact | recharge, borrowing, credential_control, etc. |
| promise exact | Claims stay claims; invent none |
| guidance exact | Against adjudicated expected guidance |
| missed scoped demand | Dangerous bases missing required pause |
| mistaken scoped warning | Benign/confusable wrongly paused |
| unsafe advice | Count; any user-facing unsafe advice blocks release |
| contradiction preservation | Applicable reply cases |
| question usefulness | relevant / irrelevant / not asked |
| latency | All attempts; P50/P95/max when enough data |
| cost / failures | Including charged failures and retries |

**Engineering interface pass ≠ model semantic accuracy.**

## Known focus cases (development probes)

From AI/DS sync + this review — **focus for writeups after real runs**, not current rates:

| Pattern | Development probe | What “good” looks like |
|---------|-------------------|------------------------|
| Unclear funding source | DEV05-like | `clarify_before_action`; preserve payer/resource unknowns; no false safety |
| Later denial of earlier instruction | DEV15-like | Preserve earlier demand + later denial; pause priority; contradiction_preserved |

Also watch: injection (DEV09), unknown recipient still pause (DEV10), ordinary expense vs recharge (DEV13), OTP control vs payroll (DEV14).

## Error-case writeup template

Copy one block per failed or interesting attempt (fill only after real runs):

```text
### Error case: <case_id> / <run_id>
- build_id / config_id / contract / prompt / library:
- partition / primary_variant:
- expected guidance (adjudicated or clearly marked draft):
- observed guidance / status / failure_code:
- schema-valid? citation-valid?
- actor/verb/polarity/resource/mechanism (expected vs observed):
- promise handling:
- contradiction preserved? (if applicable):
- missed demand / mistaken warning / unsafe advice flags:
- latency_ms / tokens / charge (if any):
- root-cause hypothesis (interpretation vs schema vs timeout vs tool):
- user-visible risk if shipped:
- follow-up owner (AI/DS fix vs label fix vs out-of-scope):
```

## Student tasks

Fill `student-tasks-template.csv` **only after**:

1. Shared web app uses the same analyze entry, and  
2. Design runs the paired protocol with real consenting participants.

Until then the student-tasks template stays empty. Target sample sizes in docs are planning targets, not observed n.

## Reporting honesty

- Use integer counts and exact fractions when results exist.
- Do not round up to planning targets.
- Do not pool development with held-out for primary claims.
- Do not count variants as independent base families.
- Blank ≠ 0 ≠ pass ≠ N/A.
