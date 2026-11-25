// Shared by the browser and server-rendered pages.
export const APP_STORE_URL = 'https://apps.apple.com/us/app/run-analytics-running-coach/id6813680941';
export const APP_STORE_CTA = 'Download on the App Store';

export type IosWebOffer = { firstMonth: string; firstYear: string; renewalMonth: string; renewalYear: string; deadline: string };

// Consume the same public Stripe-backed quotes as the main pricing page.
export function iosWebOfferFromQuotes(monthly: unknown, annual: unknown, now = Date.now()): IosWebOffer | null {
  function quote(value: unknown, period: 'monthly' | 'annual') {
    if (!value || typeof value !== 'object') return null;
    const q = value as Record<string, unknown>;
    const { introductoryUnitAmount: first, regularUnitAmount: regular, offerEndsAt } = q;
    if (q.active !== true || q.billingPeriod !== period || q.currency !== 'usd' || q.introductoryPayments !== 1 ||
        typeof first !== 'number' || !Number.isSafeInteger(first) || first < 1 ||
        typeof regular !== 'number' || !Number.isSafeInteger(regular) || regular <= first ||
        typeof offerEndsAt !== 'string' || !(Date.parse(offerEndsAt) > now)) return null;
    return { first, regular, expires: Date.parse(offerEndsAt) };
  }
  const month = quote(monthly, 'monthly'), year = quote(annual, 'annual');
  if (!month || !year || month.expires !== year.expires) return null;
  const usd = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
  return {
    firstMonth: usd(month.first), firstYear: usd(year.first), renewalMonth: usd(month.regular), renewalYear: usd(year.regular),
    deadline: new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', timeZone: 'America/New_York' }).format(month.expires - 1),
  };
}

export function iosWebOfferTerms(offer: IosWebOffer) {
  return `7 days free for eligible new web subscribers, then ${offer.firstMonth} for the first month or ${offer.firstYear} for the first year. Renews at ${offer.renewalMonth}/month or ${offer.renewalYear}/year. Sign up by ${offer.deadline}. Card required; cancel anytime.`;
}

