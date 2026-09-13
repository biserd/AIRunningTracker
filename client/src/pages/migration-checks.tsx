import { useQuery } from '@tanstack/react-query';
import { isReadOnlyStaging } from '@/lib/runtime';
type Readiness = { checkedAt: string; database: { queueTable: boolean; pushKeys: boolean; campaignsEnabled: boolean }; remaining: string[] };
export default function MigrationChecks() {
  const check = useQuery<Readiness>({ queryKey: ['/api/admin/migration/readiness'], enabled: isReadOnlyStaging, staleTime: 0 });
  if (!isReadOnlyStaging) return <p>Not available.</p>;
  return <main className="mx-auto max-w-2xl p-6 space-y-5">
    <h1 className="text-3xl font-bold">Migration checks</h1>
    <p>Admin-only, read-only checks. These do not send messages, sync Strava or change billing.</p>
    {check.isPending && <p>Checking database readiness…</p>}
    {check.isError && <p role="alert">Unable to load checks. Sign in with an admin account and try again.</p>}
    {check.data && <>
      <h2 className="text-xl font-semibold">Cutover is not yet verified</h2>
      <ul className="list-disc pl-5 space-y-2">
        <li>Durable queue table: {check.data.database.queueTable ? 'Present; execution still needs validation' : 'Missing; apply the queue SQL migration'}</li>
        <li>Existing push keys: {check.data.database.pushKeys ? 'Present' : 'Not found'}</li>
        <li>Marketing campaigns: {check.data.database.campaignsEnabled ? 'Enabled in database' : 'Disabled in database'}</li>
      </ul>
      <h2 className="text-xl font-semibold">Remaining verification</h2>
      <ul className="list-disc pl-5 space-y-2">{check.data.remaining.map(item => <li key={item}>{item}</li>)}</ul>
      <p className="text-sm text-muted-foreground">Checked {new Date(check.data.checkedAt).toLocaleString()}</p>
    </>}
    <a className="underline" href="/dashboard">Back to dashboard</a>
  </main>;
}
