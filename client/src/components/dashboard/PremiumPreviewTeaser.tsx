import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ChevronRight } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { trackFunnelEvent } from "@/lib/analytics";
import { useEffect } from "react";

interface PremiumPreviewTeaserData {
  preview: {
    kind: "premium_preview";
    findings: [string, string];
    nextAction: string;
    sourceData: {
      activityId: number;
      name: string;
    };
  } | null;
  createdAt?: string | null;
}

/**
 * Compact dashboard teaser for the one-time Premium Preview. Free users with
 * a stored preview see it here even if they never open the activity page the
 * preview was generated from; clicking through lands on that activity where
 * the full PremiumPreviewCard renders. Premium/trial users never see it.
 */
export default function PremiumPreviewTeaser() {
  const { isFree, isLoading: subscriptionLoading } = useSubscription();

  const { data } = useQuery<PremiumPreviewTeaserData>({
    queryKey: ["/api/premium-preview"],
    queryFn: async () => {
      const res = await fetch("/api/premium-preview", {
        headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
      });
      if (!res.ok) return { preview: null };
      return res.json();
    },
    enabled: !subscriptionLoading && isFree,
    retry: false,
  });

  const preview = !subscriptionLoading && isFree ? data?.preview : null;
  const activityId = preview?.sourceData?.activityId;

  // Funnel: teaser viewed once per session per activity.
  useEffect(() => {
    if (!activityId) return;
    trackFunnelEvent(
      "preview_viewed",
      {
        source: "premium_preview_dashboard",
        capability: "activity_deep_dive",
        activityId,
      },
      { oncePerSession: true, dedupeParts: ["dashboard", activityId] },
    );
  }, [activityId]);

  if (!preview || !activityId) return null;

  return (
    <Card
      className="border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-50 mb-8"
      data-testid="premium-preview-teaser"
    >
      <CardContent className="py-4 px-5 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[220px]">
          <div className="shrink-0 w-9 h-9 rounded-full bg-yellow-100 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-yellow-600" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 uppercase tracking-wide"
                data-testid="premium-preview-teaser-badge"
              >
                Premium Preview
              </span>
            </div>
            <p className="text-sm text-gray-800 mt-1 truncate">
              We analyzed <span className="font-semibold">{preview.sourceData.name}</span> the
              way Premium would — see what we found.
            </p>
          </div>
        </div>
        <Link href={`/activity/${activityId}`}>
          <Button
            size="sm"
            className="bg-yellow-500 hover:bg-yellow-600 text-white shrink-0"
            data-testid="premium-preview-teaser-cta"
            onClick={() =>
              trackFunnelEvent(
                "preview_cta_clicked",
                {
                  source: "premium_preview_dashboard",
                  capability: "activity_deep_dive",
                  activityId,
                },
                { dedupeParts: ["dashboard", activityId, Date.now()] },
              )
            }
          >
            See your preview <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
