import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface StarterCounts {
  starters: number; runs_opened: number; predictions: number; weeks_previewed: number;
  weeks_saved: number; coach_replies: number; two_actions: number; return_eligible: number; returned: number;
}

export function StarterJourneyReport() {
  const report = useQuery<{ counts: StarterCounts }>({
    queryKey: ["/api/admin/starter-journey"], staleTime: 30000, refetchInterval: 60000,
  });
  const counts = report.data?.counts;
  return <Card data-testid="starter-journey-report">
    <CardHeader>
      <CardTitle>New runner onboarding</CardTitle>
      <p className="text-sm text-slate-600">First free dashboard sessions in the last 30 days, within seven days of signup. Counts start when this tracking goes live.</p>
    </CardHeader>
    <CardContent className="space-y-4">
      {report.isError ? <p role="status" className="text-sm text-slate-600">Couldn’t load onboarding data. Use Refresh data to try again.</p>
        : !counts ? <p role="status" className="text-sm text-slate-600">Loading onboarding data…</p>
        : !counts.starters ? <p className="text-sm text-slate-600">No new-runner sessions have been recorded yet.</p>
        : <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-3"><p className="text-sm text-slate-600">Started free dashboard</p><p className="text-xl font-semibold tabular-nums">{counts.starters}</p></div>
            <div className="rounded-lg border p-3"><p className="text-sm text-slate-600">Completed 2 of 3 actions</p><p className="text-xl font-semibold tabular-nums">{counts.two_actions} / {counts.starters}</p></div>
            <div className="rounded-lg border p-3"><p className="text-sm text-slate-600">Returned within 7 days</p><p className="text-xl font-semibold tabular-nums">{counts.return_eligible ? `${counts.returned} / ${counts.return_eligible}` : "Not enough time yet"}</p></div>
          </div>
          <Table aria-label="First-session actions">
            <TableHeader><TableRow><TableHead>First-session action</TableHead><TableHead className="text-right">Runners</TableHead></TableRow></TableHeader>
            <TableBody>{[
              ["Opened a run", counts.runs_opened], ["Got a race prediction", counts.predictions],
              ["Previewed Week 1", counts.weeks_previewed], ["Saved Week 1", counts.weeks_saved],
              ["Got a coach reply", counts.coach_replies],
            ].map(([label, count]) => <TableRow key={label}><TableCell>{label}</TableCell><TableCell className="text-right tabular-nums">{count}</TableCell></TableRow>)}</TableBody>
          </Table>
          <p className="text-xs text-slate-600">A session ends after 30 minutes of inactivity. Run and race prediction count as one type; previewing and saving count as one type. Returns are new dashboard sessions 24 hours to seven days later, among runners with a full seven-day observation window.</p>
        </>}
    </CardContent>
  </Card>;
}
