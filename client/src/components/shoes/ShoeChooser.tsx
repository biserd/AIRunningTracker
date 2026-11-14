import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import type { ShoePickerModel } from "@shared/searchPageCopy";
import { trackFunnelEvent } from "@/lib/analytics";

type Props = {
  initialSlugs?: string[];
  source?: string;
  models?: ShoePickerModel[];
  catalogLoading?: boolean;
  catalogError?: boolean;
  retryCatalog?: () => void;
};

export function ShoeChooser({ initialSlugs = [], source = "comparison_hub", models, catalogLoading, catalogError, retryCatalog }: Props) {
  const id = useId();
  const [selected, setSelected] = useState([initialSlugs[0] || "", initialSlugs[1] || ""]);
  const [search, setSearch] = useState(["", ""]);
  const [active, setActive] = useState<number | null>(null);
  const catalog = useQuery<{models: ShoePickerModel[]}>({
    queryKey: ["/api/shoes/comparison-directory"],
    enabled: models === undefined,
    staleTime: 300_000,
    queryFn: async () => {
      const response = await fetch("/api/shoes/comparison-directory");
      if (!response.ok) throw new Error("Cannot load the shoe catalogue");
      return response.json();
    },
  });
  const shoes = models ?? catalog.data?.models ?? [];
  const loading = models === undefined ? catalog.isLoading : catalogLoading;
  const error = models === undefined ? catalog.isError : catalogError;
  const labels = new Map(shoes.map(s => [s.slug, s.label]));
  const ready = selected.every(slug => labels.has(slug)) && selected[0] !== selected[1];
  const select = (index: number, slug: string) => {
    setSelected(previous => previous.map((value, i) => i === index ? slug : value));
    setSearch(previous => previous.map((value, i) => i === index ? "" : value));
    setActive(null);
  };

  return <section id="choose-shoes" className="my-6 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-slate-900 sm:p-6" aria-label="Choose two running shoes">
    <h2 className="text-xl font-bold">Compare your two shoes now</h2>
    <p className="mt-2 text-sm text-slate-700">Search by brand or model, then pick a result for each shoe. No account needed.</p>
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      {[0, 1].map(index => {
        const label = labels.get(selected[index]);
        const terms = search[index].toLowerCase().trim().split(/\s+/);
        const matches = active === index && !!search[index].trim()
          ? shoes.filter(s => s.slug !== selected[1 - index] && terms.every(term => s.label.toLowerCase().includes(term))).slice(0, 8)
          : [];
        return <div key={index} className="min-w-0">
          <label htmlFor={`${id}-${index}`} className="mb-1 block font-medium">Shoe {index + 1}</label>
          <input id={`${id}-${index}`} type="search" autoComplete="off" value={search[index] || (active === index ? "" : label ?? "")} onFocus={() => setActive(index)} onKeyDown={event => { if (event.key === "Escape") setActive(null); }} onChange={event => {
            const value = event.target.value;
            setSearch(previous => previous.map((term, i) => i === index ? value : term));
            setActive(index);
          }} placeholder={label ? `Replace ${label}` : "Search models, e.g. Endorphin"} disabled={loading || error} className="w-full rounded-lg border bg-white p-3" data-testid={`shoe-chooser-${index + 1}`} />
          {label && <p className="mt-1 break-words text-sm text-slate-700">Selected: {label}. <button type="button" className="underline" onClick={() => select(index, "")}>Clear shoe {index + 1}</button></p>}
          {active === index && search[index].trim() && (matches.length ? <ul aria-label={`Matches for shoe ${index + 1}`} className="mt-1 max-h-60 overflow-y-auto rounded-lg border bg-white">
            {matches.map(model => <li key={model.slug}><button type="button" onClick={() => select(index, model.slug)} className="w-full break-words px-3 py-2 text-left hover:bg-orange-100 focus-visible:bg-orange-100">{model.label}</button></li>)}
          </ul> : <p role="status" className="mt-2 text-sm">No available models match. Try the brand or a shorter name.</p>)}
        </div>;
      })}
    </div>
    {loading && <p role="status" className="mt-3 text-sm">Loading models…</p>}
    {error && <p role="alert" className="mt-3">The model list could not load. <button type="button" onClick={retryCatalog ?? (() => { void catalog.refetch(); })} className="underline">Try again</button>.</p>}
    <div className="mt-4">
      {ready ? <Link href={`/tools/shoe-compare?shoes=${selected.map(encodeURIComponent).join(",")}#comparison-result`} onClick={() => trackFunnelEvent("tool_action", { source, capability: "shoe_comparison", action: "compare_selected" }, { dedupeParts: [source, ...selected] })} className="inline-flex rounded-lg bg-orange-700 px-5 py-3 font-semibold text-white" data-testid="shoe-chooser-compare">Compare these shoes →</Link>
        : <button type="button" disabled className="rounded-lg bg-slate-200 px-5 py-3 font-semibold text-slate-600">Choose two different shoes</button>}
    </div>
  </section>;
}
