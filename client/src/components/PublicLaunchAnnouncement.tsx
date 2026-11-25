import { useEffect, useLayoutEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { hasLaunchBanner, launchOpen, launchCutoff, LaunchStrip } from '@shared/blackFridayLaunch';
import { WEB_INTRO_OFFER_ENDS_AT } from '@shared/webIntroDeadline';

export function useLaunchWindow() {
  const [open, setOpen] = useState(() => launchOpen());
  useEffect(() => {
    const check = () => setOpen(launchOpen());
    const timer = launchOpen() ? window.setTimeout(check, launchCutoff - Date.now()) : undefined;
    window.addEventListener('pageshow', check);
    document.addEventListener('visibilitychange', check);
    return () => { clearTimeout(timer); window.removeEventListener('pageshow', check); document.removeEventListener('visibilitychange', check); };
  }, []);
  return open;
}

// The full SPA takes over the server strip to follow client-side navigation;
// public tool documents navigate with full page loads and keep the server strip.
export function PublicLaunchAnnouncement() {
  const [path] = useLocation();
  const open = useLaunchWindow(), visible = open && hasLaunchBanner(path);
  const [initial] = useState(() => document.querySelector<HTMLElement>('body > aside[data-launch-first-year]'));
  useLayoutEffect(() => { initial?.remove(); }, [initial]);
  const {data, isError} = useQuery({
    queryKey: ['/api/stripe/web-intro-offer', 'annual'], enabled: visible, staleTime: 60_000, retry: false,
    queryFn: async () => {
      const response = await fetch('/api/stripe/web-intro-offer?billingPeriod=annual');
      return response.ok ? await response.json() : {active:false};
    },
  });
  if (!visible || isError) return null;
  const price = data === undefined ? initial?.dataset.launchFirstYear :
    data.active && data.currency === 'usd' && data.billingPeriod === 'annual' && data.introductoryPayments === 1 &&
      data.offerEndsAt === WEB_INTRO_OFFER_ENDS_AT && Number.isSafeInteger(data.introductoryUnitAmount) && data.introductoryUnitAmount > 0
      ? '$' + (data.introductoryUnitAmount / 100).toFixed(2) : null;
  return price ? <LaunchStrip firstYear={price}/> : null;
}
