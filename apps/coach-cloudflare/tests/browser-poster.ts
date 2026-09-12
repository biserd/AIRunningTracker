import puppeteer from "puppeteer-core";
import assert from "node:assert/strict";
const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
try {
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:5173");
  const dimensions = await page.evaluate(async () => {
    // A neutral fixture tests the composed poster without billing an image request.
    const art = document.createElement("canvas"); art.width = art.height = 1024;
    const ctx = art.getContext("2d")!;
    const gradient = ctx.createLinearGradient(0, 0, 1024, 1024);
    gradient.addColorStop(0, "#b5cbb0"); gradient.addColorStop(1, "#354f40");
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 1024, 1024);
    const { renderPoster } = await import("/src/poster.ts" as string);
    const url = await renderPoster(art.toDataURL(), { totalRuns: 16, totalKm: 104, from: "2026-08-01", to: "2026-08-28" });
    const image = new Image(); image.src = url; await image.decode();
    document.body.replaceChildren(image);
    image.style.cssText = "width:720px;display:block";
    return [image.naturalWidth, image.naturalHeight];
  });
  assert.deepEqual(dimensions, [1440, 1800]);
  await page.setViewport({width: 740, height: 930});
  await page.screenshot({path: "test-results/poster.png"});
} finally { await browser.close(); }
