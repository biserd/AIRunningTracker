import puppeteer from "puppeteer-core";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
// This test MUST remain local: verification mail is read only from Miniflare's outbox.
const base = "http://127.0.0.1:8787",
  outbox = ".wrangler/tmp/email";
async function mailFiles() {
  return (await readdir(outbox, { recursive: true }).catch(() => [])).filter(
    (p) => p.endsWith(".txt"),
  );
}
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
  await page.setViewport({ width: 390, height: 844 });
  await page.goto(base + "/preview");
  await page.locator("::-p-text(Explore the coach preview)").click();
  await page.waitForSelector(".reminder-form");
  const before = await mailFiles();
  await page
    .locator('.reminder-form input[type="email"]')
    .fill(`local-${Date.now()}@example.test`);
  await page.locator("::-p-text(Verify my email)").click();
  await page.waitForSelector('input[autocomplete="one-time-code"]');
  const added = (await mailFiles()).filter((p) => !before.includes(p));
  assert.equal(added.length, 1);
  const code = (await readFile(join(outbox, added[0]), "utf8")).match(
    /code is ([A-F0-9]{12})/,
  )![1];
  await page.locator('input[autocomplete="one-time-code"]').fill(code);
  await page.locator("::-p-text(Confirm email)").click();
  await page.waitForSelector(".reminder-address");
  await page.locator("::-p-text(Create a reminder yourself)").click();
  await page
    .locator('input[placeholder="Lay out my running kit"]')
    .fill("Prepare my running kit");
  await page.$eval('input[type="datetime-local"]', (element) => {
    const next = new Date(Date.now() + 3600000),
      local = new Date(next.getTime() - next.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!;
    setter.call(element, local);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.locator("::-p-text(Review reminder)").click();
  await page.waitForSelector(".reminder-review");
  await page.locator("::-p-text(Confirm reminder)").click();
  await page.waitForSelector(
    "::-p-text(Reminder scheduled. You can close this page.)",
  );
  await page.reload();
  await page.waitForSelector(".reminder-list");
  assert(await page.$("::-p-text(Prepare my running kit)"));
  await page.locator("::-p-text(Cancel reminder)").click();
  await page.locator("::-p-text(Confirm cancellation)").click();
  await page.waitForSelector("::-p-text(Reminder cancelled.)");
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  assert.deepEqual(errors, []);
  console.log(
    "Local native-email verification, mobile reminder confirmation, reload and cancellation passed. No external email sent.",
  );
} finally {
  await browser.close();
}
