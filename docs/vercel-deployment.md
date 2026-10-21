# Vercel deployment and shared runtime state

Current status: v24 is READY at https://offeranchor-hk.vercel.app, with guarded trial tools enabled and a five-action lifetime account allowance. Public visitor/example/download/login-entry and one synthetic live HTTP check passed. Earlier owner-confirmed Google/email sign-ins remain provider-login evidence. [Current evidence and limits](trial-release-2026-10-18.md) is authoritative; initial infrastructure records below are historical.

## Implemented runtime and observed verification

[The server adapter](../lib/server/shared-state.ts) calls one bounded RPC, defined in [the additive migration](../supabase/migrations/20261018_runtime_state.sql). Authentication continues to use the publishable-key Supabase SSR client. A separate server-only key authorizes runtime coordination; it is never sent to the authentication client or browser.

On 18 October, the private verifier used two independent adapters against the actual Supabase RPC under a fixed synthetic `.invalid` origin. **34 checks passed across 61 HTTP requests**, completed at 03:01:52 UTC. The receipt covers:

- Cross-adapter challenge creation and claim, busy denial, revocation of an in-flight claim, consumption and replay denial.
- One concurrent request per cohort, exactly two concurrent requests globally, and idempotent release.
- Weighted reservations of two plus two plus one calls; a further reservation is denied. The thirty-first global call is denied after thirty reserved calls.
- Database rejection of an unknown operation, denial of privileged RPC execution with a publishable key, and denial of public access to the four private tables/schema.

No sign-in email, model request or real user record was used. The first connection attempt without the existing Windows proxy failed before an HTTP response and stopped immediately. The successful run inherited that proxy only in its child process and used HTTPS CONNECT; it did not edit environment files. Private receipts remain under `.local-data/launch-fix-oct18/` and are excluded from deployment. These checks establish the observed database behavior, not an actual Vercel deployment, hosted sign-in or model accuracy.

## Configuration and storage

Loopback development may use `RUNTIME_STATE_MODE=local` and the existing bounded in-memory implementation. For a live Vercel or other remote HTTPS host, set:

| Variable | Purpose |
| --- | --- |
| `RUNTIME_STATE_MODE=shared` | Select the shared RPC explicitly |
| `SUPABASE_URL` | Existing official project endpoint |
| `SUPABASE_SERVER_KEY` | Dedicated server-only secret; never a `NEXT_PUBLIC_*` variable |
| `SUPABASE_PUBLISHABLE_KEY` | Separate publishable key for the ordinary auth client |
| `APP_ORIGIN` | Exact stable HTTPS application origin |

Remote live operation cannot bypass shared storage by selecting local mode. Missing configuration, a failed reservation or an uncertain RPC response prevents outbound paid work; no local fallback or automatic retry is used. The adapter fixes the project RPC endpoint, rejects redirects, bounds JSON to 4 KiB and uses a two-second deadline. Modern secret keys use the `apikey` header; only a legacy service-role JWT additionally uses JWT authorization.

All production workers must share the same origin and session/access-code configuration. Quota scope is derived from `APP_ORIGIN`; a different preview origin has a separate scope. A fresh cookie with the same configured origin and access code does not replenish its cohort budget.

The original four tables in `offeranchor_private` hold temporary operational state. The additional [account-trial migration](../supabase/migrations/20261019_account_trial_quota.sql) is now applied and adds a server-only trial_account_quotas table holding only a server-derived account hash and cumulative count. This lifetime counter has no daily TTL and is not removed by the temporary-state cleanup:

| Table | Stored state and expiry/cleanup |
| --- | --- |
| `challenges` | Email, opaque challenge ID, attempts and verification claim; no OTP. Challenge expires after ten minutes; claim expires after sixty seconds |
| `auth_events` | Send/verification timestamps and hashed email cooldown identifiers; eligible for cleanup after one hour |
| `paid_windows` | Cohort/global usage and demo-access counters; eligible for cleanup two days after the window anchor |
| `paid_leases` | Weighted reservation ID, cohort and release state; sixty-second concurrency lease, replay-protection row retained until one day after expiry |

Expiry immediately makes an expired challenge/claim/lease unusable. **Physical cleanup runs on the next RPC request**, rather than at the expiry instant; inactive records may remain until a later request. The private tables contain no selected job material, original attachments, OTPs or account session tokens. The public-schema RPC is executable only by `service_role`, uses an empty definer search path and serializes this bounded pilot's transactions. Cloud job history and sync are not implemented.

