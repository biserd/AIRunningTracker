import React from 'react';
import { Link } from 'wouter';
import { Activity, ArrowRight, Watch } from 'lucide-react';
import { runningSources } from '@shared/runningSources';

export default function RunningSources() {
  return <section id="running-sources" aria-labelledby="running-sources-title" className="px-4 py-12 sm:px-6 sm:py-16">
    <div className="mx-auto max-w-6xl">
      <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-orange-700">Your runs, connected</p>
      <div className="mb-8 max-w-3xl"><h2 id="running-sources-title" className="mb-4 text-3xl font-bold text-charcoal sm:text-4xl">Garmin and Strava. One RunAnalytics account.</h2>
        <p className="text-lg text-gray-600">Choose the connection that fits your routine. Each source has a clear role—see what’s supported before you connect.</p></div>
      <div className="grid gap-6 md:grid-cols-2">{Object.entries(runningSources).map(([key, source]) => {
        const Icon = key === 'garmin' ? Watch : Activity;
        return <article key={key} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-5 flex items-center gap-3"><span className="rounded-xl bg-orange-50 p-3 text-orange-700"><Icon aria-hidden="true" size={25}/></span><h3 className="text-2xl font-bold text-charcoal">{source.name}</h3></div>
          <p className="mb-2 text-sm font-semibold text-orange-800">{source.label}</p>
          <p className="mb-4 text-gray-700">{source.summary}</p>
          <p className="mb-6 border-t border-gray-100 pt-4 text-sm leading-relaxed text-gray-600">{source.scope}</p>
          <Link href={source.path} className="inline-flex min-h-11 items-center gap-2 font-semibold text-orange-700 hover:underline">Explore {source.name}<ArrowRight aria-hidden="true" size={17}/></Link>
        </article>;
      })}</div>
      <Link href="/integrations" className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-gray-700 hover:text-orange-700">Compare connection options <ArrowRight aria-hidden="true" size={16}/></Link>
    </div>
  </section>;
}
