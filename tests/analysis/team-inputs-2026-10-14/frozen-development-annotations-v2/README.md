# Frozen development annotations v2

Version: **OfferAnchor-development-annotations-frozen-v2**. This immutable Design reference supersedes frozen-v1 for the same 18 exposed fictional development records / 28 action rows / 14 base families. It resolves **DEV03_UNSPECIFIED_FUNDS**. Original frozen-v1 files remain byte-for-byte unchanged.

## DEV03 decision

Exact source: “Pay HKD 2800 to unlock the next tasks and withdraw your commission.”

| Field | v1 | v2 |
| --- | --- | --- |
| actor / verb / polarity | applicant / pay / requested | unchanged |
| resource | personal_money | unknown |
| mechanism | task_recharge | unclear |
| expected_guidance | pause_requested_action | clarify_before_action |
| critical_unknowns | none | resource/funds unknown |
| required_independent_question | personal-payment verification | Does this payment have to come from your own money, or will the company provide the funds? |

The source states a payment condition but does not state ownership/origin of funds. Keep the payment request and unlock/commission wording visible; do not infer personal_money or treat unknown as safe. Mechanism unclear is required for compatibility: current contract 2.0.0 permits task_recharge only with personal_money. An action-linked blocking resource unknown makes the existing policy select clarify_before_action. No schema, enum or policy is changed. “Payment request present” is the existing actions entry (pay/requested), not a new claims kind. The unlock/commission statement remains unverified input context.

The exact UTF-16 citation E1:0:67 and canonical input SHA-256 c84b12f1edafe0bd867407320f4162c6bd5e6f244e4e329338a902ee80eaab8f are preserved. All other 17 cases keep their prior judgments; all 18 inputs, grouping, partitions and primary variants are unchanged. Split frozen_utc records this new version's freeze; variant_id=v1 still names the unchanged source variant, not the annotation version.

## Actual decision evidence

The Design member explicitly accepted unknown funds + clarify and keeping v1 immutable in this Codex chat, then authorized uploading v2 (“你上传一下标注冻结v2”). [DASE's issue #3 receipt](https://github.com/andershua2022/OfferAnchor/issues/3#issuecomment-6165980821) records the aligned direction and defers the risk-score, keyword-only high-risk and 24h/72h escalation proposals. AI/DS's current integration record independently describes unknown / unclear / clarify. See confirmation-record.json and change-log.json for exact evidence and rationale.

Unchanged v1 provenance is inherited: prior teammate adoption was member-reported, and the agent did not witness new independent annotation passes. The DASE comment is a receipt of the decision, not an acknowledgement that DASE imported these new bytes. Communication's new-version review and consumer imports are not fabricated.

## Consumer files and checks

- adjudicated-annotations.csv: shared 23-column format; 28 Design/adjudicated action rows. Only DEV03's funding, compatible mechanism, guidance, blocking unknown, question and rationale change; all rows' adjudication metadata names v2.
- frozen-development-split.csv: shared 12-column format; 18 records, 14 primary base families, 10 control records across six families. New freeze timestamp; other fields unchanged.
- canonical-selected-inputs.json: exact byte copy of v1's public fictional input artifact.
- source-backed-decisions.json: per-case rationale; only DEV03 changes. The older classification on other inherited entries describes their original AI-assisted preparation and does not assert independent gold.
- confirmation-record.json, change-log.json, freeze-record.json, checks.json and freeze-manifest.json: decision provenance, evaluation boundary and exact file identities.
- canonical-action-check-inputs.json / canonical-action-check-results.json: explicitly authored structural projections. These are NOT observed model output or full gold extractions. Claims/promise/contradiction semantics are not fully projected; routes use an empty card list to test the pure policy only.

Actual checks on 14 October 2026: all nine local v1 files matched their Git blobs at sourceDesignCommit; 18/18 compact ordered UTF-8 canonical input hashes matched; annotation/split headers and UTF-16 citation bounds matched; all grouping/primary/control counts were preserved; current AI/DS pure validator and policy accepted 18/18 authored action projections. DEV03 negative controls rejected a missing blocking resource unknown and incompatible unknown + task_recharge. checks.json records the exact module commit. No model calls, frontend or physical-device observations were performed; these self-checks are not independent accuracy or consumer acceptance.

Actual preparation/check commands: python work/prepare-frozen-development-v2.py; node work/check-frozen-development-v2.mjs; python work/finalize-frozen-development-v2.py. The local helpers and module snapshot are not uploaded. Manifest hashes cover exact saved bytes. Do not edit this directory after publication; a further material change requires a new version.

## Handoff and evaluation boundary

Owner/sole primary writer: Design, existing Codex session; START-Design / TEAM-START-2026-10-10; WP06, Communication principal reviewer, CS and DASE consumers. Shared main d6f2f884a40449946a2b6fd98b8d526b3eec8737; documentation 2.2 / contract 2.0.0; D20 financial/account scope unchanged, EXT-01 conditional. Delivery is confined to design/review-2026-10-14/frozen-development-annotations-v2/** on the existing Design draft PR #8. No other role's files are rewritten; no separate executor appeared in Design issue #4.

The DEV03 dispute is **resolved in this Design reference v2**. DASE must actually import/hash-check it, record the exact-version acknowledgement, and update its own development/demo author expectations to clarify_before_action (demo order/role unchanged). AI/DS must rebind its own frozen-reference/integration issue. CS must verify the existing unknown/clarify state in its application. Those owner integrations remain pending.

Keep all 18 development records / 14 primary base families. Do not silently drop DEV03 to improve a percentage. Before actual v2 adoption, retain and disclose old-reference dispute/exclusion status; do not present an overall accepted accuracy. After adoption, evaluate against the declared v2 boundary, retaining every attempted result and its original reference/build/config identity. Reinterpretation of old results is declared separately and is not a new model run. Publishing this label revision alone does not produce an accuracy figure.

This freezes development annotation content/version only. It does not freeze held-out data, release configuration, live content, application release, WP06/WP10/WP11 acceptance or main. No private held-out text, real selected messages, participant identities, credentials or raw model experiments were read or published. No paid calls, deployment or main merge occurred.
