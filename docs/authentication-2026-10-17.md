# Product authentication: 17 October 2026

**Current team guide — 18 October:** Read [current product and shared facts](current-product.md) and [released trial evidence](trial-release-2026-10-18.md) first. The live trial uses official team Beijing qwen3.8-max, extract-v2.24 / context-audit-1.4.0, contract 2.0.0 and five lifetime AI action attempts per account. Knowledge/image/optional search and real Google/eight-digit email login are implemented; cloud query history is not. Earlier dated checkpoints below retain their historical meaning.

**18 October current update:** The controlled v24 trial is published at offeranchor-hk.vercel.app. Google/email-code entrances are enabled; earlier real sign-ins were owner-confirmed. The original QQ sender is explicitly retained for this release because the new project mailbox cannot enable SMTP until 1 November 2026, 14:22 Asia/Shanghai. No new email or consent was performed in this release check. [Current evidence](trial-release-2026-10-18.md).

**18 October final local checkpoint:** [Readiness and observed limits](release-readiness-2026-10-18.md) and [plan alignment / bounded model recheck](prelaunch-followup-2026-10-18.md) supersede historical runtime claims below. Essential landing/workspace/login languages are unified. Real local Google/email sign-in is owner-confirmed. Candidate v2.13 was rejected after an unsupported Chinese OTP action and receiver inference; default development profile v2.12 is restored under the unchanged paid-tools quality hold. No public deployment or independent accuracy acceptance is claimed.

## Current checkpoint: 18 October email retry repair

Open the canonical application at http://localhost:3000/landing/index.html, the workspace at http://localhost:3000/check, or sign-in at http://localhost:3000/login. If the service is stopped, open a terminal in the canonical OfferAnchor folder and run `npm run open`. The launcher reuses the existing build and existing Windows proxy settings for its child only. Rebuild after source edits; do not use archived SafePause or an old ZIP as live source.

The representative has confirmed real Google product login and receipt of a deliberately requested sign-in email at a non-team mailbox. QQ custom SMTP is persisted, and the two eight-digit OTP templates and 600-second lifetime are configured. On 18 October the representative confirmed successful eight-digit email-code sign-in and entry into the workspace after the retry repair. These observations supersede the sender-not-configured and Google-unverified statements in historical checkpoints below. No code, mailbox password or SMTP authorization code is recorded here.

The reported repeated “Too many attempts” message came from the local shared limiter: EMAIL_SIGNUP_PUBLIC_ENABLED was still false, retaining a two-attempt/hour test budget, and failed send requests counted. The initial send failure was not recorded with a timestamp or a safe provider reason, so its exact cause cannot be established retroactively. Existing local logs contain two AuthRetryableFetchError entries with status 0; the refreshed 24-hour provider logs contain no matching post-template-change OTP rejection. This supports a transport-failure possibility, not a proven invalid recipient or a permanent provider fault.

For this controlled single-process test, EMAIL_SIGNUP_PUBLIC_ENABLED is now true because actual non-team delivery was personally confirmed. This flag denotes configured sender delivery and the twenty-attempt/hour local budget, not public deployment approval or unlimited delivery; local OTP acceptance is now separately owner-confirmed. The project's observed custom-SMTP budget remains thirty/hour; provider limits remain independent. A clone retains false by default until its own sender is verified.

Every attempted send is bounded, never automatically retried and subject to a sixty-second per-address server cooldown. Locally blocked clicks do not spend another hourly attempt. An exhausted local hour returns the actual remaining Retry-After, rather than always adding another hour. The page follows Retry-After, including failed sends, displays Send in Ns or Resend in Ns, and leaves Google and guest use available. A server-to-provider send has a twenty-second deadline and the browser waits up to twenty-five seconds; other provider calls retain their existing shorter deadline. A timeout remains an unknown delivery result, never proof that an email address is invalid. Wait before one deliberate new send and use only its latest code.

