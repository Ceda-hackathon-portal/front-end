# Frontend implementation map

## Phase 1 boundary

The requested deliverable is a reusable CEDA frontend skeleton. It does not yet meet the deck's complete first-demonstration release boundary (UR-01 to UR-11).

The official notice supplies seven functional themes: submission, multi-level evaluation, appropriate status visibility, role-based access, feedback and iteration, basic reporting, and scalability. The supplied 18-slide deck expands these into proposed user requirements and six user groups. Its proposed workflow, role permissions and release priorities are design inputs, not confirmed CEDA operating rules.

## Routes and ownership

| Route | Purpose | Owning source |
| --- | --- | --- |
| `/` | Public landing page | `src/pages/HomePage.jsx` |
| `/services`, `/search` | Services directory and local search | `src/pages/ServicesPage.jsx`, `src/pages/SearchPage.jsx` |
| `/challenges` | Illustrative innovation themes | `src/pages/ChallengesPage.jsx` |
| `/how-it-works` | Journey, required information and illustrative criteria | `src/pages/GuidelinesPage.jsx` |
| `/login`, `/register`, `/forgot-password` | Branded account screens and demo entry | `src/pages/AuthPage.jsx` |
| `/workspace` | Applicant overview and example updates | `src/pages/DashboardPage.jsx` |
| `/workspace/new` | Draft and demo submission | `src/pages/SubmitIdeaPage.jsx` |
| `/workspace/ideas/:id` | Idea detail, feedback, status and initial version | `src/pages/IdeaDetailPage.jsx` |
| `/review` | Evaluator queue and scorecard preview | `src/pages/ReviewPage.jsx` |
| `/adjudication` | Evidence and decision preview | `src/pages/ReviewPage.jsx` |
| `/admin` | Programme, assignments, criteria, roles and deadlines | `src/pages/AdminPage.jsx` |
| `/management`, `/reports` | Aggregate browser-demo metrics | `src/pages/ReportsPage.jsx` |
| `/system` | Technical controls and audit placeholder | `src/pages/SystemPage.jsx` |
| `/about`, `/help`, `/privacy` | Supporting information | `src/pages/InformationPage.jsx` |

Shared branding lives in `Brand.jsx`; navigation, footer, compact guest popup, loader and local guide in `src/components/shared/`. Homepage section styles live in `src/styles/home.css`. Global layout and restrained portal styles live in `src/styles/globals.css`. The latest-news section has been removed.

## Requirements coverage and next work

| ID | Requirement from the team deck | Present in this skeleton | Next implementation |
| --- | --- | --- | --- |
| UR-01 | Register and manage an account | Branded account screens and explicit demo entry | Real identity service, sessions, verification, account management and recovery |
| UR-02 | Prepare and submit | Local draft, required fields and demo submission | Server validation, durable records, secure attachments and duplicate-submit handling |
| UR-03 | Track own submissions | Sample status, submitted timestamp and initial version | Per-record ownership checks, timestamped stage events and live updates |
| UR-04 | Configure programmes | Programme configuration area and related admin sections | Persist programme-specific forms, criteria, stages, scoring weights and deadlines |
| UR-05 | Review assignments | Review queue preview | Assigned-only API queries, team membership, relevant deadlines and access denial tests |
| UR-06 | Score and justify | Criteria, score selectors and reasoning fields | Persist scored evaluations, validate completeness and support collaborative review rules |
| UR-07 | Authorise outcomes | Separate adjudicator screen and rationale field | Authorised transitions, evidence summaries, rationale and outcome publication |
| UR-08 | Respond and revise | Feedback section and revision/version placeholders | Authorised revision requests, response window, immutable prior versions and resubmission |
| UR-09 | Be notified | Labelled sample updates feed | Real notifications, unread state, delivery and retry handling |
| UR-10 | Management dashboards | Aggregate demo metrics and dedicated management role | Participation, time in stage, overdue reviews and outcome metrics from real events |
| UR-11 | Permissions and audit | UI role gates, distinct system role and audit area | Server-side role/record checks and immutable actor/time/reason/state-change audit records |
| UR-12 | Deadline control | Programme deadline and escalation section | Configured time zones, overdue detection, authorised escalation and deadline exceptions |
| UR-13 | Conflict disclosure | Conflict/recusal preview on evaluator screen | Record declarations, block conflicted reviews and support reassignment |
| UR-14 | Reviewer workload filters | Local demo queue search and filters | Query only assigned records and combine programme, stage, theme and deadline filters |
| UR-15 | Authorised exports | Reporting extension described on screen | Export permissions, field limits, audit and secure delivery |
| UR-16 | Approved integrations | Modular data and context owners | Agree actual interfaces with CEDA before building an adapter |
| UR-17 | Optional duplicate detection | Deferred | Define policy and evidence before introducing similarity detection |

The notice's award/recognition stage is shown illustratively. The deck's completeness screening, reviewer assignment, controlled revision loop and archive steps must be reflected in a programme-configured workflow, rather than inferred from the five sample display stages.

## Where to connect services

1. Replace demo identity in `AuthContext.jsx` with a verified session. Keep guest browsing and the branded guest popup.
2. Replace browser persistence in `PortalContext.jsx` with submission and draft services. Keep UI validation for usability and repeat validation on the server.
3. Replace `src/data/portal.js` example themes, roles, criteria and stage labels with approved programme configuration. The current values are presentation fixtures.
4. Connect assigned-review records to `ReviewPage.jsx`. Prevent unassigned or conflicted evaluators from reading or scoring restricted records on the server.
5. Supply authorised feedback and version history to `IdeaDetailPage.jsx`; keep private scoring separate from applicant-visible feedback.
6. Connect programme settings, assignments and escalation in `AdminPage.jsx`; technical health and audit in `SystemPage.jsx`.
7. Supply aggregate-only reporting to `ReportsPage.jsx` with separate export authorisation.

No backend endpoints or request schemas have been assumed or wired. Agree the contract with the backend team first.

## Validation before the next demonstration

- Applicant submits a complete idea and reads only their own status.
- Programme administrator assigns two reviewers under agreed rules.
- Assigned reviewer scores and justifies a review. Unassigned access is rejected by the server.
- A conflict declaration prevents a review from proceeding.
- Applicant receives an authorised revision request and resubmits while preserving version 1.
- Adjudicator records an authorised decision; status, reports and audit history update consistently.
- A retry or duplicate click cannot create duplicate submissions or outcomes.

## Non-functional work

Target keyboard access, responsive forms and WCAG 2.2 AA after an accessibility audit. Verify authentication, server-side access, secure uploads, intellectual-property visibility, retention, backup/recovery, observability and performance with representative workloads. No compliance, accessibility certification or production-readiness claim is made for this skeleton.

## Business decisions still open

Confirm decision authorities and delegation, exact review rounds, criteria and weights, reviewer assignment/recusal rules, applicant-visible feedback, deadline rules, retention and deletion, language scope, integrations and any post-award tracking.

AI scoring, public voting, financial-system integration and predictive portfolio features are outside this phase.
