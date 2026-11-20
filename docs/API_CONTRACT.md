# API contract: what the front end needs

Status: **proposal from the front-end team, 20 Nov 2026.** The backend team owns the final names and keeps `backend-api/docs/openapi.yaml` current. Where the backend chooses differently, update this file or point it at the OpenAPI spec, and tell the front end. Nothing here is wired yet.

Sources: the team proposal (10 Nov 2026), the `backend-api` runtime contract (Node 24, Express 5, Prisma, PostgreSQL, `/api/v1`, port 3001, Cognito hosted login) and the screens already built in this repository.

## 1. Basics

| Item | Agreement |
| --- | --- |
| Base URL | `VITE_API_URL` + `/api/v1`. Local: `http://localhost:3001/api/v1` |
| Format | JSON, UTF-8. Dates are ISO 8601 with offset (`2026-11-20T09:00:00+02:00`). Display time zone is Africa/Gaborone |
| Sign-in | Server-side session cookie set by the API after Cognito hosted login. The front end sends `credentials: 'include'` and never sees a token |
| CORS | `ALLOWED_ORIGINS` must include the front-end origin, with credentials allowed |
| Writes | `POST`, `PUT`, `PATCH` and `DELETE` need a CSRF protection the backend chooses (for example a `X-CSRF-Token` header read from `GET /auth/csrf`). Tell the front end which |
| Access | Every permission is checked on the server (role, programme, assignment, stage, conflict). The front-end route gates are presentation only |

### Errors

Every error uses one shape so the front end can show it next to the right field:

```json
{ "error": { "code": "VALIDATION_FAILED", "message": "Complete the highlighted fields.", "fields": { "title": "Enter an idea title." } } }
```

| Status | When | Front end does |
| --- | --- | --- |
| 400 / 422 | Invalid input. `fields` keys match the request body keys | Shows each message under its field |
| 401 | No session or it expired | Sends the user to sign in, then back |
| 403 | Signed in but not allowed (wrong role, not assigned, conflict declared) | Shows "You don't have access to this" |
| 404 | Not found, **or exists but the user may not know it exists** | Shows not found |
| 409 | Version conflict or a state change that is no longer allowed (for example editing a frozen programme) | Reloads and explains |
| 5xx | Server problem | Keeps typed answers, offers Retry |

`message` must be safe to show to the user. Never include stack traces, SQL or other users' data.

### Lists

`GET` lists take `?page=1&pageSize=25` and return `{ "items": [...], "page": 1, "pageSize": 25, "total": 112 }`.

### Double clicks and retries

`POST .../submit`, decisions and outcome releases accept an `Idempotency-Key` header (a UUID the front end generates per action). The same key returns the first result instead of acting twice.

### Edits by two people

Records that can be edited (drafts, programme settings) carry `version` (integer). Send it back as `If-Match: <version>`. A stale version returns 409.

## 2. Roles

The proposal commits to seven roles. The front end currently uses six older ids and will switch to these:

| Code | Name | Lands on |
| --- | --- | --- |
| `applicant` | Applicant | `/workspace` |
| `eligibility_officer` | Eligibility officer | `/eligibility` |
| `evaluator` | Evaluator | `/review` |
| `adjudicator` | Adjudicator | `/adjudication` |
| `programme_manager` | Programme manager | `/admin` |
| `committee_member` | Committee member | `/management` |
| `platform_admin` | Platform administrator | `/system` |

A user can hold more than one role. The platform administrator manages accounts and system health but **cannot** read ideas, scores or decisions.

## 3. Shared shapes

### Stage

Stages are codes. The front end owns the wording.

`submitted` → `eligibility` → `shortlist` → `evaluation` → `decision` → `award`

Each stage on an application has a state: `done`, `in_progress`, `waiting_for_applicant`, `upcoming` or `stopped`.

### Application (as the applicant sees it)

```json
{
  "id": "6f1c…",
  "reference": "CEDA-ICH-2026-00412",
  "programmeId": "p_123",
  "programmeName": "CEDA Innovation Challenge 2026",
  "status": "submitted",
  "currentStage": "eligibility",
  "title": "Rural enterprise toolkit",
  "theme": "digital",
  "team": "Example innovation team",
  "problem": "…",
  "solution": "…",
  "impact": "…",
  "version": 3,
  "createdAt": "…",
  "updatedAt": "…",
  "submittedAt": "…",
  "stages": [
    { "code": "submitted", "state": "done", "completedAt": "…" },
    { "code": "eligibility", "state": "waiting_for_applicant", "expectedBy": "…", "action": { "message": "Upload a current tax clearance.", "dueAt": "…" } },
    { "code": "shortlist", "state": "upcoming", "expectedFrom": "…", "expectedBy": "…" }
  ],
  "feedback": [
    { "id": "f_1", "author": "CEDA evaluation team", "message": "…", "createdAt": "…" }
  ],
  "outcome": null
}
```

