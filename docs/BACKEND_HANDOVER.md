# Front-end handover for the backend team

Written 20 Nov 2026 by the front-end team (Future Batoli, Shadrack Modise) for Theo, Neizachan, Onneile and Bradley.

Read this first, then [API_CONTRACT.md](API_CONTRACT.md) for the endpoints and JSON shapes.

## In one minute

- The applicant workspace includes a reusable profile, separate drafts, six form sections, budget validation, actual document uploads, review, local receipts, corrections and version history. See [APPLICANT_FLOW.md](APPLICANT_FLOW.md).
- The staff workspace at `/admin` includes screening, assigned reviews, scored reasons, document preview, programme administration, decisions, aggregate management reporting and system status. See [STAFF_FLOW.md](STAFF_FLOW.md).
- Nothing calls the API yet. Demo identities are in memory; application/programme metadata uses localStorage and document contents use IndexedDB. Local receipts and messages do not confirm delivery to CEDA.
- Backend integration still needs the endpoints and JSON shapes in [API_CONTRACT.md](API_CONTRACT.md), agreed role mappings, secure account/record ownership, shared storage, file quarantine/scanning and notification delivery.

## What happened

| When | What |
| --- | --- |
| Before 20 Nov | Phase 1 prototype built in the old `Batoli19/CedaHackathon` repository |
| 20 Nov, morning | Repository set up in the `Ceda-hackathon-portal` org with CI and an S3 + CloudFront deploy pipeline. The prototype was migrated without its old history, and inherited BOCRA naming and unused Tailwind config were removed |
| 20 Nov, day | Applicant portal rebuilt around the proposal: dashboard, applications list, 4-step form, receipt, stage tracker, feedback, messages, programmes and help |
| 20 Nov, afternoon | Public site restyled (CEDA colours, Poppins, photo hero with navigation over it), standalone sign-in pages, a once-per-session CEDA splash and a progress bar on page changes |
| 20 Nov, evening | Front-end review, this handover and the API contract |

The full change history is in `git log` on the `front-end` repository. The tables above describe the earlier delivery; the implementation status below reflects the current workspace.

## What changed, and why

| Change | Why we did it |
| --- | --- |
| **Separate applicant shell** (`/portal`, `/workspace`) with its own header and navigation | Applicants are the priority and most are first-time users on phones. One clear next action per page, as the proposal promises |
| **Six-section form with validation and saved drafts** (`src/pages/SubmitIdeaPage.jsx`, rules in `src/utils/applicantWorkflow.js`) | Proposal: "a guided form that cannot be submitted with gaps". Answers are never cleared and the draft resumes at the first unfinished step |
| **Field limits**: title 120, team 150, problem 3,000, solution 5,000, impact 3,000 characters | To keep answers readable for reviewers. **The API must enforce the same limits**, since the browser can be bypassed |
| **Review page before submit** with a Change link on every answer | Proposal: "check before you submit" |
| **Receipt with a reference number** and a downloadable copy | Proposal: a reference at once. New local references use `CEDA-LOCAL-…`; legacy references stay unchanged. The API must issue official references |
| **Stage tracker** on every application | Proposal: "applicants see where they stand at every step". It displays the six lifecycle stages (`submitted` to `award`), with unpublished dates shown honestly |
| **Feedback on the application page and under Messages** | Proposal: "every applicant gets a reason". Only released feedback is shown, never scores or evaluator names |
| **State owners**: `AuthContext.jsx` (sessions), `PortalContext.jsx` (applicant records), `AdminContext.jsx` (programmes/assignments), `StaffWorkflowContext.jsx` (staff workflow) and `services/applicantDocuments.js` (file bytes) | These are the boundaries for replacing local persistence with the agreed services |
| **Route gates by role** (`ProtectedRoute.jsx`) | Shows each role its own workspace. **Presentation only**: the server must check every permission |
| **Honest demo wording** ("Saved on this device. Nothing is sent to CEDA") | We don't claim a connection that doesn't exist. This wording changes when the API is connected |
| **Splash and page progress bar** | Replaced an old loader that blocked the screen on every click |

