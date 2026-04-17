import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa_install_dismissed_at";
const DISMISS_DAYS = 7;

export default function PWAInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) return;

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_DAYS * 86_400_000) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const onInstalled = () => setVisible(false);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome !== "accepted") dismiss();
    setDeferred(null);
    setVisible(false);
  };

  if (!visible || !deferred) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-xl border bg-background shadow-lg p-4 flex items-center gap-3"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      data-testid="pwa-install-prompt"
    >
      <div className="flex-1">
        <p className="text-sm font-medium">Install RunAnalytics</p>
        <p className="text-xs text-muted-foreground">Add to your home screen for a faster, app-like experience.</p>
      </div>
      <Button size="sm" onClick={install} data-testid="button-install-pwa">
        <Download className="h-4 w-4 mr-1" />
        Install
      </Button>
      <Button size="icon" variant="ghost" onClick={dismiss} data-testid="button-dismiss-pwa">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