Safe send diagnostics record only fixed reason names and a numeric provider status. Provider error codes distinguish invalid email, unconfigured sender, throttling, network unavailability and other sending failure; no raw provider messages or account existence are exposed. Process-local challenge storage, limits, restarts, single-instance restrictions, model billing hold and production release gates remain unchanged. Restarting invalidates unfinished email requests; request a new code explicitly after restart. No email, paid-model call, Git push or deployment is performed by the automated regression suite.


**Current flow:** Google remains PKCE-based. Email now uses an eight-digit code displayed on the user's phone and entered in the initiating desktop browser; older link-based checkpoints below are historical. QQ custom SMTP is saved and the representative confirmed receipt on a non-team mailbox. Both email templates and the eight-digit/600-second provider settings are saved and rechecked. The representative has now confirmed real numeric-code sign-in into the local workspace; the controlled local sender flag is enabled based on actual non-team delivery, as detailed in the latest checkpoint.

Current local implementation; not a deployment or public-release approval. Canonical source is OfferAnchor. Baseline 2.2 and analysis contract 2.0.0 are unchanged. This extension was explicitly requested by the representative; existing role ownership is retained.

## Open the product

From the canonical folder with the existing dependencies installed:

    npm run build
    npm run open

The launcher starts the built local app when absent. Open http://localhost:3000/landing/index.html, http://localhost:3000/check or http://localhost:3000/login. Use localhost consistently: 127.0.0.1 is a different browser origin. The current task's small localhost:4330 process redirects old GET/HEAD links to 3000; it does not forward POST bodies or run another app. It must be started separately with node scripts/legacy-local-redirect.cjs if needed after reboot. The main launcher does not install dependencies or change cloud settings. Windows, macOS and Linux opening commands are supported; only Windows was exercised here. Existing Windows proxy settings are inherited by the child process only, with loopback and Alibaba endpoints excluded; no system proxy/TLS setting changes.

Double-clicking an old static HTML snapshot does not start the authentication server. A clean clone needs npm ci using the pinned toolchain and its own ignored .env.local; it defaults to simulation and has no team credentials.

## What users see

The supplied login-demo informed the compact card, spacing and two-method layout. Existing OfferAnchor brand assets and a locally served licensed Inter font are used. Google sign-in, email sign-in link, sent/loading/error states, guest continuation and working privacy/terms pages are implemented. There is no password field, Apple login or numeric-code promise.

Both workspace account entrances open a same-origin login window so current guest work stays in the original tab. Verified name/initials then appear in both existing avatar positions. A blocked popup has a visible ordinary-tab link. Completion verifies the session again and sends only a same-origin notification to the actual opener; no token crosses postMessage. The original tab also refreshes on focus. Google consent and email-link completion must be performed by the real account owner.

Guest-to-account login preserves the current check. A verified account change or definitive sign-out closes previous working text, attachments, pending follow-up and modal callbacks. Temporary provider/network failures preserve the visible account and work. Sign-out waits for server success and cancels pending profile refreshes so an older response cannot restore the previous identity. A failed sign-out is visible and keeps work.

Saved checks remain manually saved, simulation-only browser copies, namespaced by verified user UUID. They are not encrypted, not a secure account database and not cloud history; a browser owner can inspect local storage. Explicitly saved copies remain on the device after sign-out. Live readings still support protected copy/print, with live Save disabled. Signing in never automatically uploads offer text or attachments to Supabase.

## Server contract and configuration

Official pinned @supabase/ssr and @supabase/supabase-js handle PKCE exchange, refresh and cookies. Narrow routes are /api/account/start, /api/account/session, /api/account/logout and /auth/callback; /auth/complete returns to the workspace. Session responses expose only a verified minimal profile. HttpOnly, SameSite=Lax cookies use Secure on HTTPS. All account responses are private/no-store. Tokens are not sent to client JavaScript or localStorage. Real profile names come from the provider and cannot be edited through the cosmetic demo-profile form.

The server requires APP_ORIGIN, SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY. Use a publishable key, never a service-role/admin key. Keep all actual values in ignored .env.local. EMAIL_SIGNUP_PUBLIC_ENABLED remains false until a verified sender is configured and tested. APP_ORIGIN must exactly match the browser and registered callback. Production requires an exact HTTPS origin and /auth/callback entry in Supabase; the Google provider callback remains the project-hosted Supabase callback. No allowlist or OAuth-consent change was made during this task.

