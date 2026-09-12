import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {
 const page=await browser.newPage();
 await page.setRequestInterception(true);
 page.on('request',req=>{if(req.url().endsWith('/api/ai/status'))void req.respond({status:200,contentType:'application/json',body:JSON.stringify({configured:true,history:[]})});else void req.continue();});
 await page.goto((process.env.TEST_BASE_URL || 'http://127.0.0.1:8787')+'/preview');
 await page.waitForSelector('.welcome .primary');await page.click('.welcome .primary');await page.waitForSelector('.coach-composer');
 for(const width of [1440,390]){
  await page.setViewport({width,height:850});
  assert.equal(await page.$('.sidebar'),null);assert.equal(await page.$('.recommendation'),null);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const voice=await page.$('.voice-primary button');assert.ok(voice);const box=await voice.boundingBox();assert.ok(box && box.y<850 && box.height>=44);
  await page.screenshot({path:`test-results/chat-first-${width}.png`,fullPage:true});
 }
 await page.type('input[aria-label="Ask about your sample plan"]','Show a distance chart');await page.click('button[aria-label="Send message"]');await page.waitForSelector('.running-chart');
 assert.equal(await page.$$('.distance-row').then(x=>x.length),4);
 await page.type('input[aria-label="Ask about your sample plan"]','Show my week');await page.click('button[aria-label="Send message"]');await page.waitForSelector('.chat-attachment button.secondary');
 await page.click('.chat-attachment button.secondary');await page.waitForSelector('.week-full');
 await page.click('button[aria-label="Settings"]');await page.waitForSelector('.settings-card .reminder-panel');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 console.log('Chat-first desktop/mobile, visible voice control, inline chart/plan and Settings passed.');
}finally{await browser.close();}