## Decisions that affect you

1. **Agree the role mapping before connecting accounts.** Current UI ids are `submitter`, `eligibility-officer`, `evaluator`, `adjudicator`, `administrator`, `management` and `system-administrator`. The API contract uses proposed canonical codes. These browser ids are not trusted authorisation claims; map approved account permissions on the server.
2. **Sign-in is a cookie session from Cognito hosted login**, as the `backend-api` README describes. The front end will redirect to `/api/v1/auth/login` and send `credentials: 'include'`. We never handle passwords or tokens. Our login form becomes a "Sign in with CEDA" button.
3. **Applicants and staff have separate sessions.** Applicants sign in at `/login` and use `/portal` and `/workspace`. The shared staff entry is `/admin`, which redirects unauthenticated visitors to `/staff`. Staff sections are under `/admin/`; previous `/review`, `/adjudication`, `/management`, `/reports` and `/system` links redirect there. The signed-in role controls access. Being signed in on one side never signs you in on the other. Keep this separation and enforce every permission on the API.
4. **For the demo** we suggest `POST /api/v1/dev/session { role }`, available only when `AUTH_ENABLED=false`, so the applicant and staff demo sign-ins keep working. Tell us if you prefer seeded Cognito users instead.
5. **The API base is `http://localhost:3001/api/v1`.** We corrected the front end's `.env.example`, which said port 8080.
6. **A draft is an application with `status: "draft"`**, saved with `PATCH` as the applicant types. A separate drafts table works too if you prefer: tell us.
7. **Proposal rules the server must own**, not the browser:
   - A programme opens only after a second programme manager approves it.
   - Themes, criteria and stages freeze once the first application arrives.
   - Evaluators declare conflicts before they can see an idea.
   - Scores lock on submit and stay hidden from the manager until scoring closes.
   - The platform administrator cannot read ideas, scores or decisions.
   - Every score, status and decision change is audited.

## Current implementation and remaining integration

| Item | Frontend status and service boundary |
| --- | --- |
| Applicant submission | Six sections, reusable profile, budgets, saved drafts, final validation and versioned local receipts. Shared ownership and official receipts need the API. |
| Eligibility guidance and screening | Anonymous guidance, automatic evidence flags and officer decisions/correction requests are implemented locally. Official verification remains a server/officer responsibility. |
| Documents | Actual uploads, reuse/download, PDF/image preview, checksum/type/size/expiry checks and internal staff attachments are implemented. Central storage, malware scanning and authenticity checks remain external services. |
| Programmes and assignments | Templates, settings, independent administrator approval, assignments, conflict exclusions and recorded review progress are implemented locally. |
| Evaluations | Assigned reviewers save drafts, declare conflicts and submit private 1–5 marks with reasons. Submitted reviews lock; revised applicant versions need fresh checks. |
| Scoring and outcomes | Closure enforces screening/review quorum; authorised decisions and released reasons/next steps update local applicant records and messages. Committee consensus, ranking and shortlist approval need further workflow work. |
| Management and system | Aggregate counts/export and local capability/connection status are implemented. Central monitoring, audit evidence and operational analytics need services. |
| Account and API states | Local save/upload failures are handled. Real sign-in, HTTP/loading/retry states, concurrent multi-user access and email/SMS delivery must be connected and verified against the API. |

## How to run the front end against your API

```powershell
cd front-end
npm ci
Copy-Item .env.example .env.local   # VITE_API_URL=http://localhost:3001
npm run dev                         # http://localhost:5173
```

Add `http://localhost:5173` to `ALLOWED_ORIGINS` (it is already the default) and allow credentials in CORS.

## How to reach us

Questions about screens or data shapes: Future or Shadrack. If an endpoint differs from the contract, update `backend-api/docs/openapi.yaml` and tell us. We will follow the OpenAPI file.
