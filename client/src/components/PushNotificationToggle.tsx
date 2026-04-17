import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  subscribeToPush,
  unsubscribeFromPush,
  getCurrentSubscriptionStatus,
  isWebPushSupported,
} from "@/lib/push";

interface Status {
  supported: boolean;
  permission: NotificationPermission | "unsupported";
  subscribed: boolean;
  native: boolean;
}

export default function PushNotificationToggle() {
  const { toast } = useToast();
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const s = await getCurrentSubscriptionStatus();
    setStatus(s);
  };

  useEffect(() => {
    if (!isWebPushSupported()) {
      setStatus({ supported: false, permission: "unsupported", subscribed: false, native: false });
      return;
    }
    refresh();
  }, []);

  if (!status) return null;

  if (!status.supported) {
    return (
      <div className="text-sm text-muted-foreground" data-testid="text-push-unsupported">
        Push notifications aren't supported in this browser. On iPhone, install the app to your Home Screen first.
      </div>
    );
  }

  const handleEnable = async () => {
    setBusy(true);
    try {
      const result = await subscribeToPush();
      if (result.ok) {
        toast({ title: "Notifications enabled", description: "You'll get a push when your runs are analyzed." });
      } else {
        toast({
          title: "Couldn't enable notifications",
          description:
            result.reason === "permission_denied"
              ? "Notifications are blocked. Enable them in your browser settings."
              : "Something went wrong. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      await refresh();
      setBusy(false);
    }
  };

  const handleDisable = async () => {
    setBusy(true);
    try {
      await unsubscribeFromPush();
      toast({ title: "Notifications disabled" });
    } finally {
      await refresh();
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-4 p-4 border rounded-lg" data-testid="card-push-toggle">
      <div className="flex-1">
        <div className="font-medium flex items-center gap-2">
          {status.subscribed ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          Push notifications
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          {status.subscribed
            ? "On — we'll ping this device when your post-run recap is ready."
            : "Get a notification on this device after each run is analyzed."}
        </div>
        {status.permission === "denied" && (
          <div className="text-xs text-destructive mt-2">
            Notifications are blocked for this site. Enable them in your browser settings to turn this on.
          </div>
        )}
      </div>
      {status.subscribed ? (
        <Button variant="outline" onClick={handleDisable} disabled={busy} data-testid="button-disable-push">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Disable"}
        </Button>
      ) : (
        <Button onClick={handleEnable} disabled={busy || status.permission === "denied"} data-testid="button-enable-push">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enable"}
        </Button>
      )}
    </div>
  );
}
