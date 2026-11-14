import React, { useEffect, useState } from "react";
import type { RunningShoe } from "@shared/schema";
import { categoryName, shoeEvidence, shoeName } from "@shared/shoeEditorial";
import { shoeAvailability, shoeBoolean, shoeNumber } from "@shared/shoeEvidence";
import { hasStack, ShoeStackSchematic } from "./ShoeStackSchematic";

const tone = ["text-orange-700", "text-sky-700"] as const;
const lightTone = ["text-orange-300", "text-sky-300"] as const;
const groups = ["All specs", "Geometry", "Build & use", "Price & stock"] as const;
type Group = typeof groups[number];
type WeightUnit = "oz" | "g";
type Measure = "weight" | "heelStackHeight" | "forefootStackHeight" | "heelToToeDrop";
type Row = {
  label: string; group: Exclude<Group, "All specs">;
  metric?: Measure; values: [string, string];
  numeric?: [number | null, number | null]; unit?: string;
};
const available = (x: number | null): x is number => x != null && Number.isFinite(x);
const missing = "Not published";
const gramsPerOz = 28.349523;
const keySpecs = [
  ["Heel stack", "heelStackHeight"], ["Forefoot stack", "forefootStackHeight"], ["Listed drop", "heelToToeDrop"], ["Weight", "weight"],
] as const;

function StackCard({ shoe, index, scaleMax, weight }: { shoe: RunningShoe; index: 0 | 1; scaleMax: number; weight: string }) {
  const e = shoeEvidence(shoe);
  const heel = shoe.heelStackHeight, forefoot = shoe.forefootStackHeight;
  return <article className="min-w-0 rounded-xl border border-slate-700 bg-slate-900 p-2.5 sm:p-5">
    <h3 className={`break-words text-sm font-bold leading-tight sm:text-lg ${lightTone[index]}`}>{shoeName(shoe)}</h3>
    <p className="mt-1 text-xs text-slate-300">{e.status === "source_checked" ? "Source checked" : "Historical · unverified"}</p>
    {hasStack(heel) && hasStack(forefoot)
      ? <ShoeStackSchematic heel={heel} forefoot={forefoot} scaleMax={scaleMax} tone={index === 0 ? "orange" : "sky"} compact />
      : <p className="flex min-h-16 items-center py-3 text-xs text-slate-300 sm:min-h-32">Full stack profile unavailable. Known values are listed below.</p>}
    <dl className="mt-2 grid grid-cols-2 gap-x-1 gap-y-2 border-t border-slate-700 pt-3 text-xs sm:gap-3">
      {keySpecs.map(([label, key]) => <div key={key}>
        <dt className="text-slate-300">{label}</dt>
        <dd className="mt-0.5 break-words font-semibold tabular-nums text-white sm:text-sm">
          {key === "weight" ? weight : shoeNumber(shoe[key], " mm")}
        </dd>
      </div>)}
    </dl>
  </article>;
}