- `status` is `draft`, `submitted` or `withdrawn`. Progress after submission is in `currentStage` and `stages`.
- `feedback` contains **released** feedback only. Never scores, evaluator names or private notes.
- `outcome` stays `null` until the programme manager releases outcomes, then `{ "result": "selected" | "not_selected" | "not_eligible", "reason": "…", "nextSteps": ["…"], "canRequestReview": true }`.
- Field limits match `src/utils/applicant.js`, and the server must enforce them too: title 120, team 150, problem 3,000, solution 5,000, impact 3,000 characters, all required at submit. `theme` must be one of the programme's theme ids.

### Programme

```json
{
  "id": "p_123",
  "code": "ICH-2026",
  "name": "CEDA Innovation Challenge 2026",
  "templateId": "innovation_challenge",
  "status": "draft",
  "summary": "…",
  "opensAt": "…",
  "closesAt": "…",
  "themes": [{ "id": "digital", "name": "Smarter digital services", "description": "…" }],
  "criteria": [{ "id": "c_1", "name": "Problem and innovation", "description": "…", "weight": 25, "minimum": 3 }],
  "stages": [{ "code": "eligibility", "targetWorkingDays": 10 }],
  "reviewersPerApplication": 2,
  "shortlistSize": 20,
  "version": 4,
  "createdBy": { "id": "u_1", "name": "…" },
  "approvedBy": null
}
```

Programme `status`: `draft` → `awaiting_approval` → `open` → `closed` → `scoring_closed` → `outcomes_released` → `archived`.

Rules from the proposal the server enforces:
- Criteria weights add up to 100. Each `minimum` is 0 to 5 (0 = no minimum). Scores use a 1 to 5 scale.
- A programme opens only after a **different** programme manager approves it.
- Themes, criteria and stages are frozen once the first application is submitted. Dates can still change with a recorded reason.

## 4. Endpoints

Priority **P0** is what the demo needs: one idea from submission through eligibility, review and decision to released feedback. **P1** follows if time allows.

### Session (all users)

| Pri | Method and path | Purpose |
| --- | --- | --- |
| P0 | `GET /auth/login?returnTo=/workspace` | Redirects to hosted login, then back to `returnTo` (same-origin paths only) |
| P0 | `POST /auth/logout` | Ends the session |
| P0 | `GET /me` | `{ id, name, email, roles: ["applicant"], programmeIds: [] }`, or 401 |
| P0 | `POST /dev/session` `{ role }` | **Only when `AUTH_ENABLED=false`.** Starts a session as a seeded demo user with that role, so the applicant and staff demo sign-ins keep working. An applicant role starts an applicant session and a staff role starts a staff session, never both. Must not exist in production |

### Public (no sign-in)

| Pri | Method and path | Purpose |
| --- | --- | --- |
| P0 | `GET /programmes?status=open` | Open programmes: `id`, `name`, `summary`, `opensAt`, `closesAt`, `themes` |
| P0 | `GET /programmes/:id` | Public programme detail: themes, criteria names and descriptions (no weights needed), stages with target days, dates |
| P1 | `POST /programmes/:id/eligibility-check` | Anonymous pre-check: each rule `met`, `not_met` or `needs_evidence` with a reason. Stores no personal data |

### Applicant

| Pri | Method and path | Purpose |
| --- | --- | --- |
| P0 | `GET /me/applications` | My drafts and submissions, latest first (summary fields plus `currentStage`) |
| P0 | `POST /applications` `{ programmeId }` | Starts a draft, returns the application with `status: "draft"` |
| P0 | `PATCH /applications/:id` | Saves draft fields (partial body, `If-Match`). Called as the applicant types, about every 2 seconds |
| P0 | `POST /applications/:id/submit` | Validates everything, assigns `reference`, saves version 1 as a snapshot. `Idempotency-Key` |
| P0 | `GET /applications/:id` | The application as above. 404 unless it is mine |
| P1 | `GET /me/messages` | Notifications: `{ id, applicationId, kind, message, createdAt, readAt }` |
| P1 | `POST /me/messages/:id/read` | Marks one as read |
| P1 | `POST /applications/:id/responses` `{ message, fields }` | Answers a correction request, which creates a new version |
| P1 | `POST /applications/:id/review-requests` `{ grounds }` | Asks for a review of a rejection |
| P1 | Documents: `POST /applications/:id/documents` (multipart), `GET`, `DELETE` | Scanned and quarantined before anyone can open them |

### Programme manager (admin side)

