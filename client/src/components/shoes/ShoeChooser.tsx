import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import type { RunningShoe } from "@shared/schema";
import { trackFunnelEvent } from "@/lib/analytics";

export function ShoeChooser({ initialSlugs = [], source = "comparison_hub" }: { initialSlugs?: string[]; source?: string }) {
  const id = useId();
  const [selected, setSelected] = useState([initialSlugs[0] || "", initialSlugs[1] || ""]);
  const [search, setSearch] = useState("");
  const { data = [], isLoading, isError, refetch } = useQuery<RunningShoe[]>({
    queryKey: ["/api/shoes"],
    queryFn: async () => {
      const response = await fetch("/api/shoes");
      if (!response.ok) throw new Error("Cannot load the shoe catalogue");
      return response.json();
    },
  });
  const shoes = [...data].filter(s => s.slug).sort((a, b) => `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`, undefined, { numeric: true }));
  const terms = search.toLowerCase().trim().split(/\s+/);
  const options = shoes.filter(s => selected.includes(s.slug!) || terms.every(term => `${s.brand} ${s.model}`.toLowerCase().includes(term)));
  const ready = selected.every(Boolean) && selected[0] !== selected[1];
  return <section id="choose-shoes" className="rounded-2xl border border-orange-200 bg-orange-50 p-5 sm:p-6 my-6" aria-label="Choose two running shoes">
    <h2 className="text-xl font-bold">Compare your two shoes now</h2>
    <p className="mt-2 text-sm text-slate-700">Choose any two catalogued models. See specifications, dated sources and missing measurements side by side. No account needed.</p>
    <label htmlFor={`${id}-search`} className="block font-medium mt-4 mb-1">Narrow the model list</label>
    <input id={`${id}-search`} type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Brand or model, e.g. Endorphin" className="w-full border rounded-lg p-3 bg-white" />
    <div className="grid sm:grid-cols-2 gap-4 mt-4">
      {[0, 1].map(index => <div key={index} className="min-w-0">
        <label htmlFor={`${id}-${index}`} className="block font-medium mb-1">Shoe {index + 1}</label>
        <select id={`${id}-${index}`} value={selected[index]} onChange={e => setSelected(previous => previous.map((s, i) => i === index ? e.target.value : s))} disabled={isLoading || isError} className="w-full min-w-0 border rounded-lg p-3 bg-white" data-testid={`shoe-chooser-${index + 1}`}>
          <option value="">{isLoading ? "Loading models…" : "Choose a model"}</option>
          {options.map(s => <option key={s.id} value={s.slug!} disabled={s.slug === selected[1 - index]}>{s.brand} {s.model}</option>)}
        </select>
      </div>)}
    </div>
    {isError && <p role="alert" className="mt-3">The model list could not load. <button onClick={() => refetch()} className="underline">Try again</button>.</p>}
    {!isLoading && !isError && options.length === 0 && <p role="status" className="mt-3">No models match that search. Try the brand name or clear the search.</p>}
    <div className="mt-4">
      {ready ? <Link href={`/tools/shoe-compare?shoes=${selected.map(encodeURIComponent).join(",")}#comparison-result`} onClick={() => trackFunnelEvent("tool_action", { source, capability: "shoe_comparison", action: "compare_selected" }, { dedupeParts: [source, ...selected] })} className="inline-flex rounded-lg bg-orange-700 px-5 py-3 font-semibold text-white" data-testid="shoe-chooser-compare">Compare these shoes →</Link>
        : <button disabled className="rounded-lg bg-slate-200 text-slate-600 px-5 py-3 font-semibold">Choose two different shoes</button>}
    </div>
  </section>;
}
