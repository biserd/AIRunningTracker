// Standalone documents (including the app page) do not mount the SPA.
(() => {
  const cutoff = Number(document.currentScript.dataset.ends);
  const strip = document.querySelector('body > aside[data-launch-first-year]');
  if (!strip || !Number.isFinite(cutoff)) return;
  function expire() { if (Date.now() >= cutoff) strip.remove(); }
  expire();
  window.setTimeout(expire, Math.max(0, cutoff - Date.now()));
  window.addEventListener('pageshow', expire);
  document.addEventListener('visibilitychange', expire);
})();
