# DASE evaluation drafts — 2026-10-13 (aligned to AI/DS handoff)

**Role:** DASE (WP10 / START-DASE)  
**Locale for prose:** English  
**Timezone:** Asia/Shanghai (HKT, UTC+8)  
**Branch intent:** Publish DASE preparation artifacts that consume the AI/DS draft handoff without merging it or rewriting the analyze module.

## Alignment received (2026-10-13)

AI/DS published a **draft** handoff on branch `handoff/ai-ds-dase-20261013` ([PR #6](https://github.com/andershua2022/OfferAnchor/pull/6)):

- Single product analyze entry: `lib/analysis` (selected prompt extract-v2.7; simulation extract-v2.0; wire contract 2.0.0).
- Development measurement adapter: `tools/evaluate-development.mjs`.
- Sanitized development probes (12 extraction-probe rows) and offline engineering checks — **not** independent accuracy, and **must not** be copied into `model-results` semantic / complete_valid_shape / unsafe / held-out score fields.
- Known development gaps called out: **unknown funding**; **later denial/cancellation**.

This DASE pack **consumes** that handoff. It does **not** merge PR #6, does **not** change `lib/analysis`, and does **not** invent metrics.

## Pack contents

| File | What it is |
|------|------------|
| `README.md` | This index |
| `judgment-criteria.md` | Independent judgment criteria |
| `development-case-review.md` | Full review of 18 development cases; demo lock; DEV05/DEV15 flags |
| `split-draft.csv` | 18 development split rows; freeze fields empty |
| `annotation-draft.csv` | DASE-draft annotations from author expectations |
| `annotation-draft-README.md` | Status banner: draft ≠ gold ≠ model results |
| `heldout-plan.md` | Held-out **category** plan only (no case text, no gold); stub vs pending + independence rules |
| `heldout-category-stub.csv` | Category inventory stub (IDs + tags only; no text, no guidance answers) |
| `demo-lock.md` | **LOCKED** demo set: DEV03 / DEV01 / DEV14 + DEV02 contrast |
| `run-and-failure-framework.md` | Post-handoff run protocol and failure-analysis template |
| `handoff-checklist.md` | Checklist mapped to PR #6 artifacts |
| `adapter-and-scoring-plan.md` | How DASE invokes the shared analyze entry + eval tool |

Companion ledger: `docs/status-dase-progress-2026-10-13.md`.

## Ready now

1. Judgment criteria and development-case family review.
2. Split / annotation **drafts** (Communication must label independently; Design adjudicates).
3. Held-out **categories** only — text/gold stay private under `.local-data/heldout/`.
4. Offline adapter steps on the handoff branch (simulation / authored / inventory) — see `adapter-and-scoring-plan.md`.
5. Failure-analysis template for when a frozen `build_id` / `config_id` run exists.

## DASE next steps (after this upload)

1. ~~On `handoff/ai-ds-dase-20261013`, run offline inventory + simulation + authored profiles~~ **Done 2026-10-13** (inventory / `dase-authored-01` / `dase-simulation-02`; `modelCalls: 0`; semantic pending — scaffolding only).
2. Ask Communication for independent labels **after exam window** (bilingual review on `main` is **not** gold); Design for adjudication / freeze; wait for PR #6 config freeze before formal model-results.
3. Keep held-out case text and gold **private** until configuration freeze; AI/DS must not see them during tuning.
4. Fill `model-results` / `student-tasks` **only** after real scored runs / real participant sessions.

## Must stay empty until real evidence exists

- Root `evals/student/model-results-template.csv` — header only until a confirmed build/config run (include failures in the denominator).
- Root `evals/student/student-tasks-template.csv` — header only until real participant sessions.
- Do **not** invent participant counts, pass rates, partnerships, or accuracy from this pack.
- Do **not** put held-out case text or gold guidance answers in any file shared with AI/DS.
- Do **not** treat 12 probe rows or 32 offline engineering checks as independent semantic accuracy.

## Demo materials (LOCKED 2026-10-13; DEV03 updated 2026-10-14 to frozen-v2)

Canonical lock file: **`demo-lock.md`**. Author expectations only (not gold, not model results). DEV03 now binds to `OfferAnchor-development-annotations-frozen-v2`.

| Role | caseId | Expected guidance (author expectation) |
|------|--------|----------------------------------------|
| Recharge | **DEV03** | `clarify_before_action` (frozen-v2: `resource=unknown`, `mechanism=unclear`; supersedes 2026-10-13 `pause_requested_action` / `personal_money` / `task_recharge`) |
| Borrowing | **DEV01** | `pause_requested_action` |
| Credential control | **DEV14** | `pause_requested_action` |
| Control contrast | **DEV02** | `no_personal_financial_request_identified` (**not** “safe”) |

Narrative order: DEV03 → DEV01 → DEV14, then DEV02 contrast. Changing the set requires Design + DASE and an Issue #3 note. See `demo-lock.md` § DEV03 update.

## Related

- Issue [#3](https://github.com/andershua2022/OfferAnchor/issues/3) (START-DASE)
- AI/DS draft PR [#6](https://github.com/andershua2022/OfferAnchor/pull/6) / `AI-DS-HANDOFF.md`
- `resources/DASE.md`, `docs/evaluation.md`, `evals/student/README.md`
