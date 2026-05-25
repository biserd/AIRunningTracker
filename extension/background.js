// background.js — RunAnalytics extension service worker.
// Two jobs: (1) accept auth tokens from the aitracker.run web app via
// externally_connectable messaging, and (2) open the onboarding tab on first install.

const ONBOARDING_URL = 'https://aitracker.run/auth?utm_source=extension_install';

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: ONBOARDING_URL });
  }
});

// Strict origin validation: parse the URL and enforce
//   - protocol === https:
//   - hostname === aitracker.run  OR  hostname ends with '.aitracker.run'
// This avoids substring tricks like https://aitracker.run.attacker.com
// (which would pass a naive endsWith / startsWith check).
function isAllowedOrigin(originOrUrl) {
  if (!originOrUrl || typeof originOrUrl !== 'string') return false;
  let parsed;
  try {
    parsed = new URL(originOrUrl);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  const host = parsed.hostname.toLowerCase();
  return host === 'aitracker.run' || host.endsWith('.aitracker.run');
}

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  const candidate = sender.origin || sender.url || '';
  if (!isAllowedOrigin(candidate)) {
    sendResponse({ success: false, error: 'Unauthorized origin' });
    return true;
  }

  if (!message || typeof message !== 'object' || typeof message.type !== 'string') {
    sendResponse({ success: false, error: 'Invalid message' });
    return true;
  }

  if (message.type === 'RA_AUTH_TOKEN') {
    const token = message.token;
    // Basic JWT shape: three dot-separated base64url segments, reasonable length.
    if (typeof token !== 'string' || token.length < 20 || token.length > 4096 || token.split('.').length !== 3) {
      sendResponse({ success: false, error: 'Invalid token' });
      return true;
    }
    const user = message.user && typeof message.user === 'object' ? {
      firstName: typeof message.user.firstName === 'string' ? message.user.firstName : null,
      email: typeof message.user.email === 'string' ? message.user.email : null,
    } : null;
    chrome.storage.local.set({ raToken: token, raUser: user }, () => sendResponse({ success: true }));
    return true;
  }

  if (message.type === 'RA_LOGOUT') {
    chrome.storage.local.remove(['raToken', 'raUser'], () => sendResponse({ success: true }));
    return true;
  }

  sendResponse({ success: false, error: 'Unknown message type' });
  return true;
});
