import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { RequestHandler } from 'express';
import { LaunchStrip, hasLaunchBanner, launchCutoff, launchOpen } from '../../shared/blackFridayLaunch';
import type { IosWebOffer } from '../../shared/iosAppContent';

// Only look up the billing offer for marketing documents. Coalesce concurrent
// requests and let pages work normally when the catalog is unavailable.
export function launchAnnouncement(readOffer: () => Promise<IosWebOffer | null>, now = Date.now): RequestHandler {
  let cached: IosWebOffer | null = null, refreshAt = 0;
  let pending: Promise<void> | undefined;
  return async (req, res, next) => {
    if (!['GET','HEAD'].includes(req.method) || !hasLaunchBanner(req.path) || !launchOpen(now())) return next();
    if (now() >= refreshAt) {
      pending ??= Promise.resolve().then(readOffer).catch(() => null).then(value => {
        cached = value; refreshAt = now() + (value ? 60_000 : 15_000);
      }).finally(() => { pending = undefined; });
      await pending;
    }
    if (cached) {
      const firstYear = cached.firstYear, send = res.send;
      res.send = function(body) {
        const type = String(this.getHeader('Content-Type') || 'text/html');
        if (this.statusCode === 200 && type.startsWith('text/html') && typeof body === 'string' && /<body(?:\s[^>]*)?>/i.test(body) && launchOpen(now())) {
          const strip = renderToStaticMarkup(<LaunchStrip firstYear={firstYear}/>);
          body = body.replace(/<body(?:\s[^>]*)?>/i, match => match + strip +
            '<script defer src="/launch-expiry-2026.js" data-ends="' + launchCutoff + '"></script>');
          const ttl = Math.max(0, Math.min(60, Math.floor((launchCutoff - now()) / 1000)));
          if (!/private|no-store/i.test(String(this.getHeader('Cache-Control') || '')))
            this.setHeader('Cache-Control', 'public, max-age=0, s-maxage=' + ttl + ', must-revalidate');
        }
        return send.call(this, body);
      };
    }
    next();
  };
}
