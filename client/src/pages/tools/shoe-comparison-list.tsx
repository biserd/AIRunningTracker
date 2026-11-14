import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Helmet } from "react-helmet";
import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";
import { ShoeChooser } from "@/components/shoes/ShoeChooser";
import { trackFunnelEvent } from "@/lib/analytics";
import { comparisonHubCopy, type ShoeComparisonLink, type ShoePickerModel } from "@shared/searchPageCopy";

const featuredSlugs = [
  "saucony-endorphin-pro-4-vs-saucony-endorphin-pro-5",
  "asics-gel-slowcush-vs-asics-gel-nimbus-28",
  "adidas-adizero-adios-pro-4-vs-saucony-endorphin-pro-5",
  "asics-megablast-vs-adidas-adizero-evo-sl",
];
const filters = [
  ["all", "All"],
  ["evolution", "Model updates"],
  ["category_rival", "Category rivals"],
  ["popular", "Popular matchups"],
];
const comparisonUrl = (slug: string) => `/tools/shoes/compare/${slug}`;

export default function ShoeComparisonList() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const { data, isLoading, isError, refetch } = useQuery<{models: ShoePickerModel[]; links: ShoeComparisonLink[]}>({
    queryKey: ["/api/shoes/comparison-directory"],
    queryFn: async () => {
      const response = await fetch("/api/shoes/comparison-directory");
      if (!response.ok) throw new Error("Could not load comparisons");
      return response.json();
    },
    staleTime: 300_000,
  });
  useEffect(() => {
    trackFunnelEvent("tool_viewed", {source: "comparison_hub", capability: "shoe_comparison"}, {oncePerSession: true});
  }, []);
  const links = data?.links ?? [];
  const featured = featuredSlugs.flatMap(slug => links.filter(row => row.slug === slug));
  const terms = search.toLowerCase().trim().split(/\s+/);
  const matches = links.filter(row => (filter === "all" || row.type === filter) && terms.every(term => row.title.toLowerCase().includes(term)));

  return <div className="min-h-screen bg-background">
    <Helmet>
      <title>{comparisonHubCopy.title}</title>
      <meta name="description" content={comparisonHubCopy.description} />
      <meta property="og:title" content={comparisonHubCopy.title} />
      <meta property="og:description" content={comparisonHubCopy.description} />
      <link rel="canonical" href="https://aitracker.run/tools/shoes/compare" />
    </Helmet>
    <PublicHeader />
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <Link href="/tools/shoes" className="text-sm font-semibold text-orange-800 dark:text-orange-300 underline">Running shoe catalogue</Link>
      <header>
        <h1 className="text-3xl font-bold sm:text-5xl">{comparisonHubCopy.heading}</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">Pick two models to compare weight, drop, stack height and construction. Or browse existing matchups with dated sources and clearly marked missing data.</p>
      </header>
      <ShoeChooser models={data?.models ?? []} catalogLoading={isLoading} catalogError={isError} retryCatalog={() => { void refetch(); }} />
      {featured.length > 0 && !search.trim() && filter === "all" && <section aria-labelledby="featured-matchups">
        <h2 id="featured-matchups" className="mb-3 text-xl font-semibold">Featured comparisons</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {featured.map(row => <li key={row.slug}><Link href={comparisonUrl(row.slug)} className="block h-full rounded-xl border bg-card p-4 font-semibold hover:border-orange-500">{row.title}</Link></li>)}
        </ul>
      </section>}
      <section aria-labelledby="comparison-directory" className="rounded-xl border bg-card p-4 sm:p-6">
        <h2 id="comparison-directory" className="text-xl font-semibold">Comparison directory</h2>
        <label htmlFor="comparison-search" className="mt-4 mb-1 block text-sm font-medium">Search existing matchups</label>
        <input id="comparison-search" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Example: Endorphin Pro 4" className="w-full rounded-lg border bg-background p-3" />
        <div className="my-3 flex flex-wrap gap-2" role="group" aria-label="Comparison type">
          {filters.map(([key, label]) => <button type="button" key={key} onClick={() => setFilter(key)} aria-pressed={filter === key} className={`rounded-full border px-3 py-2 text-sm ${filter === key ? "border-orange-700 bg-orange-700 text-white" : "bg-background"}`}>{label}</button>)}
        </div>
        {isLoading ? <p role="status">Loading comparisons…</p> : isError && !data ? <p role="alert">Could not load comparisons. <button onClick={() => refetch()} className="underline">Try again</button>.</p> : <>
          <p aria-live="polite" className="mb-3 text-sm text-muted-foreground">{matches.length === 0 ? "No matchups found. Try fewer words or choose All." : `${matches.length} comparisons`}</p>
          {/* Compact anchors are included in the first HTML response, even without JavaScript. */}
          <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {matches.map(row => <li key={row.slug}><Link href={comparisonUrl(row.slug)} className="block rounded px-1 py-1.5 text-sm text-orange-800 underline underline-offset-2 dark:text-orange-300">{row.title}</Link></li>)}
          </ul>
        </>}
      </section>
      <section className="rounded-xl border bg-card p-5">
        <h2 className="text-xl font-semibold">Choose for the runs you actually do</h2>
        <p className="mt-2 text-muted-foreground">Compare the same size and width, then try both shoes. Weight alone cannot tell you which one will fit.</p>
        <p className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Link href="/blog/how-to-compare-running-shoes" className="underline">Shoe buying guide</Link>
          <Link href="/tools/rotation-planner" className="underline">Plan a shoe rotation</Link>
          <Link href="/tools/marathon-fueling" className="underline">Rehearse a fueling plan</Link>
          <Link href="/tools/aerobic-decoupling-calculator" className="underline">Check aerobic decoupling</Link>
        </p>
      </section>
    </main>
    <Footer />
  </div>;
}
