import { useEffect } from "react";
import { Link } from "wouter";
import { SiTelegram, SiWhatsapp, SiStrava } from "react-icons/si";
import {
  ArrowRight,
  BellRing,
  Brain,
  Check,
  CheckCircle2,
  ChevronRight,
  CloudRain,
  LockKeyhole,
  MessageCircle,
  Moon,
  Route,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TimerReset,
  TrendingUp,
} from "lucide-react";
import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { trackFunnelEvent } from "@/lib/analytics";

const PAGE_SOURCE = "proactive_coach_landing";
const CAPABILITY = "ai_coach";
const PRICING_URL = `/pricing?source=${PAGE_SOURCE}&capability=${CAPABILITY}&benefitKey=coach_chat`;

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "RunAnalytics Proactive Running Coach",
      applicationCategory: "HealthApplication",
      operatingSystem: "Web",
      description: "An AI running coach that uses authorized RunAnalytics data to deliver concise post-run guidance on WhatsApp, with an iOS app coming soon.",
      offers: {
        "@type": "Offer",
        price: "7.99",
        priceCurrency: "USD",
        description: "Included with RunAnalytics Premium after a 7-day trial",
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Is the proactive running coach available on WhatsApp?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Runners with an active Premium subscription or trial can connect WhatsApp from the RunAnalytics coach experience.",
          },
        },
        {
          "@type": "Question",
          name: "Is the RunAnalytics iOS app available?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "The iOS app is currently in limited testing and is coming soon. WhatsApp and the web coach are available now.",
          },
        },
        {
          "@type": "Question",
          name: "Can the coach change my RunAnalytics or Strava data?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "The coach cannot edit activities, accounts, or subscriptions. It can prepare a training-plan change only for the signed-in runner, and nothing is saved without that runner's explicit approval.",
          },
        },
      ],
    },
  ],
};

const currentCapabilities = [
  {
    icon: TrendingUp,
    title: "A useful post-run verdict",
    copy: "Get the pattern that mattered, the evidence behind it, and one next action, not a dump of every metric.",
  },
  {
    icon: Brain,
    title: "Context from your own training",
    copy: "The coach can use your authorized activities, trends, recovery signals, goals, and plan instead of answering like a generic chatbot.",
  },
  {
    icon: MessageCircle,
    title: "Follow up naturally",
    copy: "Ask why your effort drifted, whether tomorrow should stay easy, or how the run fits the week, without finding another dashboard.",
  },
];

const roadmapCapabilities = [
  { icon: CloudRain, text: "A heads-up when tomorrow's weather changes the safest time or effort" },
  { icon: Route, text: "A day-before check-in for long runs, workouts, and race-week logistics" },
  { icon: TimerReset, text: "A sensible adjustment when life interrupts the plan, without stacking missed intensity" },
];

const faqs = [
  {
    question: "How do I connect WhatsApp?",
    answer: "Sign in with an active Premium subscription or trial, open the coach Settings tab, and follow the numbered WhatsApp connection steps. Your approval binds your phone number to your RunAnalytics account.",
  },
  {
    question: "What about the iOS app?",
    answer: "The native RunAnalytics app for iPhone and iPad is coming soon. Explore the dedicated app page for voice, chat, training plans, progress and screenshots.",
  },
  {
    question: "Is Telegram still supported?",
    answer: "Yes. Existing Telegram connections continue to work, but WhatsApp is now the primary messaging experience we promote.",
  },
  {
    question: "Does the coach see another runner's data?",
    answer: "No. Each channel connection is bound to one signed-in RunAnalytics account. Private reads use that account's identity on the server, not a user ID supplied by the chat or model.",
  },
  {
    question: "Can it edit my plan or activities?",
    answer: "The coach cannot silently change anything. It may prepare a plan or adjustment for your review, but saving it requires your explicit approval. Activities, account details, and subscriptions remain protected.",
  },
  {
    question: "Is this a medical or emergency service?",
    answer: "No. It can summarize training patterns and encourage conservative decisions, but it does not diagnose injury or replace a qualified coach or clinician.",
  },
];

