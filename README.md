# CEDA Innovation Portal: front-end

Web client for the CEDA Innovation Portal hackathon. React + Vite single-page app, hosted on AWS (S3 + CloudFront).

Related repositories:

- [backend-api](https://github.com/Ceda-hackathon-portal/backend-api): REST API the portal calls
- [infra--devops](https://github.com/Ceda-hackathon-portal/infra--devops): Terraform for all AWS resources

## Local development

Requires Node.js 22 (see `.nvmrc`).

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

`VITE_API_URL` in `.env.local` points the app at the API. Vite inlines `VITE_*` values into the public bundle, so never put secrets in them.

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

## Migrating the existing prototype

The Phase 1 prototype lives in the earlier `CedaHackathon` repository. To bring it in:

1. Copy `src/`, `public/`, `index.html`, `package.json`, `package-lock.json`, `vite.config.js`, `postcss.config.js` and `tailwind.config.js`.
2. Do not copy `node_modules/`, `dist/`, `.qa/` or `vercel.json` (hosting is AWS).
3. Its `lint` script calls ESLint, which is not installed. Either add ESLint with an `eslint.config.js` (CI then runs it automatically) or remove the script.
4. Run `npm ci` and `npm run build` locally, then open a PR. CI starts building as soon as `package-lock.json` exists.
