import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Helmet } from "react-helmet";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { notifyExtensionAuth } from "@/lib/extensionBridge";

type Status = "verifying" | "ok" | "error";

export default function MagicLinkPage() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<Status>("verifying");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    // Optional deep-link destination (e.g. /activity/123) — only same-origin
    // paths are accepted to prevent open-redirect abuse. Anything that isn't
    // a single-leading-slash path falls back to /dashboard.
    const rawRedirect = params.get("redirect") || "";
    const safeRedirect =
      rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
        ? rawRedirect
        : "/dashboard";

    if (!token) {
      setStatus("error");
      setErrorMsg("This link is missing its sign-in token.");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/magic-link/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (!res.ok) {
          setStatus("error");
          setErrorMsg(body?.message || "This sign-in link is no longer valid.");
          return;
        }

        // Same shape as /api/auth/login: { user, token }
        localStorage.setItem("auth_token", body.token);
        notifyExtensionAuth(body.token, body.user || {});
        setStatus("ok");

        setTimeout(() => setLocation(safeRedirect), 600);
      } catch {
        if (!cancelled) {
          setStatus("error");
          setErrorMsg("Couldn't reach the server. Please try again.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setLocation]);

  return (
    <>
      <Helmet>
        <title>Signing you in — RunAnalytics</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-strava-orange rounded-lg flex items-center justify-center">
                <Activity className="text-white" size={24} />
              </div>
              <h1 className="text-3xl font-bold text-charcoal">RunAnalytics</h1>
            </div>
          </div>

          <Card>
            <CardHeader className="text-center">
              {status === "verifying" && (
                <>
                  <div className="mx-auto mb-3 w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
                    <Loader2 className="w-7 h-7 text-blue-500 animate-spin" />
                  </div>
                  <CardTitle>Signing you in…</CardTitle>
                  <CardDescription>One moment while we verify your sign-in link.</CardDescription>
                </>
              )}
              {status === "ok" && (
                <>
                  <div className="mx-auto mb-3 w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7 text-green-600" />
                  </div>
                  <CardTitle>You're in!</CardTitle>
                  <CardDescription>Taking you to your dashboard…</CardDescription>
                </>
              )}
              {status === "error" && (
                <>
                  <div className="mx-auto mb-3 w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                    <AlertCircle className="w-7 h-7 text-red-500" />
                  </div>
                  <CardTitle>Link no longer valid</CardTitle>
                  <CardDescription>{errorMsg}</CardDescription>
                </>
              )}
            </CardHeader>

            {status === "error" && (
              <CardContent className="space-y-3">
                <Link href="/auth">
                  <Button className="w-full bg-strava-orange hover:bg-strava-orange/90">
                    Request a new sign-in link
                  </Button>
                </Link>
                <Link href="/">
                  <Button variant="ghost" className="w-full">
                    Back to home
                  </Button>
                </Link>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
