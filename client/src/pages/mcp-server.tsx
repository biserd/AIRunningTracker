import { Link } from "wouter";
import { Activity, ArrowRight, Bot, Check, Database, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { buildUpgradeUrl } from "@shared/upgradeIntent";

const privateReads = [
  "Your runner profile and preferences",
  "Bounded activities and individual run details",
  "Dashboard trends, fitness, recovery, and Runner Score",
  "Goals, training-plan summaries, and plan details",
  "Analysis-ready coach snapshots and post-run briefs",
];

const upgradeUrl = buildUpgradeUrl({
  source: "mcp_landing",
  capability: "mcp_access",
  benefitKey: "mcp_access",
  returnTo: "/mcp-server",
});

export default function McpServerLandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <SEO title="Read-Only Running Data MCP Server | RunAnalytics" description="Connect authorized AI clients to your RunAnalytics profile, activities, trends, goals, plans, and public running-shoe catalog through a secure read-only MCP server." url="https://aitracker.run/mcp-server" />
      <PublicHeader />
      <main>
        <section className="overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 px-6 py-20 text-white md:py-28">
          <div className="mx-auto max-w-6xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-300/30 bg-orange-400/10 px-4 py-2 text-sm font-semibold text-orange-200"><LockKeyhole className="h-4 w-4" /> Standards-based · OAuth · Read-only</div>
            <div className="mt-7 grid items-center gap-12 lg:grid-cols-[1.15fr_.85fr]">
              <div>
                <h1 className="text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">Let your AI coach understand your running—without giving it control.</h1>
                <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">RunAnalytics MCP gives an authorized client a narrow view of your own training data. It cannot edit activities, change plans, start a Strava sync, send email, or touch billing.</p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button asChild size="lg" className="bg-strava-orange text-white hover:bg-orange-600"><Link href={upgradeUrl}>Start 14 days free <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
                  <Button asChild size="lg" variant="outline" className="border-slate-500 bg-transparent text-white hover:bg-white/10"><Link href="/developers/mcp">Read the MCP documentation</Link></Button>
                </div>
                <p className="mt-3 text-xs text-slate-400">Private runner access is included with Premium and the trial. Card required · $0 today · Then $7.99/month.</p>
              </div>
              <Card className="border-white/10 bg-white/95 shadow-2xl"><CardContent className="p-6 sm:p-8">
                <div className="flex items-center gap-3"><Bot className="h-8 w-8 text-strava-orange" /><div><p className="font-bold">A useful answer, grounded in you</p><p className="text-sm text-slate-500">Not a generic chatbot memory</p></div></div>
                <div className="mt-6 rounded-xl bg-slate-900 p-5 text-sm leading-6 text-slate-200">“Your last four comparable runs show a steadier pace at similar heart rate. Tomorrow’s plan is easy, so keep it conversational rather than testing the improvement.”</div>
                <div className="mt-5 grid grid-cols-2 gap-3 text-xs font-semibold text-slate-600"><div className="rounded-lg bg-emerald-50 p-3"><ShieldCheck className="mb-2 h-5 w-5 text-emerald-600" />Runner-scoped</div><div className="rounded-lg bg-blue-50 p-3"><Database className="mb-2 h-5 w-5 text-blue-600" />Bounded reads</div></div>
              </CardContent></Card>
            </div>
          </div>
        </section>

        <section className="px-6 py-16"><div className="mx-auto max-w-6xl">
          <div className="text-center"><p className="font-bold uppercase tracking-wider text-strava-orange">Two separate surfaces</p><h2 className="mt-2 text-3xl font-black">Private training context and an open public catalog</h2></div>
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <Card className="border-2 border-orange-100"><CardContent className="p-7"><Activity className="h-8 w-8 text-strava-orange" /><h3 className="mt-4 text-2xl font-bold">Your private runner data</h3><p className="mt-2 text-slate-600">OAuth consent binds every query to the signed-in runner. The client cannot supply another user ID.</p><ul className="mt-5 space-y-3">{privateReads.map((item) => <li key={item} className="flex gap-2 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{item}</li>)}</ul></CardContent></Card>
            <Card className="border-2 border-blue-100"><CardContent className="p-7"><Database className="h-8 w-8 text-blue-600" /><h3 className="mt-4 text-2xl font-bold">Public shoes and running tools</h3><p className="mt-2 text-slate-600">No private-account access is needed to search the public running-shoe database or discover RunAnalytics calculators.</p><ul className="mt-5 space-y-3 text-sm"><li className="flex gap-2"><Check className="h-4 w-4 text-emerald-600" />Search and filter running shoes</li><li className="flex gap-2"><Check className="h-4 w-4 text-emerald-600" />Read one shoe’s sanitized specifications</li><li className="flex gap-2"><Check className="h-4 w-4 text-emerald-600" />Compare two to four catalog shoes</li><li className="flex gap-2"><Check className="h-4 w-4 text-emerald-600" />Discover public calculators and analyzers</li></ul><p className="mt-5 rounded-lg bg-blue-50 p-3 font-mono text-xs text-blue-900">https://aitracker.run/mcp/public</p></CardContent></Card>
          </div>
        </div></section>

        <section className="bg-white px-6 py-16"><div className="mx-auto max-w-5xl text-center"><Sparkles className="mx-auto h-8 w-8 text-strava-orange" /><h2 className="mt-4 text-3xl font-black">Read-only means read-only</h2><p className="mx-auto mt-4 max-w-3xl leading-7 text-slate-600">No MCP tool can create, update, delete, sync, email, subscribe, run arbitrary SQL, invoke an arbitrary route, or expose Stripe and Strava credentials. Access tokens are short-lived, refresh grants rotate, and a runner can revoke access.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Button asChild size="lg" className="bg-strava-orange hover:bg-orange-600"><Link href={upgradeUrl}>Subscribe and connect my data</Link></Button><Button asChild size="lg" variant="outline"><Link href="/developers/mcp">View endpoints and tools</Link></Button></div></div></section>
      </main>
      <Footer />
    </div>
  );
}
