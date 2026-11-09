import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToString} from 'react-dom/server';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {Router} from 'wouter';
import {GarminOnboardingContent} from '../../client/src/components/GarminOnboarding';
import {GARMIN_AI_NOTICE,garminRunPreview,type GarminOnboarding} from '../../shared/garminOnboarding';
import {readFileSync} from 'node:fs';
(globalThis as any).React=React;
const now=Date.parse('2026-11-09T12:00:00Z');
const preview=garminRunPreview([{id:'fixture',name:'Fixture morning run',type:'RUNNING',startDate:'2026-11-08T12:00:00Z',offsetSeconds:0,distance:5000,duration:1800,averageSpeed:2.777,averageHeartRate:150,maxHeartRate:null,cadence:null,elevationGain:null,calories:null,device:null,manual:false}],'km',now);
function render(overrides:Partial<GarminOnboarding>={}) {
 const client=new QueryClient({defaultOptions:{queries:{retry:false}}});
 client.setQueryData(['/api/stripe/trial-offer',undefined,'monthly'],{trialEligible:true,unitAmount:799,introductoryUnitAmount:399,currency:'usd',estimatedFirstChargeAt:'2026-11-16T12:00:00Z'});
 const setup:GarminOnboarding={connected:true,connectionStatus:'connected',activityCount:1,hasEmail:false,hasPremium:false,state:'ready',preview,...overrides};
 const html=renderToString(<Router ssrPath="/dashboard"><QueryClientProvider client={client}><GarminOnboardingContent setup={setup}/></QueryClientProvider></Router>);client.clear();return html;
}
test('Garmin free-run preview gives two facts, optional email, honest upsell and current trial disclosures',()=>{
 const html=render().replaceAll('<!-- -->','');assert.match(html,/Rules-based preview/);assert.match(html,/No AI processing/);assert.match(html,/5.00 km/);assert.match(html,/150 bpm/);assert.match(html,/href="\/runs\/garmin\/fixture"/);
 assert.match(html,/Add and verify email/);assert.match(html,/optional/);assert.match(html,/\$0\.00 today/);assert.match(html,/\$3.99/);assert.match(html,/\$7.99/);assert.match(html,/November 16/);assert.match(html,/Cancel anytime/);assert.match(html,/payment method/);
 assert.ok(html.includes(GARMIN_AI_NOTICE));assert.doesNotMatch(html,/Unlock my complete run analysis|Strava required/);
});
test('waiting and paid states are useful without inventing data or showing paid subscribers an upsell',()=>{
 const waiting=render({preview:null,state:'waiting_for_run',activityCount:0});assert.match(waiting,/Waiting for your first Garmin run/);assert.match(waiting,/garmin\/setup#troubleshooting/);assert.doesNotMatch(waiting,/Fixture morning run/);
 const paid=render({hasPremium:true,hasEmail:true});assert.doesNotMatch(paid,/garmin-premium-offer|Add and verify email|Start my 7-day/);assert.ok(paid.includes(GARMIN_AI_NOTICE));
});
test('new Garmin data remains isolated from AI, marketing payloads and the Strava preview store',()=>{
 const code=readFileSync('server/garmin/onboarding.ts','utf8');assert.doesNotMatch(code,/openai|premiumPreview|generateContent|\.send|\.write|UPDATE users/i);
 const ui=readFileSync('client/src/components/GarminOnboarding.tsx','utf8');assert.doesNotMatch(ui,/activityId,|findings:.*trackFunnel/);
 assert.match(readFileSync('server/garmin/routes.ts','utf8'),/dashboard\?welcome=garmin/);
 assert.match(readFileSync('client/src/pages/dashboard.tsx','utf8'),/!dashboardData\?\.user\?\.stravaConnected&&<GarminOnboarding/);
});
