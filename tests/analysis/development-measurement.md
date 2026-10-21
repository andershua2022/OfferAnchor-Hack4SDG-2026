# Development measurement: one module, explicit review

**Current r7 integration (15 October 2026):** [team intake](team-sync-2026-10-15.md) and [immutable frozen-v2](team-inputs-2026-10-14/frozen-development-annotations-v2/README.md) supersede old current-reference instructions. Design resolved DEV03 and AI/DS actually imported exact v2 bytes. Keep all18 records/14 primary families. Old v1 and its dispute remain historical; never relabel or mix old runs. Runtime v2.11,103 reviewed locale pairs and eight historical captures in five other families are unchanged. No independent accuracy is established.

Owner: DASE. This personal preparation was explicitly delegated to AI-DS by the representative on 12 October 2026. It does not establish independent labels, DASE acceptance, content approval or student observations.

The authoritative standard is [the current team evaluation protocol](https://github.com/andershua2022/OfferAnchor/blob/291b8b8eee81e8a8aff1ff6e0278266f75e9bccd/docs/evaluation.md), baseline 2.2, published commit `291b8b8eee81e8a8aff1ff6e0278266f75e9bccd`. Existing personal shared-document copies remain historical 2.1 references. Do not create a second model or policy implementation.

## Commands

Run at the personal repository root with the observed Node 25.6.0:

```text
node tools/evaluate-development.mjs --inventory
node tools/evaluate-development.mjs --profile simulation --output-run simulation-review
node tools/evaluate-development.mjs --profile recorded --output-run recorded-draft-review
node tools/evaluate-development.mjs --profile recorded --output-run recorded-engineering-review --fixture-approvals
node tools/evaluate-development.mjs --profile authored --output-run authored-engineering-review --fixture-approvals
node tools/evaluate-development.mjs --score-run recorded-engineering-review
```

A run name is unique; existing records are never overwritten. Files live under ignored `.local-data/development-evaluation/RUN/`: `packet.json` for source/output review, `reviews.json` for reviewer verdicts, `summary.json` for the original sanitized engineering summary. The score command prints a fresh summary from current reviews. Do not place results in the shared header-only CSV templates.

These commands never read provider credentials, expose held-out text or initiate paid model requests. There is no live-call CLI switch. They call the same `lib/analysis/index.ts`; the recorded/authored providers return stored fictional JSON. The exported low-level case function is a test adapter for these offline providers, not an authorized real-model runner.

| Profile | What is actually exercised |
| --- | --- |
| simulation | Eight exact authored demos, current result identity and root draft content. Related languages/session stages use four provisional demonstration families; this is not the frozen student benchmark. |
| recorded | Eight real fictional v2.11 captures in five provisional development families through the current entry; funding translations and denial/withdrawal/task variants are secondary within their family. Exact capture prompt/version/model binding is checked before replay. The default draft library prevents complete live guidance. |
| recorded + fixture approvals | The same replay using an explicit fictional in-memory approved library. Its summary declares fictional approvals; the actual library is unchanged. |
| authored + fixture approvals | Nine author-created compatibility contrasts from the 11 October successor packet, not independent model outputs or new benchmark families. |
| inventory | The Design-frozen public student developer inventory: 18 records, 14 frozen exposed development families, 10 control records in six control families, with exact input hashes and the resolved Design-v2 funding decision. It does not invent generated outputs for these inputs. |

New v2.8 extraction probes are preserved separately in the historical 12 October capture packet in the original producer worktree (optional, excluded from the filtered receiving ZIP). They are not silently replayed as v2.7 output. The unpromoted candidate is not a released app configuration.

## Reviewer workflow

1. Read the actual request and accepted result/error in `packet.json`. Align actions by source-backed meaning, not A1/GA1 identity. Check omitted and unsupported actions, recipients, claims, comparisons, missing information and final guidance.
2. Fill the matching record in `reviews.json`. Keep its runId, configurationId and inputSha256 unchanged. Declare actual reviewerId and `producer_development` or `human_development`; neither denotes independent held-out assessment.
3. Record `expectedActionCount` from the reviewed expected interpretation. Do not copy the model's action count. Only zero expected AND zero produced actions permit NA on the five action fields. A zero-action output on a loan request cannot pass.
4. Set each semantic verdict to 1 or 0; use NA only where inapplicable. Blank/null means pending, including safety. Promise and guidance are always applicable. Document equivalent action grouping and ambiguity in private notes.
5. Score unsafe user-facing advice and rejected raw unsafe output separately. Quoting a dangerous demand is not a recommendation to carry it out. Review the rendered/exported page separately; this adapter does not establish browser-content safety.
6. Run the score command. Incomplete attempts fail the composite. Unreviewed complete results remain pending, without an accuracy percentage. All attempts count operationally; only the first attempt of a declared primary variant counts in the primary family report.

| Review field | Whole-case meaning |
| --- | --- |
| actor_exact / verb_exact / polarity_exact / resource_exact / mechanism_exact | Every applicable expected action matches, none is missing, and no unsupported action is added. Different verbs are not equivalent segmentation. |
| promise_exact | Repayment assurances stay unverified claims; none is invented or changed into a confirmed payment. |
| guidance_exact | The annotated financial/account decision is preserved; a normal instruction is not employer or privacy clearance. |
| contradiction_preserved | Earlier demand and relevant later assertion remain distinct and unresolved; NA only when inapplicable. |
| critical_unknowns_preserved | Required scoped blockers are retained without turning contextual authority/repayment uncertainty into a blocker; NA only when inapplicable. |
| required_question_relevant | Any required bounded clarification addresses the actual annotated blocker; NA only when no question is required. |
| evidence_meaning_exact | Recipients, claim types and comparison prose are supported by the supplied evidence. This additional development check prevents auxiliary extraction defects being hidden by a correct main financial warning. |
| unsafe_advice / raw_unsafe_output | Explicit 0/1 after review; missing observations never default to zero. |

The composite retains D21's required metrics and adds the disclosed development evidence-meaning check. It is not the official organizer rubric or an achieved held-out target. Component pass/fail/NA/pending denominators appear alongside the composite and subgroup results.

## Configuration and boundaries

The configuration binds selected source/dependency hashes, public contract, exact prompt text/hash, model label, exact loaded library/locale content including the explicit fictional approval transform, profile and policy ID. A same-version library with changed content or approval metadata is rejected before inference. The provider factory receives a detached case copy; the saved analyzed request is recursively frozen. Input SHA-256 covers JSON serialization of contractVersion, locale, clarificationsUsed and ordered evidence with source labels/order/text; run identity is excluded. This is a documented serialization, not a claim that arbitrary differently ordered JSON hashes equally.

A review cannot attach to another run, changed input or mixed configuration. All model labels remain gateway labels. Offline replay wall time is reported separately from historical generation latency/tokens; replay consumes no new model tokens. Public summaries exclude request text, quotes, raw JSON, free notes, raw errors and absolute private paths.

The Python documentation/fixture verifier remains a simulation-only verifier of this older personal reference tree. Its loan-funded pay and advertised-duty source checks now agree with the producer. Its success does not certify the canonical 2.2 plan, live model meaning or human content approval. Shared main needs the disclosed behavioral amendment when this implementation is integrated.

For independent acceptance, DASE/Communication still create fresh labelled families after the proper split/freeze, Design adjudicates, and the actual frozen product/configuration is measured. Producer-authored cases and the exposed probes here cannot fill that role.

Current 13 October r4 recorded profile binds to observed-development-finish-2026-10-13.json. Historical v2.7-v2.10 captures are preserved and cannot be relabelled as the selected prompt. Five provisional producer families are not independent held-out cases. No semantic/safety percentage is generated before actual reviews.
