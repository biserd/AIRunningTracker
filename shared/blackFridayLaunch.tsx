import React from 'react';
import { APP_STORE_URL } from './iosAppContent';
import { WEB_INTRO_OFFER_ENDS_AT } from './webIntroDeadline';

export const launchCutoff = Date.parse(WEB_INTRO_OFFER_ENDS_AT);
export const launchOpen = (now = Date.now()) => now >= Date.parse('2026-11-24T05:00:00Z') && now < launchCutoff;
const publicPath = /^\/(?:$|(?:about|features|pricing|ios-app|integrations|strava|chrome-extension|faq|contact|ai-running-coach|ai-running-coaching-guide|ai-agent-coach|proactive-running-coach|mcp-server)\/?$|(?:garmin|blog|tools|developers)(?:\/[a-z0-9-]+)*\/?$)/;
export const hasLaunchBanner = (path: string) => publicPath.test(path);

export function LaunchStrip({ firstYear }: { firstYear: string }) {
  const link = { color: '#fff', textDecoration: 'underline', textUnderlineOffset: '3px', fontWeight: 700 };
  return <aside aria-label="App launch and Black Friday offer" data-launch-first-year={firstYear}
    style={{background:'#172536',color:'#fff',textAlign:'center',padding:'9px 16px',font:'500 14px/1.5 system-ui,sans-serif',display:'flex',justifyContent:'center',alignItems:'baseline',flexWrap:'wrap',columnGap:'1.25rem',rowGap:'2px'}}>
    <span>New on iPhone and iPad: <a href={APP_STORE_URL} style={link}>Download free</a></span>
    <span><strong style={{color:'#ffd2a8'}}>Black Friday</strong>{' · '}
      <a href="/pricing#web-offer" style={link}>First year of Premium for {firstYear}</a>
      {' after your trial. Web only. Ends Nov. 30 ET.'}</span>
  </aside>;
}
