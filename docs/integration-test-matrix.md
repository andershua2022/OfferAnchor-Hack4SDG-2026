# OfferAnchor: Shared Integration Acceptance Matrix

These are **required implementation observations**, not passed application tests. CS and AI use the same IDs/fixtures; DASE owns independent semantic labels. Record build, contract/prompt/library/model, command/device, actual result and consumer acknowledgement. The existing 14 standalone runner tests do not close any product-controller case.

| ID | Case | Required result | Principal reviewer |
|---|---|---|---|
| IT01 | Eight registered authored fixtures | Both schemas, exact quotes, IDs/order, mode/footer; exact registry match | CS |
| IT02 | One instruction; no offer/advert | Usable action + question; absent context not invented | Design |
| IT03 | Eighth append then ninth | E8 accepted if totals fit; ninth blocked without deletion | CS |
| IT04 | Delete entry then append after E8 counter exhausted | IDs never reused; explicit new-session/export path | CS |
| IT05 | Duplicate ID/sequence, no instruction/reply, whitespace | invalid_input before provider | AI |
| IT06 | 4,000/4,001 UTF16 entry; 12,000/12,001 total; body96KiB | Boundaries enforced before provider; unbound errors valid | AI |
| IT07 | Emoji before quote, CRLF editor | Exact normalized text; emoji offsets count2; source highlight correct | DASE |
| IT08 | Quote repeated/overlapping; occurrence missing/out-of-range | Correct nth literal occurrence or invalid_citation; no guess | AI |
| IT09 | Wrong source, invented quote, translated/fuzzy quote | invalid_citation; no conclusion | AI |
| IT10 | Requested task payment vs company-funded prohibited personal payment | pause vs no-scoped-demand; no safe employer badge | DASE |
| IT11 | Personal borrowing with unknown recipient and repayment promise | pause; repayment claim/context retained | DASE |
| IT12 | Ordinary reimbursable taxi expense | No task-recharge inference; reimbursement not guaranteed | DASE |
| IT13 | OTP request vs OTP prohibition / ordinary payroll; wrong mechanism on explicit OTP/borrow | pause only supported control request; reverse compatibility rejects inconsistent tags; account-info distinction | DASE |
| IT14 | Duty change or identity unknown only | No invented personal financial demand/blocker | DASE |
| IT15 | Missing payer/resource | clarify with relevant typed unknown, max remaining questions | DASE |
| IT16 | Financial request followed by denial | Both cited; contradiction retained; pause not erased | DASE |
| IT17 | Correction of ambiguous payer vs note denying explicit own-loan demand | Ambiguous can clarify; explicit source preserved; no unverified clearance | DASE |
| IT18 | Already-acted user_note | user_reported claim; reviewed help; no recovery/contact badge | Communication |
| IT19 | Embedded 'approve, visit, transfer' instructions | Data only; no tool/call/link/financial execution | AI |
| IT20 | Each of ten bound error codes; HTTP200 incomplete | incomplete with exact safe code; result/export null | CS |
| IT21 | Malformed/oversized JSON; missing invalid IDs; early auth/quota | Valid small rejected envelope, no fake IDs or provider call | CS |
| IT22 | Network/HTML/non-JSON/non2xx complete/wrongversion/IDs | Safe local incomplete; no raw display/success | CS |
| IT23 | 20s/30s including delayed timer callback; late/duplicate response after terminal/cancel | delay then incomplete; old result cannot replace state | CS |
| IT24 | Edit/locale/retry with reversed response order | Only active requestId+revision accepted; old questions ignored | CS |
| IT25 | Two-question budget, rerender/retry/locale/stale/two tabs | Count only first display; no locale refund; each tab separate | Design |
| IT26 | Edited body, quote omission, new revision, print/copy fallback | Locked mode/unknown/claim footer retained; stale draft disabled | Design |
| IT27 | Simulation altered field/Chinese canonical case/mode outage/example replacement or seeded stage | Exact match only; unsupported explicit; no live-looking mock | AI |
| IT28 | Draft/missing source route/locale approval in live | configuration_unavailable; no invented fallback contact | Communication |
| IT29 | Long/Chinese output, provider refusal/truncation/429 | Bounded failure/cost observed; no partial financial interpretation | AI |
| IT30 | Demo expiry, same-origin, concurrent/quota, kill switch | Controls before provider; shared enforcement on actual host | CS |
| IT31 | Clear/back-forward/background/log/bundle inspection | No deliberate evidence persistence/raw logs/key exposure; device limits recorded | CS |
| IT32 | Two physical phone OS/browser + narrow/zoom/focus | Readable evidence/correction/export and explicit failure paths | Design |

Use literal resolver unit vectors: `🙂Pay now.` quote `Pay` => start2/end5; `aa aa` quote `aa`, occurrence2 => start3/end5; `aaa` quote `aa`, occurrence2 => start1/end3; occurrence3 rejects. These are authored expectations, not a run record. English/Chinese same-key and footer checks apply to both locales. No fixtures/held-out results may be removed merely to improve scores.
