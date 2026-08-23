import { useMemo, useState } from "react";
import { Clipboard, Flag, Printer } from "lucide-react";
import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { FAQSchema } from "@/components/FAQSchema";
import { ToolEducationPanel } from "@/components/ToolEducationPanel";
import { ToolResultActions } from "@/components/ToolResultActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculateRaceSplits, formatDuration, type DistanceUnit, type RaceSplitResult, type SplitStrategy } from "@shared/runningCalculators";

const DISTANCES = [
  { label: "5K", meters: 5_000 }, { label: "10K", meters: 10_000 },
  { label: "Half marathon", meters: 21_097.5 }, { label: "Marathon", meters: 42_195 },
];
const FAQS = [
  { question: "Which pacing strategy should I choose?", answer: "Even pacing is the simplest default. A modest negative split can work when practiced. A conservative start is useful when early crowding, excitement or climbs make goal pace difficult." },
  { question: "Why is the final split shorter?", answer: "Race distances are not exact whole numbers of miles or kilometers. The final row accounts for the remaining partial unit so the cumulative time still matches your goal." },
  { question: "Should I follow GPS or course markers?", answer: "Use official course markers where available. GPS devices commonly record slightly more or less than the certified distance." },
];

export default function RaceSplitCalculator() {
  const [distanceMeters, setDistanceMeters] = useState(42_195);
  const [hours, setHours] = useState("4");
  const [minutes, setMinutes] = useState("0");
  const [seconds, setSeconds] = useState("0");
  const [unit, setUnit] = useState<DistanceUnit>("miles");
  const [strategy, setStrategy] = useState<SplitStrategy>("even");
  const [result, setResult] = useState<RaceSplitResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const totalSeconds = useMemo(() => Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds), [hours, minutes, seconds]);

  const calculate = () => {
    if (totalSeconds < 300) { setMessage("Enter a realistic goal time."); setResult(null); return; }
    setResult(calculateRaceSplits({ distanceMeters, goalTimeSeconds: totalSeconds, unit, strategy }));
    setMessage(null);
  };

  const copyPlan = async () => {
    if (!result) return;
    const label = unit === "miles" ? "mi" : "km";
    const text = [`Race split plan: ${strategy}: goal ${formatDuration(totalSeconds)}`, ...result.rows.map((row) => `${row.distance.toFixed(row.splitDistance < 1 ? 2 : 0)} ${label}: ${formatDuration(row.splitSeconds)} split / ${formatDuration(row.cumulativeSeconds)} elapsed`)].join("\n");
    try { await navigator.clipboard.writeText(text); setMessage("Split plan copied."); } catch { setMessage("Copy is unavailable in this browser. Select the table to copy it manually."); }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <SEO title="Race Split Calculator | Mile & Kilometer Pace Chart" description="Create exact mile or kilometer race splits for an even, conservative-start or negative-split strategy. Printable and free." url="https://aitracker.run/tools/race-split-calculator" keywords="race split calculator, marathon pace chart, mile splits, negative split calculator" />
      <FAQSchema faqs={FAQS} />
      <PublicHeader />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="mb-8 max-w-3xl"><Badge className="mb-4 bg-strava-orange">Free calculator</Badge><h1 className="text-3xl font-bold text-charcoal dark:text-white sm:text-5xl">Race Split Calculator</h1><p className="mt-4 text-lg text-slate-600 dark:text-slate-300">Build an exact mile or kilometer pacing chart that preserves your goal finish time.</p></div>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Flag className="h-5 w-5 text-strava-orange" />Goal and strategy</CardTitle><CardDescription>Choose a modest strategy; the calculator does not create extreme pacing swings.</CardDescription></CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label htmlFor="split-distance">Race distance</Label><select id="split-distance" className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3" value={distanceMeters} onChange={(e) => setDistanceMeters(Number(e.target.value))}>{DISTANCES.map((distance) => <option key={distance.meters} value={distance.meters}>{distance.label}</option>)}</select></div>
              <div><Label>Goal time</Label><div className="mt-2 grid grid-cols-3 gap-2"><Input aria-label="Hours" type="number" min="0" value={hours} onChange={(e) => setHours(e.target.value)} /><Input aria-label="Minutes" type="number" min="0" max="59" value={minutes} onChange={(e) => setMinutes(e.target.value)} /><Input aria-label="Seconds" type="number" min="0" max="59" value={seconds} onChange={(e) => setSeconds(e.target.value)} /></div></div>
              <div><Label htmlFor="split-unit">Split unit</Label><select id="split-unit" className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3" value={unit} onChange={(e) => setUnit(e.target.value as DistanceUnit)}><option value="miles">Miles</option><option value="km">Kilometers</option></select></div>
              <div><Label htmlFor="split-strategy">Pacing strategy</Label><select id="split-strategy" className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3" value={strategy} onChange={(e) => setStrategy(e.target.value as SplitStrategy)}><option value="even">Even pace</option><option value="conservative">Conservative start</option><option value="negative">Negative split</option></select></div>
            </div>
            {message && <p role="status" className="text-sm text-slate-600">{message}</p>}
            <Button onClick={calculate} className="w-full bg-strava-orange text-white hover:bg-strava-orange/90">Create split chart</Button>
          </CardContent>
        </Card>

        {result && <Card className="mt-8 print:shadow-none" data-testid="race-split-result"><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle>{strategy === "even" ? "Even" : strategy === "negative" ? "Negative" : "Conservative-start"} split plan</CardTitle><CardDescription>Average pace {formatDuration(result.averagePaceSecondsPerUnit)}/{unit === "miles" ? "mi" : "km"}; first half {formatDuration(result.firstHalfSeconds)}, second half {formatDuration(result.secondHalfSeconds)}</CardDescription></div><div className="flex gap-2 print:hidden"><Button variant="outline" size="sm" onClick={copyPlan}><Clipboard className="mr-2 h-4 w-4" />Copy</Button><Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print</Button></div></div></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="py-3">Marker</th><th>Split</th><th>Elapsed</th><th>Pace</th></tr></thead><tbody>{result.rows.map((row) => <tr key={row.split} className="border-b last:border-0"><td className="py-3 font-semibold">{row.distance.toFixed(row.splitDistance < 1 ? 2 : 0)} {unit === "miles" ? "mi" : "km"}</td><td>{formatDuration(row.splitSeconds)}</td><td>{formatDuration(row.cumulativeSeconds)}</td><td>{formatDuration(row.paceSecondsPerUnit)}/{unit === "miles" ? "mi" : "km"}</td></tr>)}</tbody></table></div><ToolResultActions source="race_split_result" capability="race_splits" /></CardContent></Card>}

        <ToolEducationPanel variant="race-splits" />
        <section className="mt-8 rounded-xl bg-white p-6 dark:bg-slate-900"><h2 className="text-2xl font-bold">Frequently asked questions</h2>{FAQS.map((faq) => <details key={faq.question} className="border-b py-4"><summary className="cursor-pointer font-semibold">{faq.question}</summary><p className="mt-2 text-slate-600 dark:text-slate-300">{faq.answer}</p></details>)}</section>
      </main>
      <Footer />
    </div>
  );
}
