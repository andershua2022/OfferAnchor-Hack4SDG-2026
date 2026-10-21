# 04-annotation-draft.csv — status banner

**This file is a DASE draft only.**

- Source: `authorExpectations` in `evals/student/development-cases.json` plus contract enum vocabulary.
- **NOT** independent gold annotation.
- **NOT** observed model output.
- **NOT** to be copied into `model-results-template.csv` observed-result columns.
- Communication must independently annotate (second-annotator path).
- Design adjudicates disagreements and freezes gold.
- `annotator_id=DASE-draft`; `annotation_round=independent_draft`.
- `adjudicator_id`, `adjudication`, and `frozen_text_sha256` are intentionally empty until freeze.
- `citation_ranges` use `E#:0:N` where N is the UTF-16 code-unit length of the cited evidence string (LF-normalized as stored in the JSON). Freeze reviewers must re-verify offsets against the frozen normalized text (especially DEV11 / DEV12 / DEV18).

Do not treat blank companion templates as zero scores, passes, or N/A.  
Do not invent participant counts, pass rates, or partnerships from this draft.