POST start/logout require the configured Origin and bounded JSON. Callbacks require one code plus a retained PKCE verifier and return only to fixed local product paths. Google requests basic identity scopes, never Gmail/inbox access. Provider errors do not disclose raw messages. Requests have deadlines; email never automatically resends. Process-local email/Google attempt limits are conservative shared controls, not per-user or distributed protection.

Account sign-in is separate from the existing signed demo-access code protecting paid model tools. A Google account does not bypass the AI budget gate. No new cloud table, row security policy or server-admin credential was created.

## Observed verification

Read-only live provider settings returned HTTP 200 with Google and email enabled, and signup not disabled. This verifies configuration/connectivity, not a new personal login. Earlier separate Google and restricted-email self-tests remain historical evidence. No personal Google consent was impersonated and no email was sent during this implementation.

Server tests exercise the actual SDK with synthetic transports: PKCE cookies, verified exchange, expiry/duplicate/missing callbacks, foreign origins, safe errors, restricted email attempts, sign-out and network/throttling preservation. Browser checks exercise the actual built pages with disclosed synthetic account providers, desktop/390px layouts, popup completion, both account entrances, preserved guest drafts, account isolation, external logout, unfinished follow-up cleanup and delayed-response sign-out. Browser mocks are not real-provider acceptance. Type/build, frozen AI checks and existing workspace/file/landing regressions are recorded in the ignored auth-product-oct17 evidence folder. The current host differs from the pinned Node/npm toolchain; CI must rerun with the pinned versions.

## Model billing hold

Official Alibaba audit logs identify Arrearage for the 19:15:30 and 20:06:29 qwen3.8-max refusals on 17 October. The initial schema-cause inference is corrected: uniqueItems is independently unsupported by strict output, but the observed refusals were logged as billing failures. The account owner must resolve billing; this task did not pay or change a spending cap. MODEL_CALLS_ENABLED=false currently holds live analysis, cloud OCR and paid source tools to avoid repeated failures. Prepared examples, local document conversion, Learn and account sign-in still work. One new synthetic core recheck was made in this authentication task; it failed. No automatic retry or subsequent model call was made. After billing recovery, a bounded successful image-to-core check is still required before claiming that path works end to end.

## Before a public launch

- Confirm personal Google sign-in and one latest email link in the actual product, same browser/host, after the owner returns. Existing configuration is not a substitute for that consent flow.
- Configure a verified email sender/custom SMTP and test delivery before public email signup. Check Google audience/test-user settings; do not promise universal availability.
- Set the production HTTPS origin/redirect allowlist and verify Secure cookies, logout and failures there.
- Replace process-local throttling with tested shared/host enforcement; configure authorized provider budget limits and resolve the observed billing hold.
- Run the repaired OCR-to-core path after billing recovery and finish independent/participant evaluation. Do not turn development cases into held-out results.
- Verify provider handling/retention/logging and approve production notices before sensitive user input. Current trials use fictional/redacted material.

No Git push, ZIP publication, cloud deployment, purchase, public SMTP activation, account database or independent effectiveness acceptance is included.

## Official references

