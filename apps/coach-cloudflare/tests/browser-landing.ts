import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {
  const page=await browser.newPage();
  for (const width of [1440,390]) {
    await page.setViewport({width,height:1000});await page.goto('http://127.0.0.1:8787');
    await page.waitForSelector('#waitlist-email');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:`test-results/landing-${width}.png`,fullPage:true});
  }
  await page.locator('#waitlist-email').fill(`landing-${Date.now()}@example.com`);
  await page.locator('input[name="consent"]').click();
  await page.locator('form button').click();
  await page.waitForSelector('.launch-success');
  assert.match(await page.$eval('.launch-success',el=>el.textContent||''),/on the list/);
  await page.goto('http://127.0.0.1:8787/preview');
  await page.waitForSelector('.app-shell');
} finally {await browser.close();}
