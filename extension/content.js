// content.js — injects the RunAnalytics panel into Strava activity pages.

const API_BASE = 'https://aitracker.run/api';
const PANEL_ID = 'runanalytics-panel';
const FETCH_TIMEOUT_MS = 10000;

// ─── Utility ────────────────────────────────────────────────────────────────

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

function getActivityId() {
  const parts = window.location.pathname.split('/activities/');
  if (parts.length < 2) return null;
  return parts[1].split('/')[0].split('?')[0] || null;
}

function getStoredAuth() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['raToken', 'raUser'], (r) =>
      resolve({ token: r.raToken || null, user: r.raUser || null })
    );
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

function escapeHtml(str) {
  if (!str && str !== 0) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
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

function gradeColor(grade) {
  if (grade === 'A') return '#2A7A1C';
  if (grade === 'B') return '#2A7A1C';
  if (grade === 'C') return '#B85C00';
  if (grade === 'D') return '#B85C00';
  return '#C0272D';
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch { return ''; }
}

// ─── Panel builders ──────────────────────────────────────────────────────────

function buildLoadingPanel() {
  return `
    <div id="${PANEL_ID}" class="ra-panel">
      <div class="ra-header">
        <span class="ra-logo">⚡ RunAnalytics</span>
      </div>
      <div class="ra-divider"></div>
      <div class="ra-skeleton-line ra-shimmer" style="width:80%;height:16px;margin-bottom:10px;"></div>
      <div class="ra-skeleton-line ra-shimmer" style="width:60%;height:12px;margin-bottom:20px;"></div>
      <div style="display:flex;gap:8px;margin-bottom:16px;">
        <div class="ra-skeleton-pill ra-shimmer"></div>
        <div class="ra-skeleton-pill ra-shimmer"></div>
        <div class="ra-skeleton-pill ra-shimmer"></div>
      </div>
      <div class="ra-skeleton-line ra-shimmer" style="width:100%;height:12px;margin-bottom:6px;"></div>
      <div class="ra-skeleton-line ra-shimmer" style="width:90%;height:12px;margin-bottom:6px;"></div>
      <div class="ra-skeleton-line ra-shimmer" style="width:70%;height:12px;"></div>
    </div>`;
}

function buildLockedPanel() {
  const url = 'https://aitracker.run/auth?utm_source=extension&utm_medium=strava&utm_campaign=locked';
  return `
    <div id="${PANEL_ID}" class="ra-panel ra-center">
      <div class="ra-header">
        <span class="ra-logo">⚡ RunAnalytics</span>
      </div>
      <div class="ra-divider"></div>
      <p class="ra-locked-title">Get AI analysis for every run</p>
      <p class="ra-locked-sub">Connect your free RunAnalytics account to see pace grades, injury risk, readiness scores, and an AI coach summary for each activity.</p>
      <a href="${url}" target="_blank" rel="noopener" class="ra-cta">Connect free — 14 day trial →</a>
      <div class="ra-footer-link"><a href="https://aitracker.run" target="_blank" rel="noopener">aitracker.run</a></div>
    </div>`;
}

function buildNotSyncedPanel() {
  const url = 'https://aitracker.run/dashboard?sync=1&utm_source=extension&utm_campaign=not_synced';
  return `
    <div id="${PANEL_ID}" class="ra-panel ra-center">
      <div class="ra-header">
        <span class="ra-logo">⚡ RunAnalytics</span>
      </div>
      <div class="ra-divider"></div>
      <p class="ra-locked-title">Run not synced yet</p>
      <p class="ra-locked-sub">Open RunAnalytics and sync your activities to get an AI coach brief for this run.</p>
      <a href="${url}" target="_blank" rel="noopener" class="ra-cta">Sync activities →</a>
    </div>`;
}

function buildTrialExpiredPanel() {
  const url = 'https://aitracker.run/pricing?utm_source=extension';
  return `
    <div id="${PANEL_ID}" class="ra-panel ra-center">
      <div class="ra-header">
        <span class="ra-logo">⚡ RunAnalytics</span>
      </div>
      <div class="ra-divider"></div>
      <p class="ra-locked-title">Your brief is ready</p>
      <div class="ra-blurred-block ra-shimmer" aria-hidden="true">████████████████████████████████████████████</div>
      <a href="${url}" target="_blank" rel="noopener" class="ra-cta">Resume trial →</a>
    </div>`;
}

function buildErrorPanel() {
  return `
    <div id="${PANEL_ID}" class="ra-panel ra-center">
      <div class="ra-header">
        <span class="ra-logo">⚡ RunAnalytics</span>
      </div>
      <div class="ra-divider"></div>
      <p class="ra-locked-sub">Brief unavailable — <a href="https://aitracker.run/dashboard" target="_blank" rel="noopener" style="color:#FC4C02;">open RunAnalytics</a></p>
    </div>`;
}

function buildFullPanel(data) {
  // Deep-link directly to the activity page; user is already signed in on aitracker.run
  const activityUrl = data.internalActivityId
    ? `https://aitracker.run/activity/${data.internalActivityId}?utm_source=extension`
    : `https://aitracker.run/dashboard?utm_source=extension`;

  const readColor = readinessColor(data.readiness);
  const riskColor = injuryRiskColor(data.injuryRisk);
  const gColor = gradeColor(data.grade);

  const gradeHtml = data.grade
    ? `<span class="ra-grade-pill" style="color:${gColor};border-color:${gColor};">${escapeHtml(data.grade)}${data.gradeLabel ? ` · ${escapeHtml(data.gradeLabel)}` : ''}</span>`
    : '';

  const steps = Array.isArray(data.nextSteps) ? data.nextSteps.slice(0, 2) : [];
  const nextStepsHtml = steps.length > 0
    ? `<ul class="ra-steps">${steps.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul>`
    : '';

  return `
    <div id="${PANEL_ID}" class="ra-panel">

      <div class="ra-header">
        <span class="ra-logo">⚡ RunAnalytics</span>
        ${data.runnerScore ? `<span class="ra-score-badge">Score: ${escapeHtml(data.runnerScore)}</span>` : ''}
      </div>

      <div class="ra-divider"></div>

      <div class="ra-coach-section">
        <div class="ra-coach-row">
          <span class="ra-coach-label">AI Coach</span>
          ${gradeHtml}
        </div>
        <p class="ra-coach-summary">${escapeHtml(data.summary || '')}</p>
        ${nextStepsHtml}
      </div>

      <div class="ra-divider"></div>

      <div class="ra-signals">
        <div class="ra-signal">
          <div class="ra-signal-label">Readiness</div>
          <div class="ra-signal-value" style="color:${readColor};">${escapeHtml(data.readiness)}</div>
          <div class="ra-signal-tag" style="color:${readColor};">
            <span class="ra-dot" style="background:${readColor};"></span>${escapeHtml(data.readinessLabel || '')}
          </div>
        </div>
        <div class="ra-signal-sep"></div>
        <div class="ra-signal">
          <div class="ra-signal-label">Injury Risk</div>
          <div class="ra-signal-value" style="color:${riskColor};">${escapeHtml(data.injuryRisk)}</div>
          <div class="ra-signal-tag" style="color:${riskColor};">
            <span class="ra-dot" style="background:${riskColor};"></span>${escapeHtml(data.injuryRiskLabel || '')}
          </div>
        </div>
      </div>

      <div class="ra-divider"></div>

      <a href="${activityUrl}" target="_blank" rel="noopener" class="ra-cta">Open full analysis →</a>

    </div>`;
}

// ─── Inject / remove panel ───────────────────────────────────────────────────

function injectPanel(html) {
  document.getElementById(PANEL_ID)?.remove();
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html.trim();
  const panel = wrapper.firstChild;
  const target = findInjectionPoint();
  if (!target) return;
  if (target.id === 'main') target.appendChild(panel);
  else target.insertBefore(panel, target.firstChild);
}

// ─── Main ────────────────────────────────────────────────────────────────────

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
      { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );

    if (response.status === 402) { injectPanel(buildTrialExpiredPanel()); return; }
    if (response.status === 401) { chrome.storage.local.remove(['raToken', 'raUser']); injectPanel(buildLockedPanel()); return; }
    if (response.status === 404) { injectPanel(buildNotSyncedPanel()); return; }
    if (!response.ok)            { injectPanel(buildErrorPanel()); return; }

    const data = await response.json();
    injectPanel(buildFullPanel(data));

  } catch {
    injectPanel(buildErrorPanel());
  }
}

// ─── SPA nav handler ─────────────────────────────────────────────────────────

let lastUrl = location.href;
new MutationObserver(() => {
  const cur = location.href;
  if (cur !== lastUrl) {
    lastUrl = cur;
    document.getElementById(PANEL_ID)?.remove();
    if (cur.includes('/activities/')) initPanel();
  }
}).observe(document, { subtree: true, childList: true });

initPanel();
