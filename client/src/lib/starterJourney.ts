import type { StarterAction } from "@shared/starterJourney";

const IDLE = 30 * 60_000;
const sessions = new Map<number, { id: string; last: number }>();
const sent = new Set<string>();

// A browser session spans dashboard actions and same-origin tabs, until 30 minutes idle.
export function trackStarterAction(userId: number | undefined, action: StarterAction): void {
  if (!userId) return;
  try {
    const bearer = localStorage.getItem("auth_token");
    if (!bearer) return;
    const key = `ra_starter_session_${userId}`;
    const now = Date.now();
    let state = sessions.get(userId);
    try {
      const disk = JSON.parse(localStorage.getItem(key) || "null");
      if (typeof disk?.id === "string" && Number.isFinite(disk.last) && (!state || disk.last >= state.last)) state = disk;
    } catch { /* The in-memory session still works. */ }
    const id = state && now >= state.last && now - state.last < IDLE ? state.id : crypto.randomUUID();
    const next = { id, last: now };
    sessions.set(userId, next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* Optional persistence. */ }
    const eventKey = `${userId}:${id}:${action}`;
    if (sent.has(eventKey)) return;
    sent.add(eventKey);
    void fetch("/api/onboarding/event", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${bearer}` },
      keepalive: true, body: JSON.stringify({ action, session: id }),
    }).then(response => { if (!response.ok) sent.delete(eventKey); }).catch(() => { sent.delete(eventKey); });
  } catch { /* Telemetry is never required to use the product. */ }
}
