import { Lock, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useOfferTracking } from "@/lib/analytics";

interface LockedFeatureTeaserProps {
  tier?: 'premium';
  teaser: string;
  className?: string;
  compact?: boolean;
  /** Pricing URL carrying the upgrade intent (capability, activity, returnTo). */
  pricingUrl?: string;
  /** Capability-specific call to action, e.g. "Unlock splits analysis". */
  ctaLabel?: string;
}

export function LockedFeatureTeaser({ tier, teaser, className = '', compact = false, pricingUrl = '/pricing', ctaLabel = 'Unlock' }: LockedFeatureTeaserProps) {
  // Funnel: offer_viewed on mount (once/session), offer_clicked on CTA.
  const trackOfferClick = useOfferTracking(pricingUrl);
  const tierConfig = { 
    label: 'Premium', 
    bgClass: 'bg-gradient-to-r from-yellow-50 to-amber-50',
    borderClass: 'border-yellow-200',
    iconColor: 'text-yellow-600',
    buttonClass: 'bg-yellow-500 hover:bg-yellow-600',
    badgeClass: 'bg-yellow-100 text-yellow-700'
  };

  if (compact) {
    return (
      <div className={`flex items-center justify-between p-3 rounded-lg border ${tierConfig.borderClass} ${tierConfig.bgClass} ${className}`} data-testid="locked-teaser">
        <div className="flex items-center gap-2">
          <Lock className={`h-4 w-4 ${tierConfig.iconColor}`} />
          <span className="text-sm text-gray-700">{teaser}</span>
        </div>
        <Link href={pricingUrl}>
          <Button size="sm" className={`${tierConfig.buttonClass} text-white text-xs h-7 px-3`} data-testid="button-unlock" onClick={trackOfferClick}>
            {ctaLabel}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border ${tierConfig.borderClass} ${tierConfig.bgClass} ${className}`} data-testid="locked-teaser">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center`}>
          <Lock className={`h-5 w-5 ${tierConfig.iconColor}`} />
        </div>
        <div>
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${tierConfig.badgeClass}`}>
            {tierConfig.label.toUpperCase()}
          </span>
          <p className="text-sm text-gray-700 mt-1">{teaser}</p>
        </div>
      </div>
      <Link href={pricingUrl}>
        <Button className={`${tierConfig.buttonClass} text-white`} data-testid="button-unlock" onClick={trackOfferClick}>
          <Sparkles className="h-4 w-4 mr-2" />
          {ctaLabel}
        </Button>
      </Link>
    </div>
  );
}

export function TierBadge({ tier }: { tier?: 'premium' }) {
  return (
    <span className="ml-2 text-xs font-bold px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">PREMIUM</span>
  );
}

interface LockedOverlayProps {
  tier?: 'premium';
  teaser: string;
  children: React.ReactNode;
  blur?: boolean;
  pricingUrl?: string;
  ctaLabel?: string;
}

export function LockedOverlay({ tier, teaser, children, blur = true, pricingUrl = '/pricing', ctaLabel = 'Unlock' }: LockedOverlayProps) {
  // Funnel: offer_viewed on mount (once/session), offer_clicked on CTA.
  const trackOfferClick = useOfferTracking(pricingUrl);
  const tierConfig = { 
    label: 'Premium', 
    borderClass: 'border-yellow-300',
    buttonClass: 'bg-yellow-500 hover:bg-yellow-600',
    iconColor: 'text-yellow-600'
  };

  return (
    <div className="relative" data-testid="locked-overlay">
      <div className={blur ? 'blur-sm pointer-events-none select-none opacity-60' : 'pointer-events-none select-none opacity-40'}>
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={`flex items-center gap-3 px-4 py-3 bg-white/95 backdrop-blur-sm rounded-xl border-2 ${tierConfig.borderClass} shadow-lg`}>
          <Lock className={`h-5 w-5 ${tierConfig.iconColor}`} />
          <span className="text-sm text-gray-700 max-w-[200px]">{teaser}</span>
          <Link href={pricingUrl}>
            <Button size="sm" className={`${tierConfig.buttonClass} text-white`} data-testid="button-unlock-overlay" onClick={trackOfferClick}>
              {ctaLabel}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
