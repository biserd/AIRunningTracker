import puppeteer from "puppeteer-core";
import assert from "node:assert/strict";
import type {Snapshot} from '../shared/coach';
const browser = await puppeteer.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
try {
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  let proposal: unknown;
  await page.setRequestInterception(true);
  page.on("request", (r) => {
    if (r.url().endsWith("/api/ai/status"))
      void r.respond({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ configured: true, history: [] }),
      });
    else if (r.url().endsWith("/api/ai/chat"))
      void r.respond({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message:
            "Twenty easy minutes can fit. Review the proposed change before saving.",
          proposal,
        }),
      });
    else void r.continue();
  });
  await page.setViewport({ width: 390, height: 844 });
  await page.goto(process.env.TEST_BASE_URL || "http://127.0.0.1:8787");
  await page.locator("::-p-text(Explore the coach preview)").click();
  await page.waitForSelector(".recommendation");
  proposal = await page.evaluate(async () => {
    const state = await (await fetch("/api/state")).json() as Snapshot;
    const day = state.state.days.find(
      (d: { completed: boolean; minutes: number }) =>
        !d.completed && d.minutes > 20,
    );
    return (
      await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dayId: day!.id, kind: "shorten", minutes: 20 }),
      })
    ).json();
  });
  await page
    .locator('input[aria-label="Ask about your sample plan"]')
    .fill("I only have 20 minutes.");
  await page.locator('button[aria-label="Send message"]').click();
  await page.waitForSelector(".chat-message.assistant");
  const before = await page.evaluate(
    async () => (await (await fetch("/api/state")).json() as Snapshot).version,
  );
  assert.equal(before, 1);
  await page.locator("::-p-text(Review adjustment)").click();
  await page.waitForSelector("dialog[open]");
  await page.locator("::-p-text(Confirm change)").click();
  await page.waitForFunction(() => !document.querySelector("dialog[open]"));
  const after = await page.evaluate(
    async () => (await (await fetch("/api/state")).json() as Snapshot).version,
  );
  assert.equal(after, 2);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  assert.deepEqual(errors, []);
  console.log(
    "Mock-provider mobile chat, proposal review and real D1 confirmation passed.",
  );
} finally {
  await browser.close();
}
