import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Helmet } from "react-helmet";
import type { RunningShoe, ShoeComparison } from "@shared/schema";
import {
  buildShoeGuide,
  buildComparisonGuide,
  shoeEvidence,
  shoeName,
  shoeUrl,
  categoryName,
  safeJson,
  SHOE_METHODOLOGY,
} from "@shared/shoeEditorial";
import {
  shoeNumber,
  shoeBoolean,
  shoeAvailability,
} from "@shared/shoeEvidence";
import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";

type Related = Pick<ShoeComparison, "slug" | "title">;
export type ShoePayload = {
  shoe: RunningShoe;
  canonicalSlug: string;
  seriesShoes: RunningShoe[];
  hasSeriesData: boolean;
  similarShoes?: RunningShoe[];
  comparisons?: Related[];
};
export type ComparisonPayload = ShoeComparison & {
  shoe1: RunningShoe;
  shoe2: RunningShoe;
  relatedComparisons?: Related[];
};
const panel =
  "rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm";
const action =
  "inline-flex items-center justify-center rounded-xl bg-orange-700 px-4 py-3 font-semibold text-white hover:bg-orange-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-700";
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <PublicHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 space-y-7">{children}</main>
      <Footer />
    </div>
  );
}
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className={panel}>
      <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-slate-900">
        {title}
      </h2>
      {children}
    </section>
  );
}
function Meta({
  title,
  description,
  path,
  shoes,
}: {
  title: string;
  description: string;
  path: string;
  shoes: RunningShoe[];
}) {
  const url = `https://aitracker.run${path}`;
  const products = shoes.map((s) => ({
    "@type": "Product",
    "@id": `${shoeUrl(s)}#product`,
    name: shoeName(s),
    url: shoeUrl(s),
    brand: { "@type": "Brand", name: s.brand },
    category: categoryName(s.category),
    ...(s.imageUrl
      ? {
          image: s.imageUrl.startsWith("/")
            ? `https://aitracker.run${s.imageUrl}`
            : s.imageUrl,
        }
      : {}),
    ...(shoeEvidence(s).sourceUrl
      ? { subjectOf: shoeEvidence(s).sourceUrl }
      : {}),
    ...(shoeEvidence(s).status === "source_checked"
      ? {
          additionalProperty: [
            ["Weight", s.weight, "oz"],
            ["Heel stack", s.heelStackHeight, "mm"],
            ["Forefoot stack", s.forefootStackHeight, "mm"],
            ["Drop", s.heelToToeDrop, "mm"],
          ]
            .filter((v) => v[1] != null)
            .map(([name, value, unitText]) => ({
              "@type": "PropertyValue",
              name,
              value,
              unitText,
            })),
        }
      : {}),
  }));
  const structured = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": url,
        url,
        name: title,
        description,
        publisher: {
          "@type": "Organization",
          name: "RunAnalytics",
          url: "https://aitracker.run",
        },
        mainEntity: products.map((p) => ({ "@id": p["@id"] })),
        citation: shoes.map((s) => shoeEvidence(s).sourceUrl).filter(Boolean),
      },
      ...products,
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { name: "Running shoes", item: "https://aitracker.run/tools/shoes" },
          ...(shoes.length > 1
            ? [
                {
                  name: "Comparisons",
                  item: "https://aitracker.run/tools/shoes/compare",
                },
              ]
            : []),
          { name: title, item: url },
        ].map((x, i) => ({ "@type": "ListItem", position: i + 1, ...x })),
      },
    ],
  };
  return (
    <>
      <Helmet>
        <title>{title} | RunAnalytics</title>
        <meta name="description" content={description} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={url} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
      </Helmet>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJson(structured) }}
      />
    </>
  );
}
function Sources({ shoes }: { shoes: RunningShoe[] }) {
  return (
    <Section title="Sources, checks and editorial standards">
      <p className="leading-relaxed mb-5">{SHOE_METHODOLOGY}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {shoes.map((s) => {
          const e = shoeEvidence(s);
          return (
            <div key={s.id} className="rounded-xl bg-slate-50 p-4 space-y-3">
              <h3 className="font-semibold">{shoeName(s)}</h3>
              <p className="text-sm font-semibold text-orange-800">
                {e.status === "source_checked"
                  ? "Source-checked specifications"
                  : "Historical data · not reverified"}
              </p>
              <p className="text-sm">
                {e.checked
                  ? `Recorded source check: ${e.checked} (UTC date).`
                  : "No verification date recorded."}
              </p>
              <p className="text-sm">{e.measurementBasis}.</p>
              <ul className="list-disc pl-5 text-sm space-y-2">
                {e.limitations.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
              {e.sourceUrl ? (
                <a
                  className={action}
                  href={e.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Check {e.sourceName}
                </a>
              ) : (
                <p className="text-sm">
                  A source citation is not available for this record.
                </p>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-sm text-slate-600 mt-5">
        Published by RunAnalytics. Sources are checked on the dates shown, not
        continuously. Spot an error?{" "}
        <a className="underline text-orange-800" href="/contact">
          Send the model, disputed field and a source link
        </a>
        . We retain older records for comparison, but do not label them as newly
        verified.
      </p>
    </Section>
  );
}
function Questions({
  questions,
}: {
  questions: { question: string; answer: string }[];
}) {
  return (
    <Section title="Questions before buying">
      <div className="divide-y">
        {questions.map((q) => (
          <details key={q.question} className="py-4" open>
            <summary className="cursor-pointer font-semibold text-lg">
              {q.question}
            </summary>
            <p className="mt-3 leading-relaxed text-slate-700">{q.answer}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}
function Facts({ shoes }: { shoes: RunningShoe[] }) {
  const rows: [string, (s: RunningShoe) => string][] = [
    ["Intended category", (s) => categoryName(s.category)],
    ["Weight", (s) => shoeNumber(s.weight, " oz")],
    ["Heel stack", (s) => shoeNumber(s.heelStackHeight, " mm")],
    ["Forefoot stack", (s) => shoeNumber(s.forefootStackHeight, " mm")],
    ["Heel-to-toe drop", (s) => shoeNumber(s.heelToToeDrop, " mm")],
    ["Recorded price", (s) => shoeNumber(s.price, " USD")],
    ["Stability category", (s) => s.stability.replaceAll("_", " ")],
    ["Cushioning category", (s) => s.cushioningLevel],
    ["Carbon reinforcement", (s) => shoeBoolean(s.hasCarbonPlate)],
    ["Performance foam category", (s) => shoeBoolean(s.hasSuperFoam)],
    ["Availability", shoeAvailability],
  ];
  return (
    <Section title="Specifications at a glance">
      <p className="mb-4 text-sm">
        Historical values are labeled, not newly verified. Prices are
        snapshots—not MSRP or live offers. Higher stack, lower weight and carbon
        construction do not establish a better shoe.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm sm:text-base">
          <caption className="sr-only">
            Published and historical shoe specifications
          </caption>
          <thead>
            <tr>
              <th scope="col" className="p-3">
                Specification
              </th>
              {shoes.map((s) => (
                <th scope="col" className="p-3 min-w-36" key={s.id}>
                  {shoeName(s)}
                  <span className="block text-xs font-normal mt-1">
                    {shoeEvidence(s).status === "source_checked"
                      ? "Source checked"
                      : "Historical · verify first"}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, fn]) => (
              <tr key={label} className="border-t">
                <th scope="row" className="p-3 font-medium">
                  {label}
                </th>
                {shoes.map((s) => (
                  <td key={s.id} className="p-3">
                    {fn(s)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
function Links({
  title,
  items,
}: {
  title: string;
  items: { href: string; label: string }[];
}) {
  if (!items.length) return null;
  return (
    <Section title={title}>
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((i) => (
          <li key={i.href}>
            <Link
              href={i.href}
              className="block rounded-xl border border-orange-200 p-4 font-semibold text-orange-800 hover:bg-orange-50"
            >
              {i.label} →
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}
function LoadState({ error }: { error: boolean }) {
  return (
    <Shell>
      <h1 className="text-2xl font-semibold">
        {error
          ? "This shoe page could not be loaded"
          : "Loading shoe evidence…"}
      </h1>
      <p>
        {error
          ? "Try again or browse the catalog. No product claim is available until the data loads."
          : "Loading the catalog record and its sources."}
      </p>
      <a href="/tools/shoes" className={action}>
        Browse running shoes
      </a>
    </Shell>
  );
}

export function ShoeDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, error } = useQuery<ShoePayload>({
    queryKey: [`/api/shoes/by-slug/${slug}`],
    enabled: !!slug,
  });
  if (!data) return <LoadState error={!!error} />;
  const s = data.shoe,
    g = buildShoeGuide(s),
    series = data.seriesShoes || [];
  return (
    <Shell>
      <Meta
        title={g.title}
        description={g.description}
        path={`/tools/shoes/${data.canonicalSlug || s.slug}`}
        shoes={[s]}
      />
      <nav aria-label="Breadcrumb">
        <Link href="/tools/shoes" className="text-orange-800 underline">
          Running shoe database
        </Link>
        <span> / {shoeName(s)}</span>
      </nav>
      <header className="rounded-2xl bg-orange-50 border border-orange-100 p-6 sm:p-9">
        <p className="text-sm font-semibold uppercase tracking-wide text-orange-800">
          {s.availability === "upcoming"
            ? "Upcoming model · specification preview"
            : "Specification-based buying guide"}
        </p>
        <h1 className="text-3xl sm:text-5xl font-bold mt-3 mb-5">
          {shoeName(s)}
        </h1>
        <p className="text-lg leading-relaxed max-w-3xl">{g.summary}</p>
        <p className="mt-4 font-semibold">{shoeAvailability(s)}</p>
        <p className="mt-2 text-sm">
          {g.evidence.status === "source_checked"
            ? `Source checked ${g.evidence.checked}`
            : "Historical catalog entry · measurements need re-verification"}{" "}
          · Not hands-on tested
        </p>
      </header>
      <Facts shoes={[s]} />
      {g.sections.map((section) => (
        <Section key={section.title} title={section.title}>
          <p className="leading-relaxed">{section.text}</p>
        </Section>
      ))}
      {series.length > 1 && (
        <Section
          title={`${s.seriesName || s.model}: previous models and series history`}
        >
          <p className="mb-4">
            Use these records to research changes, not to assume each
            measurement uses the same test size or source.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr>
                  {[
                    "Model",
                    "Weight",
                    "Heel / forefoot",
                    "Drop",
                    "Evidence",
                  ].map((x) => (
                    <th className="p-3" key={x}>
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {series.map((x) => (
                  <tr key={x.id} className="border-t">
                    <td className="p-3">
                      <Link
                        className="underline text-orange-800"
                        href={`/tools/shoes/${x.slug}`}
                      >
                        {x.model}
                      </Link>
                    </td>
                    <td className="p-3">{shoeNumber(x.weight, " oz")}</td>
                    <td className="p-3">
                      {shoeNumber(x.heelStackHeight, " mm")} /{" "}
                      {shoeNumber(x.forefootStackHeight, " mm")}
                    </td>
                    <td className="p-3">
                      {shoeNumber(x.heelToToeDrop, " mm")}
                    </td>
                    <td className="p-3">
                      {shoeEvidence(x).status === "source_checked"
                        ? "Source checked"
                        : "Historical"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
      <Links
        title="Compare this shoe"
        items={(data.comparisons || []).map((c) => ({
          href: `/tools/shoes/compare/${c.slug}`,
          label: c.title,
        }))}
      />
      <Links
        title="Other models to research"
        items={(data.similarShoes || []).map((x) => ({
          href: `/tools/shoes/${x.slug}`,
          label: `${shoeName(x)} · ${categoryName(x.category)}`,
        }))}
      />
      <Questions questions={g.questions} />
      <Sources shoes={[s]} />
      <Links
        title="Find the right role in your rotation"
        items={[
          { href: "/tools/shoe-finder", label: "Shoe finder" },
          { href: "/tools/rotation-planner", label: "Rotation planner" },
        ]}
      />
    </Shell>
  );
}
export function ShoeComparisonPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, error } = useQuery<ComparisonPayload>({
    queryKey: ["/api/shoes/comparisons/by-slug", slug],
    queryFn: async () => {
      const r = await fetch(`/api/shoes/comparisons/by-slug/${slug}`);
      if (!r.ok) throw Error("Comparison unavailable");
      return r.json();
    },
    enabled: !!slug,
  });
  if (!data?.shoe1 || !data.shoe2) return <LoadState error={!!error} />;
  const a = data.shoe1,
    b = data.shoe2,
    g = buildComparisonGuide(a, b);
  return (
    <Shell>
      <Meta
        title={g.title}
        description={g.description}
        path={`/tools/shoes/compare/${slug}`}
        shoes={[a, b]}
      />
      <nav aria-label="Breadcrumb">
        <Link href="/tools/shoes" className="underline text-orange-800">
          Running shoes
        </Link>{" "}
        /{" "}
        <Link href="/tools/shoes/compare" className="underline text-orange-800">
          Comparisons
        </Link>
      </nav>
      <header className="rounded-2xl bg-orange-50 border border-orange-100 p-6 sm:p-9">
        <p className="text-sm uppercase tracking-wide font-semibold text-orange-800">
          Evidence-led comparison · not a wear test
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold my-4">{g.title}</h1>
        <p className="text-lg leading-relaxed">{g.verdict}</p>
      </header>
      <div className="grid gap-5 md:grid-cols-2">
        {[a, b].map((s) => (
          <Section key={s.id} title={shoeName(s)}>
            <p className="leading-relaxed">{buildShoeGuide(s).summary}</p>
            <p className="font-semibold my-4">{shoeAvailability(s)}</p>
            <Link href={`/tools/shoes/${s.slug}`} className={action}>
              Specs and buying guide →
            </Link>
          </Section>
        ))}
      </div>
      <Facts shoes={[a, b]} />
      <Section title="What the measurements actually change">
        <div className="grid sm:grid-cols-2 gap-5">
          {g.differences.map((d) => (
            <div key={d.title}>
              <h3 className="font-semibold mb-2">{d.title}</h3>
              <p className="leading-relaxed">{d.text}</p>
            </div>
          ))}
        </div>
      </Section>
      {g.sections.map((s) => (
        <Section key={s.title} title={s.title}>
          <p className="leading-relaxed">{s.text}</p>
        </Section>
      ))}
      <Questions questions={g.questions} />
      <Sources shoes={[a, b]} />
      <Links
        title="Related comparisons"
        items={(data.relatedComparisons || []).map((c) => ({
          href: `/tools/shoes/compare/${c.slug}`,
          label: c.title,
        }))}
      />
      <Links
        title="Build your shortlist"
        items={[
          { href: "/tools/shoes/compare", label: "Browse all comparisons" },
          { href: "/tools/shoe-compare", label: "Choose your own comparison" },
          {
            href: "/tools/shoe-finder",
            label: "Find a shoe for your training",
          },
          { href: "/tools/rotation-planner", label: "Plan a rotation" },
        ]}
      />
    </Shell>
  );
}
