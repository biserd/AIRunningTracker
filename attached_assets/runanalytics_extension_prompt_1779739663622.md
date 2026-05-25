# RunAnalytics Chrome Extension — AI Developer Prompt

> **Instructions for use:** Paste this entire document as the system prompt in Cursor, Claude, or your AI coding assistant of choice. It contains everything needed to build the RunAnalytics Chrome Extension from scratch — architecture, all file contents, design system, API contracts, and testing checklist. Do not skip sections. Build files in the order they appear.

---

## 1. Mission & Philosophy

You are building the **RunAnalytics Chrome Extension** — a Manifest V3 Chrome extension that injects AI-powered running intelligence directly into Strava activity pages.

**Core purpose:** This extension is a distribution and conversion layer for RunAnalytics (aitracker.run), an AI-powered running analytics SaaS. It surfaces AI insights (run briefs, Runner Score, Readiness, Injury Risk) inside Strava — where runners are already at peak engagement — without replacing Strava.

**Three audiences, three states:**
1. **Unauthenticated visitors** → see a teaser panel (locked state) → drives signups
2. **Authenticated users, active trial/subscription** → see full AI brief → drives retention
3. **Authenticated users, expired trial** → see blurred state → drives upgrades

Every pixel must feel native to Strava's UI — not a foreign widget. Every CTA includes UTM tracking.

---

## 2. Tech Stack & Constraints

| Concern | Decision |
|---|---|
| Manifest version | V3 (required for Chrome Web Store) |
| Framework | Plain HTML/CSS/JS — no React, no Vue, no build tools |
| Bundler | None — zero build step for V1 |
| Dependencies | Zero npm packages, zero CDN imports |
| Location in repo | `/extension` folder inside the existing `aitracker.run` repo |
| API base URL | `https://aitracker.run/api` |
| Auth mechanism | Bearer token stored in `chrome.storage.local` |
| Strava API | **Never call directly** — all data comes from RunAnalytics backend |
| Token key | `raToken` — never use `localStorage`, always `chrome.storage.local` |
| Fetch timeout | 8 seconds on all API calls, with graceful error handling |
| CSS scope | All styles scoped to `#runanalytics-panel` and `.popup-body` to avoid Strava conflicts |
| Layout safety | `box-sizing: border-box` everywhere, no global CSS resets |

---

## 3. File Structure

Create the following structure inside the repo:

```
/extension
├── manifest.json
├── content.js          ← injects panel into Strava activity pages
├── popup.html          ← shown when user clicks extension icon
├── popup.js
├── background.js       ← service worker; handles auth token storage
├── styles.css          ← shared styles for content panel + popup
├── TEST.md             ← manual testing checklist
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## 4. Design System

Match these values **exactly** throughout all HTML and CSS:

```css
/* Color palette */
--orange:  #FC4C02;   /* brand, CTAs, labels, score */
--bg:      #F0EEE9;   /* warm off-white background */
--card:    #FFFFFF;   /* card surface */
--ink:     #181715;   /* primary text */
--ink-2:   #5C5B58;   /* secondary text */
--ink-3:   #A09F9C;   /* captions, muted */
--line:    #E8E6E1;   /* dividers */
--green:   #2A7A1C;   /* good readiness, low injury risk */
--amber:   #B85C00;   /* moderate readiness/risk */
--red:     #C0272D;   /* low readiness, high risk */

/* Typography */
font-family: -apple-system, "SF Pro Display", sans-serif;

/* Card */
background: #FFFFFF;
border-radius: 12px;
box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);

