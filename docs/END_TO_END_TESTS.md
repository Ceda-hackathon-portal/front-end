# Applicant-to-staff browser checks

Run from the `front-end` repository:

```powershell
npm ci
npm test
npm run test:e2e
```

On Windows the browser suite uses an installed Google Chrome. On another platform, install Playwright Chromium first with `npx playwright install chromium`. `CEDA_E2E_CHANNEL` can select another installed Playwright browser channel.

The end-to-end command builds the frontend, starts a separate preview server on `127.0.0.1:4173`, runs the browser checks and closes the preview server. It refuses to reuse an existing server, so it cannot accidentally test a different checkout. Leave that port free. The development portal can continue on port 5174.

## What the suite exercises

| Journey | Evidence checked |
| --- | --- |
| Homepage slideshow | Desktop/mobile slides use web-sized photographs with no previous static hero underneath; manual controls, autoplay hover/focus pause, reduced motion, image-load failure and scroll shape are checked. |
| Selected application | Real form submission and file upload; already-open leader/officer/management tabs update; assigned reviewers see the record; independent reviewers submit concurrently; programme progress and counts update; an authorised outcome reaches the applicant. |
| Correction and non-selection | A dated correction appears on the applicant's current page; the response creates a new version and resets screening; staff see the new evidence; non-selection reaches the applicant; review grounds and support-contact consent reach authorised staff; the staff response returns to the applicant. |
| Stale applicant draft | An old tab cannot replace newer saved answers or remove the uploaded file. Reopen saved draft loads the latest record without signing out. |
| Stale reviewer draft | Two tabs for one reviewer cannot overwrite a newer saved review. Reopening loads the saved comments. |
| Reviewer conflict | Declaring a conflict immediately removes case access and updates the leader's assignment view. |
| Applicant/staff write race | Concurrent draft autosaves and review drafts/submission retain both records across repeated simultaneous saves. |
| Failed durable save | A quota failure leaves the draft intact, reports failure and retries without a false or duplicate receipt. |
| Stale assignment editor | An old leader tab cannot replace a newer set of assigned reviewers. Cancel and reopen loads the latest choices. |

The tests use a fresh isolated browser context per scenario and a synthetic PDF fixture. They do not alter the user's browser profile or saved applications. Illustrative seed records are excluded through the normal screening UI when exercising scoring closure for the fictional test intake.

Assertions inspect the rendered queues, files, statuses, outcome text and management counts. Storage is read only where necessary to prove a stale write did not replace the saved record. A passing test does not rely on a forced success response or a mocked application API.

## Failures and test artifacts

The suite has no automatic retries. On failure, Playwright keeps screenshots and traces in ignored `test-results/`. Open a trace with:

```powershell
npx playwright show-trace "test-results/<failed-test>/trace.zip"
```

The initial live-tabs reproduction on 21 November 2026 saved an applicant submission while the already-open leader still showed no matching application and management stayed at 8 instead of 9. The current tests assert that both screens update without reloading. They also guard against whole-store writes erasing submissions, reviews or assignments saved in another tab.

## Verified boundary

These checks cover the current browser-local frontend and its supplied 2026 sample intake. Role tabs share one origin and browser storage. Every metadata write uses the same Web Lock; browsers without safe shared-write support retain their data and report that saving is unavailable. Real accounts, separate devices, server-side permissions, central file scanning, authoritative audit records and email/SMS delivery still require the backend. Browser storage and browser locks do not replace those services.

## Responsive image assets

All 26 tracked JPEG/PNG photographs and illustrations have WebP copies in `public/images/optimized/` at 960 px and 1920 px maximum width, quality 76. Full aspect ratio and orientation are retained. The small 9 KB CEDA logo stays in its original format to keep lettering crisp. Original photos and the unrelated local image remain untouched.

The source set totals 34,457,941 bytes. The 960 px set totals 1,166,494 bytes and the 1920 px set totals 3,295,424 bytes. These are whole-library totals; pages load only their own images. Actual transfer depends on viewport size and pixel density. `docs/image-sizes.json` lists each file. To regenerate, install Pillow in a development Python environment and run `python scripts/optimize_images.py`.

`OptimizedImage` supplies responsive candidates and asynchronous decoding. Below-fold images are lazy-loaded; visible applicant/staff heroes and the first homepage slide receive priority. The decorative login image is lazy-loaded so it is not requested when hidden on narrow screens. The hero has a flat loading background instead of the previous `ceda-hero1.png`. Its existing scroll shape updates at most once per frame and skips unchanged progress; reduced motion disables that animation.

Run `npm run build` followed by `npx playwright test tests/e2e/home-hero.spec.js` for slideshow regressions. Desktop/mobile layout checks cover the split drone section, grey brand ribbon, black footer, feedback file download, no horizontal overflow and applicant/staff image loading. A performance measurement is not a guarantee of a particular device's frame rate.

The grey strip currently uses CEDA's own mark and motto. Sponsor identities have not been supplied, so it does not claim external sponsorship. The feedback form prepares a downloadable text file; it does not claim to deliver feedback to an inbox.
