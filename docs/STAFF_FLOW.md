# CEDA staff workflow

The shared entry is `/admin`. An unauthenticated visitor is sent to `/staff`, then returned to the permitted workspace. A URL does not grant a staff role. Applicant and staff sessions remain separate. The current sign-in identities are explicitly labelled demo access; real authentication and server permissions are still external integration work.

## Roles and routes

| Role | Work available |
| --- | --- |
| Eligibility officer | Screening queue, submitted evidence, automatic flags, reasoned eligibility result and dated correction requests. |
| Reviewer | Assigned applications, conflict declaration, independent weighted scorecard, a reason for every mark, draft saving and final submission. |
| Decision maker | Completed review panel after scoring closes; internal decision draft and reasoned outcome release. |
| Administrator | Programmes and independent approval, screening, reviewer assignments, progress, scoring closure, outcome release and aggregate reporting. Individual review marks stay hidden. |
| CEDA management | Aggregate participation/stage counts and CSV export. No private case navigation. |
| System administrator | Browser storage estimates and a connection register. Technical access does not grant a private case workspace. |

All roles use `/admin` for the overview. Section routes are `/admin/applications`, `/admin/screening`, `/admin/reviews`, `/admin/decisions`, `/admin/programmes`, `/admin/insights` and `/admin/system`. Application details are `/admin/applications/:id`. Previous staff links redirect into these workspaces.

## Application handoff

1. Applicant submissions appear in the staff register using their saved answers, files, version and reference. Illustrative records are labelled separately.
2. Automatic checks inspect supplied contact/company details, declared youth ownership, proposal attachments and document dates. Missing evidence stays unknown; these checks neither approve an applicant nor certify identity, authenticity or malware safety.
3. An officer records an eligibility result with a reason. A correction requires a future deadline in Botswana time. The correction and applicant message are saved together.
4. The administrator assigns reviewers using the existing programme workspace. Known conflicts cannot be assigned. Reviewer progress comes from the saved review, including recusal, rather than a sample progress label.
5. Each assigned reviewer declares conflicts before submitting. Scores use the programme's frozen criteria and weights on a 1–5 scale. Each mark needs a reason. Drafts can be partial; submitted reviews lock. Reviewers cannot see one another's marks.
6. Close applications in programme settings, then close scoring from the administrator overview. Every intake record must finish screening; eligible records need the configured number of completed assigned reviews. Missing reviews and conflicts explain why closure is blocked.
7. An authorised decision maker records an outcome and reason. Selection requires each criterion average to meet its configured minimum; a missed minimum does not make an automatic rejection. Releasing requires confirmation. The released reason, next steps and applicant message are saved together, without private reviewer marks. New applicant versions require fresh screening/reviews; older staff records are retained.

Programme creators cannot approve their own programme. Demo access offers two distinct administrator identities so this flow can be exercised without removing the guard.

## Documents and recovery

- Actual file contents use the existing IndexedDB service: PDF, DOCX, JPG and PNG; up to 10 MB each. Internal supporting documents stay separate from applicant-submitted attachments.
- PDF preview renders the saved bytes locally with page controls. Images have a local preview. DOCX has an explicit download fallback. Preview and download verify the attachment checksum; missing or changed bytes produce a visible error.
- Save failures are shown before success is reported. Unreadable stores are preserved and blocked from being overwritten with samples. A failed upload does not become a successful attachment.
- Applicant working text has been enlarged while keeping the shared hero dimensions. Staff pages share the CEDA colour palette and compact overlaid header; photograph sources are in [Staff image sources](STAFF_IMAGE_SOURCES.md).

## Verification and service boundary

Run `npm test` and `npm run build`. Tests cover applicant validation, programme rules, staff return routes, conflict and assignment checks, score reasons, private marks, review quorum, decision permissions, version changes and intake closure.

Browser checks exercise an actual applicant upload through staff preview, screening, independent reviews and outcome delivery within this browser, including errors and narrow screens. These checks do not establish a production backend connection.

Real staff accounts, secure record ownership, centrally stored files, malware quarantine/scanning, shared audit evidence, concurrent multi-user changes and email/SMS delivery require the organisation's backend services. Browser data and local history are not tamper-resistant security controls. No claims of live CEDA delivery or server verification are made by this frontend.