/* CTA button */
background: #FC4C02;
color: #FFFFFF;
border-radius: 8px;
padding: 12px 20px;
```

**Color logic for dynamic values:**
- Readiness score ≥ 80 → `--green`
- Readiness score 60–79 → `--amber`
- Readiness score < 60 → `--red`
- Injury Risk "Low" → `--green`
- Injury Risk "Med" → `--amber`
- Injury Risk "High" → `--red`

---

## 5. `manifest.json`

```json
{
  "manifest_version": 3,
  "name": "RunAnalytics for Strava",
  "version": "1.0.0",
  "description": "AI-powered run briefs, Runner Score, Readiness, and Injury Risk — injected directly into your Strava activity pages.",
  "permissions": ["storage"],
  "host_permissions": [
    "https://www.strava.com/*",
    "https://aitracker.run/*"
  ],
  "content_scripts": [
    {
      "matches": ["https://www.strava.com/activities/*"],
      "js": ["content.js"],
      "css": ["styles.css"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "background": {
    "service_worker": "background.js"
  },
  "web_accessible_resources": [
    {
      "resources": ["styles.css"],
      "matches": ["https://www.strava.com/*"]
    }
  ],
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

---

## 6. `background.js`

The service worker does two things only: receive/clear auth tokens from the web app, and open the onboarding tab on first install.

```javascript
// background.js

const ONBOARDING_URL = 'https://aitracker.run/auth?utm_source=extension_install';

// On first install, open the auth/onboarding page
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: ONBOARDING_URL });
  }
});

// Receive auth token from the RunAnalytics web app (auth bridge)
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  // Security check: only accept messages from the RunAnalytics domain
  if (!sender.origin || !sender.origin.startsWith('https://aitracker.run')) {
    sendResponse({ success: false, error: 'Unauthorized origin' });
    return true;
  }

  if (message.type === 'RA_AUTH_TOKEN') {
    chrome.storage.local.set({
      raToken: message.token,
      raUser: message.user  // { firstName, email }
    }, () => {
      sendResponse({ success: true });
    });
    return true; // Keep message channel open for async response
  }

  if (message.type === 'RA_LOGOUT') {
    chrome.storage.local.remove(['raToken', 'raUser'], () => {
      sendResponse({ success: true });
    });
    return true;
  }

  sendResponse({ success: false, error: 'Unknown message type' });
  return true;
});
```

---

## 7. `content.js`

The content script is injected on every `strava.com/activities/*` page. It:
1. Extracts the activity ID from the URL
2. Checks for a stored auth token
3. Fetches the AI brief from the RunAnalytics API
4. Renders the appropriate panel state
5. Uses MutationObserver to handle Strava's SPA navigation

```javascript
// content.js

const API_BASE = 'https://aitracker.run/api';
const PANEL_ID = 'runanalytics-panel';
const FETCH_TIMEOUT_MS = 8000;

// ─── Utility: fetch with timeout ────────────────────────────────────────────

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return response;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// ─── Utility: get activity ID from current URL ───────────────────────────────

function getActivityId() {
  const parts = window.location.pathname.split('/activities/');
  if (parts.length < 2) return null;
  const id = parts[1].split('/')[0].split('?')[0];
  return id || null;
}

// ─── Utility: get token from chrome.storage.local ────────────────────────────

function getStoredAuth() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['raToken', 'raUser'], (result) => {
      resolve({ token: result.raToken || null, user: result.raUser || null });
    });
  });
}

// ─── Utility: find the best injection point on the Strava page ───────────────

function findInjectionPoint() {
  return (
    document.querySelector('aside.activity-stats') ||
    document.querySelector('.activity-summary-container') ||
    document.querySelector('aside') ||
    document.getElementById('main')
  );
}

// ─── Utility: color class based on readiness score ───────────────────────────

function readinessColor(score) {
  if (score >= 80) return '#2A7A1C';
  if (score >= 60) return '#B85C00';
  return '#C0272D';
}

// ─── Utility: color class based on injury risk level ─────────────────────────

function injuryRiskColor(level) {
  const l = (level || '').toLowerCase();
  if (l === 'low') return '#2A7A1C';
  if (l === 'med' || l === 'medium') return '#B85C00';
  return '#C0272D';
}

// ─── Panel HTML builders ──────────────────────────────────────────────────────

function buildLoadingPanel() {
  return `
    <div id="${PANEL_ID}" class="ra-panel">
      <div class="ra-header">
        <span class="ra-logo">⚡ RunAnalytics</span>
      </div>
      <div class="ra-divider"></div>
      <div class="ra-skeleton-line ra-shimmer" style="width:90%;height:14px;margin-bottom:8px;"></div>
      <div class="ra-skeleton-line ra-shimmer" style="width:75%;height:14px;margin-bottom:8px;"></div>
      <div class="ra-skeleton-line ra-shimmer" style="width:60%;height:14px;margin-bottom:16px;"></div>
      <div style="display:flex;gap:8px;">
        <div class="ra-skeleton-pill ra-shimmer"></div>
        <div class="ra-skeleton-pill ra-shimmer"></div>
      </div>
    </div>
  `;
}

function buildLockedPanel() {
  const url = 'https://aitracker.run/auth?utm_source=extension&utm_medium=strava&utm_campaign=locked';
  return `
    <div id="${PANEL_ID}" class="ra-panel ra-locked">
      <div class="ra-header">
        <span class="ra-logo">⚡ RunAnalytics</span>
      </div>
      <div class="ra-divider"></div>
      <p class="ra-locked-title">Your AI run brief is ready</p>
      <p class="ra-locked-sub">Connect your RunAnalytics account to see AI analysis for every run.</p>
      <a href="${url}" target="_blank" rel="noopener" class="ra-cta">
        Connect free — 14 day trial →
      </a>
      <div class="ra-footer-link">
        <a href="https://aitracker.run" target="_blank" rel="noopener">aitracker.run</a>
      </div>
    </div>
  `;
}

function buildTrialExpiredPanel() {
  const url = 'https://aitracker.run/pricing?utm_source=extension';
  return `
    <div id="${PANEL_ID}" class="ra-panel">
      <div class="ra-header">
        <span class="ra-logo">⚡ RunAnalytics</span>
      </div>
      <div class="ra-divider"></div>
      <p class="ra-locked-title">Your brief is ready</p>
      <div class="ra-blurred-block ra-shimmer" aria-hidden="true">
        ████████████████████████████████████████████
      </div>
      <a href="${url}" target="_blank" rel="noopener" class="ra-cta">
        Resume trial →
      </a>
    </div>
  `;
}

function buildErrorPanel() {
  return `
    <div id="${PANEL_ID}" class="ra-panel ra-locked">
      <div class="ra-header">
        <span class="ra-logo">⚡ RunAnalytics</span>
      </div>
      <div class="ra-divider"></div>
      <p class="ra-locked-sub">Brief unavailable — <a href="https://aitracker.run/dashboard" target="_blank" rel="noopener" style="color:#FC4C02;">open RunAnalytics</a></p>
    </div>
  `;
}

function buildFullPanel(data, activityId) {
  const dashUrl = `https://aitracker.run/dashboard?utm_source=extension&activityId=${activityId}`;
  const readColor = readinessColor(data.readiness);
  const riskColor = injuryRiskColor(data.injuryRisk);

  return `
    <div id="${PANEL_ID}" class="ra-panel">
      <div class="ra-header">
        <span class="ra-logo">⚡ RunAnalytics</span>
        <span class="ra-score">Score: ${data.runnerScore}${data.grade || ''}</span>
      </div>
      <div class="ra-divider"></div>

      <div class="ra-section">
        <div class="ra-label">AI SUMMARY</div>
        <p class="ra-summary">${data.summary}</p>
      </div>

      <div class="ra-divider"></div>

      <div class="ra-pills">
        <div class="ra-pill">
          <div class="ra-pill-label">READINESS</div>
          <div class="ra-pill-value" style="color:${readColor};">${data.readiness}</div>
          <div class="ra-pill-tag" style="color:${readColor};">
            <span class="ra-dot" style="background:${readColor};"></span>
            ${data.readinessLabel || ''}
          </div>
        </div>
        <div class="ra-pill-divider"></div>
        <div class="ra-pill">
          <div class="ra-pill-label">INJURY RISK</div>
          <div class="ra-pill-value" style="color:${riskColor};">${data.injuryRisk}</div>
          <div class="ra-pill-tag" style="color:${riskColor};">
            <span class="ra-dot" style="background:${riskColor};"></span>
            ${data.injuryRiskLabel || ''}
          </div>
        </div>
      </div>

      <div class="ra-divider"></div>

      <a href="${dashUrl}" target="_blank" rel="noopener" class="ra-cta">
        Full analysis on RunAnalytics →
      </a>
    </div>
  `;
}

// ─── Panel injection ──────────────────────────────────────────────────────────

function injectPanel(html) {
  // Remove any existing panel first (idempotent)
  document.getElementById(PANEL_ID)?.remove();

  const wrapper = document.createElement('div');
  wrapper.innerHTML = html.trim();
  const panel = wrapper.firstChild;

  const target = findInjectionPoint();
  if (!target) return;

  // Prepend for aside elements, append for #main fallback
  if (target.id === 'main') {
    target.appendChild(panel);
  } else {
    target.insertBefore(panel, target.firstChild);
  }
}

// ─── Core initialization ──────────────────────────────────────────────────────

async function initPanel() {
  // Only run on activity pages
  if (!window.location.pathname.includes('/activities/')) return;

  const activityId = getActivityId();
  if (!activityId) return;

  // Show loading skeleton immediately
  injectPanel(buildLoadingPanel());

  const { token } = await getStoredAuth();

  if (!token) {
    injectPanel(buildLockedPanel());
    return;
  }

  try {
    const response = await fetchWithTimeout(
      `${API_BASE}/brief?stravaActivityId=${activityId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.status === 402) {
      injectPanel(buildTrialExpiredPanel());
      return;
    }

    if (response.status === 401) {
      // Token invalid or expired — treat as logged out
      chrome.storage.local.remove(['raToken', 'raUser']);
      injectPanel(buildLockedPanel());
      return;
    }

    if (!response.ok) {
      injectPanel(buildErrorPanel());
      return;
    }

    const data = await response.json();
    injectPanel(buildFullPanel(data, activityId));

  } catch (err) {
    // Network error, timeout, or abort
    injectPanel(buildErrorPanel());
  }
}

// ─── SPA navigation handler ───────────────────────────────────────────────────

let lastUrl = location.href;

new MutationObserver(() => {
  const currentUrl = location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    if (currentUrl.includes('/activities/')) {
      document.getElementById(PANEL_ID)?.remove();
      initPanel();
    } else {
      // Not an activity page — remove panel if present
      document.getElementById(PANEL_ID)?.remove();
    }
  }
}).observe(document, { subtree: true, childList: true });

// ─── Bootstrap ────────────────────────────────────────────────────────────────

initPanel();
```

---

## 8. `styles.css`

All styles are scoped to `#runanalytics-panel` and `.popup-body` to prevent any conflict with Strava's own CSS.

```css
/* ═══════════════════════════════════════════════════════════════
   RunAnalytics Extension Styles
   Scoped to #runanalytics-panel and .popup-body only
   ═══════════════════════════════════════════════════════════════ */

/* ── Shimmer animation ── */
@keyframes ra-shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}

/* ── Panel card (injected into Strava) ── */
#runanalytics-panel {
  all: initial;
  display: block;
  font-family: -apple-system, "SF Pro Display", sans-serif;
  box-sizing: border-box;
  background: #FFFFFF;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  padding: 16px;
  margin-bottom: 16px;
  width: 100%;
  border: 1px solid #E8E6E1;
}

#runanalytics-panel *,
#runanalytics-panel *::before,
#runanalytics-panel *::after {
  box-sizing: border-box;
  font-family: -apple-system, "SF Pro Display", sans-serif;
}

/* ── Header row ── */
#runanalytics-panel .ra-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

#runanalytics-panel .ra-logo {
  color: #FC4C02;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.2px;
  line-height: 1;
}

#runanalytics-panel .ra-score {
  color: #FC4C02;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
}

/* ── Divider ── */
#runanalytics-panel .ra-divider {
  height: 1px;
  background: #E8E6E1;
  margin: 12px 0;
  border: none;
}

/* ── Section label (e.g. AI SUMMARY) ── */
#runanalytics-panel .ra-label {
  font-size: 10px;
  font-weight: 700;
  color: #FC4C02;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  margin-bottom: 6px;
  line-height: 1;
}

/* ── AI summary text ── */
#runanalytics-panel .ra-summary {
  font-size: 14px;
  color: #181715;
  line-height: 1.5;
  margin: 0;
  padding: 0;
}

/* ── Pills row ── */
#runanalytics-panel .ra-pills {
  display: flex;
  align-items: stretch;
  gap: 0;
}

#runanalytics-panel .ra-pill {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px 0;
}

#runanalytics-panel .ra-pill-divider {
  width: 1px;
  background: #E8E6E1;
  margin: 0 16px;
  flex-shrink: 0;
}

#runanalytics-panel .ra-pill-label {
  font-size: 10px;
  font-weight: 600;
  color: #A09F9C;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  line-height: 1;
}

#runanalytics-panel .ra-pill-value {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.1;
}

#runanalytics-panel .ra-pill-tag {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
}

#runanalytics-panel .ra-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* ── CTA button ── */
#runanalytics-panel .ra-cta {
  display: block;
  background: #FC4C02;
  color: #FFFFFF !important;
  text-decoration: none !important;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  border-radius: 8px;
  padding: 12px 20px;
  width: 100%;
  cursor: pointer;
  transition: background 0.15s ease;
  line-height: 1.2;
  border: none;
  outline: none;
  margin-top: 4px;
}

#runanalytics-panel .ra-cta:hover {
  background: #E04300;
}

/* ── Locked / muted state ── */
#runanalytics-panel.ra-locked {
  text-align: center;
}

#runanalytics-panel .ra-locked-title {
  font-size: 15px;
  font-weight: 600;
  color: #181715;
  margin: 0 0 8px 0;
  padding: 0;
}

#runanalytics-panel .ra-locked-sub {
  font-size: 13px;
  color: #5C5B58;
  margin: 0 0 16px 0;
  padding: 0;
  line-height: 1.5;
}

/* ── Footer link ── */
#runanalytics-panel .ra-footer-link {
  margin-top: 12px;
  text-align: center;
}

#runanalytics-panel .ra-footer-link a {
  font-size: 11px;
  color: #A09F9C;
  text-decoration: none;
}

#runanalytics-panel .ra-footer-link a:hover {
  color: #FC4C02;
}

/* ── Blurred block (trial expired) ── */
#runanalytics-panel .ra-blurred-block {
  font-size: 13px;
  color: transparent;
  background: linear-gradient(90deg, #E8E6E1 25%, #F5F3EF 50%, #E8E6E1 75%);
  background-size: 400px 100%;
  animation: ra-shimmer 1.4s infinite linear;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 16px;
  user-select: none;
}

/* ── Skeleton loading ── */
#runanalytics-panel .ra-skeleton-line {
  background: linear-gradient(90deg, #E8E6E1 25%, #F5F3EF 50%, #E8E6E1 75%);
  background-size: 400px 100%;
  border-radius: 4px;
  display: block;
}

#runanalytics-panel .ra-skeleton-pill {
  height: 64px;
  flex: 1;
  background: linear-gradient(90deg, #E8E6E1 25%, #F5F3EF 50%, #E8E6E1 75%);
  background-size: 400px 100%;
  border-radius: 8px;
}

#runanalytics-panel .ra-shimmer {
  animation: ra-shimmer 1.4s infinite linear;
}

/* ── Section wrapper ── */
#runanalytics-panel .ra-section {
  margin: 0;
  padding: 0;
}

/* ════════════════════════════════════════════════════════════════
   Popup styles (.popup-body)
   ════════════════════════════════════════════════════════════════ */

.popup-body {
  width: 320px;
  max-height: 480px;
  overflow-y: auto;
  padding: 16px;
  background: #F0EEE9;
  font-family: -apple-system, "SF Pro Display", sans-serif;
  box-sizing: border-box;
}

.popup-body * {
  box-sizing: border-box;
  font-family: -apple-system, "SF Pro Display", sans-serif;
}

.popup-body .popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.popup-body .popup-logo {
  color: #FC4C02;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.2px;
}

.popup-body .popup-tagline {
  font-size: 12px;
  color: #5C5B58;
  margin: 0 0 20px 0;
}

.popup-body .popup-greeting {
  font-size: 20px;
  font-weight: 700;
  color: #181715;
  margin: 0 0 16px 0;
}

/* ── Last run card in popup ── */
.popup-body .popup-card {
  background: #FFFFFF;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  padding: 14px;
  margin-bottom: 12px;
  border: 1px solid #E8E6E1;
}

.popup-body .popup-card-meta {
  font-size: 11px;
  color: #A09F9C;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  font-weight: 600;
}

.popup-body .popup-card-stats {
  display: flex;
  gap: 12px;
  margin-bottom: 10px;
  align-items: baseline;
}

.popup-body .popup-card-distance {
  font-size: 20px;
  font-weight: 700;
  color: #181715;
}

.popup-body .popup-card-pace {
  font-size: 14px;
  color: #5C5B58;
  font-weight: 500;
}

.popup-body .popup-card-summary {
  font-size: 13px;
  color: #5C5B58;
  line-height: 1.5;
  margin: 0;
}

/* ── Pills in popup ── */
.popup-body .popup-pills {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.popup-body .popup-pill {
  flex: 1;
  background: #FFFFFF;
  border-radius: 10px;
  border: 1px solid #E8E6E1;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.popup-body .popup-pill-label {
  font-size: 9px;
  color: #A09F9C;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  font-weight: 600;
}

.popup-body .popup-pill-value {
  font-size: 18px;
  font-weight: 700;
}

.popup-body .popup-pill-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 500;
}

.popup-body .popup-dot {
  display: inline-block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
}

/* ── Popup CTA button ── */
.popup-body .popup-cta {
  display: block;
  background: #FC4C02;
  color: #FFFFFF;
  text-decoration: none;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  border-radius: 8px;
  padding: 12px 20px;
  width: 100%;
  cursor: pointer;
  transition: background 0.15s ease;
  margin-bottom: 12px;
  border: none;
  outline: none;
}

.popup-body .popup-cta:hover {
  background: #E04300;
}

/* ── Disconnect link ── */
.popup-body .popup-disconnect {
  display: block;
  text-align: center;
  font-size: 12px;
  color: #A09F9C;
  text-decoration: none;
  cursor: pointer;
  background: none;
  border: none;
  width: 100%;
  padding: 4px 0;
}

.popup-body .popup-disconnect:hover {
  color: #C0272D;
}

/* ── Popup skeleton / loading ── */
.popup-body .popup-skeleton-line {
  background: linear-gradient(90deg, #E8E6E1 25%, #F0EEE9 50%, #E8E6E1 75%);
  background-size: 400px 100%;
  border-radius: 4px;
  animation: ra-shimmer 1.4s infinite linear;
  display: block;
  margin-bottom: 8px;
}

.popup-body .popup-skeleton-card {
  background: linear-gradient(90deg, #E8E6E1 25%, #F0EEE9 50%, #E8E6E1 75%);
  background-size: 400px 100%;
  border-radius: 12px;
  animation: ra-shimmer 1.4s infinite linear;
  height: 100px;
  margin-bottom: 12px;
}
```

---

## 9. `popup.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>RunAnalytics</title>
  <style>
    /* Reset popup chrome */
    html, body {
      margin: 0;
      padding: 0;
      background: #F0EEE9;
      width: 320px;
      min-height: 80px;
    }
  </style>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <div class="popup-body" id="popup-root">
    <!-- Rendered by popup.js -->
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

---

## 10. `popup.js`

```javascript
// popup.js

const API_BASE = 'https://aitracker.run/api';
const FETCH_TIMEOUT_MS = 8000;
const root = document.getElementById('popup-root');

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

function readinessColor(score) {
  if (score >= 80) return '#2A7A1C';
  if (score >= 60) return '#B85C00';
  return '#C0272D';
}

function injuryRiskColor(level) {
  const l = (level || '').toLowerCase();
  if (l === 'low') return '#2A7A1C';
  if (l === 'med' || l === 'medium') return '#B85C00';
  return '#C0272D';
}

function renderLoading() {
  root.innerHTML = `
    <div class="popup-header">
      <span class="popup-logo">⚡ RunAnalytics</span>
    </div>
    <div class="popup-skeleton-line" style="width:60%;height:22px;margin-bottom:16px;"></div>
    <div class="popup-skeleton-card"></div>
    <div style="display:flex;gap:8px;">
      <div class="popup-skeleton-line" style="flex:1;height:64px;border-radius:10px;"></div>
      <div class="popup-skeleton-line" style="flex:1;height:64px;border-radius:10px;"></div>
    </div>
  `;
}

function renderLoggedOut() {
  root.innerHTML = `
    <div class="popup-header">
      <span class="popup-logo">⚡ RunAnalytics</span>
    </div>
    <p class="popup-tagline">AI run analysis for Strava</p>
    <a
      id="popup-connect"
      href="https://aitracker.run/auth?utm_source=extension_popup&utm_medium=popup&utm_campaign=logged_out"
      target="_blank"
      rel="noopener"
      class="popup-cta"
    >
      Connect account
    </a>
  `;
}

function renderLoggedIn(data) {
  const readColor = readinessColor(data.readiness);
  const riskColor = injuryRiskColor(data.injuryRisk);

  const dateStr = data.lastRun?.date
    ? new Date(data.lastRun.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '';

  root.innerHTML = `
    <div class="popup-header">
      <span class="popup-logo">⚡ RunAnalytics</span>
    </div>
    <p class="popup-greeting">Hey ${escapeHtml(data.firstName)}</p>

    <div class="popup-card">
      <div class="popup-card-meta">Last run${dateStr ? ' · ' + dateStr : ''}</div>
      <div class="popup-card-stats">
        <span class="popup-card-distance">${escapeHtml(data.lastRun?.distance || '—')}</span>
        <span class="popup-card-pace">${escapeHtml(data.lastRun?.pace || '')}</span>
      </div>
      <p class="popup-card-summary">${escapeHtml(data.lastRun?.summary || 'No summary available.')}</p>
    </div>

    <div class="popup-pills">
      <div class="popup-pill">
        <span class="popup-pill-label">Readiness</span>
        <span class="popup-pill-value" style="color:${readColor};">${data.readiness}</span>
        <span class="popup-pill-tag" style="color:${readColor};">
          <span class="popup-dot" style="background:${readColor};"></span>
          ${escapeHtml(data.readinessLabel || '')}
        </span>
      </div>
      <div class="popup-pill">
        <span class="popup-pill-label">Injury Risk</span>
        <span class="popup-pill-value" style="color:${riskColor};">${escapeHtml(data.injuryRisk || '—')}</span>
        <span class="popup-pill-tag" style="color:${riskColor};">
          <span class="popup-dot" style="background:${riskColor};"></span>
          ${escapeHtml(data.injuryRiskLabel || '')}
        </span>
      </div>
    </div>

    <a
      href="https://aitracker.run/dashboard?utm_source=extension_popup"
      target="_blank"
      rel="noopener"
      class="popup-cta"
    >
      Open RunAnalytics
    </a>
    <button class="popup-disconnect" id="popup-disconnect">Disconnect account</button>
  `;

  document.getElementById('popup-disconnect').addEventListener('click', handleDisconnect);
}

function renderError() {
  root.innerHTML = `
    <div class="popup-header">
      <span class="popup-logo">⚡ RunAnalytics</span>
    </div>
    <p style="font-size:13px;color:#5C5B58;margin:0 0 16px;">
      Couldn't load your data. 
      <a href="https://aitracker.run/dashboard" target="_blank" rel="noopener" style="color:#FC4C02;">Open RunAnalytics →</a>
    </p>
  `;
}

function escapeHtml(str) {
  if (!str && str !== 0) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function handleDisconnect() {
  await chrome.storage.local.remove(['raToken', 'raUser']);
  renderLoggedOut();
}

async function init() {
  renderLoading();

  const result = await chrome.storage.local.get(['raToken', 'raUser']);
  const token = result.raToken;

  if (!token) {
    renderLoggedOut();
    return;
  }

  try {
    const res = await fetchWithTimeout(`${API_BASE}/athlete/summary`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (res.status === 401) {
      // Token expired — clear it
      await chrome.storage.local.remove(['raToken', 'raUser']);
      renderLoggedOut();
      return;
    }

    if (!res.ok) {
      renderError();
      return;
    }

    const data = await res.json();
    renderLoggedIn(data);

  } catch (err) {
    renderError();
  }
}

init();
```

---

## 11. API Endpoints Required (Backend Contract)

If these endpoints don't already exist, they must be created on the `aitracker.run` backend. The extension makes no calls to Strava — all data flows through these two endpoints.

### `GET /api/brief?stravaActivityId={id}`

**Headers:** `Authorization: Bearer {token}`

**Success response (200):**
```json
{
  "summary": "Strong aerobic effort — decoupling held under 3% despite the heat. Best efficiency in 3 weeks.",
  "runnerScore": 72,
  "grade": "C",
  "readiness": 82,
  "readinessLabel": "Go run",
  "injuryRisk": "Med",
  "injuryRiskLabel": "Monitor",
  "activityId": "12345678"
}
```

**Error responses:**
- `401` — missing or invalid token → extension treats as logged out, clears stored token
- `402` — trial expired → extension shows upgrade panel
- `404` — activity not found or not yet synced → extension shows error panel

---

### `GET /api/athlete/summary`

**Headers:** `Authorization: Bearer {token}`

**Success response (200):**
```json
{
  "firstName": "Sarah",
  "lastRun": {
    "date": "2025-01-15T07:30:00Z",
    "distance": "8.2 mi",
    "pace": "8:14 /mi",
    "summary": "Solid long run at conversational pace. Heart rate stayed steady in Zone 2 throughout."
  },
  "readiness": 78,
  "readinessLabel": "Ready",
  "injuryRisk": "Low",
  "injuryRiskLabel": "Clear"
}
```

**Error responses:**
- `401` — invalid token → extension clears token, shows logged out state

---

## 12. Auth Bridge (Web App Integration)

After a user successfully logs into `aitracker.run`, add this snippet to the auth success handler. This sends the token to the extension if it is installed.

```javascript
// auth-success-handler.js (web app side)

// Store your published extension ID in environment config
const EXTENSION_ID = process.env.NEXT_PUBLIC_EXTENSION_ID; // e.g. 'abcdefghijklmnopqrstuvwxyz123456'

async function notifyExtension(authToken, user) {
  // Guard: only run in browser, only if extension API available
  if (typeof chrome === 'undefined' || !chrome?.runtime?.sendMessage) return;
  if (!EXTENSION_ID) return;

  try {
    chrome.runtime.sendMessage(
      EXTENSION_ID,
      {
        type: 'RA_AUTH_TOKEN',
        token: authToken,
        user: {
          firstName: user.firstName,
          email: user.email
        }
      },
      (response) => {
        // Ignore errors if extension not installed
        if (chrome.runtime.lastError) return;
        console.debug('[RunAnalytics] Extension token sync:', response);
      }
    );
  } catch (err) {
    // Extension not installed — safe to ignore
  }
}

// Call on logout:
async function notifyExtensionLogout() {
  if (typeof chrome === 'undefined' || !chrome?.runtime?.sendMessage) return;
  if (!EXTENSION_ID) return;

  try {
    chrome.runtime.sendMessage(
      EXTENSION_ID,
      { type: 'RA_LOGOUT' },
      () => { if (chrome.runtime.lastError) return; }
    );
  } catch (err) {}
}
```

**Important:** The `EXTENSION_ID` is only available after publishing to the Chrome Web Store. During development, find it at `chrome://extensions` with Developer Mode enabled. Update the environment variable after publishing.

---

## 13. Icon Generation Script

Run this script once to generate the three required PNG icons. It uses Node.js with the `canvas` package. Alternatively, create the icons manually in Figma/Sketch (orange `#FC4C02` background, white centered lightning bolt ⚡).

```javascript
// scripts/generate-icons.js
// Run: node scripts/generate-icons.js
// Requires: npm install canvas (one-time, not bundled with extension)

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const sizes = [16, 48, 128];
const outputDir = path.join(__dirname, '../extension/icons');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

sizes.forEach((size) => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Orange background with rounded corners
  const radius = size * 0.2;
  ctx.fillStyle = '#FC4C02';
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fill();

  // White lightning bolt ⚡
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${Math.round(size * 0.6)}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⚡', size / 2, size / 2 + size * 0.04);

  const buffer = canvas.toBuffer('image/png');
  const outputPath = path.join(outputDir, `icon${size}.png`);
  fs.writeFileSync(outputPath, buffer);
  console.log(`Generated: ${outputPath}`);
});

console.log('Icons generated successfully.');
```

---

## 14. `TEST.md`

```markdown
# RunAnalytics Extension — Manual Testing Checklist

Run through these checks before every release. Test in Chrome with Developer Mode enabled.

## Setup

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked** → select the `/extension` folder
4. Note the Extension ID shown under the card

---

## Content Script (Strava Activity Page)

- [ ] **Locked state**: Navigate to any Strava activity page while logged out of RunAnalytics. Panel appears above activity stats with "Your AI run brief is ready" and "Connect free — 14 day trial →" button.
- [ ] **Full brief state**: Log in to RunAnalytics (auth bridge sends token). Reload a Strava activity. Panel shows AI summary, score, readiness, injury risk, and "Full analysis" CTA.
- [ ] **Trial expired state**: With an expired-trial account, panel shows blurred content and "Resume trial →" CTA.
- [ ] **Loading skeleton**: Visible briefly while API call is in progress (simulate with slow network in DevTools).
- [ ] **Error state**: With no network / API unreachable, panel shows "Brief unavailable — open RunAnalytics".
- [ ] **No inject on non-activity pages**: Navigate to `strava.com/athlete/*`, `strava.com/segments/*`, `strava.com/clubs/*` — panel must NOT appear.
- [ ] **SPA navigation**: Navigate between two activity pages without full reload (click activity links in feed). Old panel removes, new panel injects for new activity.
- [ ] **Idempotency**: Reload the same activity multiple times — only one panel ever appears.
- [ ] **No layout breakage**: Panel does not shift or break Strava's layout at 1280px, 1440px, or 1920px widths.
- [ ] **No console errors**: Open DevTools console on any Strava page — zero errors or warnings from the extension.

---

## Popup

- [ ] **Logged out**: Click extension icon → shows RunAnalytics logo, tagline, and "Connect account" orange button.
- [ ] **"Connect account" button**: Opens `https://aitracker.run/auth` in a new tab.
- [ ] **Logged in**: After auth, click extension icon → shows "Hey [firstName]", last run card with date/distance/pace/summary, readiness + injury risk pills, and "Open RunAnalytics" button.
- [ ] **"Open RunAnalytics" button**: Opens `https://aitracker.run/dashboard` in a new tab.
- [ ] **"Disconnect account" link**: Clears token, popup switches to logged-out state immediately.
- [ ] **Loading skeleton**: Visible for a moment while fetching athlete summary.
- [ ] **Popup dimensions**: Width is 320px, does not exceed 480px height.

---

## Auth Bridge

- [ ] **Token sync**: After logging in on `aitracker.run`, return to a Strava activity — panel now shows full brief without page refresh (may need to navigate away and back if panel was already injected).
- [ ] **Logout sync**: After logging out on `aitracker.run`, panel on Strava reverts to locked state on next navigation.
- [ ] **Extension install**: Uninstall and reinstall extension → `aitracker.run/auth` opens automatically in a new tab.

---

## Security & Data Hygiene

- [ ] **No run data in storage**: Open `chrome://extensions` → Extension details → "Inspect views: service worker" → check `chrome.storage.local` — only `raToken` and `raUser` present, never activity data.
- [ ] **Token cleared on 401**: Simulate a 401 from API → popup and panel both revert to logged-out state, token is removed.
- [ ] **External message origin check**: Confirm background.js rejects messages not from `https://aitracker.run`.

---

## UTM Tracking (verify in browser network tab or GA)

- [ ] Locked panel CTA → `?utm_source=extension&utm_medium=strava&utm_campaign=locked`
- [ ] Trial expired CTA → `?utm_source=extension`
- [ ] Full brief CTA → `?utm_source=extension&activityId={id}`
- [ ] Popup connect button → `?utm_source=extension_popup&utm_medium=popup&utm_campaign=logged_out`
- [ ] Popup dashboard button → `?utm_source=extension_popup`
- [ ] Install onboarding → `?utm_source=extension_install`
```

---

## 15. Implementation Order

Build files in this sequence to minimize integration issues:

1. **`manifest.json`** — foundation; load extension in Chrome to verify it loads without errors
2. **`styles.css`** — design system foundation; preview in a static HTML file
3. **`background.js`** — service worker; test via `chrome://extensions` service worker inspector
4. **`content.js`** — build locked state first, verify injection on Strava, then add auth logic, then full panel
5. **`popup.html` + `popup.js`** — build logged-out state first, then logged-in
6. **Icons** — run icon generation script or create manually
7. **`TEST.md`** — already written above; run checklist end-to-end

---

## 16. Common Pitfalls & Solutions

| Pitfall | Solution |
|---|---|
| Panel injects multiple times on SPA navigation | Always check `document.getElementById('runanalytics-panel')` before injecting; MutationObserver calls `remove()` first |
| CSS leaks into Strava | Scope every rule to `#runanalytics-panel` or `.popup-body`; use `all: initial` on the panel root |
| Fetch never resolves | Always use `fetchWithTimeout` with `AbortController`; 8-second hard limit |
| Service worker wakes up inconsistently | Background.js only registers event listeners at top level — no async init code outside listeners |
| `chrome.runtime.lastError` unchecked | Always check in `sendMessage` callbacks to suppress Chrome error noise |
| Activity ID includes query params | `split('/activities/')[1].split('/')[0].split('?')[0]` handles all cases |
| Token sent to wrong origin | `background.js` validates `sender.origin.startsWith('https://aitracker.run')` before accepting messages |
| Popup flickers at wrong size | Set `width: 320px` in both `<html>` and `.popup-body`; avoid dynamic width changes |
| Strava renders aside lazily | MutationObserver on `document` with `subtree: true` catches late DOM injection; use fallback selectors |

---

## 17. Environment Config for Web App

Add to your `.env` (or equivalent):

```bash
# Chrome Extension ID — update after publishing to Web Store
# During local dev: find at chrome://extensions with Developer Mode on
NEXT_PUBLIC_EXTENSION_ID=your_extension_id_here
```

---

## 18. Chrome Web Store Submission Checklist

- [ ] All three icon sizes present: 16px, 48px, 128px PNG
- [ ] `manifest.json` version bumped for each submission
- [ ] `host_permissions` includes only necessary domains (`strava.com`, `aitracker.run`)
- [ ] No `eval()` or remote code execution anywhere in the codebase
- [ ] Privacy policy URL added to store listing (link to `aitracker.run/privacy`)
- [ ] Single-purpose description written: "Injects AI run analysis from RunAnalytics into Strava activity pages"
- [ ] Screenshots prepared: locked state, full brief state, popup — at 1280×800px
- [ ] Promotional tile: 440×280px with RunAnalytics branding
- [ ] Justification written for `host_permissions` on `aitracker.run` (fetches user's AI briefs)

---

*End of prompt. Build `/extension` with these exact files. Do not add external dependencies. Do not add a build step. Keep the code readable and well-commented — this extension will be maintained and iterated on.*
