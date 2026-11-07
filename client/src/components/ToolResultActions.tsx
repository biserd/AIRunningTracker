import { Brain, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrackedUpgradeLink } from "@/components/TrackedUpgradeLink";
import { useSubscription } from "@/hooks/useSubscription";
import { buildUpgradeUrl } from "@shared/upgradeIntent";
import { useEffect, useState } from "react";
import { trackFunnelEvent } from "@/lib/analytics";
import { useAuth } from "@/hooks/useAuth";
import { saveToolResult, TOOL_OFFER_KEY } from "@/lib/toolJourney";

export function ToolResultActions({ source, capability = "public_tool", title, summary }: { source: string; capability?: string; title?: string; summary?: string }) {
  const { hasActiveSubscription } = useSubscription();
  const { isAuthenticated } = useAuth();
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  useEffect(() => {
    trackFunnelEvent("tool_completed", { source, capability }, { oncePerSession: true, dedupeParts: [source, capability] });
    if (title && summary) trackFunnelEvent("offer_viewed", { source, capability: "training_history", experimentVariant: "contextual_v1" }, { oncePerSession: true, dedupeParts: [source, "training_history"] });
  }, [source, capability, title, summary]);
  if (summary && title) return <section className="mt-6 rounded-xl border border-orange-200 bg-orange-50/70 p-5" aria-label="Save and use this result">
    <h3 className="font-semibold text-charcoal">Keep this result for your next run</h3>
    <p className="text-sm text-slate-700 mt-2 mb-4">Save a copy on this device, then compare your plan with your actual training. A free account lets you connect Strava; personalized Premium coaching is optional.</p>
    <div className="flex flex-wrap gap-3">
      <Button variant="outline" onClick={() => {
        const okay = saveToolResult({ source, title, summary, path: window.location.pathname + window.location.search });
        setSaved(okay); setSaveError(!okay);
      }}>{saved ? "Saved on this device" : "Save this result on this device"}</Button>
      <a href={isAuthenticated ? "/dashboard" : `/auth?mode=signup&redirect=${encodeURIComponent(`/dashboard?fromTool=${source}`)}`} className="inline-flex items-center rounded-md bg-orange-700 px-4 py-2 font-semibold text-white" onClick={() => {
        saveToolResult({ source, title, summary, path: window.location.pathname + window.location.search });
        try { localStorage.setItem(TOOL_OFFER_KEY, JSON.stringify({ source, at: Date.now() })); } catch { /* Optional attribution. */ }
        trackFunnelEvent("offer_clicked", { source, capability: "training_history", experimentVariant: "contextual_v1" }, { dedupeParts: [source, "training_history"] });
      }}>{isAuthenticated ? "Use my training history" : "Create a free account & connect Strava"} →</a>
    </div>
    {saved && <p role="status" className="mt-3 text-sm">Your saved copy will appear when you return in this browser.</p>}
    {saveError && <p role="alert" className="mt-3 text-sm">Browser storage is unavailable. Copy or print your result before leaving.</p>}
  </section>;
  const coachHref = hasActiveSubscription
    ? "/dashboard?openChat=true"
    : buildUpgradeUrl({ source, capability: "ai_coach", benefitKey: "ai_coach", returnTo: "/dashboard?openChat=true" });
  const planHref = hasActiveSubscription
    ? "/training-plans"
    : buildUpgradeUrl({ source, capability: "training_plans", benefitKey: "training_plan", returnTo: "/training-plans" });

  return (
    <section className="mt-6 rounded-xl border border-orange-200 bg-orange-50/70 p-5" aria-label="Continue with this result">
      <h3 className="font-semibold text-charcoal mb-1">Put this result to work</h3>
      <p className="text-sm text-gray-600 mb-4">Use personalized coaching or a training plan to explore your next step. These features may require Premium.</p>
      <div className="flex flex-col sm:flex-row gap-3">
        <TrackedUpgradeLink href={coachHref} source={source} capability="ai_coach">
          <Button className="bg-strava-orange text-white hover:bg-strava-orange/90"><Brain className="h-4 w-4 mr-2" />Ask AI Coach about this</Button>
        </TrackedUpgradeLink>
        <TrackedUpgradeLink href={planHref} source={source} capability="training_plans">
          <Button variant="outline"><CalendarPlus className="h-4 w-4 mr-2" />Build a training plan</Button>
        </TrackedUpgradeLink>
      </div>
    </section>
  );
}
