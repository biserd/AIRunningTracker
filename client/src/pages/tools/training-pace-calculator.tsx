import { useMemo, useState } from "react";
import { Gauge, Info } from "lucide-react";
import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { FAQSchema } from "@/components/FAQSchema";
import { ToolEducationPanel } from "@/components/ToolEducationPanel";
import { ToolResultActions } from "@/components/ToolResultActions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculateTrainingPaces, formatDuration, formatPace, type DistanceUnit, type TrainingPaceResult } from "@shared/runningCalculators";

const DISTANCES = [
  { label: "5K", meters: 5_000 },
  { label: "10K", meters: 10_000 },
  { label: "Half marathon", meters: 21_097.5 },
  { label: "Marathon", meters: 42_195 },
];

const FAQS = [
  { question: "Are these paces personalized training zones?", answer: "They are transparent starting ranges based on a recent race, not laboratory-measured physiological thresholds. Adjust for terrain, weather, fatigue and how the effort feels." },
  { question: "Which race result should I use?", answer: "Use a recent, well-paced race or hard effort. Results from 5K through half marathon generally transfer more directly than a sprint or ultra-distance effort." },
  { question: "Should every run fit one of these ranges?", answer: "No. Recovery, hills, heat and accumulated fatigue can make a slower pace appropriate. Effort should take priority over forcing a number." },
];

