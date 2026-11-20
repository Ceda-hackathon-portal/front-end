# Front-end handover for the backend team

Written 20 Nov 2026 by the front-end team (Future Batoli, Shadrack Modise) for Theo, Neizachan, Onneile and Bradley.

Read this first, then [API_CONTRACT.md](API_CONTRACT.md) for the endpoints and JSON shapes.

## In one minute

- The **applicant side is built** and works end to end as a demo. An applicant can browse programmes, fill in a 4-step application, save a draft, submit it, get a reference, and follow its stage and feedback.
- **Nothing calls the API yet.** Sign-in is a demo role picker and applications are saved in the browser (`localStorage`). That was deliberate: we built the screens while the API was still a scaffold.
- **What we need from you:** the P0 endpoints in [API_CONTRACT.md](API_CONTRACT.md), answers to the 5 questions at the end of it, and seeded demo data.
- **What we do next:** the programme manager (admin) screens, then we wire every screen to your API as endpoints land.

## What happened

| When | What |
| --- | --- |
| Before 20 Nov | Phase 1 prototype built in the old `Batoli19/CedaHackathon` repository |
| 20 Nov, morning | Repository set up in the `Ceda-hackathon-portal` org with CI and an S3 + CloudFront deploy pipeline. The prototype was migrated without its old history, and inherited BOCRA naming and unused Tailwind config were removed |
| 20 Nov, day | Applicant portal rebuilt around the proposal: dashboard, applications list, 4-step form, receipt, stage tracker, feedback, messages, programmes and help |
| 20 Nov, afternoon | Public site restyled (CEDA colours, Poppins, photo hero with navigation over it), standalone sign-in pages, a once-per-session CEDA splash and a progress bar on page changes |
| 20 Nov, evening | Front-end review, this handover and the API contract |

The full list is in `git log` on the `front-end` repository (about 55 commits).

## What changed, and why

| Change | Why we did it |
| --- | --- |
| **Separate applicant shell** (`/portal`, `/workspace`) with its own header and navigation | Applicants are the priority and most are first-time users on phones. One clear next action per page, as the proposal promises |
| **4-step form with validation and autosave** (`src/pages/SubmitIdeaPage.jsx`, rules in `src/utils/applicant.js`) | Proposal: "a guided form that cannot be submitted with gaps". Answers are never cleared and the draft resumes at the first unfinished step |
| **Field limits**: title 120, team 150, problem 3,000, solution 5,000, impact 3,000 characters | To keep answers readable for reviewers. **The API must enforce the same limits**, since the browser can be bypassed |
| **Review page before submit** with a Change link on every answer | Proposal: "check before you submit" |
| **Receipt with a reference number** and a downloadable copy | Proposal: a reference at once. The current `CEDA-DEMO-…` reference is a placeholder until the API issues real ones |
| **Stage tracker** on every application | Proposal: "applicants see where they stand at every step". It currently shows 5 demo stages. It will switch to the API's 6 stage codes (`submitted` to `award`) |
| **Feedback on the application page and under Messages** | Proposal: "every applicant gets a reason". Only released feedback is shown, never scores or evaluator names |
| **All data goes through two files**: `AuthContext.jsx` (who is signed in) and `PortalContext.jsx` (applications and drafts) | So wiring the API means changing two files, not every page |
| **Route gates by role** (`ProtectedRoute.jsx`) | Shows each role its own workspace. **Presentation only**: the server must check every permission |
| **Honest demo wording** ("Saved on this device. Nothing is sent to CEDA") | We don't claim a connection that doesn't exist. This wording changes when the API is connected |
| **Splash and page progress bar** | Replaced an old loader that blocked the screen on every click |

## Decisions that affect you

1. **Seven roles, not six.** The proposal commits to applicant, eligibility officer, evaluator, adjudicator, programme manager, committee member and platform administrator. The front end still uses six older ids and will switch to the codes in the contract (`applicant`, `eligibility_officer`, …). Please use those codes in the database and in `GET /me`.
2. **Sign-in is a cookie session from Cognito hosted login**, as the `backend-api` README describes. The front end will redirect to `/api/v1/auth/login` and send `credentials: 'include'`. We never handle passwords or tokens. Our login form becomes a "Sign in with CEDA" button.
3. **For the demo** we suggest `POST /api/v1/dev/session { role }`, available only when `AUTH_ENABLED=false`, so judges can switch roles. Tell us if you prefer seeded Cognito users instead.
4. **The API base is `http://localhost:3001/api/v1`.** We corrected the front end's `.env.example`, which said port 8080.
5. **A draft is an application with `status: "draft"`**, saved with `PATCH` as the applicant types. A separate drafts table works too if you prefer: tell us.
6. **Proposal rules the server must own**, not the browser:
   - A programme opens only after a second programme manager approves it.
   - Themes, criteria and stages freeze once the first application arrives.
   - Evaluators declare conflicts before they can see an idea.
   - Scores lock on submit and stay hidden from the manager until scoring closes.
   - The platform administrator cannot read ideas, scores or decisions.
   - Every score, status and decision change is audited.

## Not built yet on the front end

| Item | Status |
| --- | --- |
| Programme manager (admin) screens | **Built on demo data** (20 Nov): programmes overview, new programme from a template, settings with second-manager approval, applications and reviewer assignment. State lives in `src/context/AdminContext.jsx`. Each function there is marked with the endpoint that replaces it. Rules are in `src/utils/admin.js` with tests |
| Close scoring, ranking, shortlist approval, release outcomes | Next on the admin side |
| Eligibility officer queue | After admin |
| Evaluator and adjudicator screens | Layouts exist (`ReviewPage.jsx`) but save nothing |
| Eligibility pre-check before applying | Not started (P1) |
| Document uploads | Not started (P1, needs your upload and scanning endpoints) |
| Revise and resubmit after feedback | Not started (P1) |
| Loading and error states for API calls | Added as we wire each endpoint |

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
