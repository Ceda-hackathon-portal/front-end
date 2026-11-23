# CEDA service work — implementation and acceptance plan

Scope: reporting, audit access, live consultant chat, WebRTC audio, alert subscriptions,
support/authority information, and privacy/upload protection. Authentication/account
lifecycle and CMS belong to the concurrent agent. Source publication is requested;
production deployment and external service provisioning remain separate steps.

## 1. Database and access
- Add an additive migration for conversations, deduplicated messages, agent availability,
  call state/signalling, account preferences, notifications and privacy requests.
- Reuse real cookie sessions, CSRF and live programme grants. Applicants see only their
  conversations; staff access stays programme-scoped. Internal notes never reach applicants.
- Record actor/time/action/target for service mutations; keep confidential bodies out of audit.
- Prove cross-user/programme denial, retries and simultaneous claims against PostgreSQL.

## 2. Insights and audit
- Date/programme filters; database participation trend, stage distribution, released outcomes,
  processing times, consultant response/resolution metrics; export the filtered aggregates.
- Match the supplied reference: quiet sidebar, square-cell trend, restrained metric row,
  workflow breakdown and timeline cards. Never fabricate sample chart values.
- Audit list searches all existing audit families plus service events, with bounded pagination.

## 3. Consultant support and audio
- Applicant drawer and staff three-column inbox following supplied references.
- Durable messages, retry-safe sending, polling/reconnection, unread/read state, assigned
  conversations, internal notes, resolve/reopen, contextual authorised application links.
- Heartbeat agent availability and bounded capacity; CAT weekday 09:00–16:00 status with
  busy, after-hours, holiday and offline explanations. Offline messages stay queued.
- WebRTC microphone calls: explicit accept/decline/end, authenticated participant-only
  signalling, expiry and cleanup, visible permission/network failure, mute control.
- Configure TURN; do not call a same-computer test evidence of cross-network reliability.

## 4. Alerts and privacy
- Account-backed free in-app/email subscriptions, inbox and read state. Generate notices from
  actual workflow events and published outcomes; never leak private adjudication decisions.
- External delivery requires a provider. Persist retry/failed state; do not label queueing as delivery.
- Versioned privacy consent, request export/deletion with visible request status; no automatic
  deletion of immutable competition records without an approved retention policy/legal hold rules.
- Antivirus scan before storing uploads, fail closed when scanning is required and unavailable.
- Do not modify the other agent's authentication or staff provisioning work; expose dependencies.

## 5. Support content and verification
- Replace obsolete help copy with accurate FAQs and verified official authority links.
- Publish support hours and clearly labelled service targets; contact ownership needs CEDA approval.
- Run backend compile/unit/integration tests; frontend build and relevant tests; two independent
  browser sessions for message/call journey; narrow-screen and browser-engine checks where installed.
- Inspect screenshots against references. Document measured results and exact unverified boundaries.

## Verification ledger — 23 November 2026

| Workstream | Current evidence | Outstanding boundary |
| --- | --- | --- |
| Database reports | Scoped PostgreSQL reports, nonzero published-outcome/timeline assertions, visible outcomes view and CSV download | Production load and hosting not verified |
| Audit | Search/paging across application, screening, evaluation, decision, workflow and service events; denied cross-programme reads and audit updates | No claim against a database owner who can disable protection |
| Consultant chat | Two independent browser contexts, real API/database messages, private notes, resolution, server-side search/paging, >200-message history and offline handoff | Actual consultant account provisioning belongs to the parallel account work |
| Audio calls | Native audio packets received in Chrome, Edge and Firefox, background invitations, end/decline/expiry, simulated microphone-denial recovery | No TURN service configured; different-network/device connectivity remains unverified |
| Alerts | Database-backed preferences/inbox; real publication creates one alert and none before release; persisted email retry/idempotency contract checked | No live email provider; no SMS implementation or delivery proof |
| Upload security | Actual Windows Defender clean verdict on benign private test bytes; ClamD protocol rejection/unavailable tests; required scanning fails closed | Hosted Linux scanner/signatures/runtime permissions still require deployment verification |
| Privacy | Separate application/contact consent, unsubscribe without re-consent, account data export, private-note exclusion and deletion requests | Deletion review/fulfilment and general retention purge are not implemented pending approved retention/legal-hold rules |
| Help/support | Updated FAQs, CEDA support details and three common authority directories | Hosting fault owner/turnaround targets and final regulator scope need approval |

Checks: 82 backend unit tests; 12 real PostgreSQL integration tests; 86 frontend unit
tests; 15 existing applicant/landing browser regressions. New support/call acceptance
passed in Chrome, Edge and Firefox using synthetic test identities, a real PostgreSQL
database and test audio. Physical-phone and different-network calls are not proven.

Local API measurements: 100 requests per endpoint, concurrency 5, small test dataset;
p95 reports 91.9 ms, audit 53.7 ms, conversations 30.3 ms; no unexpected errors.
These measurements do not establish production capacity.

The approved Prisma alignment and both additive service migrations are applied to the
existing loopback `ceda_dev` database. Its application count was zero before and after
migration; no demonstration applications were inserted into it. Existing applicant and
administrator login, reports, activity and CSV download were verified against this database.

## Remaining completion gates
1. Configure a real email sender/verified domain and prove recipient delivery. SMS requires
   a separate provider and verified recipient/opt-in design if selected for this release.
2. Configure TURN and test a call between devices on different networks over the deployed
   HTTPS portal. Local peer audio success is insufficient evidence for that claim.
3. Supply the retention periods/legal-hold decisions and privacy owner. Implement and verify
   approved deletion fulfilment; do not mark a queued request as deleted.
4. Approve hosting fault ownership, response targets, privacy notice and relevant authority list.
5. Integrate the parallel authentication/CMS work and verify production sign-up, MFA/account
   recovery/staff grants separately. This work did not overwrite that agent's worktree.
6. Verify hosted storage, HTTPS/session configuration, scanner and operational availability.

## Running/reviewing
- Frontend: http://localhost:5189/portal
- Staff: http://localhost:5189/staff; then Conversations, Insights or Activity according to grants.
- API: http://localhost:3019/health/ready
- The local account files already supplied under `Ceda-local-test` remain private; no credentials
  are included here or in Git. Local development sign-in is not production authentication.
- API/setup contract: sibling `backend-api/docs/SERVICE_CENTER.md`.
- Reproducible isolated acceptance: backend `scripts/service-preview.mjs`, frontend
  `scripts/service-browser-check.mjs` (CEDA_SERVICE_BROWSER=chrome|msedge|firefox).
- Screenshots/timings are local ignored artifacts under frontend `.qa/service`.
- Source branches: frontend `feature/service-workspaces`, backend `feature/backend`.
  Publication does not establish deployment or close the remaining completion gates.
  The pre-existing applicant image is excluded from this service work.
