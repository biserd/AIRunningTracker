import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Brain,
  CheckCircle2,
  Download,
  ExternalLink,
  FileCheck2,
  Mail,
  Quote,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { trackFunnelEvent } from "@/lib/analytics";

const GUMROAD_URL = "https://airunning.gumroad.com/l/the_running_guide_to_ai_coaching";
const PRICING_URL =
  "/pricing?source=ebook_landing&capability=ebook_bundle&benefitKey=ebook_bundle" +
  "&returnTo=%2Fai-running-coaching-guide%3Fdownload%3D1" +
  "&pendingResourceId=ai-coaching-ebook&experimentVariant=ebook_bundle_v1";

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "The Runner's Guide to AI Coaching",
      url: "https://aitracker.run/ai-running-coaching-guide",
      description:
        "Get the 33-page Runner's Guide to AI Coaching free when you start a 14-day RunAnalytics Premium trial.",
    },
    {
      "@type": "Book",
      name: "The Runner's Guide to AI Coaching",
      author: { "@type": "Person", name: "Biser" },
      publisher: { "@type": "Organization", name: "RunAnalytics" },
      numberOfPages: 33,
      bookFormat: "https://schema.org/EBook",
      inLanguage: "en",
      image: "https://aitracker.run/ebook/ai-coaching-guide-cover.webp",
      description:
        "What AI can do, what it gets wrong, and how to train safely with your data.",
    },
  ],
};

const INCLUDED = [
  {
    icon: Brain,
    title: "Understand the system",
    text: "See how activity data becomes a recommendation - and where missing context can create confident mistakes.",
  },
  {
    icon: BarChart3,
    title: "Judge the evidence",
    text: "Use the 20-point AI Coach Scorecard to evaluate personalization, uncertainty, safety, privacy, and real usefulness.",
  },
  {
    icon: ShieldCheck,
    title: "Train with boundaries",
    text: "Apply practical guidance for load, recovery, intensity, strength, tapering, race predictions, and stop rules.",
  },
  {
    icon: FileCheck2,
    title: "Put it into practice",
    text: "Use the runner brief, weekly review, worked 10K example, and buying checklist with any AI coach.",
  },
];

const FAQS = [
  {
    question: "Is the ebook really included free?",
    answer:
      "Yes. Start an eligible 14-day RunAnalytics Premium trial and the complete 33-page PDF is included at no additional cost.",
  },
  {
    question: "Do I need a payment card for the trial?",
    answer:
      "Yes. Stripe collects a card when you activate the trial. You pay $0 today and can cancel before the trial ends. If you continue, Premium is $7.99 per month or $79.99 per year.",
  },
  {
    question: "Can I buy the ebook without starting a trial?",
    answer:
      "Yes. The standalone edition is listed for $49 on Gumroad. That option is available below for runners who only want the guide.",
  },
  {
    question: "What if I already have Premium or an active trial?",
    answer:
      "Sign in on this page and use the download button. Active Premium and trial accounts can download the guide directly.",
  },
];

