import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { CheckCircle2, Loader2, Send, Unplug } from "lucide-react";
import { SiTelegram } from "react-icons/si";
import { apiRequest, getQueryFn, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type CoachChannelStatus = {
  available: boolean;
  accessReason: "available" | "premium_required" | "feature_disabled";
  telegram: {
    connected: boolean;
    status: "not_connected" | "provisioning" | "active" | "provisioning_failed" | "revoked";
    linkedAt: string | null;
  };
};

type TelegramConnectionCardProps = {
  userId: number;
  location: "settings" | "dashboard";
};

export function TelegramConnectionCard({ userId, location }: TelegramConnectionCardProps) {
  const { toast } = useToast();
  const { data: channelStatus, isLoading } = useQuery<CoachChannelStatus>({
    queryKey: ["/api/coach/channels"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: Boolean(userId),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const connectMutation = useMutation({
    mutationFn: () => apiRequest("/api/coach/channels/telegram/link", "POST", {}),
    onSuccess: (result: { deepLink: string }) => window.location.assign(result.deepLink),
    onError: (error: any) => toast({
      title: "Telegram could not be connected",
      description: error.message || "Please try again.",
      variant: "destructive",
    }),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => apiRequest("/api/coach/channels/telegram", "DELETE"),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/coach/channels"] });
      toast({
        title: "Telegram disconnected",
        description: "The coach can no longer use this account's running data.",
      });
    },
    onError: (error: any) => toast({
      title: "Could not disconnect Telegram",
      description: error.message || "Please try again.",
      variant: "destructive",
    }),
  });

  // Free users already have the larger trial offer. This card is for
  // connected users and for Premium users who can connect from a high-traffic page.
  if (!isLoading && !channelStatus?.telegram.connected && !channelStatus?.available) {
    return null;
  }

  const connected = channelStatus?.telegram.connected === true;

  return (
    <Card
      className="border-sky-200 bg-gradient-to-br from-white via-sky-50/60 to-white"
      data-testid={`telegram-connection-card-${location}`}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SiTelegram className="h-5 w-5 text-[#229ED9]" />
          Telegram coaching
          {connected && (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
              <CheckCircle2 className="h-3.5 w-3.5" /> Telegram connected
            </span>
          )}
        </CardTitle>
        <CardDescription>
          Get private, runner-specific coaching messages based on your own training data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking Telegram connection…
          </div>
        ) : connected ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-gray-900">Telegram connected</p>
              <p className="text-sm text-gray-500">
                {channelStatus?.telegram.linkedAt
                  ? `Connected ${new Date(channelStatus.telegram.linkedAt).toLocaleDateString()}`
                  : "Your private coach connection is active."}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
              className="gap-2"
              data-testid={`button-disconnect-telegram-${location}`}
            >
              {disconnectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unplug className="h-4 w-4" />}
              {disconnectMutation.isPending ? "Disconnecting…" : "Disconnect"}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-gray-900">Connect your private running coach</p>
              <p className="text-sm text-gray-500">
                It takes one click to open Telegram. You can disconnect anytime.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => connectMutation.mutate()}
              disabled={connectMutation.isPending}
              className="gap-2 bg-[#229ED9] hover:bg-[#1d8fc4]"
              data-testid={`button-connect-telegram-${location}`}
            >
              {connectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {connectMutation.isPending ? "Opening Telegram…" : "Connect Telegram"}
            </Button>
          </div>
        )}
        <Link
          href="/coach/settings"
          className="mt-4 inline-block text-sm font-semibold text-[#167ca9] hover:underline"
        >
          Manage coach settings
        </Link>
      </CardContent>
    </Card>
  );
}