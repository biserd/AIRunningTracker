import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { CheckCircle2, ExternalLink, Loader2, ShieldCheck } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type Status = { configured: boolean; authorized: boolean; connected: boolean; destination: string | null; templateReady: boolean };
type Review = { ticket: string; details: { clientName: string; scopes: { scope: string; description: string }[] } };
const API = "/api/coach/whatsapp";
function friendlyError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  try { const parsed = JSON.parse(message.slice(message.indexOf(":") + 1)); if (typeof parsed.message === "string") return parsed.message; } catch { /* Never render raw upstream responses. */ }
  return "WhatsApp could not be updated. Please try again.";
}
export function WhatsAppConnectionCard({ userId, hasAccess }: { userId: number; hasAccess: boolean }) {
  const [review, setReview] = useState<Review | null>(null);
  const [link, setLink] = useState<{ url: string; expires: number } | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const status = useQuery<Status>({
    queryKey: [API, userId], queryFn: () => apiRequest(API), enabled: Boolean(userId),
    staleTime: 0, retry: 1, refetchOnMount: "always", refetchOnWindowFocus: true,
    refetchInterval: link ? 5000 : false,
  });
  const data = status.data;
  useEffect(() => {
    if (!link) return;
    if (data?.connected && data.authorized) { setLink(null); setNotice("WhatsApp is connected. You can now message your coach."); return; }
    const timer = window.setTimeout(() => { setLink(null); setNotice("Your private link expired. Prepare a new link to continue."); }, Math.max(0, link.expires - Date.now()));
    return () => window.clearTimeout(timer);
  }, [link, data?.connected, data?.authorized]);
  async function act(action: "review" | "approve" | "connect" | "disconnect") {
    if (busy) return;
    setBusy(action); setError(""); setNotice("");
    try {
      const result = await apiRequest(API + "/" + action, "POST", { confirm: true, ...(action === "approve" ? { ticket: review?.ticket } : {}) });
      if (action === "review") setReview(result);
      if (action === "approve") { setReview(null); setNotice("Running-data access approved. Next, link your WhatsApp number."); }
      if (action === "connect") {
        const url = new URL(result.url);
        if (url.origin !== "https://wa.me" || url.username || url.password || url.hash || !/^\/[1-9][0-9]{7,14}$/.test(url.pathname) || !/^LINK [a-f0-9]{48}$/.test(url.searchParams.get("text") || "")) throw new Error("Invalid private link");
        setLink({ url: url.toString(), expires: Date.now() + 600000 });
      }
      if (action === "disconnect") { setReview(null); setLink(null); setNotice("WhatsApp disconnected. Your runs and plans are unchanged."); }
      if (action !== "review") await status.refetch();
    } catch (failure) { setError(friendlyError(failure)); }
    finally { setBusy(""); }
  }
  return <Card id="whatsapp" data-testid="whatsapp-connection-card">
    <CardHeader>
      <CardTitle className="flex items-center gap-2"><SiWhatsapp aria-hidden="true" className="h-5 w-5 text-emerald-600" /> WhatsApp coach
        {data?.connected && data.authorized && <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-800"><CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />Connected</span>}
      </CardTitle>
      <CardDescription>Talk to your running coach in a private WhatsApp chat, using the same running history as the app.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <p className="flex gap-2 rounded-lg border border-emerald-100 bg-emerald-50/60 p-3 text-sm text-emerald-950"><ShieldCheck aria-hidden="true" className="h-5 w-5 shrink-0" />You choose whether to share read-only running data. Connecting does not give WhatsApp control of your account, billing or training plans. Disconnect anytime.</p>
      {status.isLoading ? <p role="status" className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Checking WhatsApp connection…</p>
        : status.isError ? <div><p role="alert" className="mb-2 text-sm">We couldn’t check your WhatsApp connection.</p><Button variant="outline" disabled={status.isFetching} onClick={() => void status.refetch()}>Retry connection check</Button></div>
        : data && <>
          <p className="text-sm font-medium">{data.connected ? `${data.destination || "WhatsApp number linked"}${data.authorized ? "" : " · running-data access needs renewal"}` : data.authorized ? "Step 2 of 2: link your WhatsApp number" : "Step 1 of 2: review running-data access"}</p>
          {!hasAccess && <div className="space-y-2"><p className="text-sm text-gray-600">WhatsApp coaching requires an active Premium subscription or trial. Existing connections can still be disconnected below.</p><Button asChild><Link href="/pricing">See trial and pricing</Link></Button></div>}
          {!data.configured && <p role="status" className="text-sm text-gray-600">WhatsApp setup is temporarily unavailable. Please try again later.</p>}
          {hasAccess && data.configured && !data.authorized && !review && <Button disabled={Boolean(busy)} onClick={() => void act("review")}>Review WhatsApp access</Button>}
          {review && <section aria-label="Review WhatsApp access" className="space-y-3 rounded-lg border p-4">
            <h3 className="font-semibold">Allow {review.details.clientName} to read:</h3>
            <ul className="list-disc space-y-1 pl-5 text-sm">{review.details.scopes.map(scope => <li key={scope.scope}>{scope.description}</li>)}</ul>
            <p className="text-sm text-gray-600">Access lasts up to 30 days and can be revoked here. Your messages are processed by our WhatsApp and AI service providers to deliver coaching.</p>
            <div className="flex flex-wrap gap-2"><Button disabled={Boolean(busy)} onClick={() => void act("approve")}>Allow read-only access</Button><Button variant="outline" disabled={Boolean(busy)} onClick={() => setReview(null)}>Cancel</Button></div>
          </section>}
          {hasAccess && data.configured && data.authorized && !data.connected && !link && <Button className="bg-emerald-700 hover:bg-emerald-800" disabled={Boolean(busy)} onClick={() => void act("connect")}>Prepare private WhatsApp link</Button>}
          {link && <div className="space-y-3 rounded-lg border border-emerald-200 p-4"><p className="text-sm">Open WhatsApp and tap Send on the pre-filled message without changing it. Then return here; your connection status updates automatically. This private, single-use link expires in 10 minutes.</p><Button asChild className="bg-emerald-700 hover:bg-emerald-800"><a href={link.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Continue in WhatsApp<ExternalLink aria-hidden="true" className="ml-2 h-4 w-4" /></a></Button></div>}
          {data.connected && data.authorized && hasAccess && <p className="text-sm text-gray-600">Open your existing WhatsApp chat to ask about your runs, training or the weather.{!data.templateReady && " Scheduled messages require a message from you within the last 23 hours."}</p>}
          {(data.connected || data.authorized) && <Button variant="outline" disabled={Boolean(busy)} onClick={() => setDisconnectOpen(true)}>Disconnect WhatsApp</Button>}
        </>}
      {busy && <p role="status" className="flex items-center gap-2 text-sm text-gray-500"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />{busy === "review" ? "Preparing your access review…" : busy === "approve" ? "Connecting your running data…" : busy === "connect" ? "Preparing your private link…" : "Disconnecting WhatsApp…"}</p>}
      {notice && <p role="status" className="text-sm text-emerald-800">{notice}</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <Link href="/proactive-running-coach" className="inline-block text-sm font-medium text-strava-orange hover:underline">How WhatsApp coaching works</Link>
      <AlertDialog open={disconnectOpen} onOpenChange={setDisconnectOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Disconnect WhatsApp?</AlertDialogTitle><AlertDialogDescription>This revokes WhatsApp’s running-data access and cancels its reminders. Your saved runs and training plans are unchanged.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep connected</AlertDialogCancel><AlertDialogAction onClick={() => void act("disconnect")}>Disconnect WhatsApp</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </CardContent>
  </Card>;
}
