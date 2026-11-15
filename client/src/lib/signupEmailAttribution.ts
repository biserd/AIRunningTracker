let pendingSignupClick: Promise<void> = Promise.resolve();

/** Run before other client analytics can capture the landing URL. */
export function registerSignupEmailLanding(): void {
  const location = window.location;
  if (!location.hash.startsWith("#signup_ref=")) return;
  const ref = location.hash.slice("#signup_ref=".length);
  const source = new URLSearchParams(location.search).get("source");
  history.replaceState(history.state, "", location.pathname + location.search);
  if (!/^[A-Za-z0-9_-]{48,160}$/.test(ref) ||
      !((location.pathname === "/tools/race-predictor" && (source === "signup_day1" || source === "signup_day7")) ||
        (location.pathname === "/tools/marathon-fueling" && source === "signup_day14"))) return;

  // A landing request alone (including email previews) does not count as a click.
  // Never gate a tool on this request. For the dashboard handoff allow a short
  // window for the browser to retain the attribution cookie before navigation.
  pendingSignupClick = new Promise(resolve => {
    const deadline = window.setTimeout(resolve, 1200);
    void fetch("/api/marketing/signup-click", {
      method: "POST", credentials: "same-origin", keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ref, source }),
    }).catch(() => {}).finally(() => { window.clearTimeout(deadline); resolve(); });
  });
}

export function afterSignupEmailClick(action: () => void): void {
  void pendingSignupClick.then(action).catch(() => {});
}
