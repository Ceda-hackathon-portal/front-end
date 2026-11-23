// Real API/PostgreSQL and native WebRTC acceptance. Requires scripts/service-preview.mjs.
import { chromium, firefox, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const fixture = JSON.parse(
  readFileSync("../backend-api/.runtime/service-browser-session.json", "utf8"),
);
mkdirSync(".qa/service", { recursive: true });
const channel = process.env.CEDA_SERVICE_BROWSER || "chrome";
const subject = "Document help — " + channel + " " + Date.now();
const folder = ".qa/service/" + channel;
mkdirSync(folder, { recursive: true });
const browser =
  channel === "firefox"
    ? await firefox.launch({
        headless: true,
        firefoxUserPrefs: {
          "media.navigator.streams.fake": true,
          "media.navigator.permission.disabled": true,
          "media.autoplay.default": 0,
        },
      })
    : await chromium.launch({
        channel,
        headless: true,
        args: [
          "--use-fake-device-for-media-stream",
          "--use-fake-ui-for-media-stream",
          "--autoplay-policy=no-user-gesture-required",
        ],
      });
const applicant = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  permissions: channel === "firefox" ? [] : ["microphone"],
});
const staff = await browser.newContext({
  viewport: { width: 1600, height: 1100 },
  permissions: channel === "firefox" ? [] : ["microphone"],
});
const failures = [],
  evidence = {
    environment:
      "isolated PostgreSQL, synthetic identities, real API and native WebRTC; test audio source; fixed working-hours clock",
  };
