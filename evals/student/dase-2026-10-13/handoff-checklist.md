# Handoff checklist — receiving confirmed AI module + eval tooling

**Date:** 2026-10-13 (HKT)  
**DASE rule:** Same analyze module as the product. No second pipeline.  
**Update:** Draft AI/DS handoff received via branch `handoff/ai-ds-dase-20261013` / [PR #6](https://github.com/andershua2022/OfferAnchor/pull/6) (`AI-DS-HANDOFF.md`). Boxes below mark **draft receipt**, not frozen release sign-off.

## A. Version identity

| Field | Received (draft)? | Value / link |
|-------|-------------------|--------------|
| `build_id` | ☐ | Not a frozen release build; wait for explicit freeze |
| `config_id` (frozen release config) | ☐ | Not frozen yet |
| Contract version | ☑ draft | **2.0.0** (public wire; confirm at freeze) |
| Prompt version | ☑ draft | Selected runtime **extract-v2.7**; simulation **extract-v2.0** |
| Library version | ☐ | Leave root library draft per handoff; confirm at freeze |
| Provider / model / parameters record | ☐ | Required before any live scored run |
| Policy / prompt hash or path | ☑ draft | See `tests/analysis/module-handoff.json` on handoff branch |
| Eval tool / adapter commit or package id | ☑ draft | `tools/evaluate-development.mjs` on PR #6 branch |

## B. How to invoke

| Field | Received (draft)? | Value |
|-------|-------------------|-------|
| Exact command or entrypoint to call analyze | ☑ draft | Shared `lib/analysis` via `tools/evaluate-development.mjs` profiles |
| Working directory / package location | ☑ draft | Handoff branch root |
| How to pass a case request | ☑ draft | Tool profiles: `--inventory`, `--profile simulation`, `--profile authored` |
| How failures/timeouts are returned | ☑ draft | See `tests/analysis/development-measurement.md` |
| Max latency / timeout setting | ☐ | Confirm before live scored run |
| Whether the tool writes model-results-shaped rows | ☑ draft | Offline packets under `.local-data/development-evaluation/`; root templates stay empty until real scored runs |
| Logging: where raw output is stored (private) | ☑ draft | Ignored `.local-data/…` only |

**Offline commands (no paid calls; do not use `recorded` profile):**

```text
node tools/evaluate-development.mjs --inventory
node tools/evaluate-development.mjs --profile simulation --output-run dase-simulation-01
node tools/evaluate-development.mjs --profile authored --output-run dase-authored-01 --fixture-approvals
```

After human `reviews.json`: `node tools/evaluate-development.mjs --score-run RUN`.

## C. What DASE returns / publishes after a run

1. Filled `model-results` rows for every **attempt** (including failures) — only after frozen config.
2. Separate metric tables (schema, citation, actor/verb/polarity/resource/mechanism, promise, guidance, miss, mistaken warning, unsafe advice, contradiction, latency, cost).
3. Error-case writeups (`run-and-failure-framework.md`), prioritizing unclear-funding and contradiction failures.
4. Explicit denominator rules used.
5. Updates to status docs with **only** checks actually performed — no invented scores.

DASE should **not** return:

- Held-out text or gold to AI/DS before freeze.
- A single collapsed “accuracy” that hides failure modes.
- Student-task numbers without real sessions.
- Probe CSV rows copied into semantic `model-results` fields.

## D. Preconditions before held-out scored run

| Check | Done? |
|-------|-------|
| Development family grouping reviewed | ☑ draft (`development-case-review.md`) |
| Independent Communication labels complete | ☐ |
| Design adjudication complete | ☐ |
| Text/grouping/partition/hash frozen | ☐ |
| Held-out text still private under `.local-data/heldout/` | ☑ process (`heldout-plan.md`; no text in Git) |
| AI/DS confirms they did not inspect held-out text/labels | ☐ |
| Shared analyze entry matches web app path (or documented interim adapter) | ☑ draft module on PR #6; CS app wiring still pending |

## E. Sign-off

| Role | Name | Date (HKT) | Notes |
|------|------|------------|-------|
| AI/DS confirms handoff | | 2026-10-13 | Draft PR #6 published; not main merge / not accuracy claim |
| DASE accepts handoff artifacts | Vic-Chen-DASE | 2026-10-13 | Accepts draft tooling for offline adapter; freeze still open |
| Communication aware of freeze status | | | |
| Design aware of adjudication status | | | |

Blank cells for freeze / live scoring remain intentional until real freeze and authorized runs.
