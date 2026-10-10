import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emailService } from './email';

test('Cloudflare path refuses promotional lifecycle campaigns', async () => {
  const result = await emailService.sendDripEmail({
    to: 'runner@example.com', subject: 'Test', previewText: 'Test', bodyText: 'Test',
    ctaText: 'Review', ctaUrl: 'https://aitracker.run/pricing',
    unsubscribeUrl: 'https://aitracker.run/settings', userName: 'Runner',
    step: 'PEN1', campaign: 'preview_engaged_no_trial',
  });
  assert.deepEqual(result, { success: false, error: 'cloudflare_recovery_only' });
});
