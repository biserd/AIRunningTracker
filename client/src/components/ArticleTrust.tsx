import { ExternalLink, ShieldCheck } from "lucide-react";

type Topic = "training" | "ai" | "tools" | "ultra";

const SOURCES: Record<Topic, Array<{ label: string; href: string }>> = {
  training: [
    { label: "WHO physical activity guidance", href: "https://www.who.int/news-room/fact-sheets/detail/physical-activity" },
    { label: "ACSM exercise guidance", href: "https://www.acsm.org/education-resources/trending-topics-resources/physical-activity-guidelines" },
  ],
  ultra: [
    { label: "International Trail Running Association health resources", href: "https://itra.run/Health" },
    { label: "WHO physical activity guidance", href: "https://www.who.int/news-room/fact-sheets/detail/physical-activity" },
  ],
  ai: [
    { label: "RunAnalytics methodology and limitations", href: "/faq" },
    { label: "Strava API data terms", href: "https://www.strava.com/legal/api" },
  ],
  tools: [
    { label: "RunAnalytics comparison methodology", href: "/tools" },
    { label: "Strava API data terms", href: "https://www.strava.com/legal/api" },
  ],
};

export function ArticleTrust({ topic }: { topic: Topic }) {
  return (
    <aside className="max-w-4xl mx-auto px-4 sm:px-6 -mt-2 mb-8" aria-label="Article editorial information">
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90 p-4 text-sm text-slate-600 dark:text-slate-300">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
          <span className="font-semibold text-slate-900 dark:text-white">By the RunAnalytics Editorial Team</span>
          <span>Updated August 7, 2026</span>
          <span className="inline-flex items-center gap-1"><ShieldCheck className="h-4 w-4" /> Product and data claims reviewed</span>
        </div>
        <p className="mb-2">Educational content only. Training estimates depend on data quality and are not medical diagnosis or individualized clinical advice.</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {SOURCES[topic].map((source) => (
            <a key={source.href} href={source.href} target={source.href.startsWith("http") ? "_blank" : undefined} rel={source.href.startsWith("http") ? "nofollow noopener noreferrer" : undefined} className="inline-flex items-center gap-1 text-blue-700 dark:text-blue-300 hover:underline">
              {source.label}{source.href.startsWith("http") && <ExternalLink className="h-3 w-3" />}
            </a>
          ))}
        </div>
      </div>
    </aside>
  );
}
