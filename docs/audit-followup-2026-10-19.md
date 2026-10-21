# OfferAnchor follow-up — 19 October 2026

## Decision

The unchanged local audit 1.8 candidate passed this bounded follow-up on both the user-authorized private gateway and the actual team Alibaba endpoint. It is ready for a reviewed public-source update and is a reasonable controlled-trial deployment candidate. No GitHub push or deployment was performed. A later release should validate its deployment preview before switching the public alias; local checks are not actual-public acceptance.

No further interpretation-code change was justified by this round. Generation remains extract-v2.28, audit context-audit-1.8.0 and adapter source-context-roles-events-1.3.0. The earlier audit-polarity fix and its strict findings rejection remain intact. Frontend files, public contract 2.0.0, original cases/gold, two-call ceiling and 50/53/58 second budgets are unchanged.

## Frozen cases and observed results

| Case | Source mechanism | Private gateway | Official team Alibaba |
| --- | --- | --- | --- |
| F01 | Personal loan + linked proceeds + future repayment + cancellation without denial | Complete, source-correct, 40.125s | Complete, source-correct, 42.005s |
| F02 | Same HKD 680 payment clarified as company-funded, with personal-transfer/loan prohibitions | Complete, source-correct, 42.250s | Complete, source-correct, 41.492s |
| F03 | F01 with a differently worded acknowledgement of the original requests and later withdrawal | Complete, source-correct, 39.699s | Not tested; team quota conserved |
| F04 | F01 with an actual retrospective denial combined with cancellation | Complete, source-correct, 40.226s | Not tested; team quota conserved |

Reviews check every retained action, actor, funds type, promise/history target, original citation, relationship and guidance. F03 produces a clarification rather than a fabricated denial. F04 retains actual instruction_denial and same-event contradictions for both original operations. F02 retains one company transfer plus two explicit prohibitions without a stale funds question or false personal-payment warning. Alibaba F02 also retains an additional unverified source quotation; this is supported context, not another financial event. That extra prose remains a presentation-polish limitation.

These are four exposed synthetic source scenarios, with two repeated on another provider, not six independent cases. The earlier 18 October runs and failures are preserved and are not pooled into a population accuracy percentage. Exact first attempts, failures and refusal records are never replaced by selected retries. There were no model failures in this round.

## Provider compatibility

Both requests use the model label qwen3.8-max. The private gateway uses json_object; the official Beijing endpoint uses strict json_schema. The official documentation distinguishes these output guarantees: [Alibaba documentation](https://help.aliyun.com/zh/model-studio/qwen-structured-output). Returned aliases and matching case conclusions do not prove identical model snapshots, proxy routing, parameter handling or future behaviour. This round supplies direct official-provider evidence instead of assuming interchangeability.

## Limits and checks

The private gateway used 8 raw requests/28,342 tokens. The official team used exactly 4 raw requests/14,102 tokens. Combined 12 raw requests/42,444 recorded tokens; no retries, provider switching, unknown-usage requests or hosted user-allowance consumption. Actual rates/invoices were not checked, so no currency cost is invented.

360 integration tests and 93 compatibility tests passed again. The browser suite on isolated port 3110 passed simulation HTTP, exact quote selection, protected export, stale-result invalidation, attachment text, synthetic cancellation/consent states and narrow viewport checks. It made no external browser call or real model request. No physical-device test or new real login/allowance-exhaustion test is claimed. The existing production build ran successfully with byte-identical runtime source; no clean pinned-toolchain install is claimed.

A complete check still takes about 40–42 seconds, leaving limited margin under the model deadline of 50 seconds. Quality on these development cases is not broad accuracy, independent human validation, employer certification or assurance that an arbitrary case will succeed. Treat the release as a supervised controlled trial.

## Integration

The new local handoff contains only proposed source/test/documentation files and hashes, based on public commit `7d8f8cf5d9c9baed7f9c5e7ba234b250b0a6995a`. The 18 October handoff and old receipts remain untouched. Never copy .local-data, credentials, node_modules or build caches into a shared repository. Check the current target revision and teammate edits before applying this proposal. Official model settings stay server-side; users do not provide keys.
