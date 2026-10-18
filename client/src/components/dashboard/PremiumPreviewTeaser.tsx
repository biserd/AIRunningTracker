import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, LockKeyhole, Loader2, Sparkles } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { trackFunnelEvent } from "@/lib/analytics";
import { buildUpgradeUrl } from "@shared/upgradeIntent";
import { DirectCheckoutButton } from "@/components/DirectCheckoutButton";
import { TrialOfferDetails, useTrialOffer } from "@/components/TrialOfferDetails";
import { isReadOnlyStaging } from '@/lib/runtime';

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

function PreviewShell({ children, testId }: { children: React.ReactNode; testId: string }) {
  return (
    <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 mb-8" data-testid={testId}>
      <CardContent className="p-6">{children}</CardContent>
    </Card>
  );
}

export default function PremiumPreviewTeaser() {
  const { isFree, isLoading: subscriptionLoading } = useSubscription();
  const { data: trialOffer } = useTrialOffer();
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

  if (isReadOnlyStaging && !preview) return (
    <PreviewShell testId="premium-preview-staging">
      <h3 className="font-bold text-gray-900">Preview generation is paused in staging</h3>
      <p className="mt-1 text-sm text-gray-700">You can explore your saved runs. Generating new analysis is disabled on this test site.</p>
      <Button asChild variant="outline" className="mt-3"><Link href="/activities">View saved runs</Link></Button>
    </PreviewShell>
  );

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
  return (
    <PreviewShell testId="premium-preview-teaser">
      <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-amber-700">
        <Sparkles className="h-4 w-4" /> YOUR FIRST RUN INSIGHT
      </div>
      <h2 className="mt-3 text-2xl font-bold text-gray-900">A finding from your own running data</h2>
      <p className="mt-1 text-sm text-gray-600">
        From {preview.sourceData.name}{activityDate ? ` · ${activityDate}` : ""}
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-2 lg:items-stretch">
        <div className="flex flex-col justify-between rounded-xl border border-amber-200 bg-white p-5 shadow-sm" data-testid="premium-preview-first-insight">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-amber-700">What we noticed</p>
            <p className="mt-3 text-lg font-semibold leading-relaxed text-gray-900">{preview.findings[0]}</p>
          </div>
          <Link href={`/activity/${activityId}`} className="mt-5 w-fit text-sm font-medium text-amber-800 underline underline-offset-2 hover:text-amber-950">
            View this run
          </Link>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-100/70 p-5" data-testid="premium-preview-deeper-analysis">
          <div className="flex items-center gap-2 text-amber-800">
            <LockKeyhole className="h-4 w-4" />
            <p className="text-xs font-bold uppercase tracking-wide">Deeper coach analysis</p>
          </div>
          <h3 className="mt-3 text-lg font-bold text-gray-900">What does this mean for your next run?</h3>
          <p className="mt-2 text-sm text-gray-700">Go beyond this first finding with the full run breakdown and a personal next-step recommendation.</p>
          <DirectCheckoutButton
            upgradeUrl={upgradeUrl}
            onBeforeCheckout={() => trackFunnelEvent(
              "preview_cta_clicked",
              { source: "premium_preview_dashboard", capability: "activity_deep_dive", activityId },
              { dedupeParts: ["dashboard", activityId, Date.now()] },
            )}
          >
            <Button className="mt-4 w-full bg-orange-600 text-white hover:bg-orange-700" data-testid="premium-preview-teaser-cta">
              {trialOffer?.trialEligible ? "Start my 7-day trial" : "Unlock my complete run analysis"}
            </Button>
          </DirectCheckoutButton>
          <TrialOfferDetails className="mt-3" benefit="the full breakdown of this run and a specific recommendation for your next session." />
        </div>
      </div>
    </PreviewShell>
  );
}
