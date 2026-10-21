# Demo lock — Communication alignment (development cases)

**Date locked:** 2026-10-13 (Asia/Shanghai)  
**Status:** **LOCKED** (author expectations for demo materials; not gold; not observed model results)  
**Owner:** DASE  
**Consumers:** Communication (demo / bilingual materials), Design (review), AI/DS (may tune on development only)

## Locked set

| Priority | Role | caseId | baseCaseId | Author-expected guidance | One-line expectation |
|----------|------|--------|------------|--------------------------|----------------------|
| P0 | Recharge | **DEV03** | DEV03 | `clarify_before_action` | Payment requested to unlock tasks/commission, funding source not stated (`resource=unknown`, `mechanism=unclear`) → ask whether the money must come from the applicant before any action. Bound to `OfferAnchor-development-annotations-frozen-v2`. |
| P0 | Borrowing | **DEV01** | DEV01 | `pause_requested_action` | Personal loan + onward transfer to a nominated account → pause; repayment remains an unverified claim. |
| P0 | Credential control | **DEV14** | DEV14 | `pause_requested_action` | Share banking OTP for recruiter login/control → pause; not ordinary payroll. |
| Contrast | Company-funded control | **DEV02** | DEV02 | `no_personal_financial_request_identified` | Company pays; personal borrow/OTP prohibited → no scoped personal financial request identified. **Not** “safe / trusted / OK to share ID”. |

**Canonical trio for external demo narrative:** DEV03 → DEV01 → DEV14, then show DEV02 as the control contrast.

## DEV03 update — frozen-v2 import (2026-10-14)

- DEV03 now binds to `OfferAnchor-development-annotations-frozen-v2` (Design, `design/review-2026-10-14/frozen-development-annotations-v2/`, PR #8).
- Superseded (not rewritten): the 2026-10-13 lock expectation `pause_requested_action` with `resource=personal_money`, `mechanism=task_recharge`, from the DASE independent draft / frozen-v1. v1 stays immutable.
- Kept: payment request `applicant / pay / requested` and the source quotation.
- Changed: `resource=unknown`, `mechanism=unclear` (contract 2.0.0 requires `unclear` when funds are unknown), guidance `clarify_before_action`, critical unknown `resource/funds unknown`.
- DEV03 is excluded from overall accuracy until the dispute is closed. Deferred and not added: numeric risk score, "unlock = high risk", 24h/72h clarify escalation.
- Demo narrative still DEV03 → DEV01 → DEV14 → DEV02; DEV03 now demonstrates clarify-before-action rather than pause.

## What “locked” means

1. Communication should build demo / bilingual presentation around these four case IDs unless Design + DASE jointly unlock a change.
2. Expected guidance above is **author expectation** from development seeds — **not** Communication independent gold and **not** model accuracy.
3. Changing the locked set requires an explicit note in `docs/status-dase-progress-*.md` and an Issue #3 update.
4. Held-out coverage of the same *categories* uses **separate** private families (`heldout-plan.md` HO-F01 / HO-F02 / HO-F07 / HO-F03). Do **not** promote these demo cases into held-out.

## What this lock is not

- Not a freeze of development gold.
- Not permission to fill `model-results` semantic fields.
- Not a claim that any model passed these cases.
- Not held-out material (held-out stays category-only in Git).

## Cross-references

- Case table: `development-case-review.md` § Locked demo materials  
- Pack index: `README.md` § Demo materials  
- Held-out category coverage: `heldout-plan.md` § Relationship to development demo lock  
- Ledger: `docs/status-dase-progress-2026-10-13.md`
