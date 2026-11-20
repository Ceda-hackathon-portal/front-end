# Applicant delivery checklist

Source: the supplied CEDA Innovation Platform proposal, 10 November 2026, especially pages 8–11 and 23, and the supplied hackathon guidelines. Illustrative names, dates and screenshots are design inputs. The programme must supply its final dates and document rules.

Applicants enter through `/login`, `/portal` and `/workspace`. Staff keep their separate `/staff` entry and staff session. There is no applicant-to-staff role switch.

| Applicant task | Frontend behaviour | Service responsibility |
| --- | --- | --- |
| Decide whether to apply | Programme checklist, anonymous eligibility guidance, correction of answers and printable checklist | Published programme rules and dates; final eligibility decision |
| Reuse personal/company details | Editable contact/company profile, shareholders, calculated youth citizen shareholding, contact preferences | Verified account, ownership and officer verification |
| Prepare an application | Separate drafts; About you, Your business, Your idea, Budget, Documents, Review; field help, counters and actionable validation | Cross-device draft sync and authoritative validation |
| Provide evidence | PDF/DOCX/JPG/PNG, 10 MB per file, maximum 10 attachments; signature/size/expiry checks, photo resizing, SHA-256 integrity checks; persisted file bytes in IndexedDB; download, detach, replace and reuse | Quarantine, virus scanning, sanitised previews, encrypted server storage, resumable remote transport and retention |
| Review and submit | Completeness guard, review/change links, declaration, duplicate-click guard, separate immutable snapshot, local reference, text copy and browser Print / Save PDF | Official reference, durable receipt, email/SMS delivery and actual delivery to CEDA |
| Track work | Application/draft search and filters, six-stage tracker, recorded events, expected dates/action requests when supplied, expiry alerts | Authorised stage transitions, targets, delay reasons and reminders |
| Read updates | Messages, unread filter/count, mark read/all read, application links | Live notification events and email/SMS delivery |
| Correct or amend | Explicit update action, correction explanation, deadline gate, unchanged reference, version selector preserving old answers and file metadata | Permission to revise, deadline enforcement and independent server snapshots |
| Understand the outcome | Released feedback, supplied outcome/reason/next steps, review-request form when allowed, opt-in referral contact consent | Release authority, review decisions and referral execution |
| Get support | Field guidance, programme checklist, FAQs, mobile layout, keyboard focus and saved data-light preference | Approved Setswana translations, assisted-application consent workflow, real-device/accessibility acceptance |

## Local data and migration

- Metadata is saved under `ceda.applicant.v2`. Existing `ceda.prototype.v1` records are migrated without deleting the original browser copy.
- File contents are saved in IndexedDB, separately from JSON form data. A file is attached only after its storage transaction completes.
- File replacement creates a new file record. Submitted versions keep the original document IDs and checksums.
- A failed storage write does not clear a draft or create a receipt. A missing or changed file blocks submission.
- A local reference is visibly prefixed `CEDA-LOCAL`. It is not an official CEDA receipt. The frontend does not certify identity, eligibility, virus scanning, server-side permissions or delivery.
- Account authentication, server integration and backend changes are deferred at the user's instruction. Existing staff changes are preserved.

## Verification

Run `npm test` for the existing suite and `node --test src/utils/applicantWorkflow.test.js` for ownership boundaries, budget validation, attachment constraints, expiry, amendment permissions, snapshot isolation and return-route regressions. Run `npm run build` and check real file selection/download/reload in the browser. Emulated viewport checks do not replace physical-device or accessibility acceptance.
