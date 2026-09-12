import puppeteer from "puppeteer-core";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const browser = await puppeteer.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const page = await browser.newPage();
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(String(e)));
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:8787";
async function click(text: string) {
  const button = await page.waitForSelector(`::-p-text(${text})`);
  await button!.click();
}
try {
  await mkdir("test-results", { recursive: true });
  await page.setViewport({ width: 1440, height: 1050 });
  await page.goto(base);
  await click("Explore the coach preview");
  await page.waitForSelector(".recommendation");
  await page.screenshot({
    path: "test-results/coach-desktop.png",
    fullPage: true,
  });
  await click("I have less time");
  await page.waitForSelector("dialog[open]");
  await click("Review adjustment");
  await page.waitForSelector(".changes");
  await click("Confirm change");
  await page.waitForFunction(() => !document.querySelector("dialog[open]"));
  await page.reload();
  await page.waitForSelector(".recommendation");
  await click("Open my week");
  await page.waitForSelector(".week-full");
  assert(await page.$("::-p-text(20 minutes)"));
  await click("Undo last change");
  await page.waitForSelector(".changes");
  await click("Confirm change");
  await page.waitForFunction(() => !document.querySelector("dialog[open]"));
  await page.setViewport({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/week-mobile.png",
    fullPage: true,
  });
  await page
    .locator("nav button")
    .filter((b) => b.textContent === "Coach")
    .click();
  await page.waitForSelector(".recommendation");
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    "mobile must not overflow horizontally",
  );
  await page.screenshot({
    path: "test-results/coach-mobile.png",
    fullPage: true,
  });
  await click("I feel tired");
  await page.waitForSelector("dialog[open]");
  await click("Keep my plan as it is");
  await page.waitForFunction(() => !document.querySelector("dialog[open]"));
  assert.deepEqual(errors, []);
  console.log(
    "Desktop/mobile, confirmation, D1 reload persistence, undo and cancel passed.",
  );
} finally {
  await browser.close();
}
