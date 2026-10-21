# Local PDF.js distribution

Version 6.4.299. Unmodified pdf.mjs and pdf.worker.mjs from the official pdfjs-dist npm package. SHA-512 integrity of the downloaded package: sha512-AVl138zALtfaAPvADulE0PZThbYzCBS79nL4pOSL/6Sm/4AH5A21BD9VHt97OlCuzJuCpmeZtAtkinisF4Vb1g==. License: Apache-2.0, included as LICENSE and assets/PDFjs-LICENSE.txt. Source: https://github.com/mozilla/pdf.js; package: https://www.npmjs.com/package/pdfjs-dist.

The preview builds a separate local assets/pdf-local.js from src/pdf-local.ts. The worker is loaded from an in-memory blob of the pinned worker source, without a CDN. Only text extraction is exposed; no document links, actions, scripts or rendering are executed. The wrapper is our source, not an upstream modification. Lazy loading keeps the large parser out of the normal homepage startup. Runtime tests cover Windows Chrome on file and HTTP origins; wider PDF/text-encoding/browser support is not claimed.

The canonical wrapper frontend/workspace/pdf-local.ts also renders at most two scanned/mixed pages for optional consented cloud text reading. Rebuild with npm run build:readers; upstream vendor modules and Apache license are unchanged.
