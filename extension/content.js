// content.js — injects the RunAnalytics panel into Strava activity pages.

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

function getStoredAuth() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['raToken', 'raUser'], (result) => {
      resolve({ token: result.raToken || null, user: result.raUser || null });
    });
  });
}

function findInjectionPoint() {
  return (
    document.querySelector('aside.activity-stats') ||
    document.querySelector('.activity-summary-container') ||
    document.querySelector('aside') ||
    document.getElementById('main')
  );
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

function escapeHtml(str) {
  if (!str && str !== 0) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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
  const dashUrl = `https://aitracker.run/dashboard?utm_source=extension&activityId=${encodeURIComponent(activityId)}`;
  const readColor = readinessColor(data.readiness);
  const riskColor = injuryRiskColor(data.injuryRisk);

  return `
    <div id="${PANEL_ID}" class="ra-panel">
      <div class="ra-header">
        <span class="ra-logo">⚡ RunAnalytics</span>
        <span class="ra-score">Score: ${escapeHtml(data.runnerScore)}${escapeHtml(data.grade || '')}</span>
      </div>
      <div class="ra-divider"></div>

      <div class="ra-section">
        <div class="ra-label">AI SUMMARY</div>
        <p class="ra-summary">${escapeHtml(data.summary || '')}</p>
      </div>

      <div class="ra-divider"></div>

      <div class="ra-pills">
        <div class="ra-pill">
          <div class="ra-pill-label">READINESS</div>
          <div class="ra-pill-value" style="color:${readColor};">${escapeHtml(data.readiness)}</div>
          <div class="ra-pill-tag" style="color:${readColor};">
            <span class="ra-dot" style="background:${readColor};"></span>
            ${escapeHtml(data.readinessLabel || '')}
          </div>
        </div>
        <div class="ra-pill-divider"></div>
        <div class="ra-pill">
          <div class="ra-pill-label">INJURY RISK</div>
          <div class="ra-pill-value" style="color:${riskColor};">${escapeHtml(data.injuryRisk)}</div>
          <div class="ra-pill-tag" style="color:${riskColor};">
            <span class="ra-dot" style="background:${riskColor};"></span>
            ${escapeHtml(data.injuryRiskLabel || '')}
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

function injectPanel(html) {
  document.getElementById(PANEL_ID)?.remove();

  const wrapper = document.createElement('div');
  wrapper.innerHTML = html.trim();
  const panel = wrapper.firstChild;

  const target = findInjectionPoint();
  if (!target) return;

  if (target.id === 'main') {
    target.appendChild(panel);
  } else {
    target.insertBefore(panel, target.firstChild);
  }
}

async function initPanel() {
  if (!window.location.pathname.includes('/activities/')) return;

  const activityId = getActivityId();
  if (!activityId) return;

  injectPanel(buildLoadingPanel());

  const { token } = await getStoredAuth();

  if (!token) {
    injectPanel(buildLockedPanel());
    return;
  }

  try {
    const response = await fetchWithTimeout(
      `${API_BASE}/brief?stravaActivityId=${encodeURIComponent(activityId)}`,
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
      document.getElementById(PANEL_ID)?.remove();
    }
  }
}).observe(document, { subtree: true, childList: true });

initPanel();