function ChannelPill({ channel, status }: { channel: "telegram" | "whatsapp" | "ios"; status: string }) {
  const telegram = channel === "telegram";
  const whatsapp = channel === "whatsapp";
  const Icon = telegram ? SiTelegram : whatsapp ? SiWhatsapp : Smartphone;
  const palette = telegram
    ? "border-sky-200 bg-sky-50 text-sky-900"
    : whatsapp
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : "border-orange-200 bg-orange-50 text-orange-900";
  const iconColor = telegram ? "text-[#229ED9]" : whatsapp ? "text-[#25D366]" : "text-[#FC4C02]";
  const statusColor = telegram ? "bg-sky-200/70 text-sky-900" : whatsapp ? "bg-emerald-200/70 text-emerald-900" : "bg-orange-200/70 text-orange-900";
  return (
    <div className={`inline-flex items-center gap-3 rounded-full border px-4 py-2 shadow-sm ${palette}`}>
      <Icon className={`h-5 w-5 ${iconColor}`} />
      <span className="font-semibold">{channel === "ios" ? "iOS app" : channel.charAt(0).toUpperCase() + channel.slice(1)}</span>
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusColor}`}>{status}</span>
    </div>
  );
}

function CoachMessagePreview() {
  return (
    <div className="relative mx-auto max-w-[390px]" aria-label="Example WhatsApp post-run coaching message">
      <div className="absolute -inset-8 rounded-full bg-emerald-300/20 blur-3xl" />
      <div className="relative overflow-hidden rounded-[2rem] border-[7px] border-slate-900 bg-[#dce9e2] shadow-2xl">
        <div className="flex items-center gap-3 bg-[#128C7E] px-5 py-4 text-white">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="font-bold">RunAnalytics Coach</p>
            <p className="text-xs text-emerald-100">runner-scoped · changes require approval</p>
          </div>
          <ShieldCheck className="ml-auto h-5 w-5 text-emerald-100" />
        </div>

        <div className="space-y-3 p-4 text-[14px] leading-relaxed">
          <div className="ml-auto w-fit rounded-full bg-white/70 px-3 py-1 text-[11px] font-medium text-slate-500">Today · 8:06 AM</div>
          <div className="max-w-[92%] rounded-2xl rounded-tl-sm bg-white p-4 text-slate-800 shadow-sm">
            <p className="mb-2 font-bold text-slate-950">Good long run. Keep tomorrow easy.</p>
            <p>Your 18.2 km stayed controlled through 14 km. Pace held steady while heart-rate drift increased late, which points to normal accumulated fatigue, not a reason to add more work.</p>
            <div className="my-3 border-l-2 border-[#25D366] pl-3 text-slate-600">
              <p><strong>Do this:</strong> Rest, or run 25–35 minutes conversationally if your legs feel normal.</p>
            </div>
            <p className="text-xs text-slate-500">Based on this run, your recent load, and your current goal.</p>
          </div>
          <div className="ml-auto max-w-[78%] rounded-2xl rounded-tr-sm bg-[#d9fdd3] p-3 text-slate-800 shadow-sm">
            Why not the intervals on my plan?
          </div>
          <div className="max-w-[92%] rounded-2xl rounded-tl-sm bg-white p-4 text-slate-800 shadow-sm">
            Because they would place intensity directly after your longest run in three weeks. Keep the purpose of the week; move the workout rather than forcing the calendar.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProactiveRunningCoachLanding() {
  const { isAuthenticated } = useAuth();
  const primaryHref = isAuthenticated ? "https://new.aitracker.run/preview" : PRICING_URL;
  const primaryLabel = isAuthenticated ? "Open your coach" : "Start 7 days free";

  useEffect(() => {
    trackFunnelEvent(
      "offer_viewed",
      { source: PAGE_SOURCE, capability: CAPABILITY, experimentVariant: "messaging_coach_v1" },
      { oncePerSession: true, dedupeParts: [PAGE_SOURCE, "messaging_coach_v1"] },
    );
  }, []);

  const trackPrimaryClick = () => trackFunnelEvent(
    "offer_clicked",
    { source: PAGE_SOURCE, capability: CAPABILITY, experimentVariant: "messaging_coach_v1" },
    { dedupeParts: [PAGE_SOURCE, "messaging_coach_v1", isAuthenticated ? "settings" : "trial"] },
  );

  return (
    <div className="min-h-screen bg-[#f7f8f6] text-slate-950">
      <SEO
        title="AI Running Coach on WhatsApp | RunAnalytics"
        description="Get concise, runner-specific post-run coaching on WhatsApp through a private RunAnalytics connection. Voice and web chat are available now; the iOS app is coming soon."
        keywords="WhatsApp running coach, proactive running coach, iOS running coach, Telegram running coach, AI running coach messages, Strava coach, post-run coaching"
        url="https://aitracker.run/proactive-running-coach"
        ogTitle="Your running coach, already in your messages"
        ogDescription="Run, sync, and receive one useful next step on WhatsApp. Voice and web chat are available now; the iOS app is coming soon."
        structuredData={structuredData}
      />
      <PublicHeader />

      <main>
        <section className="relative overflow-hidden border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_#e0f2fe_0,_transparent_34%),radial-gradient(circle_at_85%_25%,_#dcfce7_0,_transparent_28%),linear-gradient(180deg,_#ffffff_0%,_#f7f8f6_100%)]">
          <div className="mx-auto grid max-w-7xl items-center gap-14 px-6 py-16 lg:grid-cols-[1.05fr_.95fr] lg:py-24">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-slate-700 shadow-sm">
                <BellRing className="h-4 w-4 text-[#FC4C02]" />
                Available with Premium
              </div>
              <h1 className="max-w-3xl text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
                A running coach that messages <span className="text-[#FC4C02]">before the lesson gets lost.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
                Run as usual. When Strava syncs, RunAnalytics can deliver a concise, data-aware coaching message in the chat you already check, then answer your natural follow-up.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <ChannelPill channel="whatsapp" status="Available now" />
                <ChannelPill channel="ios" status="Coming soon" />
                <ChannelPill channel="telegram" status="Also supported" />
              </div>

              <p className="mt-4"><Link href="/ios-app" className="font-semibold text-[#c43c00] underline underline-offset-4">Explore the iPhone &amp; iPad app →</Link></p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a href={primaryHref} onClick={trackPrimaryClick}>
                  <Button size="lg" className="h-14 w-full bg-slate-950 px-7 text-base text-white hover:bg-slate-800 sm:w-auto" data-testid="proactive-coach-primary-cta">
                    {primaryLabel} <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </a>
                <a href="#how-it-works" className="inline-flex h-14 items-center justify-center rounded-md border border-slate-300 bg-white px-7 text-base font-semibold text-slate-800 transition hover:bg-slate-50">
                  See how it works <ChevronRight className="ml-1 h-5 w-5" />
                </a>
              </div>

              <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> 7-day Premium trial</span>
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Runner-scoped access</span>
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Disconnect anytime</span>
              </div>
              <p className="mt-4 max-w-xl text-xs leading-5 text-slate-500">
                WhatsApp can be connected by Premium and trial runners from the coach Settings tab. Connecting is an explicit, runner-owned opt-in.
              </p>
            </div>

            <div className="py-4 lg:py-0">
              <CoachMessagePreview />
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-6 py-7 text-center md:flex-row md:text-left">
            <div className="flex items-center gap-3">
              <SiStrava className="h-7 w-7 text-[#FC4C02]" />
              <div>
                <p className="font-bold">Built around the training data you already sync</p>
                <p className="text-sm text-slate-500">No second activity log. No copy-pasting screenshots into a generic chatbot.</p>
              </div>
            </div>
            <div className="text-sm font-semibold text-slate-500">Strava → RunAnalytics → your private coach channel</div>
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-7xl px-6 py-20 lg:py-28">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#FC4C02]">What works in early access</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Less dashboard archaeology. More useful decisions.</h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">The coach is designed to lead with the decision, show the runner-specific evidence, and finish with one executable action.</p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {currentCapabilities.map(({ icon: Icon, title, copy }) => (
              <article key={title} className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-[#FC4C02]"><Icon className="h-6 w-6" /></div>
                <h3 className="mt-6 text-xl font-bold">{title}</h3>
                <p className="mt-3 leading-7 text-slate-600">{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-slate-950 text-white">
          <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center lg:py-24">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-sky-300">One-click connection</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">A private coach, not a shared chatbot.</h2>
              <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">The smooth experience happens behind the chat. Your WhatsApp number is securely bound to your signed-in RunAnalytics account, and every private request is checked on the server.</p>

              <ol className="mt-8 space-y-5">
                {[
                  ["1", "Open coach Settings", "Choose WhatsApp and approve access to your own RunAnalytics data."],
                  ["2", "Send the prepared message", "RunAnalytics securely binds that private WhatsApp chat to your runner account."],
                  ["3", "Start coaching", "Ask about your runs and plan. Any proposed plan change waits for your approval."],
                ].map(([number, title, copy]) => (
                  <li key={number} className="flex gap-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-400 font-black text-slate-950">{number}</span>
                    <div><h3 className="font-bold">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-400">{copy}</p></div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-3xl border border-slate-700 bg-slate-900 p-7 sm:p-9">
              <div className="flex items-center gap-3 border-b border-slate-700 pb-5">
                <LockKeyhole className="h-6 w-6 text-emerald-400" />
                <h3 className="text-xl font-bold">What the messaging coach cannot do</h3>
              </div>
              <ul className="mt-6 space-y-4">
                {[
                  "Read another runner's profile, activities, goals, analytics, or plans",
                  "Change activities, account details, or subscription settings",
                  "Silently save or replace a training plan without your explicit approval",
                  "Start a Strava sync or send messages to an unconnected channel",
                  "See Stripe, Strava, session, magic-link, or internal provider credentials",
                  "Use a user ID supplied by the model or by a chat message",
                ].map((item) => <li key={item} className="flex gap-3 text-slate-300"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" /><span>{item}</span></li>)}
              </ul>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-20 lg:py-28">
          <div className="grid gap-10 lg:grid-cols-[.85fr_1.15fr] lg:items-start">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-amber-900"><Moon className="h-4 w-4" /> Beta roadmap</div>
              <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl">Proactive should mean timely, not noisy.</h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">The next phase is about contacting you only when timing materially changes the recommendation. These capabilities are planned, not presented as live today.</p>
            </div>
            <div className="space-y-4">
              {roadmapCapabilities.map(({ icon: Icon, text }) => (
                <div key={text} className="flex gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-amber-700 shadow-sm"><Icon className="h-5 w-5" /></div>
                  <p className="self-center font-semibold leading-7 text-amber-950">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-5xl px-6 py-20">
            <div className="text-center">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#FC4C02]">Clear expectations</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Questions runners should ask before connecting</h2>
            </div>
            <div className="mt-10 divide-y divide-slate-200 rounded-3xl border border-slate-200 px-6 sm:px-8">
              {faqs.map(({ question, answer }) => (
                <details key={question} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-slate-900">
                    {question}<span className="text-2xl font-light text-slate-400 transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="max-w-3xl pb-2 pt-3 leading-7 text-slate-600">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-20 lg:py-28">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-[#FC4C02] px-7 py-12 text-center text-white shadow-2xl sm:px-12 sm:py-16">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15"><Sparkles className="h-7 w-7" /></div>
            <h2 className="mx-auto mt-6 max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">Your next useful coaching moment should find you.</h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-orange-50">Start the 7-day Premium trial, connect Strava, then opt in to WhatsApp from coach Settings. Premium remains $7.99/month after the trial; the iOS app is coming soon.</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <a href={primaryHref} onClick={trackPrimaryClick}>
                <Button size="lg" className="h-14 w-full bg-white px-7 text-base font-bold text-[#C63B00] hover:bg-orange-50 sm:w-auto" data-testid="proactive-coach-bottom-cta">
                  {primaryLabel} <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </a>
              <Link href="/blog/ai-agent-coach-proactive-coaching">
                <Button size="lg" variant="outline" className="h-14 w-full border-white/60 bg-transparent px-7 text-base text-white hover:bg-white/10 hover:text-white sm:w-auto">
                  Read the coaching guide
                </Button>
              </Link>
            </div>
            <div className="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-orange-50">
              <span className="flex items-center gap-2"><Check className="h-4 w-4" /> No separate activity logging</span>
              <span className="flex items-center gap-2"><Check className="h-4 w-4" /> Private, runner-scoped connection</span>
              <span className="flex items-center gap-2"><Check className="h-4 w-4" /> Cancel or disconnect anytime</span>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
