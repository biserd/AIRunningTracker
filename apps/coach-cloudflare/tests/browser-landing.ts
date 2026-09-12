import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {
  const page=await browser.newPage();
  for (const width of [1440,390]) {
    await page.setViewport({width,height:740});await page.goto('http://127.0.0.1:8787');
    await page.waitForSelector('#waitlist-email');
    assert.equal(await page.evaluate(()=>['#waitlist-email','#waitlist button','input[name="consent"]'].every(s=>{const r=document.querySelector(s)!.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;})),true,'Signup controls must be above the fold');
    assert.equal(await page.$('a[href*="/preview"]'),null);
    assert.equal(await page.$('.launch-preview'),null);
    assert.match(await page.$eval('h1',el=>el.textContent||''),/Your coach listens/);
    await page.$eval('.launch-editorial',el=>el.scrollIntoView());
    await page.waitForFunction(()=>Array.from(document.querySelectorAll('.launch-page img')).every(img=>img instanceof HTMLImageElement && img.complete && img.naturalWidth>0));
    await page.evaluate(()=>window.scrollTo(0,0));
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