| Pri | Method and path | Purpose |
| --- | --- | --- |
| P0 | `GET /admin/templates` | The five ready templates with default themes, criteria and stages |
| P0 | `GET /admin/programmes` | All programmes I manage, with `status` and counts per stage |
| P0 | `POST /admin/programmes` `{ templateId, name }` | Creates a draft from a template |
| P0 | `GET /admin/programmes/:id` | Full settings (the Programme shape) |
| P0 | `PATCH /admin/programmes/:id` | Edits settings while `draft` (`If-Match`). 409 once frozen |
| P0 | `POST /admin/programmes/:id/submit-for-approval` | `draft` → `awaiting_approval` |
| P0 | `POST /admin/programmes/:id/approve` `{ comment }` | `awaiting_approval` → `open`. 403 if I created or last edited it |
| P1 | `POST /admin/programmes/:id/return` `{ reason }` | Sends it back to `draft` with a reason |
| P0 | `GET /admin/programmes/:id/applications` | Every application: reference, title, theme, `currentStage`, eligibility result, assigned reviewers and their **progress only** (no score values until scoring closes) |
| P0 | `GET /admin/evaluators?programmeId=` | Evaluators available, with current load and declared conflicts |
| P0 | `PUT /admin/programmes/:id/applications/:applicationId/assignments` `{ evaluatorIds }` | Sets reviewers. 409 if an evaluator declared a conflict |
| P1 | `POST /admin/programmes/:id/assignments/auto` | Spreads reviewers evenly, skipping conflicts. Returns the proposed plan, which the manager then confirms |
| P0 | `GET /admin/programmes/:id/progress` | Counts per stage, reviews done, due and overdue, and the next deadline |
| P0 | `POST /admin/programmes/:id/close-scoring` | Locks scoring and makes scores visible to the manager and adjudicators |
| P0 | `GET /admin/programmes/:id/ranking` | After scoring closes: weighted totals, minimums missed, the proposed shortlist and borderline ranks |
| P1 | `POST /admin/programmes/:id/shortlist/approve` `{ applicationIds, changes: [{ applicationId, reason }] }` | Approves the shortlist. Any change from the proposal needs a reason |
| P0 | `POST /admin/programmes/:id/release-outcomes` | Releases decisions and approved feedback to applicants. `Idempotency-Key` |
| P1 | `POST /admin/programmes/:id/stages/:code/delay` `{ reason, newDate }` | Records a delay and notifies affected applicants |

### Eligibility officer

| Pri | Method and path | Purpose |
| --- | --- | --- |
| P0 | `GET /eligibility/queue` | Submitted applications awaiting a check, oldest first |
| P0 | `POST /applications/:id/eligibility` `{ result, reasons, correction }` | `result` is `eligible`, `not_eligible` or `correction_needed`. A correction names the item, reason and due date |

### Evaluator

| Pri | Method and path | Purpose |
| --- | --- | --- |
| P0 | `GET /reviews` | Only my assignments, with deadline and state (`conflict_check`, `in_progress`, `submitted`) |
| P0 | `POST /reviews/:assignmentId/conflict` `{ hasConflict, note }` | Must come first. Content stays hidden until "no conflict" is declared. A conflict removes access and tells the manager |
| P0 | `GET /reviews/:assignmentId` | The application content and criteria, only after "no conflict" |
| P0 | `PUT /reviews/:assignmentId` `{ scores: [{ criterionId, score, reason }], feedback }` | Saves a draft review |
| P0 | `POST /reviews/:assignmentId/submit` | Locks it. Every criterion needs a score and a reason |

### Adjudicator

| Pri | Method and path | Purpose |
| --- | --- | --- |
| P0 | `GET /decisions/queue?programmeId=` | Shortlisted or ranked applications with score summaries, after scoring closes |
| P0 | `POST /applications/:id/decision` `{ outcome, rationale, applicantFeedback }` | Records the decision. `applicantFeedback` is what may be released. `Idempotency-Key` |

### Committee member and reports

| Pri | Method and path | Purpose |
| --- | --- | --- |
| P1 | `GET /reports/summary?programmeId=` | Aggregates only: applications per stage, time in stage, overdue reviews, outcomes by theme. No idea content |

### Platform administrator

| Pri | Method and path | Purpose |
| --- | --- | --- |
| P1 | `GET /admin/users`, `POST /admin/users` | Staff accounts |
| P1 | `PUT /admin/users/:id/roles` `{ roles, programmeIds }` | Role and programme access |
| P1 | `GET /admin/audit?entity=&actor=` | Audit trail: who, what, record, when, before and after, reason |

## 5. Audit

Every write above records actor, role, action, record and version, time, before and after values, and the reason where one is required. Scores and decisions are never changed in place: a change is a new entry with a reason.

## 6. Questions for the backend team

1. CSRF approach and the header name.
2. Does `POST /dev/session` work for you for the demo, or do you prefer seeded Cognito users?
3. Who seeds the demo programme, users and the five templates?
4. Do drafts autosave with `PATCH` as above, or do you prefer a separate drafts table?
5. Reference format: `CEDA-<programme code>-<year>-<5 digits>`?

## 7. Where the front end connects

| Front-end file | Replaced by |
| --- | --- |
| `src/context/AuthContext.jsx` | `GET /me`, `/auth/login`, `/auth/logout`, `/dev/session` |
| `src/context/PortalContext.jsx` | Applicant endpoints |
| `src/data/portal.js` (themes, criteria, stages) | `GET /programmes/:id` |
| `src/pages/AdminPage.jsx` and the new admin pages | Programme manager endpoints |
| `src/pages/ReviewPage.jsx` | Evaluator and adjudicator endpoints |
| `src/pages/ReportsPage.jsx` | `GET /reports/summary` |
