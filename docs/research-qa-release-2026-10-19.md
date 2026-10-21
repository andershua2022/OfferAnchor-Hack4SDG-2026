# Governed source question answering — 19 October 2026

Status: deployed and checked at https://offeranchor-hk.vercel.app. The exact tested deployment `dpl_GmEc3yNGgZc9yAcY2xkVKrVLvVCj` was promoted; runtime source is `eb620bf0ce78ca442e229c0fff75d7310f9316bc`. [Machine-readable release receipt](research-qa-verification-2026-10-19.json).

## Scope and provenance

The existing optional Knowledge panel, shared by Learn and Check, can use the 24 public-source editorial summaries as bounded answer passages. The owner explicitly authorized this scope. Seven existing core guides retain their recorded human approval; the new catalogue records `source_checked`, `humanApprovalGranted: false`, and the audit date. No reviewer signature was invented. The original display-card editorial status is unchanged.

The 24 records cover 22 primary URLs. English passages reuse the existing audited summary, notice and limitation. Authored Traditional Chinese passages preserve the relevant conditions and limitations. SHA-256 binds each catalogue entry to its exact source record; content/source drift removes eligibility. Named-company policy intent cannot exclude matching general safety guidance. International cases remain comparisons, and company policies do not establish universal law or sender identity.

The model receives no more than three relevant references. It can select up to three complete verbatim sentences. The server checks the exact reference and sentence, including amounts with decimal points, and constructs the cited answer. Unsupported questions return insufficient evidence without a model request. This remains precise local retrieval, not semantic embeddings, independent legal advice or free-form authenticated research.

## Protected behavior

- Core contract 2.0.0, extract-v2.29 and context-audit-1.8.0 remain unchanged. The 24 cases do not enter the core extraction prompt or become facts about the submitted offer.
- Frontend layout, language files, login flow, attachments and export formats are unchanged.
- Official team Alibaba Beijing qwen3.8-max remains the model; no private gateway, model or credential change.
- Each ordinary account retains five lifetime AI action attempts, shared raw-request allowance remains 60 per 24 hours, and optional Q&A is still an explicit paid-budget action. Adding records does not cause automatic calls.
- Firecrawl remains the explicit Public sources action. Its generic-query privacy checks, official-domain restrictions and unavailable/skip behavior are unchanged. Raw search snippets cannot become approved answer evidence.

## Local evidence

Integration tests: 440 passed, zero failed. AI compatibility: 93 passed, zero failed. Typecheck and production Webpack build passed. The 24 records were tested with 48 specific English/Traditional Chinese retrieval questions, plus source-drift and negative-scope checks. These are development/regression results, not a measured user accuracy percentage.

Independent read-only review identified company-name interference, omitted received-wages timing in the Chinese agency summary, and decimal sentence splitting. All were reproduced before fixes and retained as regression tests. The Chinese agency passage now preserves successful placement, receipt of first-month wages and the ten-percent cap. The [official EAA portal](https://www.eaa.labour.gov.hk/en/looking.html) and its linked [current Code of Practice, section 3.5.1, PDF page 14](https://www.eaa.labour.gov.hk/_res/pdf/CoP_Eng.pdf) support the distinction; this product does not advise that a particular bill should be paid.

Local Chrome checks passed for login UI and numeric-code states, account isolation/logout, send cooldowns, local selectable PDF and text imports, synthetic image/scanned-PDF consent and cancellation. Download/reimport was exercised in the actual workspace: import restores editable source material and does not restore a report's authority or trigger analysis. Login/OCR providers in these browser checks were synthetic; no new human Google consent or real email delivery is claimed.

## Actual service and rollout evidence

Five explicit optional questions passed on the staged team Alibaba deployment: English and Chinese Hays fees, Chinese Hong Kong agency commission, Chinese pre-acceptance identity copies, and the personal-loan repayment distinction. Answers retained source IDs and exact quotations. An unrelated baking question returned insufficient evidence without a model call. The same saved real answers were also rendered successfully through the built bilingual browser client without extra paid calls.

One initial Firecrawl attempt was blocked by the unchanged owner-demo limit after those five questions. That was an application quota rejection before search execution, not a search-provider failure. After the ten-minute window expired, the separate remaining test batch returned three official government guidance results. No limit, cookie cohort, API key or model was rotated to evade the allowance; no automatic provider retry was used.

Both frozen core controls completed with original-word citations:

| Case | Observed result |
| --- | --- |
| F01: personal loan and transfer, company repayment promise, later cancellation without denying the original requests | `pause_requested_action`; one requested personal borrowing and one requested transfer of those borrowed funds; the repayment promise remains a claim linked to both. |
| F02: the same expense later clarified as company funds, with explicit personal-payment/borrowing prohibitions | `no_personal_financial_request_identified`; company-funded transfer retained, personal transfer and borrowing remain prohibited. |

These two development controls are not a broad model-accuracy estimate. CLI wall time, including command/network overhead, was about 55–57 seconds per core control; optional Q&A actions took about 8–10 seconds by the same measure. This record does not invent raw token usage or a per-call price that the application response does not expose. Validation used at most nine raw model requests plus one successful Firecrawl search, without consuming an ordinary user's lifetime allowance.

The same READY staged deployment was promoted to the canonical domain; its alias deployment ID was verified. An initial read-only smoke stopped on an `ECONNRESET` from Playwright's separate APIRequest transport while reading account status. The zero-paid-call check was repeated using native browser fetch for those status reads; no product code was changed. The completed fresh production Chrome check covered the landing-to-workspace CTA, all 24 readers and original-source links, English/Chinese keyword search, category filters, both language versions of the Firecrawl instruction, 390-pixel overflow, login entrances, privacy/terms, and an actual prepared-example ZIP download/reimport. No paid request or browser page error occurred in the completed check. Reimport restores editable material and clears the prior report's authority.

Staged negative requests confirmed unauthenticated and cross-origin rejection, malformed-input rejection, and blocking of a private email search query before a provider call. The approved seven project credential categories were compared locally against tracked source, Git history, build/public files and ten downloaded staged browser scripts; no exact match or unreviewed pattern/email candidate was found. Deployment ignores exclude environment files, local data, uploads, keys and logs. The original team repository remains private.

The original frontend source, core analysis, team model and five lifetime account actions are unchanged. Existing tabs should refresh to load the additive `source_checked` reference validation. No new real email delivery or personal Google consent is claimed in this unattended check; authentication UI/state checks used synthetic providers. Earlier release records preserve their own failures and limits. No semantic embedding or autonomous web-search feature was added.