Default paid limits remain five provider calls per cohort per ten minutes, one in flight per cohort, thirty calls per hour globally and two globally in flight. Failed attempts count. A model adapter declaring two requests per extraction reserves two calls before extraction; OCR, search and knowledge answers reserve one each. Application limits supplement the provider account's own rate and spending controls.

## Vercel project settings

For this synchronization branch only, [vercel.json](../vercel.json) disables automatic Git deployment of sync/released-trial-20261018. No production environment or project setting was changed. The exact-branch setting follows [Vercel Git configuration](https://vercel.com/docs/project-configuration/git-configuration); other branches retain their existing behavior. GitHub deployment/hook records were empty during this sync, so they do not by themselves establish Vercel account settings.

**Historical infrastructure preparation follows:** the earlier project/PAT/no-code observations predate the READY release recorded at the top of this document. They must not be treated as the current deployment state.

Import the canonical source into a Next.js project. Use the repository root, `npm ci --include=dev --cache .local-data/npm-cache --no-audit --no-fund` and `npm run build`; retain the lockfile and build-time development dependencies for the local reader bundle. Use Next.js default output settings. Vercel provides a stable `vercel.app` address, so a purchased domain is not required.

A Vercel project named offeranchor with free domain offeranchor-hk.vercel.app and 23 encrypted production variables exists in the andershuang2022-8069 workspace; no application code has been deployed. The current project-scoped one-hour PAT returned HTTP 403, and the CLI deployment path is unavailable. Do not create a broad-scope token to work around this; use an authorization path limited to this Vercel project.

[The deployment exclusion file](../.vercelignore) excludes environment files, private local captures/data, Git metadata, installed dependencies and generated build/test output. Host secrets are configured separately; never upload `.env.local`, cookies or private receipts. Node 24.x was observed in the Vercel project browser metadata; this is not a deployed build or runtime check. Confirm the host's selected Node major; Vercel does not guarantee this project's exact local patch version.

All nine Node API routes declare a duration: /api/analyze is 90 seconds; the other eight routes are 60 seconds. The current budgets are 50 seconds for a model request, 53 seconds for the server handler, 58 seconds for the browser wait, and 20 seconds for delayed work. The 60-second shared paid lease covers the 53-second server budget, up to 2 seconds to reserve and 2 seconds to release (under 60 seconds total). No automatic retry is used. Team provider credentials remain server-only; the current qwen3.8-max extract-v2.22 / source-context-roles-1.0.0 candidate remains under real-acceptance quality hold, with no automatic fallback and at most two model requests per extraction. This runtime update does not reactivate private gateway keys. Node is required for dependencies including sharp. The image route's 3 MiB JSON limit is below Vercel's 4.5 MB payload ceiling; check the encoded payload on the actual host. Local document conversion does not add an original-binary upload or arbitrary-URL input to the analysis contract.

A simulation-only preview needs no runtime database or provider secrets. Leave account configuration absent for that preview so it does not advertise working remote login. Live activation still follows the separately recorded model/release decision.

## Actual-host acceptance still required

1. Set the exact stable `APP_ORIGIN` and required server variables on the host. Add its precise `https://<actual-host>/auth/callback` to the existing Supabase redirect allowlist. Keep Google's provider callback at the existing Supabase callback URL; do not allow arbitrary preview hosts.
2. Confirm that hosted requests use the shared store and handle missing configuration or a store outage by refusing the operation. Preserve normal provider limits and the configured sender; SMTP credentials stay in Supabase.
3. Complete Google sign-in and the latest eight-digit email-code sign-in on that host, then verify sign-out and refreshed cookies without recording codes or auth URLs. The owner's earlier local sign-ins are separate evidence.
4. Exercise a prepared journey and an approved synthetic live request. Confirm current-revision-only export, language continuity, source preservation, safe failures and the hosted OCR/search boundaries.
5. Record the actual host origin, deployment revision and results. Keep a labelled prepared fallback; do not infer model accuracy or independent content acceptance from infrastructure checks.

## Official references checked 18 October 2026

- [Automatic deployment domains](https://vercel.com/docs/domains/working-with-domains)
- [Function duration, payload and runtime limits](https://vercel.com/docs/functions/limitations)
- [Supported Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
- [Backend hosting and external persistent state](https://vercel.com/docs/frameworks/backend)
- [Supabase API key types and handling](https://supabase.com/docs/guides/getting-started/api-keys)
- [Database function privileges](https://supabase.com/docs/guides/database/functions)