export default function AICoachingGuidePage() {
  const { isAuthenticated } = useAuth();
  const { hasActiveSubscription, isLoading: subscriptionLoading } = useSubscription();
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);
  const wantsDownload = new URLSearchParams(window.location.search).get("download") === "1";

  const authUrl = `/auth?mode=signup&redirect=${encodeURIComponent(PRICING_URL)}`;
  const signInToDownloadUrl = `/auth?redirect=${encodeURIComponent("/ai-running-coaching-guide?download=1")}`;
  const trialUrl = isAuthenticated ? PRICING_URL : authUrl;

  useEffect(() => {
    trackFunnelEvent(
      "offer_viewed",
      { source: "ebook_landing", capability: "ebook_bundle", experimentVariant: "ebook_bundle_v1" },
      { oncePerSession: true, dedupeParts: ["ebook_landing", "ebook_bundle_v1"] },
    );
  }, []);

  const trackTrialClick = () => {
    trackFunnelEvent(
      "offer_clicked",
      { source: "ebook_landing", capability: "ebook_bundle", experimentVariant: "ebook_bundle_v1" },
      { dedupeParts: ["ebook_landing", "ebook_bundle_v1"] },
    );
  };

  const trackGumroadClick = () => {
    trackFunnelEvent(
      "ebook_gumroad_clicked",
      { source: "ebook_landing", capability: "ebook_standalone" },
      { dedupeParts: ["ebook_landing", "gumroad"] },
    );
  };

  const downloadGuide = async () => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      window.location.href = authUrl;
      return;
    }

    setDownloading(true);
    try {
      const response = await fetch("/api/ebook/ai-coaching-guide", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 403) {
        window.location.href = PRICING_URL;
        return;
      }
      if (!response.ok) throw new Error("The guide could not be downloaded.");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "the-runners-guide-to-ai-coaching.pdf";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: "Download unavailable",
        description: error?.message || "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  const PrimaryAction = ({ compact = false }: { compact?: boolean }) => {
    if (!subscriptionLoading && hasActiveSubscription) {
      return (
        <Button
          size="lg"
          onClick={downloadGuide}
          disabled={downloading}
          className={`bg-[#FC4C02] text-white hover:bg-[#df4302] ${compact ? "w-full sm:w-auto" : "w-full sm:w-auto px-7 py-6 text-base"}`}
          data-testid="ebook-download-cta"
        >
          <Download className="mr-2 h-5 w-5" />
          {downloading ? "Preparing your guide..." : "Download your free ebook"}
        </Button>
      );
    }

    if (wantsDownload && !isAuthenticated) {
      return (
        <Link href={signInToDownloadUrl}>
          <Button
            size="lg"
            className={`bg-[#FC4C02] text-white hover:bg-[#df4302] ${compact ? "w-full sm:w-auto" : "w-full sm:w-auto px-7 py-6 text-base"}`}
            data-testid="ebook-signin-download-cta"
          >
            Sign in to download your ebook
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>
      );
    }

    return (
      <Link href={trialUrl} onClick={trackTrialClick}>
        <Button
          size="lg"
          className={`bg-[#FC4C02] text-white hover:bg-[#df4302] shadow-lg shadow-orange-950/15 ${compact ? "w-full sm:w-auto" : "w-full sm:w-auto px-7 py-6 text-base"}`}
          data-testid="ebook-trial-cta"
        >
          Start 14 days free + get the ebook
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <SEO
        title="Free AI Running Coaching Ebook | RunAnalytics"
        description="Start a 14-day RunAnalytics Premium trial and get the $49 Runner's Guide to AI Coaching free. Learn what AI does well, where it fails, and how to train safely with your data."
        keywords="AI running coaching ebook, AI running coach guide, running analytics guide, AI training plan, Strava coaching"
        url="https://aitracker.run/ai-running-coaching-guide"
        ogImage="https://aitracker.run/ebook/ai-coaching-guide-cover.webp"
        structuredData={STRUCTURED_DATA}
        ogTitle="Get the $49 AI Running Coaching Guide Free"
        ogDescription="Start your 14-day RunAnalytics Premium trial and receive the complete 33-page guide at no additional cost."
      />
      <PublicHeader />

      <main>
        <section className="relative overflow-hidden bg-[#071b2d] text-white">
          <div className="absolute inset-0 opacity-30" aria-hidden="true">
            <div className="absolute -left-24 top-20 h-80 w-80 rounded-full bg-cyan-500 blur-3xl" />
            <div className="absolute -right-20 bottom-10 h-72 w-72 rounded-full bg-[#FC4C02] blur-3xl" />
          </div>
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 md:grid-cols-[1.08fr_.92fr] md:py-24">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-300/30 bg-orange-400/10 px-4 py-2 text-sm font-semibold text-orange-100">
                <Sparkles className="h-4 w-4 text-[#FC4C02]" />
                $49 ebook included with your 14-day Premium trial
              </div>
              <h1 className="max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
                Use AI to train smarter.
                <span className="mt-2 block text-cyan-300">Keep the runner in control.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200 sm:text-xl">
                Get <em>The Runner&apos;s Guide to AI Coaching</em> free when you start your RunAnalytics Premium trial. Learn what AI can do, what it gets wrong, and how to make safer decisions with your own training data.
              </p>

              <div className="mt-8">
                <PrimaryAction />
                <p className="mt-3 text-sm text-slate-300">
                  $0 today. Card required. Cancel anytime. Then $7.99/month or $79.99/year.
                </p>
              </div>

              <div className="mt-8 grid max-w-2xl gap-3 text-sm text-slate-200 sm:grid-cols-3">
                {["33 practical pages", "17 focused chapters", "15 research sources"].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 flex-none text-cyan-300" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mx-auto w-full max-w-md md:max-w-lg">
              <div className="relative mx-auto w-[78%] rotate-2 rounded-sm bg-slate-950 p-2 shadow-2xl shadow-black/60 transition-transform duration-300 hover:rotate-0">
                <img
                  src="/ebook/ai-coaching-guide-cover.webp"
                  alt="Cover of The Runner's Guide to AI Coaching"
                  className="aspect-[2/3] w-full object-cover"
                  width="900"
                  height="1350"
                  fetchPriority="high"
                />
                <div className="absolute -right-4 bottom-12 rounded-lg bg-white px-4 py-3 text-slate-900 shadow-xl">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Standalone value</p>
                  <p className="text-2xl font-bold">$49</p>
                  <p className="text-xs font-semibold text-[#FC4C02]">Included free</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-slate-50 py-10">
          <div className="mx-auto max-w-6xl px-6 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FC4C02]">One offer, two useful tools</p>
            <h2 className="mt-3 text-2xl font-bold sm:text-3xl">Read the principles. Apply them to your own runs.</h2>
            <p className="mx-auto mt-3 max-w-3xl text-slate-600">
              The ebook helps you evaluate AI coaching. RunAnalytics lets you test those ideas against your own Strava history, recent training, and goals.
            </p>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FC4C02]">Inside the guide</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">A decision framework, not another generic plan</h2>
              <p className="mt-4 text-lg text-slate-600">
                Built for everyday runners who want the benefits of AI without handing an algorithm the final word.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {INCLUDED.map(({ icon: Icon, title, text }) => (
                <article key={title} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-[#FC4C02]">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold">{title}</h3>
                  <p className="mt-2 leading-7 text-slate-600">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#071b2d] py-16 text-white sm:py-20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid items-center gap-12 lg:grid-cols-[.75fr_1.25fr]">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">Look inside</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Clear enough to use on Monday morning</h2>
                <p className="mt-5 text-lg leading-8 text-slate-300">
                  The guide turns technical ideas into practical checks, visual explanations, and worksheets you can use with RunAnalytics or any other AI coach.
                </p>
                <ul className="mt-7 space-y-3 text-slate-200">
                  {["A visual data-to-recommendation pipeline", "A printable 20-point AI Coach Scorecard", "A weekly review and worked 10K adaptation", "Privacy, uncertainty, and safety checklists"].map((item) => (
                    <li key={item} className="flex gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-cyan-300" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-3 items-end gap-3 sm:gap-5">
                {[
                  ["/ebook/guide-data-pipeline.webp", "Guide page explaining how an AI running coach works"],
                  ["/ebook/guide-scorecard.webp", "The 20-point AI Coach Scorecard"],
                  ["/ebook/guide-worked-example.webp", "Worked example adapting a 10K training week"],
                ].map(([src, alt], index) => (
                  <div key={src} className={`overflow-hidden rounded-lg bg-white p-1 shadow-2xl ${index === 1 ? "-translate-y-5" : ""}`}>
                    <img src={src} alt={alt} loading="lazy" className="aspect-[.707] w-full object-cover object-top" width="720" height="1018" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-5xl px-6">
            <div className="rounded-3xl border border-orange-100 bg-orange-50 p-8 sm:p-12">
              <Quote className="h-10 w-10 text-[#FC4C02]" />
              <blockquote className="mt-5 text-2xl font-semibold leading-relaxed text-slate-900 sm:text-3xl">
                “I built RunAnalytics because I wanted running data to produce better decisions - not simply more charts.”
              </blockquote>
              <div className="mt-7 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#071b2d] text-lg font-bold text-white">B</div>
                <div>
                  <p className="font-bold">Biser</p>
                  <p className="text-sm text-slate-600">Author, experienced runner, and creator of RunAnalytics</p>
                </div>
              </div>
              <p className="mt-6 max-w-4xl leading-7 text-slate-700">
                Every trial reader also receives a welcome message from me with the guide, why I wrote it, and how to use it alongside your own training. My aim is to help you become a more informed runner - not a more obedient app user.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-slate-50 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FC4C02]">How it works</p>
              <h2 className="mt-3 text-3xl font-bold">From registration to your first useful insight</h2>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {[
                ["01", "Create your account", "Register with Strava or email so RunAnalytics can preserve your ebook offer."],
                ["02", "Activate the 14-day trial", "Complete secure Stripe checkout. You pay $0 today and can cancel anytime."],
                ["03", "Download and apply the guide", "Get the PDF and use its scorecard, runner brief, and weekly review with your own data."],
              ].map(([number, title, text]) => (
                <article key={number} className="rounded-2xl border border-slate-200 bg-white p-7">
                  <p className="text-4xl font-bold text-orange-100">{number}</p>
                  <h3 className="mt-3 text-xl font-bold">{title}</h3>
                  <p className="mt-2 leading-7 text-slate-600">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-4xl px-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold">Frequently asked questions</h2>
            </div>
            <div className="mt-10 divide-y divide-slate-200 border-y border-slate-200">
              {FAQS.map(({ question, answer }) => (
                <details key={question} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-semibold">
                    {question}
                    <span className="text-2xl font-normal text-[#FC4C02] group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 max-w-3xl leading-7 text-slate-600">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#071b2d] py-16 text-white sm:py-20">
          <div className="mx-auto max-w-4xl px-6 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-cyan-300" />
            <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">Start the trial. Keep the guide.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-300">
              Connect your training to RunAnalytics for 14 days and receive the complete $49 ebook at no additional cost.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4">
              <PrimaryAction compact />
              <p className="text-sm text-slate-300">$0 today. Card required. Cancel before the trial ends to avoid being charged.</p>
            </div>

            <div className="mx-auto mt-10 max-w-2xl border-t border-slate-700 pt-8">
              <div className="flex items-center justify-center gap-2 text-sm text-slate-300">
                <Mail className="h-4 w-4" />
                Prefer the ebook without a trial?
              </div>
              <a
                href={GUMROAD_URL}
                target="_blank"
                rel="nofollow noopener noreferrer"
                onClick={trackGumroadClick}
                className="mt-3 inline-flex items-center gap-2 font-semibold text-cyan-300 underline-offset-4 hover:underline"
                data-testid="ebook-gumroad-link"
              >
                Buy the standalone edition for $49 on Gumroad
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
