# CEDA Innovation Portal: front-end

Web client for the CEDA Innovation Portal hackathon. React + Vite single-page app, prepared for AWS hosting with S3 and CloudFront.

Related repositories:

- [backend-api](https://github.com/Ceda-hackathon-portal/backend-api): REST API the portal calls
- [infra--devops](https://github.com/Ceda-hackathon-portal/infra--devops): Terraform for all AWS resources

**Backend team:** start with the [front-end handover](docs/BACKEND_HANDOVER.md) (what was built, what changed and why), then the [API contract](docs/API_CONTRACT.md) (endpoints and JSON shapes the front end needs).

## Local development

Working directory: `C:\Users\user\Documents\BAC\Ceda-hackathon-portal\front-end`.

Requires Node.js 22 (see `.nvmrc`).

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

`VITE_API_URL` in `.env.local` is the public API base URL reserved for frontend integration. The frontend currently uses an in-memory workspace identity and browser-local data; it does not yet call the API. Vite inlines `VITE_*` values into the public bundle, so never put secrets in them.

## Applicant workspace

Open `/portal` on the local Vite URL (for example `http://127.0.0.1:5174/portal`). Use the account icon or the applications panel to open sign-in. The existing **Demo access** section on the sign-in page still opens the local applicant workspace without real credentials.

The applicant shell has its own compact header and navigation. It includes anonymous eligibility guidance, a reusable applicant/company profile, separate drafts, six form sections, budget validation, saved document contents, review, a local receipt with Print / Save PDF, unread messages and versioned corrections. The requirements and service boundaries are in [Applicant delivery checklist](docs/APPLICANT_FLOW.md). Every applicant page uses the shared full-width photo hero, with header controls over the image and plain page titles. The home and cattle images were supplied; three additional photographs and their provenance are listed in [Applicant image sources](docs/APPLICANT_IMAGE_SOURCES.md).

Drafts, profile details and submissions use local storage; actual document bytes use IndexedDB. Existing local records are migrated without removing their original copy. Workspace identity ends on refresh; use Demo access on the applicant sign-in page to return to saved work. Local references start with CEDA-LOCAL; legacy references stay unchanged on correction. Nothing is sent to CEDA. Account authentication, cross-device persistence, official receipts, file quarantine/scanning, officer verification and email/SMS delivery require the backend services.

Run `npm test` for applicant, programme-manager and staff workflow checks, including document constraints, snapshot isolation, recovery, ownership calculations, assigned reviews, private marks, decision gates and return routes. Run `npm run build` for the frontend build.

The shared staff entry is `/admin`, with screening, assigned reviews, decisions, programmes, management insights and system status. Staff and applicant records connect through the local workflow; accounts and shared services remain unconnected. See [Staff workflow and service boundaries](docs/STAFF_FLOW.md) and [Staff photograph sources](docs/STAFF_IMAGE_SOURCES.md).

## Branching and reviews

- `main` is production. Every push to `main` deploys.
- Work on short-lived branches: `feature/<topic>`, `fix/<topic>`, `chore/<topic>`.
- Open a pull request into `main`. CI must pass and one teammate approves before merging.
- Prefer squash merges so `main` reads as one commit per change.

## CI/CD

| Workflow | Trigger | What it does |
| --- | --- | --- |
| `ci.yml` | Every PR and push to `main` | `npm ci`, lint (once ESLint is configured), tests if present, production build |
| `deploy.yml` | Push to `main`, or run manually | Build, sync `dist/` to S3, invalidate `index.html` on CloudFront |

The deploy job authenticates with GitHub OIDC (no AWS keys in GitHub) and stays skipped until the `production` environment is configured.

### Production environment settings

Create a GitHub environment named `production` (Settings → Environments) and add:

| Kind | Name | Value comes from |
| --- | --- | --- |
| Secret | `AWS_DEPLOY_ROLE_ARN` | `infra--devops` output: front-end deploy role |
| Variable | `AWS_REGION` | `af-south-1` unless infra says otherwise |
| Variable | `S3_BUCKET` | `infra--devops` output: site bucket name |
| Variable | `CLOUDFRONT_DISTRIBUTION_ID` | `infra--devops` output |
| Variable | `VITE_API_URL` | Public URL of `backend-api` |
| Variable | `SITE_URL` | Public URL of the portal (shown on each deployment) |

CloudFront must return `/index.html` with status 200 for 403 and 404 responses, so deep links such as `/workspace` survive a page refresh.

## Frontend scope

The CEDA frontend is migrated into this organisation repository. Run development commands here and use `https://github.com/Ceda-hackathon-portal/front-end.git` as the remote.

Application source is in `src/`, static assets in `public/`, and the applicant/workspace implementation map in `docs/FRONTEND_ROADMAP.md`. The latest CEDA hero, navigation, footer and typography updates are included.

Backend implementation and infrastructure belong to the sibling repositories listed above. The frontend does not contain server code, database migrations or infrastructure configuration. Keep `node_modules/`, `dist/`, `.qa/`, local environment files and credentials out of Git.
