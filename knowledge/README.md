# OfferAnchor reference content

Baseline **2.1**, contract **2.0.0**. The historical library identifier remains **draft-0.2.0**; it is a version identifier, not the current approval status. [library.json](library.json) contains the seven core guides, registered sources and four checking routes. Their exact English and Traditional Chinese wording was approved by the AI/DS representative on 17 October; see [the recorded human review](../docs/content-review-2026-10-17.md).

The separate [published-cases.json](published-cases.json) contains 24 public-source editorial records (eight reported cases, twelve official guidance summaries and four company practices). They are not original transcripts or additional core classifiers. Their source/content audit is [recorded separately](../docs/learn-content-audit-2026-10-19.md); agent verification does not invent human approval.

## Current use

- Core Check analysis interprets supplied text, validates the extraction, then uses `lib/knowledge/index.ts` to select approved core guidance and routes. The seven-guide approval includes the ordinary reimbursable-expense control; it does not guarantee funding, repayment or safety.
- The 24 summaries are available in Learn and as topic-linked reading after a Check result. They are not inserted into the main extraction prompt.
- Optional live Knowledge answers use the seven human-approved core guides plus the separate [research-passages.json](research-passages.json) catalogue. Its 24 bilingual passages are `source_checked`, not human-approved: each is bound to the exact published record by SHA-256, and drift removes eligibility. Authored Chinese passages preserve scope; company aliases require policy intent. No runtime translation or extra model request is introduced. At most three relevant references enter one explicit question request. [Release and evidence](../docs/research-qa-release-2026-10-19.md).
- Optional Public sources search is explicit and supplementary. A source or result does not authenticate an employer or sender.

Actual core card/route wording comes from [English](../locales/en-HK.json) and [Traditional Chinese](../locales/zh-Hant-HK.json) keys with the same stable IDs. Communication owns meaning/source review; Design owns locale keys; AI owns policy selection and reference validation. Missing or withdrawn core approval blocks the affected live use. Any future approval must record a real named reviewer and the exact source scope/wording; version changes and approval withdrawal trigger affected-case review.

Card dates are either the exact publisher date, when recorded, or a labelled source-check date. They are not incident dates. Do not invent a day from a case ID, upload month or copyright year.

Use [the current source/content audit](../docs/learn-content-audit-2026-10-19.md), [data plan](../docs/knowledge-and-data.md), [source register](../docs/research-and-sources.md) and [integration contract](../docs/integration-contract.md). Earlier dated planning documents describe their own stage. This material is public-source product synthesis, not victim records, employer authentication or an official finding about a submitted job.

The original card editorial/human-review status is unchanged. The owner explicitly authorized the source-checked catalogue for the existing optional Knowledge panel on 19 October. `checkedOn` records source audit, never human sign-off. Web snippets remain unreviewed and cannot be promoted to answer passages. Company policies retain company scope; overseas reports remain comparisons rather than Hong Kong law.
