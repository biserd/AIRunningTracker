import React, { useEffect, useId, useState } from "react";
import type { RunningShoe } from "@shared/schema";
import { shoeEvidence } from "@shared/shoeEditorial";
import { shoeNumber } from "@shared/shoeEvidence";
import { bostonProfile } from "@shared/shoeProfile";
import { hasStack, ShoeStackSchematic } from "./ShoeStackSchematic";

type Unit = "oz" | "g";
const measurement = (value: number | null | undefined): value is number =>
  value != null && Number.isFinite(value);
const formatWeight = (value: number | null | undefined, unit: Unit) =>
  !measurement(value) ? "Not published" : shoeNumber(unit === "g" ? Math.round(value * 28.349523) : value, " " + unit);

export function ShoeProfileExplorer({ shoe }: { shoe: RunningShoe }) {
  const [unit, setUnit] = useState<Unit>("oz");
  const [interactive, setInteractive] = useState(false);
  useEffect(() => setInteractive(true), []);
  const evidence = shoeEvidence(shoe);
  const boston = bostonProfile(shoe.slug);
  const heel = shoe.heelStackHeight;
  const forefoot = shoe.forefootStackHeight;
  const profile = hasStack(heel) && hasStack(forefoot);
  const specs = [
    ["Weight", formatWeight(shoe.weight, unit)], ["Heel stack", shoeNumber(heel, " mm")],
    ["Forefoot stack", shoeNumber(forefoot, " mm")], ["Listed drop", shoeNumber(shoe.heelToToeDrop, " mm")],
  ];
  return <section id="shoe-profile" aria-label="Shoe profile" className="scroll-mt-28 overflow-hidden rounded-2xl bg-slate-950 text-white shadow-md" data-testid="shoe-profile">
    <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-2">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-widest text-orange-300">The shoe at a glance</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-2xl font-bold sm:text-3xl">Under the foot</h2>
          {interactive && measurement(shoe.weight) && <div aria-label="Weight unit" role="group" className="inline-flex rounded-lg border border-slate-600 p-0.5">
            {(["oz", "g"] as const).map(option => <button type="button" key={option} aria-pressed={unit === option}
              onClick={() => setUnit(option)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-300 ${option === unit ? "bg-orange-300 text-slate-950" : "text-slate-200 hover:bg-slate-800"}`}>{option}</button>)}
          </div>}
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-2 sm:gap-3" aria-live="polite">
          {specs.map(([label, value]) => <div className="rounded-xl border border-slate-700 bg-slate-900 p-3 sm:p-4" key={label}>
            <dt className="text-xs font-medium text-slate-300 sm:text-sm">{label}</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums sm:text-2xl">{value}</dd>
          </div>)}
        </dl>
        <p className="mt-4 text-xs leading-relaxed text-slate-300">
          {evidence.status === "source_checked" ? `${evidence.sourceName} · ${evidence.measurementBasis}` : "Historical catalog values · measurement size and source not reverified."}
        </p>
      </div>
      <div className="min-w-0 rounded-xl border border-slate-700 bg-slate-900/60 px-4 pb-4 pt-2">
        {profile ? <>
          <ShoeStackSchematic heel={heel} forefoot={forefoot} scaleMax={Math.max(60, heel, forefoot)} />
          <p className="text-center text-xs text-slate-300">Stack-height schematic · not a product image</p>
        </> : <p className="py-6 text-sm text-slate-300">A stack profile needs both heel and forefoot measurements. See the specifications below for what’s available.</p>}
      </div>
    </div>
    {boston && <div className="grid gap-3 border-t border-slate-700 bg-slate-900 px-5 py-5 text-sm text-slate-200 sm:grid-cols-2 sm:px-8">
      <div><span className="block font-semibold text-white">Midsole</span>{boston.foam}</div>
      <div><span className="block font-semibold text-white">Reinforcement</span>{boston.support}</div>
      <div><span className="block font-semibold text-white">Where to use it</span>{boston.use}</div>
      <div><span className="block font-semibold text-white">Fit check</span>{boston.fit}</div>
    </div>}
  </section>;
}

const compareMetrics = [
  ["Weight", "weight", "oz"],
  ["Heel stack", "heelStackHeight", "mm"],
  ["Forefoot stack", "forefootStackHeight", "mm"],
  ["Listed drop", "heelToToeDrop", "mm"],
] as const;

export function ShoeGenerationPicker({ shoe, series }: { shoe: RunningShoe; series: RunningShoe[] }) {
  const options = series.filter(s => s.slug && s.id !== shoe.id);
  const index = series.findIndex(s => s.id === shoe.id);
  const first = (index > 0 ? series[index-1] : options[0])?.slug ?? "";
  const [selection, setSelection] = useState(first);
  const [interactive, setInteractive] = useState(false);
  useEffect(() => setInteractive(true), []);
  const pickerId = useId();
  const other = options.find(s => s.slug === selection) ?? options.find(s => s.slug === first);
  if (!other) return null;
  const currentSource = shoeEvidence(shoe);
  const compareSource = shoeEvidence(other);
  const comparable = currentSource.status === "source_checked" && compareSource.status === "source_checked"
    && currentSource.sourceName === "Running Warehouse" && compareSource.sourceName === "Running Warehouse";
  return <div className="mb-6 rounded-xl border border-orange-200 bg-orange-50/70 p-4 sm:p-5" data-testid="shoe-generation-picker">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h3 className="text-lg font-bold text-slate-950">Compare generations</h3>
        <p className="text-sm text-slate-700">See what changed, then open either model for the full guide.</p>
      </div>
      {interactive && options.length > 1 && <div className="w-full sm:w-auto">
        <label htmlFor={pickerId} className="mb-1 block text-xs font-semibold text-slate-800">Compare with</label>
        <select id={pickerId} className="w-full rounded-lg border border-orange-300 bg-white p-2 text-sm sm:w-auto" value={other.slug ?? ""} onChange={e=>setSelection(e.target.value)}>
          {options.map(s=><option key={s.id} value={s.slug ?? ""}>{s.model}</option>)}
        </select>
      </div>}
    </div>
    <p className="mt-4 text-sm font-semibold text-slate-800" aria-live="polite">{shoe.model} vs. <a className="underline text-orange-800" href={`/tools/shoes/${other.slug}`}>{other.model}</a></p>
    <dl aria-live="polite" className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {compareMetrics.map(([label,key,unit]) => {
        const now=shoe[key], prior=other[key];
        const delta=comparable && measurement(now) && measurement(prior) ? Number((now-prior).toFixed(2)) : null;
        return <div key={key} className="rounded-lg bg-white border border-orange-100 p-3">
          <dt className="text-sm font-semibold text-slate-900">{label}</dt>
          <dd className="mt-1 text-sm tabular-nums">{shoeNumber(now, " "+unit)} vs. {shoeNumber(prior, " "+unit)}</dd>
          {delta != null && <dd className="mt-2 text-xs font-semibold text-orange-800">{delta===0 ? "No change" : `${delta>0?"+":""}${delta} ${unit}`}</dd>}
        </div>;
      })}
    </dl>
    <p className="mt-3 text-xs text-slate-700">{comparable ? "Differences use the recorded Running Warehouse figures. Small changes may reflect rounding." : "Source or measurement basis differs or is unverified. Values are shown side by side without calculating differences."}</p>
  </div>;
}
