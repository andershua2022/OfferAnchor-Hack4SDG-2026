# Image and document intake: current local implementation

Recorded **17 October 2026**. Canonical source: OfferAnchor. This is a local development extension, not a public deployment, independent accuracy study or organizer acceptance. Baseline 2.2 and analysis contract 2.0.0 are unchanged.

## How to use it

Open http://localhost:4330/check and refresh if an old build is cached. Use the paperclip to attach a file. TXT, Markdown, DOCX and text-only PDF are read on the device. Short readable text is ready immediately; an additional typed message and a confirmation click are not required. You can still open the chip to inspect, redact, edit or change its source type.

For PNG, JPEG, WebP or up to two scanned/mixed PDF pages, open the chip and select Read image / Read PDF pages. The separate confirmation discloses whole-image processing by Alibaba Cloud China (Beijing). Selection alone never sends a file. After successful clear transcription, choose Check request; extra typed context is optional. Manual entry is always available. Long, unclear or empty text must be reviewed before checking.

Chips remain visible after checking. Each attachment maps once to a stable evidence ID; retrying does not duplicate it. Removing a committed chip removes its evidence and retires the result. Originals stay only in page memory, are not included in saved history, and are released on clear, replacement, sign-out or leaving. Extracted words can appear in a deliberately copied/printed report.

## Models and boundaries

- Images: server-selected **qwen-vl-ocr-2025-11-20**, official team Alibaba Cloud Beijing credentials. It transcribes text, not job safety or document authenticity.
- Core interpretation: existing **qwen3.8-max / extract-v2.11**, same team server credentials. The local default retains JSON Object mode. Users never enter model keys.
- Files: browser decoders plus pinned PDF.js and the existing DOCX reader; no model charge for local text conversion. Mixed/scanned PDFs render every page locally, at most two, to avoid silently dropping image-only content. DOCX embedded images are not recovered.
- Knowledge: existing approved collection and cited passage retrieval first. Optional public search remains explicitly requested, skippable on failure, and does not receive an attachment automatically.

The new server adapter source-constraints-1.0.0 narrows the provider's requested schema from actual source kinds/sequences: an instruction-only input cannot invent an advertised duty; same-source evidence cannot become earlier/later comparisons. Genuine multi-source comparisons remain possible. The canonical semantic and uniqueness validators remain unchanged. The frozen AI producer bytes/hashes were preserved. Alibaba strict-mode preparation omits unsupported uniqueItems only from the provider copy; strict mode is not the active default and still needs a successful real acceptance check.

## Privacy and limits

The image API **POST /api/intake/image** accepts one strict image-intake-1.0.0 request: requestId, explicit consent and inline PNG/JPEG/WebP data. No filename, external URL, client-selected model or arbitrary extra field. Browser re-encoding removes original metadata; original PDF bytes are not uploaded. The entire visible image/page still leaves the device after consent. Redacting later text cannot undo this. Do not claim absolute privacy or zero provider retention; crop/redact before sending, never include an actual password/OTP, and use synthetic/redacted development material.

The endpoint shares origin protection, signed demo access, reviewed-content gates, one in-flight cohort request, five paid attempts per ten minutes and the process-wide thirty/hour limit with existing model tools. Failures count; no automatic retries or model switching. Limits are in-memory/single-process and do not establish safe public-scale deployment.

File limits: four attachments, 5 MB each, 15 MB combined. Text-only PDF: ten pages maximum. Scanned/mixed PDF: two pages, one OCR call per page. Encoded image: 2 MB maximum, 4,194,304 pixels, no animation. Final evidence: 4,000 UTF-16 units per source, 12,000 total, eight allocated IDs. No silent truncation. OCR timeout is bounded; interrupted/removed attachments cannot activate a stale result. Quotations match extracted/edited text, not guaranteed image pixels.

## Knowledge coverage audit

The configured collection contains **seven approved cards, four approved routes and nine public sources**. The cards cover task recharge, personal borrowing, company-paid controls, payroll versus account access, missing payer, already-acted next steps and ordinary work expenses. A 21-query local audit retrieves the appropriate approved card in English, Traditional Chinese and Simplified Chinese for each topic. Simplified Chinese aliases were added; approved content itself was not rewritten.