export function ShoeHeadToHead({ a, b }: { a: RunningShoe; b: RunningShoe }) {
  const [interactive, setInteractive] = useState(false);
  const [group, setGroup] = useState<Group>("All specs");
  const [onlyDifferences, setOnlyDifferences] = useState(false);
  const [unit, setUnit] = useState<WeightUnit>("oz");
  useEffect(() => setInteractive(true), []);
  const shoes = [a, b] as const;
  const evidence = shoes.map(shoeEvidence);
  const comparable = evidence.every(e => e.status === "source_checked" && e.sourceName === "Running Warehouse");
  const scaleMax = Math.ceil(Math.max(60, ...shoes.flatMap(s=>[s.heelStackHeight, s.forefootStackHeight]).filter(hasStack)) / 10) * 10;
  const rows: Row[] = keySpecs.map(([label, metric]) => {
    const units = metric === "weight" ? unit : "mm";
    const format = (v: number | null) => shoeNumber(metric === "weight" && unit === "g" && available(v) ? Math.round(v * gramsPerOz) : v, " " + units);
    return { label, metric, group: "Geometry", values: [format(a[metric]), format(b[metric])], numeric: [a[metric], b[metric]], unit: units };
  });
  const add = (label: string, group: Row["group"], render: (s: RunningShoe)=>string) =>
    rows.push({ label, group, values: [render(a), render(b)] });
  add("Intended category", "Build & use", s=>categoryName(s.category));
  add("Stability category", "Build & use", s=>s.stability.replaceAll("_", " "));
  add("Cushioning category", "Build & use", s=>s.cushioningLevel);
  add("Carbon reinforcement", "Build & use", s=>shoeBoolean(s.hasCarbonPlate));
  add("Performance foam category", "Build & use", s=>shoeBoolean(s.hasSuperFoam));
  add("Recorded price", "Price & stock", s=>shoeNumber(s.price, " USD"));
  add("Availability", "Price & stock", shoeAvailability);
  const isDifferent = (r: Row) => r.numeric
    ? available(r.numeric[0]) && available(r.numeric[1]) && r.numeric[0] !== r.numeric[1]
    : r.values.every(v => ![missing, "Not verified", "Availability not verified"].includes(v)) && r.values[0] !== r.values[1];
  const filtered = rows.filter(r => (group === "All specs" || group === r.group) && (!onlyDifferences || isDifferent(r)));
  const weight = rows.find(r => r.metric === "weight")!.values;

  function takeaway(r: Row) {
    if (!r.numeric) return null;
    const [left, right] = r.numeric;
    if (!available(left) || !available(right)) return "Missing measurement";
    if (!comparable) return "No verified difference";
    const diff = Number(Math.abs(left-right).toFixed(2));
    if (!diff) return "Same listed measurement";
    const index = left > right ? (r.metric === "weight" ? 1 : 0) : (r.metric === "weight" ? 0 : 1);
    const gap = r.metric === "weight" && unit === "g" ? Math.round(diff * gramsPerOz) : diff;
    if (gap === 0) return "Less than 1 g apart";
    const direction = r.metric === "weight" ? "lighter" : r.metric === "heelToToeDrop" ? "more drop" : "higher";
    return <span className={tone[index]}>{shoes[index].model}: {gap} {r.unit} {direction}</span>;
  }

  return <section aria-labelledby="comparison-lab" className="space-y-4" data-testid="shoe-head-to-head-explorer">
    <div className="rounded-2xl bg-slate-950 p-3.5 text-white shadow-md sm:p-7">
      <p className="text-xs font-bold uppercase tracking-widest text-orange-300">Head to head</p>
      <h2 id="comparison-lab" className="mt-1 text-2xl font-bold sm:text-3xl">Compare the ride geometry</h2>
      <p className="mt-2 text-xs text-slate-300 sm:text-sm">Same stack scale (0–{scaleMax} mm). These diagrams show height, not cushioning softness or the actual shoe shape.</p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-4">
        <StackCard shoe={a} index={0} scaleMax={scaleMax} weight={weight[0]} />
        <StackCard shoe={b} index={1} scaleMax={scaleMax} weight={weight[1]} />
      </div>
    </div>
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-7" id="comparison-specs">
      <h2 className="text-xl font-bold text-slate-950 sm:text-2xl">Specifications at a glance</h2>
      <p className="mt-1 text-sm text-slate-600">{
        comparable ? "Measured differences use the listed Running Warehouse figures. Small gaps may reflect rounding."
          : "Sources or measurement bases differ or are unverified. Listed values are shown side by side without calculating numerical gaps."
      } Recorded prices are snapshots, not live offers.</p>
      {interactive && <div className="my-4 space-y-3">
        <div role="group" aria-label="Filter specifications" className="flex flex-wrap gap-2">
          {groups.map(g => <button type="button" key={g} aria-pressed={group===g} onClick={()=>setGroup(g)}
            className={`min-h-10 rounded-full border px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-orange-700 ${group===g ? "border-orange-700 bg-orange-700 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-orange-500"}`}>{g}</button>)}
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 text-sm font-semibold text-slate-800">
            <input type="checkbox" checked={onlyDifferences} onChange={e=>setOnlyDifferences(e.target.checked)} className="h-4 w-4 accent-orange-700" />
            Different values only
          </label>
          {shoes.some(s=>available(s.weight)) && <div role="group" aria-label="Weight unit" className="inline-flex rounded-lg border border-slate-300 p-0.5">
            {(["oz","g"] as const).map(u=><button type="button" key={u} aria-pressed={unit===u} onClick={()=>setUnit(u)}
              className={`min-h-8 rounded-md px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-orange-700 ${unit===u ? "bg-slate-900 text-white" : "text-slate-700"}`}>{u}</button>)}
          </div>}
        </div>
        <p role="status" className="sr-only">{filtered.length} specifications shown. Weight in {unit === "g" ? "grams" : "ounces"}.</p>
      </div>}
      <table className="mt-3 w-full table-fixed text-left text-xs sm:text-sm">
        <caption className="sr-only">{shoeName(a)} and {shoeName(b)} side-by-side specifications</caption>
        <thead><tr className="border-b border-slate-300">
          <th scope="col" className="w-[32%] py-2 pr-2">Specification</th>
          {shoes.map((s,i)=><th scope="col" key={i} className={`break-words px-1 py-2 align-bottom sm:px-3 ${tone[i]}`}>{s.model}</th>)}
        </tr></thead>
        <tbody>
          {filtered.map(r=><tr key={r.label} data-spec-group={r.group} className="border-b border-slate-100">
            <th scope="row" className="break-words py-2.5 pr-2 align-top font-semibold">
              {r.label}
              {r.metric && <span className="mt-1 block break-words text-xs font-medium text-slate-600">{takeaway(r)}</span>}
            </th>
            {r.values.map((value,i)=><td key={i} className="break-words px-1 py-2.5 align-top tabular-nums sm:px-3">{value}</td>)}
          </tr>)}
          {!filtered.length && <tr><td colSpan={3} className="py-4 text-slate-700">No different published values in this group. Turn off the filter to see all listings.</td></tr>}
        </tbody>
      </table>
    </div>
  </section>;
}
