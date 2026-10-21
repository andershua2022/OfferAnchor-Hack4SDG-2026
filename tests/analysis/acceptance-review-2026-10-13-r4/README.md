# Current human-review handoff — revision 4

This is the current personal source-review page; previous snapshots are historical. The representative authorized integrating the Communication report. Selected bilingual copy and existing S10 task-card mapping are merged; borrow/transfer/pay coverage is preserved. The source Communication report is already tracked at the repository root; r4 retains the same r3 draft wording and source mapping. All seven cards and four routes remain draft until actual review. Runtime is the bounded v2.11 personal development revision. The r3 draft content is unchanged; exact checkpoint identity is refreshed. Independent model quality and human approval remain pending.

1. Communication opens [review.html](review.html), checks the eleven content/route decisions against its linked source evidence, and exports the signed content JSON.
2. Design uses the same page, reviews the eighteen English/Traditional Chinese groups (72 pairs), and exports the signed language JSON. Save/resume unsigned drafts when needed; keep drafts private and labels separate. Pending or changed wording is not approved.
3. Put those two real files under ignored .local-data/content-reviews, then give them to the representative. The importer checks exact current text/checkpoint hashes, owner roles, complete groups and actual self-report attestations. It can show/apply only accepted existing text; it does not authenticate identities, resolve changes or approve an unseen proposal.

    node tools/import-content-review.mjs --content-file OfferAnchor-content-review.json --language-file OfferAnchor-language-review.json

The command above checks records without changing content. --apply is a separate explicit local action with recoverable backup. Relevant unaccepted items stay draft. Applying even real approvals changes configuration/package hashes; run the receiving checks and issue a refreshed handoff before final measurement.

    node --test tests/analysis/consumer-smoke.test.mjs tests/analysis/meaning-regression.test.mjs tests/analysis/development-evaluation.test.mjs

No model calls, source-library copying, independent score or release acceptance comes from this page. The [current source audit](source-audit.json) retains provenance and separates historical failed retrieval from the current successful ADCC/Scameter text reads. No user-end opening or actual service call is inferred. Successful source-string review still does not replace actual rendered/exported-page review.

Independent untouched-case labelling stays with DASE/Communication/Design using the [original authoring protocol](../acceptance-review-2026-10-12/heldout-authoring.md). There is no requirement to complete eighteen already exposed practice cases first. Genuine independent model/user results remain pending; old exposed cases must not be renamed held-out.

Earlier r2/r3 drafts/review records refer to different source bytes and must not be imported as r4 decisions. The library keeps its draft-0.2.0 schema label; content identity is the new checkpoint plus exact hashes. No human approval or Design acceptance is supplied by this producer merge.

On GitHub, download this review directory and open review.html locally; the GitHub file view displays HTML source, not the runnable page. The current importer is included on this branch.