Six source-backed published summaries remain editorial drafts and are excluded from generated answers. This is useful for the current financial/account scope, not comprehensive coverage of employment law, identity-document requests, all job scams or general privacy rights. Coverage checks are exposed retrieval examples, not measured user benefit or an independent RAG benchmark. Existing bilingual content approval is documented separately in [the approval record](content-review-2026-10-17.md).

## Observed verification and unresolved issue

The fresh offline run passed **102 integration tests and 80 AI/component tests**. Type checking and application build passed. The existing workspace browser regression and new attachment browser checks cover file-only input without mandatory confirmation, retained chips, no duplicate evidence, deletion, oversized/unclear input, selectable and scanned PDFs, consent before image calls, desktop and 390px no overflow. The image boundary rejects unauthenticated/foreign requests, remote URLs, MIME mismatch, oversized dimensions, truncation, provider errors and exhausted shared quota. Browser OCR responses in these regression checks are disclosed mocks.

Two **real synthetic-image OCR requests** succeeded in about 1.10s and 1.00s. Amounts, own-fund wording, refund promise and the normal-control prohibition were preserved in these two examples. Usage total: 1,314 input and 66 output tokens. These two successes do not establish OCR accuracy across screenshots, handwriting, Cantonese or complex documents.

The resulting core check and one explicit diagnostic both failed chronology validation because the model invented a same-source advertised-duty comparison. One final strict-mode call was rejected by the provider. A later read-only review of the official audit logs established **Arrearage** for that call and the subsequent one-call hardening recheck. The earlier attribution to uniqueItems was only an inference and is corrected here. The official strict subset independently rejects uniqueItems, so that incompatibility was patched offline; it was not established as the cause of these HTTP refusals. Normal JSON Object mode remains configured.  **The repaired attachment-to-core path has not yet passed a fresh real model check.** Do not present it as a proven end-to-end success or replace the failure with a fixed example. A failed reading remains incomplete and cannot export; attachment text is kept for review. No further paid attempt was made in this task.

Task calls: **two OCR + three core attempts**, all synthetic, no held-out or real user records, no automatic retries. Original failures and private receipts remain in ignored .local-data/intake-oct17. No key, raw private record or receipt is published. Independent semantic evaluation, actual user acceptance, product cloud accounts/history, SMTP and public deployment remain pending; they are not claimed complete by this extension.

## Reproduce without spending model credit

    npm run typecheck
    npm run test:all
    npm run build
    npm run test:workspace-browser
    npm run test:attachment-browser
    python -X utf8 tools/verify-project.py

The attachment browser command expects the local application at localhost:4330 (override INTAKE_TEST_ORIGIN if needed) and mocks OCR/core responses. It makes no paid provider request. npm run build:readers reproducibly bundles the local PDF wrapper from the pinned licensed vendor files; it also runs before the application build. A known upstream import.meta warning concerns PDF.js's unused Node branch in the browser bundle; actual Chrome local text extraction and scan rendering were exercised. Installed Node/npm differ from the repository-pinned engines; the pinned toolchain remains the team's target.

## Official references

- [Alibaba OCR API](https://help.aliyun.com/zh/model-studio/qwen-vl-ocr)
- [Model pricing](https://help.aliyun.com/zh/model-studio/model-pricing): Beijing pinned OCR is CNY 0.3 input / 0.5 output per million tokens, not a fixed image charge. The two OCR calls nominally total CNY 0.0004272 before billing rules and excluding core calls; this is a calculation, not an invoice observation.
- [Structured output](https://help.aliyun.com/zh/model-studio/qwen-structured-output): strict-mode supported keyword list explicitly rejects uniqueItems. Full application validation still enforces uniqueness.

## Later authentication/hardening checkpoint

The canonical local origin is now http://localhost:3000; localhost:4330 redirects there. One additional synthetic core recheck also returned provider_error, which the official audit log identified as Arrearage. No generation succeeded in that recheck. Live paid tools are now held with MODEL_CALLS_ENABLED=false to avoid repeated failures, while local file reading, Learn, fixed examples and account sign-in remain available. Billing must be resolved by the account owner before live revalidation. See [authentication and release gates](authentication-2026-10-17.md).
