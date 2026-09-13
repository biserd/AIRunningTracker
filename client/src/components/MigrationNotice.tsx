import { Helmet } from 'react-helmet';
import { useLocation } from 'wouter';
import { isReadOnlyStaging, stagingWriteMessage } from '@/lib/runtime';

export function MigrationNotice() {
  const [path] = useLocation();
  const titles: Record<string, string> = { '/dashboard': 'Dashboard', '/activities': 'Activities',
    '/training-plans': 'Training plans', '/coach-insights': 'Coach insights', '/settings': 'Settings',
    '/admin': 'Admin', '/migration-checks': 'Migration checks' };
  const title = titles[path] || (path.startsWith('/activity/') ? 'Run details' : path.startsWith('/training-plans/') ? 'Training plan' : null);
  return <>
    <Helmet defaultTitle="RunAnalytics">{title && <title>{title} | RunAnalytics</title>}</Helmet>
    {isReadOnlyStaging && <aside role="status" className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm text-amber-950" data-testid="migration-notice">
      <strong>Cloudflare migration test.</strong> {stagingWriteMessage} Your live account is unchanged.
      {' '}<a className="underline" href="/migration-checks">Admin checks</a>
    </aside>}
  </>;
}