export const iosAppMeta = {
  title: 'Running Coach for iPhone & iPad | Run Analytics',
  description: 'Download Run Analytics for iPhone and iPad. Record GPS runs on iPhone, track your progress, and get optional coaching and training plans.',
  path: '/ios-app',
  image: 'https://aitracker.run/ios-app/social-v2.jpg',
};
export const iosPrivacyMeta = {
  title: 'iPhone & iPad App Privacy | Run Analytics',
  description: 'How the Run Analytics app uses account details, Strava runs, AI conversations, microphone access, notifications and subscription information.',
  path: '/ios-app/privacy',
  image: iosAppMeta.image,
};
export const iosAppFaqs = [
  {question:'Where can I download the app?',answer:'Run Analytics is available free on the App Store for iPhone and iPad. iPhone GPS recording and basic run history do not require a subscription. Premium coaching is optional.'},
  {question:'Do I need a new RunAnalytics account?',answer:'No. Sign in with the email you already use for RunAnalytics. Your account, synced runs and saved training plans come from the same backend as the website. New runners can create an account with an email sign-in link in the app.'},
  {question:'How do my runs get into the app?',answer:'Record runs with GPS on your iPhone, connect Strava to import authorized running history, or connect Garmin for newly synced runs. Strava and Garmin are optional. Coaching based on synced activity history uses eligible Strava runs, not direct Garmin data.'},
  {question:'How much does Premium cost?',answer:'Through the U.S. App Store, Premium is $7.99/month or $79.99/year, with a 7-day free trial for eligible new subscribers. Web checkout may offer different introductory pricing. Existing paid RunAnalytics accounts can sign in without buying a second subscription.'},
  {question:'Can I cancel during the free trial?',answer:'Yes. Cancel anytime through the service where you subscribed. For an Apple trial, cancel at least 24 hours before the 7-day trial ends to avoid a charge, in Apple Settings → Subscriptions. Website subscriptions are managed in web billing. Cancelling stops future renewal; deleting the app or your account does not cancel an Apple subscription.'},
  {question:'Can the coach change my training plan?',answer:'The app’s plan workflow prepares a proposed plan or adjustment for your review. Changes are not saved until you explicitly confirm. Plan-writing access requires eligible coaching access; availability may be limited during rollout.'},
  {question:'Does it work without an internet connection?',answer:'You need an internet connection for sign-in, syncing, AI chat and voice, and saving plan changes. The iPad app has a larger native layout, not a stretched mobile webpage.'},
];
export function getIosAppFaqs(offer: IosWebOffer | null = null) {
  return offer ? iosAppFaqs.map(faq => faq.question === 'How much does Premium cost?' ?
    { ...faq, answer: `Web checkout only: ${iosWebOfferTerms(offer)} ${faq.answer}` } : faq) : iosAppFaqs;
}
export const getIosAppSchema = (offer: IosWebOffer | null = null) => ({
  '@context':'https://schema.org',
  '@graph':[
    {'@type':'SoftwareApplication',name:'Run Analytics',applicationCategory:'HealthApplication',operatingSystem:'iOS, iPadOS',url:'https://aitracker.run/ios-app',installUrl:APP_STORE_URL,description:iosAppMeta.description,screenshot:['https://aitracker.run/ios-app/coach-v1.webp','https://aitracker.run/ios-app/plan-v1.webp','https://aitracker.run/ios-app/ipad-v1.webp']},
    {'@type':'FAQPage',mainEntity:getIosAppFaqs(offer).map(({question,answer})=>({'@type':'Question',name:question,acceptedAnswer:{'@type':'Answer',text:answer}}))},
  ],
});
export const iosPrivacySections = [
  {id:'account',title:'Your account and running data',paragraphs:[
    'Run Analytics for iPhone and iPad uses your existing RunAnalytics account and backend. We process your email, profile preferences and authentication information to sign you in. The native app uses email links rather than asking you to create a password.',
    'When you connect Strava, we import the activities and athlete information you authorize. This can include dates, distance, pace, duration, elevation, heart rate, laps and route coordinates when the activity contains them. Saved plans, goals, check-ins and coaching preferences help personalize your experience. Imported route maps describe recorded activities; they do not start phone recording. Garmin can also be connected separately, with the sharing choices described in the full privacy policy.',
  ]},
  {id:'recording',title:'Phone recording, sensors and Apple Health',paragraphs:[
    'You can use your account to record runs without Garmin, Strava or a coaching subscription. Starting a phone run requests precise location permission. Location updates continue while that recording is active, including in the background or with the screen locked, and stop when paused, finished, discarded or signed out. Force-quitting stops recording; an unfinished draft can be recovered at its last saved checkpoint.',
    'GPS routes, individual sensor heart-rate samples and recording drafts are stored in protected, account-scoped files on the recording device. The run name, date, distance, running and elapsed time, and optional effort, notes, splits, laps and average heart rate sync privately to your account on Cloudflare. Raw GPS coordinates and individual heart-rate samples are not included in that upload. These phone summaries are not forwarded to the AI coach, messaging services, Garmin or Strava.',
    'Bluetooth heart-rate recording is optional and uses a sensor you choose after system permission. Native route maps use Apple map services. If you choose Save to Apple Health, the app separately requests permission to save the workout and available heart-rate samples; exporting the GPS route requires its own choice. Apple Health manages exported copies according to your device and Apple settings. This feature does not import general Apple Health, sleep or recovery data.',
    'Live Activities can show distance, time, pace and recording state on your Lock Screen and Dynamic Island. Audio announcements and haptic feedback are optional. Signing out pauses recording and keeps that account’s local files for the next sign-in. Account deletion from the app removes its local recording files and server summaries; removing the app removes its local files. Copies previously exported to Apple Health remain there and can be managed in Apple Health.',
  ]},
  {id:'ai',title:'AI chat and voice coaching',paragraphs:[
    'When you use AI coaching, your messages and relevant running context are sent to OpenAI to generate a response. Context can include recent runs, training plans, goals, coaching notes, check-ins and derived training metrics. This processing is not entirely on your device. Conversations and generated content may be stored in your account to provide history and continuity.',
    'Voice coaching uses your microphone after device permission and when you start a session. Audio is transmitted to the AI voice service; transcripts and conversation content may be processed to provide coaching and reviewable actions. End the voice session to stop it. You can revoke microphone permission in iOS or iPadOS Settings. Microphone permission and permission to process personal data are separate matters.',
    'Avoid entering information you do not want processed by an AI service, including unnecessary medical or other sensitive details. The coach is not a medical or emergency service. Provider processing and retention are also subject to the applicable provider terms; this notice does not promise zero retention or on-device-only processing.',
  ]},
  {id:'permissions',title:'Optional permissions and notifications',paragraphs:[
    'Push notifications use Apple Push Notification service and a device token associated with your account. The service stores notification preferences, scheduled reminders and delivery records to deliver and deduplicate messages. Enable notifications only if you want them; you can change preferences in the app or disable system permission in device Settings. Notification text may be visible on your lock screen.',
    'The app does not need your camera to coach you. Weather lookups use a place you provide or an explicitly enabled weather location, not automatic background phone tracking. If you choose an external messaging integration, that channel has its own connection and privacy terms; it is not required to use the iPhone or iPad app.',
  ]},
  {id:'providers',title:'Services involved in providing the app',paragraphs:[
    'Cloudflare hosts application services and stores account-linked application data. OpenAI processes AI coaching requests. Strava supplies activity data after your authorization. Apple provides app distribution, in-app purchases, push delivery and native map services. Email delivery providers process sign-in and service emails. Existing website subscriptions may also use Stripe.',
    'These services process the data needed for their role. For example, an Apple purchase transaction is linked to an account to verify access and restore purchases; Run Analytics does not receive your full payment-card details from Apple. Operational request and error records help diagnose failures and protect the service.',
  ]},
  {id:'control',title:'Access, disconnecting and deletion',paragraphs:[
    'You can change coaching and notification preferences, disconnect integrations and sign out from the app. Disconnecting an integration stops that connection; it is not the same as deleting your RunAnalytics account or deleting the original activities in Strava.',
    'The app includes Delete account in Settings. You can also contact hello@aitracker.run for access, deletion or retention questions. Some purchase, security or compliance records may need to be retained where applicable. Deleting the app from your device alone does not delete your account.',
    'Account deletion does not itself cancel an Apple subscription. Manage or cancel it through your Apple subscription settings. A subscription purchased on the website is managed through the website’s billing flow.',
  ]},
];
