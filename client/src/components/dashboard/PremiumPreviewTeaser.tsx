import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, BarChart2, ChevronRight, Flag, Loader2, Sparkles } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { trackFunnelEvent } from "@/lib/analytics";
import { buildUpgradeUrl } from "@shared/upgradeIntent";
import { TrackedUpgradeLink } from "@/components/TrackedUpgradeLink";
import { useAuth } from "@/hooks/useAuth";

interface PremiumPreviewTeaserData {
  preview: {
    kind: "premium_preview";
    findings: [string, string];
    nextAction: string;
    sourceData: {
      activityId: number;
      name: string;
      startDate?: string | null;
    };
  } | null;
  createdAt?: string | null;
  status?: "ready" | "preparing" | "waiting_for_run" | "not_eligible" | "failed";
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
  const { user } = useAuth();
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
    enabled: !subscriptionLoading && isFree && !!user?.stravaConnected,
    retry: 1,
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

  if (subscriptionLoading || !isFree || !user?.stravaConnected) return null;

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
              <Link href="/activities"><Button size="sm" variant="outline">View activities</Button></Link>
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

  if (!preview || !activityId) return null;

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
        <Sparkles className="h-4 w-4" /> YOUR PREMIUM PREVIEW
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mt-3">We found something useful in your latest run</h2>
      <p className="text-sm text-gray-700 mt-1">Here's a sample of the personalized analysis available with RunAnalytics Premium.</p>
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
      <div className="flex items-start gap-3 rounded-lg bg-white p-4 shadow-sm border-l-4 border-amber-400 mt-3">
        <Flag className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-bold text-amber-700 uppercase">Recommended action</p>
          <p className="text-sm text-gray-800 mt-1">{preview.nextAction}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-5">
        <Link href={`/activity/${activityId}`}>
          <Button variant="outline" data-testid="premium-preview-teaser-cta" onClick={() => trackFunnelEvent(
            "preview_cta_clicked",
            { source: "premium_preview_dashboard", capability: "activity_deep_dive", activityId },
            { dedupeParts: ["dashboard", activityId, Date.now()] },
          )}>
            View your Premium Preview <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
        <TrackedUpgradeLink href={upgradeUrl}>
          <Button className="bg-amber-500 hover:bg-amber-600 text-white">Unlock ongoing personalized analysis</Button>
        </TrackedUpgradeLink>
      </div>
      <p className="text-xs text-gray-500 mt-3">Start 14 days free · $0 today · Cancel anytime</p>
    </PreviewShell>
  );
}