for (const [context, person] of [
  [applicant, fixture.applicant],
  [staff, fixture.agent],
]) {
  await context.addCookies([
    {
      name: "dev_ceda_session",
      value: person.raw,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  await context.addInitScript(() => {
    const Native = window.RTCPeerConnection;
    window.__servicePeers = [];
    window.RTCPeerConnection = class extends Native {
      constructor(...args) {
        super(...args);
        window.__servicePeers.push(this);
      }
    };
  });
}
const a = await applicant.newPage(),
  s = await staff.newPage();
for (const page of [a, s])
  page.on("pageerror", (e) => failures.push(e.message));
try {
  await s.goto("http://localhost:5187/admin/support");
  await s.getByRole("checkbox").click();
  await expect(s.getByRole("checkbox")).toBeChecked();
  await a.goto("http://localhost:5187/portal");
  await a
    .getByRole("button", { name: "Open CEDA support", exact: true })
    .click();
  await a.getByLabel("What do you need help with?").fill(subject);
  await a.getByLabel("Related application").selectOption(fixture.applicationId);
  await a
    .getByRole("button", { name: "Start conversation", exact: true })
    .click();
  await a
    .getByLabel("Your message", { exact: true })
    .fill("Which proposal document should I upload?");
  await a.getByRole("button", { name: "Send", exact: true }).click();
  await s.getByRole("button").filter({ hasText: subject }).first().click();
  await expect(
    s.getByText("Which proposal document should I upload?", { exact: true }),
  ).toBeVisible();
  await s
    .getByRole("button", { name: "Take conversation", exact: true })
    .click();
  await s
    .getByLabel("Your message", { exact: true })
    .fill("Please attach your technical proposal in the Documents step.");
  await s.getByRole("button", { name: "Send", exact: true }).click();
  await expect(
    a.getByText(
      "Please attach your technical proposal in the Documents step.",
      { exact: true },
    ),
  ).toBeVisible();
  await s.getByRole("button", { name: "Internal note", exact: true }).click();
  await s
    .getByLabel("Internal note", { exact: true })
    .fill("Internal verification note, not for the applicant.");
  await s.getByRole("button", { name: "Send", exact: true }).click();
  await expect(
    s.getByText("Internal verification note, not for the applicant.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    a.getByText("Internal verification note, not for the applicant.", {
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    s.getByRole("link", { name: "Open application", exact: false }),
  ).toHaveAttribute("href", "/admin/applications/" + fixture.applicationId);
  evidence.messagesBothDirections = true;
  evidence.internalNoteIsolation = true;
  evidence.contextualApplicationLink = true;
  await s.screenshot({
    path: folder + "/consultant-inbox.png",
    fullPage: true,
  });
  await a.screenshot({
    path: folder + "/applicant-drawer.png",
    fullPage: true,
  });
  await a
    .getByRole("button", { name: "Start audio call", exact: true })
    .click();
  await expect(
    s
      .getByLabel("Audio call")
      .getByText("Incoming audio call", { exact: true }),
  ).toBeVisible();
  await s.getByRole("button", { name: "Accept", exact: true }).click();
  await expect(a.getByText("Audio connected", { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await expect(s.getByText("Audio connected", { exact: true })).toBeVisible({
    timeout: 30000,
  });
  async function packets(page) {
    return page.evaluate(async () => {
      let count = 0;
      for (const peer of window.__servicePeers) {
        for (const row of (await peer.getStats()).values())
          if (row.type === "inbound-rtp" && row.kind === "audio")
            count += row.packetsReceived || 0;
      }
      return count;
    });
  }
  await expect.poll(() => packets(a), { timeout: 10000 }).toBeGreaterThan(0);
  await expect.poll(() => packets(s), { timeout: 10000 }).toBeGreaterThan(0);
  evidence.nativeAudioPackets = {
    applicant: await packets(a),
    staff: await packets(s),
  };
  writeFileSync(
    folder + "/audio-evidence.json",
    JSON.stringify(evidence, null, 2),
  );
  await a.getByRole("button", { name: "End call", exact: true }).click();
  await expect(s.getByText("Call ended", { exact: true })).toBeVisible();
  await a
    .getByRole("dialog", { name: "CEDA support" })
    .getByRole("button", { name: "Close support", exact: true })
    .click();
  // A recipient on another page still receives and can open an incoming invitation.
  await s
    .getByRole("button", { name: "Start audio call", exact: true })
    .click();
  await expect(a.locator(".sc-incoming-toast")).toBeVisible();
  await a
    .locator(".sc-incoming-toast")
    .getByRole("button", { name: "Open conversation" })
    .click();
  await a.getByRole("button", { name: "Accept", exact: true }).click();
  await expect(a.getByText("Audio connected", { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await a.getByRole("button", { name: "End call", exact: true }).click();
  await a
    .getByRole("dialog", { name: "CEDA support" })
    .getByRole("button", { name: "Close support", exact: true })
    .click();
  evidence.backgroundCallInvitation = true;
  // Simulate the browser permission dependency failing, then exercise the real UI and call API recovery.
  await a.evaluate(()=>{const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);window.__deniedMediaAttempts=0;window.__restoreMedia=()=>{navigator.mediaDevices.getUserMedia=original;};navigator.mediaDevices.getUserMedia=async()=>{window.__deniedMediaAttempts++;throw new DOMException('Permission denied for acceptance test','NotAllowedError');};});
  await s.getByRole('button',{name:'Start audio call',exact:true}).click();
  await expect(a.locator('.sc-incoming-toast')).toBeVisible();
  await a.locator('.sc-incoming-toast').getByRole('button',{name:'Open conversation'}).click();
  await a.getByRole('button',{name:'Accept',exact:true}).click();
  await expect(a.getByText(/Microphone permission was denied/)).toBeVisible();
  await expect(s.getByText('Call ended',{exact:true})).toBeVisible();
  expect(await a.evaluate(()=>window.__deniedMediaAttempts)).toBe(1);
  await a.evaluate(()=>window.__restoreMedia());
  await a.getByRole('dialog',{name:'CEDA support'}).getByRole('button',{name:'Close support',exact:true}).click();
  evidence.simulatedMicrophoneDenialRecovery=true;

  await s
    .getByRole("button", { name: "Resolve conversation", exact: true })
    .click();
  await expect(s.locator(".sc-resolved")).toContainText("resolved");
  evidence.resolution = true;
  await a.goto("http://localhost:5187/workspace/messages");
  await expect(
    a.getByRole("heading", { name: "Your conversations" }),
  ).toBeVisible();
  evidence.connectedMessagesPage = true;
  await s.goto("http://localhost:5187/admin/insights");
  await expect(
    s.getByRole("heading", { name: "Participation trend", exact: false }),
  ).toBeVisible();
  await expect(
    s.getByRole("img", { name: /Daily participation: 1 applications created/ }),
  ).toBeVisible();
  await s.screenshot({ path: folder + "/insights.png", fullPage: true });
  await s.goto("http://localhost:5187/admin/activity");
  await expect(
    s.getByRole("cell", { name: "support.message_sent", exact: true }).first(),
  ).toBeVisible();
  await s.screenshot({ path: folder + "/activity.png", fullPage: true });
  await a.setViewportSize({ width: 390, height: 844 });
  await a.goto("http://localhost:5187/portal");
  await a
    .getByRole("button", { name: "Open CEDA support", exact: true })
    .click();
  await expect(a.getByRole("dialog", { name: "CEDA support" })).toBeVisible();
  evidence.mobileOverflow = await a.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  await a.screenshot({
    path: folder + "/applicant-mobile.png",
    fullPage: true,
  });
  evidence.pageErrors = failures;
  expect(failures).toEqual([]);
  expect(evidence.mobileOverflow).toBe(false);
  console.log(JSON.stringify(evidence, null, 2));
  writeFileSync(
    folder + "/browser-evidence.json",
    JSON.stringify(evidence, null, 2),
  );
} catch (error) {
  await a.screenshot({
    path: folder + "/applicant-failure.png",
    fullPage: true,
  });
  await s.screenshot({ path: folder + "/staff-failure.png", fullPage: true });
  throw error;
} finally {
  await browser.close();
}