export default function TrainingPaceCalculator() {
  const [distanceMeters, setDistanceMeters] = useState(10_000);
  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("45");
  const [seconds, setSeconds] = useState("0");
  const [raceAgeDays, setRaceAgeDays] = useState("14");
  const [weeklyDistanceKm, setWeeklyDistanceKm] = useState("40");
  const [averageHeartRate, setAverageHeartRate] = useState("");
  const [unit, setUnit] = useState<DistanceUnit>("km");
  const [result, setResult] = useState<TrainingPaceResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalSeconds = useMemo(() => Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds), [hours, minutes, seconds]);

  const calculate = () => {
    try {
      if (totalSeconds < 180) throw new Error("Enter a realistic recent finish time.");
      const heartRate = averageHeartRate.trim() ? Number(averageHeartRate) : null;
      if (heartRate !== null && (!Number.isFinite(heartRate) || heartRate < 60 || heartRate > 230)) throw new Error("Average heart rate must be between 60 and 230 bpm.");
      setResult(calculateTrainingPaces({
        distanceMeters,
        timeSeconds: totalSeconds,
        raceAgeDays: Number(raceAgeDays),
        weeklyDistanceKm: Number(weeklyDistanceKm),
        averageHeartRate: heartRate,
      }));
      setError(null);
    } catch (reason) {
      setResult(null);
      setError(reason instanceof Error ? reason.message : "Check your inputs and try again.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <SEO title="Training Pace Calculator | Free Running Pace Zones" description="Calculate broad easy, long-run, steady, threshold and interval pace ranges from a recent race. Transparent methodology and no signup required." url="https://aitracker.run/tools/training-pace-calculator" keywords="training pace calculator, running pace zones, easy run pace, threshold pace" />
      <FAQSchema faqs={FAQS} />
      <PublicHeader />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="mb-8 max-w-3xl">
          <Badge className="mb-4 bg-strava-orange">Free calculator</Badge>
          <h1 className="text-3xl font-bold text-charcoal dark:text-white sm:text-5xl">Training Pace Calculator</h1>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">Turn a recent race into practical pace ranges—with an explicit usefulness rating and no false precision.</p>
        </div>

        <Alert className="mb-8 border-blue-200 bg-blue-50"><Info className="h-4 w-4 text-blue-700" /><AlertDescription>Use a recent race or hard, evenly paced effort. The calculator cannot account for soreness, illness, heat or hills.</AlertDescription></Alert>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Gauge className="h-5 w-5 text-strava-orange" />Recent performance</CardTitle><CardDescription>All fields except average heart rate are required.</CardDescription></CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label htmlFor="pace-distance">Race distance</Label><select id="pace-distance" value={distanceMeters} onChange={(event) => setDistanceMeters(Number(event.target.value))} className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3">{DISTANCES.map((distance) => <option key={distance.meters} value={distance.meters}>{distance.label}</option>)}</select></div>
              <div><Label>Finish time</Label><div className="mt-2 grid grid-cols-3 gap-2"><Input aria-label="Hours" type="number" min="0" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="Hours" /><Input aria-label="Minutes" type="number" min="0" max="59" value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="Minutes" /><Input aria-label="Seconds" type="number" min="0" max="59" value={seconds} onChange={(e) => setSeconds(e.target.value)} placeholder="Seconds" /></div></div>
              <div><Label htmlFor="race-age">Days since this effort</Label><Input id="race-age" className="mt-2" type="number" min="0" max="730" value={raceAgeDays} onChange={(e) => setRaceAgeDays(e.target.value)} /></div>
              <div><Label htmlFor="weekly-distance">Current weekly distance (km)</Label><Input id="weekly-distance" className="mt-2" type="number" min="0" max="300" value={weeklyDistanceKm} onChange={(e) => setWeeklyDistanceKm(e.target.value)} /></div>
              <div><Label htmlFor="average-hr">Average race heart rate (optional)</Label><Input id="average-hr" className="mt-2" type="number" min="60" max="230" value={averageHeartRate} onChange={(e) => setAverageHeartRate(e.target.value)} placeholder="e.g. 172" /></div>
              <div><Label htmlFor="pace-unit">Display pace</Label><select id="pace-unit" value={unit} onChange={(event) => setUnit(event.target.value as DistanceUnit)} className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3"><option value="km">Per kilometer</option><option value="miles">Per mile</option></select></div>
            </div>
            {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
            <Button onClick={calculate} className="w-full bg-strava-orange text-white hover:bg-strava-orange/90">Calculate training paces</Button>
          </CardContent>
        </Card>

        {result && (
          <Card className="mt-8" data-testid="training-pace-result">
            <CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle>Your starting pace ranges</CardTitle><CardDescription>10K-equivalent performance: {formatDuration(result.equivalent10kSeconds)}</CardDescription></div><Badge variant={result.confidence === "High" ? "default" : "secondary"}>{result.confidence} usefulness</Badge></div></CardHeader>
            <CardContent>
              <p className="mb-5 text-sm text-slate-600">{result.confidenceReason}</p>
              <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="py-3 pr-4">Run type</th><th className="py-3 pr-4">Starting range</th><th className="py-3">Purpose</th></tr></thead><tbody>{result.zones.map((zone) => <tr key={zone.key} className="border-b last:border-0"><th className="py-4 pr-4 font-semibold">{zone.label}</th><td className="whitespace-nowrap py-4 pr-4">{formatPace(zone.fasterSecondsPerKm, unit)}–{formatPace(zone.slowerSecondsPerKm, unit)}</td><td className="py-4 text-slate-600">{zone.purpose}</td></tr>)}</tbody></table></div>
              <ul className="mt-5 space-y-2 text-sm text-slate-600">{result.notes.map((note) => <li key={note}>• {note}</li>)}</ul>
              <ToolResultActions source="training_pace_result" capability="training_paces" />
            </CardContent>
          </Card>
        )}

        <ToolEducationPanel variant="training-pace" />
        <section className="mt-8 rounded-xl bg-white p-6 dark:bg-slate-900"><h2 className="text-2xl font-bold">Frequently asked questions</h2>{FAQS.map((faq) => <details key={faq.question} className="border-b py-4"><summary className="cursor-pointer font-semibold">{faq.question}</summary><p className="mt-2 text-slate-600 dark:text-slate-300">{faq.answer}</p></details>)}</section>
      </main>
      <Footer />
    </div>
  );
}
