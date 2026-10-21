# WP06 implementation supplement

Draft version Design-WP06-20261013-r2; documentation 2.2 / contract 2.0.0. Principal reviewer Communication; consumers CS and DASE. This supplements docs/ux-spec.md without replacing public/internal contracts. Human wording review and consumer acknowledgement remain pending.

## Reading the state/control/locale map

`state-control-locale.csv` specifies 27 visible states/overlays, controls, transitions, focus and export rules. These are UI descriptions of the existing reducer contract; they do not introduce 27 new API statuses. Backend run states remain editing/processing/delayed/complete/incomplete. No frontend exists in the reviewed repository.

`locale-inventory.csv` maps each stable key to both draft values and origin. The two locales contain 103 identical keys and matching placeholders. Existing 72 key identities are retained. Existing-value proposals are from PR6's unmerged r3; 31 new UI keys supply previously missing controls/errors within the existing domain. Existing locale groups are retained. CS must consume one accepted locale version, rather than combine prototype text with a private copy list.

## Entry and source management

Order: product promise, current-coverage notice, visible simulation/live handling, privacy handling, latest-instruction label/textarea, field counter, Analyse, optional context, source list and Clear. Latest instruction is the only required content; no mandatory login, advertisement, screenshot or full chat. Optional source kinds use existing contract kinds; correction/clarification/outcome are purpose-labelled user_note, not new API kinds.

Limits are after LF normalization: at most eight sources E1–E8; 4,000 UTF-16 units each; 12,000 total; source label 120; transport body 96 KiB. Reject whitespace-only required input, unpaired surrogate and excess bounds before a paid request. Retain text and show field errors plus a linked summary; no truncation.

A deliberate add/edit/delete/reorder/note/reply/locale event increments revision, invalidates result/body/footer export, aborts the old request best-effort and retains the question count. Stable IDs are never reused after deletion; recompute contiguous sequence values only. An unused slot count does not permit append once nextEvidenceId exceeds E8. Deleting the only instruction leaves the required-input error; no analyse request may start. Clear/new-example is a deliberate new session and resets counters according to the existing integration contract; ordinary editing does not reset them.

## Results, citations and questions

First result: exact guidance statement, actor/action/resource, current source quotation, selected claim/unknown boundaries, one application-owned independent question and compact coverage notice. Expanded evidence remains available. Pause applies to the supported scoped action, not a verdict on the whole employer. No-scoped-request is never presented as safe, verified identity or privacy clearance. Claims and reported outcomes keep their status.

A quote click opens the original source and highlights the exact UTF-16 end-exclusive range. Source text and language remain unchanged. UI copy explains the highlight plainly; offset numbers are external developer notes. Close/back restores the originating quote control. No fabricated quotation appears when no action or claim supports one.

The two displayed model questions are tab-local. Count only on an accepted current response, once, using the existing semantic dedupe key; never on rerender/duplicate/stale output. Existing consumed allowance survives retry and revision/locale changes. At exhaustion, unresolved unknowns remain and adding user notes/replies is still available. The independent question is a distinct deterministic next step, not a third model clarification.

## Correction and reply

Source edit changes the source and invalidates the previous analysis. Interpretation correction appends a labelled user_note while preserving the original quotation. Both reanalyse the full current source set. Later reply also appends, preserving earlier sources; a later denial does not erase an earlier supported demand. A note reporting contact or completed action is a user report, not confirmation, recovered funds or delivered message.

## Processing and errors

Immediate processing → delayed at 20 seconds → timeout incomplete at 30 seconds. Cancel is a distinct terminal incomplete reason. Both retire active identity and remove export availability. Manual Retry starts immediate Processing with fresh request ID/current revision; never skip straight to Delayed or Timeout. Deadline uses elapsed time, including background/resume, even when timers are late.

Map all existing error codes to errors.*. Show safe allowlisted reasons only. Retry is controlled by the response retryable flag and applicable access/configuration gates. Invalid input goes back to local fields; unsupported simulation offers an unchanged named fixture. No automatic retries or fixture success for arbitrary edits. Raw provider/fetch exception text never enters the UI.

## Brief, quote selection and immutable footer

Brief body is editable; protected footer is a separate noneditable application-owned field. Editing body marks it user-edited without awarding evidence verification. The Include supporting quotations control uses brief.includeQuotes and may hide full passages/identifiers; it cannot hide claim/source/uncertainty/provenance limits. New evidence revision or locale change discards the edited draft.

Export requires a current complete response bound to the accepted request ID/revision/locale. The same renderer string is used for clipboard, manual fallback and print. Success is announced only after actual clipboard resolution; fallback exposes the complete selectable body/footer and retains keyboard access. Print includes every footer field and does not hide uncertainties. Copying the short independent question retains the same essential protected fields, with a shorter body only.

Protected fields: product, documentation baseline, contract, accepted revision, live/simulation mode, preparation from selected material, employer identity/repayment/external-events unverified, unresolved checks, user-report/claim boundary, edited-body flag and financial/account coverage limit. A previously exported copy cannot be recalled. Copy/print/route clicks never create a contact or verification state.

## Focus, touch and responsive handoff

Phone specimen width 390 is a layout example; actual UI adapts to available width and respects 200% zoom. Body text target 16px/1.5; minimum touch targets 44px with spacing; visible focus and guidance text as well as color. All critical actions remain reachable while content scrolls.

After failed submission, focus a labelled error summary with links to the invalid fields; retain field-local messages via described-by relationships. Do not move focus on every blur. Dialogs initially focus the heading or least-destructive action, trap focus while open and restore the trigger on close. Submit results focus the result heading once; delay/status announcements do not steal focus. Editing preserves the caret. CS owns actual accessibility semantics and implementation.

## Figma continuation

Saved file: https://www.figma.com/design/Tc5HRMglvbunLYvZ0hrdGa . 32 authored phone screens, partial. Correct EN10 Cancel to a distinct Cancelled specimen; correct EN11 Retry to immediate Processing; add the pending exhausted/reverse-language states; draw language and quote controls; replace technical source-view copy; inspect all new screens/footer/component sizing. Local SVG supplements explain the intended controls, but have not been written into Figma.

Known wrong Figma links must not be implemented by CS. The state CSV and public/internal contracts govern intended behavior until the canvas is corrected and reviewed.
