# Loan-funding repair release — 19 October 2026

## Current decision

**The v29 judging release is now deployed at https://offeranchor-hk.vercel.app.** The complex and normal control both passed actual staged HTTP/model checks and whole-source review before the same deployment was promoted. Deployed source is `bf2934f5fe6433b094d10ac2d8ce2f4c5694ba81`. The owner-approved shared budget is 60 raw requests per 24 hours; every account still has five lifetime AI actions. See the [actual release receipt](judging-release-2026-10-19.json). This record owns the current v29 release status. The [earlier v28 hosted refusal](release-2026-10-19.md) remains an unchanged historical observation.

## What changed

Generation extract-v2.29 distinguishes who owns the money used for an operation from who promises to repay its cost later. An applicant's personal loan and linked loan-proceeds transfer remain personal borrowing when a company promises to cover the principal, interest or supplier cost. That assurance is retained as an unverified repayment promise for the related actions. A genuine statement that the transfer uses company-owned funds remains representable, including future scheduled company payments and material conflicting claims.

This is a separately versioned generation policy with a narrow dispatch and provenance compatibility update. The existing v28 source-role/same-payment processing, audit1.8 and repayment/funding/citation checks are unchanged. The application does not delete an unsupported funds row, clear an audit finding, rewrite model facts, add retries or approve an employer. All public schema fields and frontend files remain unchanged; only the declared backend provenance whitelist adds v29. Auth, origin, secrets, team-provider settings and five lifetime attempts per account are preserved.

## Actual model observations

| Case | Private gateway | Actual team Alibaba |
| --- | --- | --- |
| F01 original complex personal loan, linked proceeds, promise and non-denying cancellation | Complete; source-correct; 39.897s | Complete; source-correct; 42.325s |
| F02 one company-funded same payment with personal-transfer and personal-loan prohibitions | Complete; source-correct; 40.199s | Complete; source-correct; 41.443s |
| F03 non-denying withdrawal paraphrase | Complete; source-correct; 40.204s | Not repeated; team budget conserved |
| F04 actual retrospective denial plus withdrawal | Complete; source-correct; 43.387s | Not repeated; team budget conserved |

Whole-extraction developer review checks all actions, roles, resources, promises, historical targets, relationships, exact quotations and final guidance. The normal control retains one requested company-funded payment and two distinct prohibitions, without a duplicate payment or stale funds question. The complex input retains borrowing and loan-proceeds transfer separately, a promise targeting both, and the difference between withdrawal and retrospective denial.

These are four exposed own fictional scenarios, two repeated across providers, not six independent cases. No first attempt was retried or replaced, and earlier failed v28 results remain visible. The private gateway uses json_object; the official team Beijing endpoint uses json_schema. A common qwen3.8-max label does not establish identical routing or snapshots. The unchanged candidate was checked on the actual team endpoint rather than assuming equivalence.

Private gateway: eight raw requests / 29,166 tokens. Team Alibaba: four raw requests / 14,516 tokens. Total: twelve raw requests / 43,682 tokens. No currency cost is invented; actual prices/invoices were not verified. No private gateway is configured as a product fallback. Model/server/browser deadlines remain 50/53/58 seconds, with at most two raw requests per analysis.

## Integrated evidence and limits

364 integration tests, 93 compatibility tests, local Webpack production build and the workspace browser suite passed. The browser suite used simulation HTTP and explicitly synthetic live responses, not real login/model calls. One independent read-only code review found no actionable issues. A byte comparison preserved 162 frontend/reference files and five public schema files. Host Node was 25.6.0; no clean pinned-toolchain install or physical-device test is claimed.

See [sanitized observations](loan-funding-verification-2026-10-19.json), [frozen code hashes](loan-funding-source-freeze-2026-10-19.json) and [fictional inputs](../tests/analysis/loan-funding-cases-2026-10-19.json). These developer observations support a controlled rollout decision, not an independent accuracy percentage or a guarantee that every job request will complete. Complex checks still take about 40–43 seconds, near the fixed deadline. Unknown or invalid output must still abstain. The staged observations below separate configuration readiness from an actual hosted model response and real user authentication.

## Historical stage with the previous 30-request shared budget

The v29 production-configuration deployment built to READY with no public-domain promotion. The workstation and login page returned HTTP 200. Account configuration reports configured/public email delivery; the service reports live readiness and the unchanged five-lifetime-action policy. These are configuration/entry checks, not new actual Google/email sign-in.

