import React, { useEffect, useState } from "react";
import type { RunningShoe } from "@shared/schema";
import { shoeEvidence } from "@shared/shoeEditorial";
import { shoeNumber } from "@shared/shoeEvidence";

type Metric = "weight" | "heelStackHeight" | "forefootStackHeight" | "heelToToeDrop" | "price";
const orange = { solid: "bg-orange-700", outline: "border-orange-700" };
const blue = { solid: "bg-sky-700", outline: "border-sky-700" };
const panels: { title: string; unit: string; metrics: { key: Metric; label: string; color: typeof orange }[] }[] = [
  { title: "Weight", unit: "oz", metrics: [{ key: "weight", label: "Weight", color: orange }] },
  { title: "Stack height", unit: "mm", metrics: [
    { key: "heelStackHeight", label: "Heel", color: orange },
    { key: "forefootStackHeight", label: "Forefoot", color: blue },
  ] },
  { title: "Heel-to-toe drop", unit: "mm", metrics: [{ key: "heelToToeDrop", label: "Drop", color: orange }] },
  { title: "Recorded price", unit: "USD", metrics: [{ key: "price", label: "Price", color: orange }] },
];
const finite = (value: number | null): value is number => value != null && Number.isFinite(value);

export function ShoeSeriesCharts({ shoes }: { shoes: RunningShoe[] }) {
  const [interactive, setInteractive] = useState(false);
  const [activePanel, setActivePanel] = useState("All");
  useEffect(() => setInteractive(true), []);
  if (shoes.length < 2) return null;
  const models = shoes.map(shoe => ({ shoe, historical: shoeEvidence(shoe).status === "historical_unverified" }));
  return <div className="mb-6" data-testid="series-comparison-chart">
    <h3 className="font-semibold text-slate-900">Series evolution</h3>
    <p className="mt-1 mb-4 text-sm text-slate-600">
      Outlined bars show historical, unverified values. Recorded prices may include clearance and are not a price trend. The table below lists the exact values and evidence status.
    </p>
    {interactive && <div aria-label="Filter charts by measurement" role="group" className="mb-4 flex flex-wrap gap-2">
      {["All", ...panels.map(p => p.title)].map(label => <button type="button" key={label} aria-pressed={activePanel===label}
        onClick={()=>setActivePanel(label)} className={`min-h-9 rounded-full border px-3 py-1.5 text-sm font-semibold focus-visible:outline-orange-700 ${activePanel===label ? "border-orange-700 bg-orange-700 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-orange-500"}`}>{label}</button>)}
    </div>}
    <div className="grid gap-4 md:grid-cols-2">
      {panels.map(({ title, unit, metrics }) => {
        const values = shoes.flatMap(s => metrics.map(m => s[m.key]).filter(finite));
        const low = Math.min(0, ...values);
        const high = Math.max(1, ...values);
        const pct = (x: number) => (x - low) * 100 / (high - low);
        return <figure key={title} hidden={activePanel !== "All" && activePanel !== title} className="rounded-xl border bg-slate-50 p-4" aria-hidden="true">
          <figcaption className="font-medium mb-3">{title} ({unit})</figcaption>
          {metrics.length > 1 && <div className="mb-3 flex gap-4 text-xs text-slate-600">
            {metrics.map(m => <span key={m.key} className="inline-flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-sm ${m.color.solid}`} />{m.label}
            </span>)}
          </div>}
          <div className="space-y-3">
            {models.map(({ shoe, historical }) => <div key={shoe.id} data-series-model={shoe.slug}>
              <p className="mb-1 text-xs font-medium">{shoe.model}</p>
              {metrics.map(m => {
                const value = shoe[m.key];
                return <div key={m.key} className="flex min-h-5 items-center gap-2 text-xs">
                  {finite(value) ? <>
                    <div className="relative h-2.5 flex-1 rounded-sm bg-slate-200">
                      <div data-metric={m.key} data-value={value} data-evidence={historical ? "historical" : "source-checked"}
                        className={`absolute inset-y-0 rounded-sm ${historical ? `border border-dashed bg-white ${m.color.outline}` : m.color.solid}`}
                        style={{ left: `${pct(Math.min(0, value))}%`, width: `${Math.abs(pct(value) - pct(0))}%` }} />
                    </div>
                    <span className="w-20 text-right tabular-nums">{shoeNumber(value, ` ${unit}`)}</span>
                  </> : <span className="text-slate-600">{metrics.length > 1 ? `${m.label}: ` : ""}Not published</span>}
                </div>;
              })}
            </div>)}
          </div>
        </figure>;
      })}
    </div>
  </div>;
}