- [Supabase server-side authentication](https://supabase.com/docs/guides/auth/server-side)
- [PKCE flow](https://supabase.com/docs/guides/auth/sessions/pkce-flow)
- [Passwordless email](https://supabase.com/docs/guides/auth/auth-email-passwordless)
- [Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Alibaba Model Studio error codes](https://help.aliyun.com/zh/model-studio/error-code/)

## Final local self-check receipt

Fresh final checks passed: 118 integration tests, 80 AI/component tests, TypeScript check, production build, account browser regression, workspace browser regression, attachment browser regression and landing browser smoke. Desktop and 390px login screenshots were visually reviewed; this is not physical-phone acceptance. The official npm production-dependency audit returned zero known advisories at this check; no automatic dependency upgrades were performed. Public/client assets (31 files) contained zero exact matches for the configured model/search keys, session secret, demo code or Supabase publishable key. Documentation validation checked 385 local links with zero broken links and zero ownership gaps before this final record update.

Current HTTP observations: /login, /check, /landing/index.html, /privacy and /terms return 200; old localhost:4330/login redirects to localhost:3000/login. Account session reports configured=true and authenticated=false for a fresh guest. Paid service reports ready=false with reason=live_disabled. Independent read-only review found network/exit/account-boundary defects; the fixes are covered by the passing regressions. The model path was not retried after the billing hold. AgentBoard was not connected; no board synchronization or human release acceptance is claimed.

## Subsequent owner login and email setup checkpoint

The representative reported a successful new Google login in an ordinary browser after retrying from the current login page. This is actual owner-reported product evidence, not a simulated provider test or proof that every Google account is permitted. The original failed attempt did not retain a diagnostic, so its cause is not established. Subsequent code distinguishes missing browser state, an incomplete callback, provider rejection, exchange/network failure and failed identity verification instead of labelling all failures as expired links. Thirteen targeted server tests, type checking, build and the account-browser regression pass after that change. Diagnostic logs contain fixed stage/reason codes, booleans and an optional numeric status only, never codes, verifier values, emails, raw callback URLs or provider messages.

A standalone connectivity script initially returned ECONNRESET because its proxy flag was assigned after Node startup. Repeating with the actual child-process startup environment returned HTTP 200 with Google/email enabled. That standalone failure is not evidence that the running product connection failed.

The representative confirmed there is no project sending mailbox/domain/SMTP service yet. Public/non-team email sign-in therefore remains blocked on a real sender, not on the choice of link versus numeric code. Prepare a dedicated project Gmail account for low-volume competition testing; do not reuse personal mailbox passwords. The owner must create the account, complete any phone/identity verification, enable two-step verification and, if available under that account's policy, create an app password named OfferAnchor SMTP. Do not copy passwords or app passwords into chat, Git or project files. If the account does not offer app passwords, stop and choose an eligible sender/service; do not weaken account security.

In the existing Supabase project's Authentication email/SMTP settings, enter sender name OfferAnchor, sender address equal to the actual project Gmail address, host smtp.gmail.com, port 587 (STARTTLS), username equal to the full project Gmail address, and the app password in the console's SMTP password field. Match the provider-supported TLS settings and retain existing Google settings and the exact app callback. A mailbox relay is a small-demo bridge, not a promise of unlimited production delivery. A verified domain and transactional sender are preferred for public operations.

Keep EMAIL_SIGNUP_PUBLIC_ENABLED=false until a deliberately requested sign-in email reaches an address outside the Supabase project team, its latest link completes login in the same browser, expiry/logout remain correct, and actual provider/project sending limits are confirmed. Then update the flag and restart only this product process. Do not enable a public flag as a substitute for SMTP or delivery verification. Current server email attempts remain conservatively bounded. Numeric OTP is not activated: the competition default stays the existing link until mail delivery is proven. Switching later requires an actual Token email template plus a guarded server verification endpoint; changing the label or adding an input alone does not implement OTP.

Official references: [Gmail SMTP settings](https://support.google.com/mail/answer/7104828), [Google app passwords](https://support.google.com/accounts/answer/185833), [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [email OTP and magic links](https://supabase.com/docs/guides/auth/auth-email-passwordless).

## Current sender: QQ SMTP configuration saved

The Gmail-registration proposal above was replaced after the representative could not complete Google phone verification. The representative chose an existing QQ mailbox, completed phone binding, enabled its mail-client service and personally entered the generated SMTP authorization code directly into the existing Supabase project's SMTP password field. The agent did not read, copy, log or store that code in project files.

The original project was recovered by signing into its existing Supabase account; no replacement project or organization was created. SMTP settings were saved and verified again after refresh: custom SMTP enabled, host smtp.qq.com, port 465, sender name OfferAnchor, sender address matching the SMTP username, and the console reporting a hidden stored password. Actual addresses, account names and credentials are intentionally omitted from this record. Google-provider settings and the callback were not changed.

This proves persisted configuration, not delivery. One owner-controlled mailbox outside the Supabase organization is being used for a deliberately requested sign-in test in the same Chrome browser. EMAIL_SIGNUP_PUBLIC_ENABLED remains false until that latest email arrives and its link completes the real product session. No unsolicited messages, automatic resends or inbox reading are performed. The public notice now identifies Tencent QQ Mail as the sign-in-message relay. Job material is not included in these emails. Free/personal-mailbox relay is for bounded competition testing; public production sending still needs appropriate delivery limits and a verified-domain transactional sender.

## Eight-digit email-code implementation

The representative received the email on a phone and found opening its link in desktop Chrome inconvenient. The authorized login-completion work therefore replaces the email-link UI with numeric-code entry while preserving Google, guest access, the approved card design, existing account handling and the unchanged analysis contract. This does not create a second app or a new account database.

The actual provider default was eight digits; it was retained, with Email OTP expiration changed from 3,600 to 600 seconds and rechecked after refresh. Both Confirm sign up and Magic link or OTP templates now use the same public/auth/email-code.html source and subject Your OfferAnchor sign-in code. They contain Token and no ConfirmationURL. Original non-secret template sources are kept in the ignored auth-product-oct17 folder for recovery. SMTP credentials were not reread or copied. Earlier Gmail instructions and the link-only proposal are superseded.

POST /api/account/start still explicitly sends one email through Supabase. A successful send creates an opaque HttpOnly oa_email_challenge cookie and a ten-minute server-memory entry containing only the requested address, expiry and attempt state. Actual OTP values are never stored. POST /api/account/verify accepts only an eight-digit code, not a caller-supplied identity. It requires the exact Origin, bounded JSON, the current browser challenge, at most five attempts and a shared thirty-attempt/ten-minute verification budget. Missing/expired/replaced/used challenges fail closed. An explicit Google start or logout invalidates pending email state. A late verification response cannot activate a session after logout.

The installed official SDK verifies the OTP, then the server calls getUser and checks that the verified address matches the challenge. Only after this succeeds are session cookies returned. The response contains only a signed_in marker and one of the two fixed product return paths, never access or refresh tokens. Final lookup failures discard provisional cookies. Upstream throttling is reported as rate limiting rather than a wrong-code verdict. The browser supports eight-digit entry, native one-time-code autofill, incorrect/expired/unavailable states and manual resend after a sixty-second wait. Nothing automatically sends or retries. Read the email on any device, but enter the code in the browser where it was requested.

Challenge storage and counters are bounded and process-local. A restart invalidates unfinished challenges; a new code must be explicitly requested. This is appropriate only for the existing controlled single-process test. Shared storage, atomic limits, appropriate sender capacity and production host/privacy review remain prerequisites for multi-instance/public deployment. No deployment or public model access is activated.

Fresh checks passed 128 integration plus 80 AI/component tests (208), type checking, production build and the account browser suite. These cover a disclosed synthetic numeric-code success, failed final identity lookup, wrong identity, bad/expired/reused codes, no automatic resend, no token/code browser storage, rate limits and logout races. The 390px empty-code screen was visually reviewed. Real SMTP receipt is owner-reported; real numeric-code authentication is still pending. No new email was sent by the agent for these checks.


18 October regression receipt: 131 integration tests (including 25 account API tests), TypeScript checking, production build and the complete account-browser regression passed. The new red/green cases reproduced the missing failure cooldown, fixed one-hour wait and collapsed sender errors before the fix. Synthetic browser checks verify failed-send cooldown, provider Retry-After countdown, manual retry, continued Google availability and no automatic resend. These are not real mailbox or OTP-session acceptance. No AI logic or paid tool was exercised by this repair.


## Owner acceptance: 18 October

After the retry repair and local restart, the representative explicitly answered that the real email-code flow successfully entered the workspace. This closes the requested local end-to-end email acceptance alongside the previously confirmed Google product login. Evidence is the owner's report, not an agent inspection of the code, inbox or credentials. No additional send or identity verification was performed by the agent. Earlier pending statements are historical checkpoints. This does not establish all-recipient delivery, production-domain callbacks, cloud history or public deployment. The paid-model billing hold and other release gates are unchanged.
