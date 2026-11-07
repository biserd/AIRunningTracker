import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emailService } from './email';

test('Cloudflare path refuses unselected lifecycle campaigns', async () => {
  const result = await emailService.sendDripEmail({
    to: 'runner@example.com', subject: 'Test', previewText: 'Test', bodyText: 'Test',
    ctaText: 'Review', ctaUrl: 'https://aitracker.run/pricing',
    unsubscribeUrl: 'https://aitracker.run/settings', userName: 'Runner',
    step: 'PEN1', campaign: 'preview_engaged_no_trial',
  });
  assert.deepEqual(result, { success: false, error: 'cloudflare_recovery_only' });
});

test('only the explicitly enabled signup sequence is allowed, with suppression, final eligibility and one-click unsubscribe intact', async () => {
  const originalFlag = process.env.ENABLE_SIGNUP_PAYMENT_REMINDERS;
  const originalCheck = emailService.checkCloudflareSuppression;
  const originalSend = emailService.sendEmailDetailed;
  let sends = 0, captured: any;
  const options = { to: 'fixture@example.test', subject: 'Test', previewText: 'Test', bodyText: 'Test', ctaText: 'Review', ctaUrl: 'https://aitracker.run/pricing', unsubscribeUrl: 'https://aitracker.run/api/marketing/unsubscribe?token=fixture', userName: 'Runner', step: 'DAY1', campaign: 'signup_unpaid' };
  try {
    delete process.env.ENABLE_SIGNUP_PAYMENT_REMINDERS;
    assert.equal((await emailService.sendDripEmail(options)).success, false);
    process.env.ENABLE_SIGNUP_PAYMENT_REMINDERS = 'true';
    emailService.checkCloudflareSuppression = async () => ({status:'unavailable'});
    assert.equal((await emailService.sendDripEmail(options)).error, 'cloudflare_suppression_check_unavailable');
    emailService.checkCloudflareSuppression = async () => ({status:'suppressed', reason:'complaint'});
    assert.equal((await emailService.sendDripEmail(options)).error, 'cloudflare_suppressed_complaint');
    emailService.checkCloudflareSuppression = async () => ({status:'clear'});
    emailService.sendEmailDetailed = async (value, retries) => { assert.equal(retries, 0); sends++; captured = value; return {success:true}; };
    assert.equal((await emailService.sendDripEmail({...options,beforeSend:async()=>false})).error, 'recipient_no_longer_eligible');
    assert.equal(sends, 0);
    assert.equal((await emailService.sendDripEmail({...options,beforeSend:async()=>true})).success, true);
    assert.equal(sends, 1);
    assert.equal(captured.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');
    assert.ok(captured.html.includes('Unsubscribe'));
    assert.equal((await emailService.sendDripEmail({...options,step:'DAY30'})).success, false);
  } finally {
    emailService.checkCloudflareSuppression = originalCheck; emailService.sendEmailDetailed = originalSend;
    if (originalFlag === undefined) delete process.env.ENABLE_SIGNUP_PAYMENT_REMINDERS; else process.env.ENABLE_SIGNUP_PAYMENT_REMINDERS = originalFlag;
  }
});
