import { Link } from "wouter";
import { ArrowRight, CheckCircle2, Code2, LockKeyhole, ShieldCheck } from "lucide-react";
import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { buildUpgradeUrl } from "@shared/upgradeIntent";

const privateTools = ["get_runner_profile", "list_activities", "get_activity", "get_dashboard_trends", "get_fitness_metrics", "get_recovery_status", "get_runner_score", "get_runner_coach_snapshot", "get_post_run_brief", "list_goals", "list_training_plans", "get_training_plan"];
const publicTools = ["search_running_shoes", "get_running_shoe", "list_running_shoe_filters", "compare_running_shoes", "list_runanalytics_tools"];
const scopes = [
  ["mcp:profile.read", "Profile and preferences"],
  ["mcp:activities.read", "Visible activities and bounded details"],
  ["mcp:analytics.read", "Trends, fitness, recovery, and score"],
  ["mcp:goals.read", "Runner-owned goals"],
  ["mcp:plans.read", "Runner-owned plan summaries and details"],
];
const discovery = [
  "Authorization server metadata",
  "https://aitracker.run/.well-known/oauth-authorization-server",
  "",
  "Protected resource metadata",
  "https://aitracker.run/.well-known/oauth-protected-resource/mcp",
  "",
  "Authorization  https://aitracker.run/mcp/oauth/authorize",
  "Token          https://aitracker.run/mcp/oauth/token",
  "Registration   https://aitracker.run/mcp/oauth/register",
  "Revocation     https://aitracker.run/mcp/oauth/revoke",
].join("\n");
const upgradeUrl = buildUpgradeUrl({ source: "mcp_docs", capability: "mcp_access", benefitKey: "mcp_access", returnTo: "/developers/mcp" });

export default function McpDocsPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <SEO title="RunAnalytics MCP Documentation | Read-Only Running Data" description="Production endpoints, OAuth scopes, tools, limits, and client setup for the RunAnalytics read-only MCP server." url="https://aitracker.run/developers/mcp" />
      <PublicHeader />
      <main>
        <section className="border-b bg-white px-6 py-14"><div className="mx-auto max-w-5xl"><div className="flex items-center gap-2 font-bold text-strava-orange"><Code2 className="h-5 w-5" /> MCP documentation</div><h1 className="mt-3 text-4xl font-black sm:text-5xl">Connect to RunAnalytics safely</h1><p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">A standards-based Streamable HTTP MCP server with authorization code + PKCE for private runner data and a separate unauthenticated public catalog.</p><div className="mt-7 flex flex-wrap gap-3"><Button asChild className="bg-strava-orange hover:bg-orange-600"><Link href={upgradeUrl}>Start trial for private access <ArrowRight className="ml-2 h-4 w-4" /></Link></Button><Button asChild variant="outline"><Link href="/mcp-server">Why use the RunAnalytics MCP?</Link></Button></div></div></section>
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 lg:grid-cols-[220px_1fr]">
          <aside className="space-y-2 text-sm lg:sticky lg:top-6 lg:self-start"><a className="block rounded px-3 py-2 hover:bg-white" href="#endpoints">Endpoints</a><a className="block rounded px-3 py-2 hover:bg-white" href="#oauth">OAuth</a><a className="block rounded px-3 py-2 hover:bg-white" href="#tools">Tools</a><a className="block rounded px-3 py-2 hover:bg-white" href="#limits">Limits</a><a className="block rounded px-3 py-2 hover:bg-white" href="#security">Security</a></aside>
          <article className="min-w-0 space-y-12">
            <section id="endpoints"><h2 className="text-2xl font-black">Production endpoints</h2><div className="mt-5 space-y-3"><div className="rounded-xl border bg-white p-5"><p className="font-semibold">Private runner server</p><code className="mt-2 block break-all text-sm text-strava-orange">https://aitracker.run/mcp</code><p className="mt-2 text-sm text-slate-600">Requires OAuth and an active Premium subscription or trial.</p></div><div className="rounded-xl border bg-white p-5"><p className="font-semibold">Public catalog server</p><code className="mt-2 block break-all text-sm text-blue-700">https://aitracker.run/mcp/public</code><p className="mt-2 text-sm text-slate-600">No account token. Public shoe and calculator data only.</p></div></div></section>
            <section id="oauth"><h2 className="text-2xl font-black">OAuth discovery and consent</h2><p className="mt-3 leading-7 text-slate-600">Clients dynamically register exact redirect URIs and use authorization code with PKCE S256. Web-session JWTs and magic-link tokens are not accepted as MCP bearer tokens.</p><pre className="mt-5 overflow-x-auto rounded-xl bg-slate-950 p-5 text-sm leading-6 text-slate-200"><code>{discovery}</code></pre><h3 className="mt-6 text-lg font-bold">Available scopes</h3><div className="mt-3 divide-y rounded-xl border bg-white">{scopes.map(([scope, copy]) => <div key={scope} className="p-4 sm:flex sm:gap-5"><code className="font-semibold text-strava-orange sm:w-48">{scope}</code><span className="mt-1 block text-sm text-slate-600 sm:mt-0">{copy}</span></div>)}</div></section>
            <section id="tools"><h2 className="text-2xl font-black">Registered read tools</h2><h3 className="mt-5 font-bold">Private runner tools</h3><div className="mt-3 grid gap-2 sm:grid-cols-2">{privateTools.map((tool) => <code key={tool} className="rounded-lg border bg-white px-3 py-2 text-sm">{tool}</code>)}</div><h3 className="mt-7 font-bold">Public catalog tools</h3><div className="mt-3 grid gap-2 sm:grid-cols-2">{publicTools.map((tool) => <code key={tool} className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900">{tool}</code>)}</div></section>
            <section id="limits"><h2 className="text-2xl font-black">Predictable limits</h2><ul className="mt-4 space-y-3">{["Activity ranges are capped at 365 days and pages at 100 records.", "Training-plan details are capped at 32 weeks and seven days per week.", "Shoe search returns at most 50 records; comparison accepts two to four slugs.", "Tool execution times out after eight seconds.", "Private and public requests have separate distributed rate limits."].map((item) => <li key={item} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />{item}</li>)}</ul></section>
            <section id="security" className="rounded-2xl bg-slate-900 p-7 text-white"><div className="flex gap-3"><ShieldCheck className="h-7 w-7 text-emerald-400" /><div><h2 className="text-2xl font-black">Read-only security boundary</h2><p className="mt-3 leading-7 text-slate-300">Ownership comes from the OAuth subject, never a model-supplied user ID. Responses omit secrets and raw internal records. No tool can mutate accounts, activities, plans, subscriptions, or catalog records; trigger processing; send messages; or run arbitrary SQL.</p></div></div><div className="mt-7 flex flex-col gap-3 sm:flex-row"><Button asChild className="bg-strava-orange hover:bg-orange-600"><Link href={upgradeUrl}><LockKeyhole className="mr-2 h-4 w-4" />Subscribe for private access</Link></Button><Button asChild variant="outline" className="border-slate-500 bg-transparent text-white hover:bg-white/10"><Link href="/tools/shoes">Browse the public shoe database</Link></Button></div></section>
          </article>
        </div>
      </main>
      <Footer />
    </div>
  );
}