The first staged F01 analysis returned HTTP 429 / quota_exceeded before model work. It consumed no model request or real user trial action. The response supplied Retry-After 24,222 seconds at observation time; it does not identify whether the cohort or global/shared counter caused rejection, nor guarantee an exact recovery time. This is not another incorrect model answer. F02 was not attempted on the already-limited hosted channel; its separate direct team-provider check remains recorded above.

No quota, access code, account counter, budget window, session secret or origin was rotated or reset. The prior public v24 deployment was confirmed both before and after staging and remains untouched. Source publication passed; hosted AI acceptance and promotion remain pending. Once the existing allowance permits it, test both frozen cases through this staged build before assigning the public domain. Do not claim that a direct provider success is an observed hosted success.

The final source/history/static scan compared seven authorized credential categories, 514 tracked files, 496 historical blobs and 65 browser/public static files. No known credential match, unreviewed secret pattern, new private email or sensitive tracked path was found. One new literal test key is deliberately fictional and reviewed by exact path/hash. No actual credential, cookie or raw provider output is published.

## Owner-approved judging budget adjustment

On 19 October the owner authorized a moderate increase in the shared service budget to complete staged checks, preserving five lifetime actions per account. The configured global request budget was 30 per 86,400 seconds and the existing global counter had reached 30. Application and database validation now support an explicit maximum of 60, while the clone default remains 30. The judging deployment uses 60. No counter, quota window, identity, access code or origin is reset or rotated.

The additive migration replaces only the existing global upper-bound check and widens the shared counter constraint. Existing account-usage aggregates remained identical immediately before and after; the personal-five guard, denied anonymous execution and granted server execution were verified through the existing authenticated project SQL editor. Individual account rows, emails and credentials were not exported. Existing historical migrations remain intact.

367 integration tests passed, including an explicit sixty-request hard-cap test and rejection above sixty; prior account exhaustion tests still pass. The generation/audit code and exact model inputs are unchanged from the successful private/team checks. A fresh staged build and both actual HTTP cases are required before production promotion; later rollout observations below will record what happened.

## Successful staged checks and production adoption

After the authorized budget migration, the complex F01 and company-funded F02 both returned HTTP 200 / complete through the actual deployed product, using team Alibaba qwen3.8-max and extract-v2.29. Their end-to-end times including the deployment CLI were 48.594s and 49.072s. Every retained action, resource, first promise, withdrawal/denial relationship, normal prohibition and exact quotation passed the same developer source review. The shared counter increased by four reserved raw requests; account trial usage aggregates stayed unchanged. No failed model attempt was retried or concealed.

The READY deployment `dpl_A9WRv9oi9PFi3TZXyN23mLxaYJzE` was promoted directly; no alternative build was substituted after testing. The production target was verified. Fresh production browser checks passed landing-to-workspace navigation, account entrances, five-lifetime-action policy and narrow layout without script errors or horizontal overflow. Google OAuth startup points to the canonical callback, invalid email is rejected, and unauthenticated analysis is denied before model work. Real user Google consent and a new delivered email were not repeated; existing successful owner sign-ins and unchanged authentication source remain earlier evidence.

367 integration and 93 compatibility tests pass. All 162 frontend/reference files and five public schema files match the released visual baseline. The source tree and known-credential/history/static scans remain clean; only synthetic inputs and sanitized receipts are published. The original collaboration repository remains private, and the canonical teammate workspace was not overwritten. Clone defaults stay safe; the live Vercel project explicitly stores the authorized 60-request shared setting for future releases.

Refresh existing browser tabs after deployment so the new backend provenance whitelist is loaded. The interface is unchanged. This release remains a controlled trial: these exposed development checks are not an independent accuracy percentage, and complex model work still takes roughly 40–50 seconds. Prepared examples remain free simulations; genuine new material uses the guarded live service.

### Additional actual-public core smoke check

After promotion, the original DEV14 fictional bank-login-code case was checked once through the public product URL. It returned HTTP 200 / complete, qwen3.8-max / extract-v2.29, pause_requested_action, in 35.132s including CLI overhead. Whole-source review retained exactly the applicant's requested OTP disclosure to the recruiter, account-control resource and exact original quote, without fabricated financial actions or identity verification. The private generic harness used alias F01; the source case/request remain DEV14 / dev_dev14_001 and are identified accurately in the public receipt. This bounded additional check used at most two raw requests through the separate team channel and no real user's trial allowance. Hosted token usage was not returned. No automatic retry or additional model call followed.
