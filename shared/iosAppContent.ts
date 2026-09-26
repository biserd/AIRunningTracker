// Shared by the browser and server-rendered pages; no account data or launch claims.
export const iosAppMeta = {
  title: 'Running Coach for iPhone & iPad | Run Analytics',
  description: 'Meet Run Analytics for iPhone and iPad: voice coaching, training plans, Strava run insights and progress in one native app. Coming soon.',
  path: '/ios-app',
  image: 'https://aitracker.run/ios-app/social-v1.jpg',
};
export const iosPrivacyMeta = {
  title: 'iPhone & iPad App Privacy | Run Analytics',
  description: 'How the Run Analytics app uses account details, Strava runs, AI conversations, microphone access, notifications and subscription information.',
  path: '/ios-app/privacy',
  image: iosAppMeta.image,
};
export const iosAppFaqs = [
  {question:'When can I download the app?',answer:'Run Analytics for iPhone and iPad is coming soon. There is no public App Store download available from this page yet.'},
  {question:'Do I need a new RunAnalytics account?',answer:'No. Sign in with the email you already use for RunAnalytics. Your account, synced runs and saved training plans come from the same backend as the website. New runners can create an account with an email sign-in link in the app.'},
  {question:'How do my runs get into the app?',answer:'Connect your Strava account from the app and authorize access. Run Analytics uses your synced activities for history, insights and coaching. It is not a replacement for the app or watch you use to record runs.'},
  {question:'How much does Premium cost?',answer:'Premium is $7.99/month or $79.99/year in the US, with a 7-day free trial for eligible new subscribers. After the trial, your selected subscription renews automatically unless cancelled. Local App Store prices, taxes and trial eligibility are shown before confirmation. Existing paid RunAnalytics accounts can sign in without buying a second subscription.'},
  {question:'Can I cancel during the free trial?',answer:'Yes. Cancel anytime through the service where you subscribed. For an Apple trial, cancel at least 24 hours before the 7-day trial ends to avoid a charge, in Apple Settings → Subscriptions. Website subscriptions are managed in web billing. Cancelling stops future renewal; deleting the app or your account does not cancel an Apple subscription.'},
  {question:'Can the coach change my training plan?',answer:'The app’s plan workflow prepares a proposed plan or adjustment for your review. Changes are not saved until you explicitly confirm. Plan-writing access requires eligible coaching access; availability may be limited during rollout.'},
  {question:'Does it work without an internet connection?',answer:'You need an internet connection for sign-in, syncing, AI chat and voice, and saving plan changes. The iPad app has a larger native layout, not a stretched mobile webpage.'},
];
export const iosAppSchema = {
  '@context':'https://schema.org',
  '@graph':[
    {'@type':'SoftwareApplication',name:'Run Analytics',applicationCategory:'HealthApplication',operatingSystem:'iOS, iPadOS',url:'https://aitracker.run/ios-app',description:iosAppMeta.description,screenshot:['https://aitracker.run/ios-app/coach-v1.webp','https://aitracker.run/ios-app/plan-v1.webp','https://aitracker.run/ios-app/ipad-v1.webp']},
    {'@type':'FAQPage',mainEntity:iosAppFaqs.map(({question,answer})=>({'@type':'Question',name:question,acceptedAnswer:{'@type':'Answer',text:answer}}))},
  ],
};
export const iosPrivacySections = [
  {id:'account',title:'Your account and running data',paragraphs:[
    'Run Analytics for iPhone and iPad uses your existing RunAnalytics account and backend. We process your email, profile preferences and authentication information to sign you in. The native app uses email links rather than asking you to create a password.',
    'When you connect Strava, we import the activities and athlete information you authorize. This can include dates, distance, pace, duration, elevation, heart rate, laps and route coordinates when the activity contains them. Saved plans, goals, check-ins and coaching preferences help personalize your experience. Route maps describe recorded runs; they are not live tracking of your phone.',
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
