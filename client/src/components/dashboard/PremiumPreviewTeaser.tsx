import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, BarChart2, ChevronRight, Flag, Loader2, Sparkles } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { trackFunnelEvent } from "@/lib/analytics";
import { buildUpgradeUrl } from "@shared/upgradeIntent";
import { DirectCheckoutButton } from "@/components/DirectCheckoutButton";

interface PremiumPreviewTeaserData {
  preview: {
    kind: "premium_preview";
    unitPreference?: "km" | "miles";
    findings: [string, string];
    nextAction: string;
    comparison?: {
      sampleSize: number;
      baselinePaceSecondsPerUnit: number | null;
      paceDeltaSecondsPerUnit: number | null;
      baselineHeartRate: number | null;
      heartRateDelta: number | null;
      baselineCadence: number | null;
      cadenceDelta: number | null;
    } | null;
    sourceData: {
      activityId: number;
      name: string;
      startDate?: string | null;
    };
  } | null;
  createdAt?: string | null;
  status?: "ready" | "preparing" | "waiting_for_run" | "not_connected" | "not_eligible" | "failed";
  reason?: string | null;
}

function formatPace(seconds: number | null | undefined, unitPreference: "km" | "miles" | undefined): string | null {
  if (seconds === null || seconds === undefined) return null;
  const rounded = Math.max(0, Math.round(seconds));
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}/${unitPreference === "km" ? "km" : "mi"}`;
}

function PreviewShell({ children, testId }: { children: React.ReactNode; testId: string }) {
  return (
    <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 mb-8" data-testid={testId}>
      <CardContent className="p-6">{children}</CardContent>
    </Card>
  );
}

export default function PremiumPreviewTeaser() {
  const { isFree, isLoading: subscriptionLoading } = useSubscription();
  const queryClient = useQueryClient();
  const query = useQuery<PremiumPreviewTeaserData>({
    queryKey: ["/api/premium-preview"],
    queryFn: async () => {
      const res = await fetch("/api/premium-preview", {
        headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
      });
      if (!res.ok) throw new Error("Failed to prepare preview");
      return res.json();
    },
    // The endpoint is authoritative for connection and eligibility state.
    // Do not silently suppress recovery because a second user query is stale.
    enabled: !subscriptionLoading && isFree,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval: (state) => state.state.data?.status === "preparing" ? 4000 : false,
  });

  const retry = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/premium-preview/retry", {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
      });
      if (!res.ok) throw new Error("Retry failed");
      return res.json();
    },
    onSuccess: (data) => queryClient.setQueryData(["/api/premium-preview"], data),
  });

  const preview = !subscriptionLoading && isFree ? query.data?.preview : null;
  const activityId = preview?.sourceData?.activityId;

  useEffect(() => {
    if (!activityId) return;
    trackFunnelEvent(
      "preview_viewed",
      { source: "premium_preview_dashboard", capability: "activity_deep_dive", activityId },
      { oncePerSession: true, dedupeParts: ["dashboard", activityId] },
    );
  }, [activityId]);

  if (subscriptionLoading || !isFree) return null;

  if (query.data?.status === "not_connected") return null;

  if (query.isError || retry.isError || query.data?.status === "failed") {
    return (
      <PreviewShell testId="premium-preview-failed">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-700 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-bold text-gray-900">We couldn't prepare your preview</h3>
            <p className="text-sm text-gray-700 mt-1">Your activity is safe. Try generating the preview again, or sync a newer run.</p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button size="sm" onClick={() => retry.mutate()} disabled={retry.isPending}>
                {retry.isPending ? "Trying again…" : "Try again"}
              </Button>
              <Button asChild size="sm" variant="outline"><Link href="/activities">View activities</Link></Button>
            </div>
          </div>
        </div>
      </PreviewShell>
    );
  }

  if (query.isLoading || query.data?.status === "preparing") {
    return (
      <PreviewShell testId="premium-preview-preparing">
        <div className="flex items-start gap-3">
          <Loader2 className="h-5 w-5 text-amber-700 animate-spin mt-0.5" />
          <div>
            <h3 className="font-bold text-gray-900">Preparing your Premium Preview</h3>
            <p className="text-sm text-gray-700 mt-1">We're analyzing your latest run. Your personalized findings will appear here shortly.</p>
            <p className="text-xs text-gray-500 mt-2">Usually ready in a few moments</p>
          </div>
        </div>
      </PreviewShell>
    );
  }

  if (query.data?.status === "waiting_for_run") {
    return (
      <PreviewShell testId="premium-preview-waiting-for-run">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-amber-700 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-bold text-gray-900">Your Premium Preview is waiting for a run</h3>
            <p className="text-sm text-gray-700 mt-1">Sync a recent run of at least 1 km and we'll turn it into two personalized findings and one recommended action.</p>
            <Button asChild size="sm" variant="outline" className="mt-4"><Link href="/activities">View activities</Link></Button>
          </div>
        </div>
      </PreviewShell>
    );
  }

  if (!preview || !activityId) {
    return (
      <PreviewShell testId="premium-preview-unavailable">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-700 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-bold text-gray-900">Your preview isn't ready yet</h3>
            <p className="text-sm text-gray-700 mt-1">You have eligible running data, so we'll try preparing it again without affecting your activities.</p>
            <Button size="sm" className="mt-4" onClick={() => retry.mutate()} disabled={retry.isPending}>
              {retry.isPending ? "Trying again…" : "Prepare my preview"}
            </Button>
          </div>
        </div>
      </PreviewShell>
    );
  }

  const activityDate = preview.sourceData.startDate
    ? new Date(preview.sourceData.startDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : null;
  const upgradeUrl = buildUpgradeUrl({
    source: "premium_preview_dashboard",
    capability: "activity_deep_dive",
    activityId,
    benefitKey: "premium_preview",
    returnTo: `/activity/${activityId}`,
  });
  const comparison = preview.comparison;
  const baselinePace = formatPace(comparison?.baselinePaceSecondsPerUnit, preview.unitPreference);

  return (
    <PreviewShell testId="premium-preview-teaser">
      <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-amber-700">
        <Sparkles className="h-4 w-4" /> PREMIUM PREVIEW · LAST RUN → NEXT RUN
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mt-3">
        {comparison ? `${preview.sourceData.name}: compared with ${comparison.sampleSize} similar runs` : `${preview.sourceData.name}: your first personal benchmark`}
      </h2>
      <p className="text-sm text-gray-700 mt-1">
        {comparison
          ? "A real comparison from your imported history, not a population average."
          : "This run establishes the baseline that future comparable runs will be measured against."}
      </p>
      <p className="text-xs text-gray-500 mt-2">
        {preview.sourceData.name}{activityDate ? ` · ${activityDate}` : ""}
      </p>

      <div className="grid md:grid-cols-2 gap-3 mt-5">
        {preview.findings.map((finding, index) => (
          <div key={index} className="flex items-start gap-3 rounded-lg bg-white p-4 shadow-sm">
            <BarChart2 className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-gray-800">{finding}</p>
          </div>
        ))}
      </div>
      {comparison && (
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-amber-200 bg-amber-100/60 p-3 sm:grid-cols-4" data-testid="premium-preview-benchmark">
          <div><p className="text-[10px] font-semibold uppercase text-amber-700">Benchmark</p><p className="text-sm font-bold text-gray-900">{comparison.sampleSize} similar runs</p></div>
          {baselinePace && <div><p className="text-[10px] font-semibold uppercase text-amber-700">Usual pace</p><p className="text-sm font-bold text-gray-900">{baselinePace}</p></div>}
          {comparison.baselineHeartRate !== null && <div><p className="text-[10px] font-semibold uppercase text-amber-700">Usual HR</p><p className="text-sm font-bold text-gray-900">{comparison.baselineHeartRate} bpm</p></div>}
          {comparison.baselineCadence !== null && <div><p className="text-[10px] font-semibold uppercase text-amber-700">Usual cadence</p><p className="text-sm font-bold text-gray-900">{comparison.baselineCadence} spm</p></div>}
        </div>
      )}
      <div className="flex items-start gap-3 rounded-lg bg-white p-4 shadow-sm border-l-4 border-amber-400 mt-3">
        <Flag className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-bold text-amber-700 uppercase">Recommended action</p>
          <p className="text-sm text-gray-800 mt-1">{preview.nextAction}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-5">
        <Button asChild variant="outline" data-testid="premium-preview-teaser-cta">
          <Link href={`/activity/${activityId}`} onClick={() => trackFunnelEvent(
            "preview_cta_clicked",
            { source: "premium_preview_dashboard", capability: "activity_deep_dive", activityId },
            { dedupeParts: ["dashboard", activityId, Date.now()] },
          )}>
            See why this happened <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
        <DirectCheckoutButton upgradeUrl={upgradeUrl}>
          <Button className="bg-amber-500 hover:bg-amber-600 text-white">Unlock my complete run analysis</Button>
        </DirectCheckoutButton>
      </div>
      <p className="text-xs text-gray-500 mt-3">14 days free · Card required · $0 today · Then $7.99/month · Cancel anytime</p>
    </PreviewShell>
  );
}
