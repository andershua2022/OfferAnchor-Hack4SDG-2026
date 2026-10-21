# Held-out plan (categories only)

**Date:** 2026-10-13 (Asia/Shanghai)  
**Status:** Category plan + stub inventory only — **strengthened 2026-10-13 evening**  
**Aligned with:** `docs/evaluation.md` §2; `resources/DASE.md`  
**Companion stub:** `heldout-category-stub.csv` (same directory)

**Important:** This file and `heldout-category-stub.csv` contain **categories and planning IDs only**.  
**No held-out case text. No gold guidance answers. Do not share held-out text/gold with AI/DS before freeze.**

## Targets (planning, not achieved counts)

| Target | Planning figure | Notes |
|--------|----------------:|-------|
| Overall base families | ~30 | Development currently **14** provisional bases if grouping accepted |
| Benign/confusable families overall | ≥10 | Development currently **6** control families |
| Fresh held-out base families needed | ~16 | 30 − 14; adjust if grouping changes |
| Controls in held-out | Keep controls in **both** partitions | Exact held-out control count TBD after private drafting |
| Held-out variants | Attach to a held-out **base** | Do **not** count language/Unicode/quote variants as new bases |

Publish **actual** record/base/control counts only after freeze. Do not treat development variants (DEV11/12/17/18) as independent held-out bases, and do not reuse development strings as held-out text.

## Stub vs pending (what exists in Git vs what does not)

| Artifact | In this PR / Git? | Meaning |
|----------|-------------------|---------|
| Category list (this file) | **Yes** | Planning coverage only |
| `heldout-category-stub.csv` | **Yes** | Planned family IDs + category labels + risk/control tag |
| Private case bodies under `.local-data/heldout/` | **No** (gitignored) | Must be authored privately; **pending** |
| Independent gold labels for held-out | **No** | Communication after freeze path; **pending** |
| Held-out input / gold hashes | **No** until freeze | Publish hashes only **after** Design freeze |
| Formal held-out model-results rows | **No** | Empty until frozen build + real scored run |

**Stub** = category / ID / control-or-risk tag only (safe to share with AI/DS as coverage intent).  
**Pending** = any case text, evidence spans, guidance answers, or scores (must stay private until freeze).

## Independence and partition rules

1. **Fresh wording:** Every held-out family must use **new** surface text. Do not copy or lightly paraphrase development DEV strings.
2. **One mechanism ≠ one copy of DEV:** Mapping a held-out family to the same *category* as a demo DEV (e.g. recharge ≈ DEV03 role) is allowed for **coverage**; the case body must still be independent.
3. **Variants are not bases:** Language / Unicode / repeated-quote / surrogate controls attach to a held-out company-funded (or other) **base** — they do not add to the ~16 fresh-base count.
4. **Seen during tuning → development:** Any case shown to AI/DS (or used for prompt tuning) before freeze is **no longer** held-out; move it to development and replace with a fresh private family.
5. **Author draft ≠ gold:** DASE may draft private expectations; Communication labels independently; Design adjudicates; only then freeze gold + hashes.
6. **Partition:** Primary release claims use held-out; development is for scaffolding, focus gaps, and engineering checks. Do not pool partitions for primary accuracy claims.

## What must NOT be published (before freeze)

Do **not** put any of the following in Git, PR descriptions, Issue comments, AI/DS channels, or shared drives visible to model authors:

- Held-out case plaintext (emails, chats, evidence strings)
- Gold / draft guidance answers, actor/verb/resource labels, or citation spans for held-out
- Screenshots or recordings that reveal held-out wording
- “Almost gold” drafts that include full held-out narratives
- Mapping tables that quote held-out sentences next to DEV IDs

**Allowed to publish before freeze:** this category plan, stub CSV (IDs + category tags), process notes, and (after freeze) **hashes** + category counts.

## Private storage

- Path: **`.local-data/heldout/`** (gitignored via `/.local-data/`).
- Public pack / Git: category counts, planned family IDs, and **hashes after freeze** only.
- AI/DS may see **categories**, not text or labels, until release configuration freeze.

## Category coverage to author freshly (no text here)

Mechanisms / situations that still need fresh held-out families (illustrative category list; invent new wording privately):

| Priority | # | Category (planning label) | control_or_risk | Demo-role coverage (dev analogy only — not the same case) |
|----------|---|---------------------------|-----------------|-----------------------------------------------------------|
| P0 | 1 | Task recharge / personal unlock payment | risk | Same **role** as DEV03 (recharge demo) — fresh text only |
| P0 | 2 | Personal borrowing + onward transfer | risk | Same **role** as DEV01 (borrowing demo) — fresh text only |
| P0 | 3 | Positive banking OTP / account-control request | risk | Same **role** as DEV14 (credential demo) — fresh text only |
| P0 | 4 | Company-funded work with borrow prohibition | control | Same **role** as DEV02 contrast — fresh text only |
| P1 | 5 | Company-funded work with OTP prohibition | control | May merge with #4 as one family, two actions |
| P1 | 6 | Ordinary reimbursable work expense boundary | control | Expense ≠ recharge |
| P1 | 7 | Payroll information without account control | control | Info request; OTP prohibited if present |
| P1 | 8 | Missing payer / unclear funds → clarify | confusable | AI focus: unknown funding |
| P1 | 9 | Description of third-party scam with no request of applicant | control | Description ≠ request |
| P1 | 10 | Promise / website-as-proof repayment claim | risk | Promise remains claim |
| P1 | 11 | Changed non-financial duty only | control | No pay/borrow |
| P1 | 12 | Embedded hostile / injection instruction alongside payment demand | risk | Injection is data |
| P1 | 13 | Clear borrow with unknown/deferred recipient | risk | Still pause if borrow clear |
| P0 (AI focus) | 14 | Contradiction: earlier personal-money demand + later denial | risk | Preserve both; AI focus |
| P1 | 15 | Already-acted / user-reported completed transfer | risk | user_reported ≠ recovery |
| Attach | 16 | Language / Unicode / repeated-quote control variants | control_variant | Attach to a held-out company-funded base; **not** a 17th base |

Optional stretch if time: correction/revision sequences; multi-evidence staged onboarding that still contains a scoped demand.

Stub IDs **HO-F01 … HO-F16** in `heldout-category-stub.csv` map 1:1 to the rows above for planning.

## Process

1. DASE drafts held-out texts **privately** under `.local-data/heldout/` (not in this PR).
2. Communication independently annotates (do not treat DASE draft expectations as gold).
3. Design adjudicates; DASE freezes text / grouping / partition / hash.
4. Until freeze: share only this category plan / stub CSV / later hashes.
5. **Do not send held-out text or gold answers to AI/DS before freeze.**

## Relationship to development demo lock

Development demo materials for Communication alignment are locked separately in `demo-lock.md` (**DEV03 / DEV01 / DEV14** + **DEV02** contrast). Those are **development** cases. Held-out must still cover the same *categories* with **independent** private families (HO-F01, HO-F02, HO-F07, HO-F03 above) — never by shipping the demo case text as held-out.
