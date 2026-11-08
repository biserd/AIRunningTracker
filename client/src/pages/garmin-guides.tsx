import React from 'react';
import { Link } from 'wouter';
import { ArrowRight, ChevronDown, Moon, ShieldCheck, Watch } from 'lucide-react';
import PublicHeader from '@/components/PublicHeader';
import Footer from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { useAuth } from '@/hooks/useAuth';
import { garminPublicPages, type GarminPublicPage } from '@shared/garminPublicContent';

export function GarminResources() {
  return <nav aria-label="Garmin guides" className="mx-auto grid max-w-6xl gap-5 px-6 py-12 md:grid-cols-2">
    {Object.values(garminPublicPages).map(page => <Link key={page.path} href={page.path} className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors hover:border-orange-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-700">
      <p className="mb-2 text-sm font-semibold text-orange-700">{page.label}</p><h2 className="mb-3 text-xl font-bold text-charcoal">{page.headline}</h2><p className="mb-5 leading-relaxed text-gray-600">{page.intro}</p><span className="inline-flex min-h-11 items-center gap-2 font-semibold text-orange-700">{page.path.endsWith('setup') ? 'Read the setup guide' : 'Explore recovery features'}<ArrowRight size={17} aria-hidden="true"/></span>
    </Link>)}
  </nav>;
}

function GarminGuide({ pageKey }: { pageKey: GarminPublicPage }) {
  const page = garminPublicPages[pageKey], recovery = pageKey === 'recovery';
  const { isAuthenticated } = useAuth();
  const destination = recovery ? '/recovery' : '/settings#garmin';
  const href = isAuthenticated ? destination : '/auth?redirect=' + encodeURIComponent(destination);
  const Icon = recovery ? Moon : Watch;
  const schema = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'WebPage', name: page.title, description: page.description, url: 'https://aitracker.run' + page.path },
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Connections', item: 'https://aitracker.run/integrations' }, { '@type': 'ListItem', position: 2, name: 'Garmin', item: 'https://aitracker.run/garmin' }, { '@type': 'ListItem', position: 3, name: page.label, item: 'https://aitracker.run' + page.path }] },
    { '@type': 'FAQPage', mainEntity: page.faqs.map(f => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })) },
  ] };
  return <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
    <SEO title={page.title} description={page.description} url={'https://aitracker.run' + page.path} structuredData={schema}/>
    <PublicHeader/><main>
      <section className="mx-auto max-w-4xl px-6 pb-10 pt-12 sm:pt-20">
        <Link href="/garmin" className="mb-6 inline-flex min-h-11 items-center text-sm font-medium text-gray-600 hover:text-orange-700">← Garmin running dashboard</Link>
        <div className="mb-5 flex items-center gap-3 text-orange-700"><Icon size={26} aria-hidden="true"/><p className="text-sm font-semibold uppercase tracking-widest">{page.label}</p></div>
        <h1 className="mb-6 text-4xl font-bold leading-tight text-charcoal sm:text-5xl">{page.headline}</h1>
        <p className="mb-7 text-lg leading-relaxed text-gray-600">{page.intro}</p>
        <Link href={href} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-orange-700 px-6 py-3 font-semibold text-white hover:bg-orange-800">{recovery ? 'Open my recovery dashboard' : 'Connect Garmin in Settings'}<ArrowRight size={18} aria-hidden="true"/></Link>
        <p className="mt-4 text-sm text-gray-600">Web account required. Strava is not required. {recovery ? 'Health sharing is optional and needs separate consent.' : 'Authorize Garmin only after signing in to RunAnalytics.'}</p>
        <nav aria-label="On this page" className="mt-8 flex flex-wrap gap-x-5 gap-y-2 border-t border-gray-200 pt-5">{page.sections.map(section => <a key={section.id} href={'#' + section.id} className="inline-flex min-h-11 items-center text-sm font-semibold text-orange-700 underline underline-offset-4">{section.title}</a>)}</nav>
      </section>
      {page.sections.map((section, index) => <section key={section.id} id={section.id} className="mx-auto max-w-6xl scroll-mt-24 px-6 py-8">
        <h2 className="mb-6 max-w-3xl text-2xl font-bold text-charcoal sm:text-3xl">{section.title}</h2>
        <div className={'grid gap-5 ' + (section.items.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2')}>
          {section.items.map(item => <article key={item.title} className={'rounded-2xl border p-6 ' + (recovery && index === 1 ? 'border-teal-200 bg-teal-50' : 'border-gray-200 bg-white')}><h3 className="mb-3 text-lg font-bold text-charcoal">{item.title}</h3><p className="leading-relaxed text-gray-600">{item.text}</p></article>)}
        </div>
        {!recovery && section.id === 'troubleshooting' && <Link href="/contact" className="mt-4 inline-flex min-h-11 items-center gap-2 font-semibold text-orange-700 underline">Contact RunAnalytics support<ArrowRight size={17} aria-hidden="true"/></Link>}
      </section>)}
      <section className="mx-auto max-w-4xl px-6 py-12"><h2 className="mb-6 text-3xl font-bold text-charcoal">Common questions</h2><div className="space-y-3">{page.faqs.map(f => <details key={f.question} className="rounded-2xl border border-gray-200 bg-white p-5"><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-semibold text-charcoal">{f.question}<ChevronDown aria-hidden="true" size={18} className="shrink-0"/></summary><p className="mt-4 leading-relaxed text-gray-600">{f.answer}</p></details>)}</div></section>
      <section className="mx-auto max-w-6xl px-6 pt-4"><div className="flex gap-4 rounded-2xl bg-charcoal p-6 text-white sm:p-8"><ShieldCheck aria-hidden="true" size={28} className="shrink-0 text-orange-200"/><div><h2 className="mb-3 text-xl font-bold">Your connection, on your terms</h2><p className="mb-4 max-w-3xl leading-relaxed text-gray-300">RunAnalytics is independent of Garmin. Data availability depends on your device and permissions. Garmin health readings are not used for AI coaching, and this dashboard does not provide medical advice.</p><div className="flex flex-wrap gap-x-6 gap-y-2"><Link href="/privacy#garmin-health" className="inline-flex min-h-11 items-center font-semibold text-orange-200 underline">Health and sleep privacy</Link><Link href="/integrations" className="inline-flex min-h-11 items-center font-semibold text-orange-200 underline">Compare Garmin and Strava</Link><Link href="/pricing" className="inline-flex min-h-11 items-center font-semibold text-orange-200 underline">Current trial and pricing</Link></div></div></div></section>
      <GarminResources/>
    </main><Footer/>
  </div>;
}
export function GarminRecoveryPage() { return <GarminGuide pageKey="recovery"/>; }
export function GarminSetupPage() { return <GarminGuide pageKey="setup"/>; }
