import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { trackFunnelEvent } from "@/lib/analytics";
import { readSavedToolResult, SAVED_TOOL_KEY, TOOL_OFFER_KEY, type SavedToolResult } from "@/lib/toolJourney";

export function ToolJourneyTracker() {
  const [location] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const [saved, setSaved] = useState<SavedToolResult | null>(null);
  useEffect(() => {
    const result = readSavedToolResult();
    setSaved(result);
    if (!location.startsWith("/tools/")) return;
    try {
      const key = `ra_tool_visit:${location}`;
      const previous = localStorage.getItem(key);
      if (previous && Date.now() - Date.parse(previous) >= 30 * 60000 && !sessionStorage.getItem(key)) trackFunnelEvent("tool_returned", { source: location, capability: "public_tool", experimentVariant: "contextual_v1" }, { oncePerSession: true, dedupeParts: [location] });
      sessionStorage.setItem(key, "1");
      localStorage.setItem(key, new Date().toISOString());
    } catch { /* Storage is optional. */ }
  }, [location]);
  useEffect(() => {
    if (!isAuthenticated) return;
    try {
      const intent = JSON.parse(localStorage.getItem(TOOL_OFFER_KEY) || "null");
      if (!intent || Date.now() - intent.at > 7 * 86400000) return;
      trackFunnelEvent("tool_account_continued", { source: intent.source, capability: "training_history", experimentVariant: "contextual_v1" }, { oncePerSession: true, dedupeParts: [intent.source, intent.at] });
      if ((user as any)?.stravaConnected) trackFunnelEvent("tool_history_connected", { source: intent.source, capability: "training_history", experimentVariant: "contextual_v1" }, { oncePerSession: true, dedupeParts: [intent.source, intent.at] });
    } catch { /* No valid attribution. */ }
  }, [isAuthenticated, user]);
  if (!saved || location.startsWith("/auth") || location.startsWith("/pricing")) return null;
  return <aside className="mx-auto max-w-6xl m-4 rounded-xl border bg-white p-4 text-slate-800" aria-label="Your saved tool result">
    <details><summary className="font-semibold cursor-pointer">Saved on this device: {saved.title}</summary>
      <p className="text-sm mt-2">Saved {new Date(saved.savedAt).toLocaleDateString()}. This copy stays in this browser.</p>
      <pre className="whitespace-pre-wrap font-sans text-sm my-3 max-h-64 overflow-auto">{saved.summary}</pre>
      <Link href={saved.path} className="text-orange-800 underline mr-4">Reopen the tool</Link>
      {isAuthenticated && <Link href="/dashboard" className="text-orange-800 underline mr-4">Connect Strava and review your training</Link>}
      <button onClick={() => { localStorage.removeItem(SAVED_TOOL_KEY); setSaved(null); }} className="underline text-sm">Remove saved copy</button>
    </details>
  </aside>;
}
