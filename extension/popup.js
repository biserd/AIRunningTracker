// popup.js — RunAnalytics extension popup.

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

function escapeHtml(str) {
  if (!str && str !== 0) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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
    <p class="popup-greeting">Hey ${escapeHtml(data.firstName || 'runner')}</p>

    <div class="popup-card">
      <div class="popup-card-meta">Last run${dateStr ? ' · ' + escapeHtml(dateStr) : ''}</div>
      <div class="popup-card-stats">
        <span class="popup-card-distance">${escapeHtml(data.lastRun?.distance || '—')}</span>
        <span class="popup-card-pace">${escapeHtml(data.lastRun?.pace || '')}</span>
      </div>
      <p class="popup-card-summary">${escapeHtml(data.lastRun?.summary || 'No summary available.')}</p>
    </div>

    <div class="popup-pills">
      <div class="popup-pill">
        <span class="popup-pill-label">Readiness</span>
        <span class="popup-pill-value" style="color:${readColor};">${escapeHtml(data.readiness)}</span>
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
