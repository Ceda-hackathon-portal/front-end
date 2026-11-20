# CEDA frontend workspace

## Scope
- Work only in this `front-end` repository under the organisation workspace.
- The sibling `backend-api` and `infra--devops` repositories have separate owners. Changes there require a separate user request.
- Use the organisation frontend remote. Do not fetch from or restore former template repositories.
- Keep branding, assets, filenames, code identifiers and documentation specific to CEDA.
- Preserve the organisation's package files, CI and AWS deployment setup unless the task explicitly requires changing them.

## Product work
- Applicant usability is the current priority. Establish the task, next action, progress and recovery behaviour before designing screens.
- Prefer clear language, short forms, mobile usability and visible save/error states.
- The current account and application flows use demo state. Describe live authentication, API persistence and verification only when they are connected and verified.
- Treat proposal examples as design inputs; confirm programme rules before encoding them as policy.

## Workflow
- Check the current branch, status and applicable instructions before editing. Preserve unrelated work.
- Use short-lived branches and keep changes within the approved frontend task.
- Run `npm run build` and checks relevant to the change. Inspect rendered UI when changing appearance or interactions.
- Commit, push or deploy only when the user requests it. Never add secrets or generated build/dependency folders to commits.

## Applicant UI rules
- Use the supplied applicant portal reference, the updated woman hero for home and the cattle image for Programmes.
- Use the shared full-width hero with overlaid header controls on every applicant page. Keep photography subdued in the CEDA palette.
- Use plain page and section titles; avoid promotional two-line taglines. Record any additional photograph sources.
- No emojis or 3D icons. Use the existing flat line icon set for useful actions.
- Keep navigation compact, copy concise and the primary next action easy to find.
- Keep applicant styles scoped to the portal; preserve the public website and staff workspaces.
- Show honest local save, submission and verification states. Do not imply an API connection that does not exist.
