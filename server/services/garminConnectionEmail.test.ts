import test from 'node:test';
import assert from 'node:assert/strict';
import { emailService } from './email';

test('Garmin admin alert uses existing sender, fixed admin recipient and escaped account details only', async () => {
  const original = emailService.sendEmail;
  const captured: any[] = [];
  emailService.sendEmail = async (options, attempts) => { captured.push({options,attempts}); return true; };
  try {
    assert.equal(await emailService.sendGarminConnectionNotification({userId:42,firstName:'<img src=x>',lastName:'Runner & Friend',email:'runner+test@example.test'}),true);
    const {options,attempts} = captured[0];
    assert.equal(captured.length,1);
    assert.equal(options.to,'hello@bigappledigital.nyc');
    assert.equal(options.subject,'Garmin Connected - RunAnalytics');
    assert.equal(attempts,1);
    assert.match(options.html,/&lt;img src=x&gt;/);
    assert.match(options.html,/Runner &amp; Friend/);
    assert.doesNotMatch(options.html,/<img src=x>/);
    assert.match(options.text,/User ID: 42/);
    assert.match(options.text,/ET/);
    assert.match(options.text,/not receipt of the first activity/);
    assert.match(options.text,/separate consent/);
    assert.doesNotMatch(JSON.stringify(options),/access_token|refresh_token|code_verifier|sleepSeconds|hrvAverage/);
    await emailService.sendGarminConnectionNotification({userId:43});
    assert.match(captured[1].options.html,/name not provided/);
    assert.match(captured[1].options.html,/email not provided/);
    emailService.sendEmail = async () => false;
    assert.equal(await emailService.sendGarminConnectionNotification({userId:44}),false);
  } finally { emailService.sendEmail = original; }
});
