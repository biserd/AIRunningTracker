import { Link } from "wouter";
import { SiTelegram } from "react-icons/si";
import { Check, CloudSun, LockKeyhole, Sparkles } from "lucide-react";
import { buildUpgradeUrl } from "@shared/upgradeIntent";
import { DirectCheckoutButton } from "@/components/DirectCheckoutButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type TelegramTrialOfferProps = {
  source: "dashboard_telegram_offer" | "settings_telegram_offer" | "coach_settings_telegram_offer";
  compact?: boolean;
};

const benefits = [
  { icon: Sparkles, text: "A useful post-run analysis after Strava syncs" },
  { icon: CloudSun, text: "Tomorrow's run and weather heads-ups" },
  { icon: LockKeyhole, text: "A private, runner-scoped connection you can disconnect anytime" },
];

export function TelegramTrialOffer({ source, compact = false }: TelegramTrialOfferProps) {
  const upgradeUrl = buildUpgradeUrl({
    source,
    capability: "ai_coach",
    benefitKey: "telegram_coach",
    returnTo: "/coach/settings?connect=telegram",
    experimentVariant: "telegram_trial_offer_v1",
  });

  return (
    <Card
      className="overflow-hidden border-sky-200 bg-gradient-to-br from-white via-sky-50/70 to-orange-50 shadow-sm"
      data-testid={`telegram-trial-offer-${source}`}
    >
      <CardContent className={compact ? "p-5" : "p-6 sm:p-7"}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#229ED9] px-3 py-1 text-xs font-bold text-white">
                <SiTelegram className="h-3.5 w-3.5" /> Telegram coaching
              </span>
              <span className="rounded-full border border-orange-200 bg-white px-3 py-1 text-xs font-bold text-orange-700">
                14 days free
              </span>
            </div>

            <h2 className={`${compact ? "text-xl" : "text-2xl sm:text-3xl"} font-bold tracking-tight text-slate-950`}>
              Your running coach can come to you
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
              Get timely coaching in Telegram based on your own runs, training plan, recovery, and optional weather context.
            </p>

            <ul className={`mt-4 ${compact ? "space-y-2" : "grid gap-2 sm:grid-cols-3"}`}>
              {benefits.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-2 text-sm leading-5 text-slate-700">
                  <span className="mt-0.5 rounded-full bg-emerald-100 p-1 text-emerald-700">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="shrink-0 lg:w-72">
            <DirectCheckoutButton upgradeUrl={upgradeUrl}>
              <Button
                className="w-full gap-2 bg-strava-orange text-white hover:bg-orange-600"
                size="lg"
                data-testid={`button-start-telegram-trial-${source}`}
              >
                <SiTelegram className="h-4 w-4" /> Start trial and connect
              </Button>
            </DirectCheckoutButton>
            <p className="mt-2 text-center text-xs leading-5 text-slate-500">
              $0 today. Card required. Then $7.99/month. Cancel anytime.
            </p>
            <Link
              href="/proactive-running-coach"
              className="mt-2 flex items-center justify-center gap-1 text-xs font-semibold text-sky-700 hover:underline"
            >
              <Check className="h-3.5 w-3.5" /> See how Telegram coaching works
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
