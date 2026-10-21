# Functional API and client review

The plain `/check` page accepts a contract 2.0.0 AnalyzeRequest. Evidence contains
ordered original words; labels, notes and retrieved material are untrusted data.
Do not insert actual passwords, OTPs, full banking identifiers or private records.

| Route | Purpose |
| --- | --- |
| `GET /api/session` | Safe mode/readiness/access status; no keys or remaining count |
| `POST /api/session` | Team code to an HttpOnly demo credential; code is server-configured |
| `POST /api/analyze` | Same source-bound analysis entry as the production product |
| `POST /api/knowledge/ask` | Explicit local-source Q&A with bounded source references |
| `POST /api/research` | Explicit public Firecrawl search; optional/failable |
| `POST /api/intake/image` | Separately consented transcription, not document authenticity |
| `GET /api/account/session` | Verified safe profile, not raw tokens |
| `POST /api/account/start` | Configured Google redirect or email challenge start |
| `POST /api/account/verify` | Eight-digit challenge verification |
| `POST /api/account/logout` | Server-managed sign-out |

Read `contracts/`, `lib/research/contracts.ts` and `lib/api/image-intake.ts` for
exact request fields. The browser adapters call these existing contracts rather
than adding a second extractor. Request origin, size, source/citation and quota
checks remain server controlled.

The complete production product uses a backend-configured team Alibaba provider;
users never enter a model key. In a fresh clone simulation is the default and
arbitrary unregistered text fails explicitly. Fixed examples are disclosed as
fictional, consume no provider allowance and prove no model accuracy.

Core analysis reserves at most two provider requests. Each verified ordinary
account has five AI action attempts in total; auxiliary paid tools share that
allowance. A failed reserved attempt can count. Shared global limits also apply.
No credentials, demo codes, mail settings or account data are distributed here.

`frontend/workspace/portable-record.ts` exports/read-validates the bounded portable
ZIP. Reimport restores source material, never trusts an old answer or triggers a
model automatically. The plain client's Download review JSON is an inspection
receipt, not the full product portable ZIP workflow. Text/DOCX/PDF reader adapters
are included; image transcription still requires explicit consent and configured
services. No cloud query history is implemented.
